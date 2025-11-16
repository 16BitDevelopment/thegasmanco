import express from "express";
import admin from "firebase-admin";
import dotenv from "dotenv";
import Stripe from "stripe";
import { sendInvoiceEmail } from "./send-email.js";

dotenv.config();

// Initialize Firebase Admin SDK securely from env vars
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  }),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public'));

function getGasman(location) {
    const mullumLocations = [
        "Mullum",
        "Mullum Creek",
        "Koonyum Range",
        "Wilsons Creek",
        "Upper Wilsons Creek",
        "Huonbrook",
        "Wanganui",
        "Palmswood",
        "Main Arm",
        "Upper Main Arm",
        "The Pockett",
        "Myocum"
    ];
    const byronLocations = [
        "Crabbes Creek",
        "Yelgun",
        "Ocean Shores",
        "South Golden Beach",
        "Billinudgel",
        "Brunswick Heads",
        "Tyagarah",
        "Ewingsdale",
        "Byron Bay",
        "Skinners Shoot",
        "Hayters Hill",
        "Talofa",
        "Coopers Creek",
        "Suffolk Park"
    ];
    const federalLocations = [
        "Coorabell",
        "Federal",
        "Repentance Creek",
        "Goonengerry",
        "Eureka",
        "Rosebank",
        "Dorroughby",
        "Corndale",
        "Binna Burra",
        "Clunes",
        "Bexhill",
        "Whian Whian",
        "Bangalow",
        "Possum Creek"
    ];

    if (mullumLocations.some(item => item === location)) {
        return "mullum";
    } else if (byronLocations.some(item => item === location)) {
        return "byron";
    } else if (federalLocations.some(item => item === location)) {
        return "federal";
    } else {
        return "mullum"; // or any default value
    }
}

function sendOrder(orderData, res) {
    const gasman = getGasman(orderData.location);

    const year = new Date().getFullYear() - 2000;

    db.ref(`${year}`).get().then((snapshot) => {
        if (snapshot.exists()) {
            db.ref(`${year}`).set(snapshot.val() + 1)
                .then(() => console.log(`Set order number for 20${year} to ${snapshot.val() + 1}`))
                .catch(err => console.error("❌ Error writing to Firebase:", err));
        } else {
            db.ref(`${year}`).set(1)
                .then(() => console.log(`Set order number for 20${year} to 1`))
                .catch(err => console.error("❌ Error writing to Firebase:", err));
        }

        orderData.id = `${year}${String(snapshot.val() + 1).padStart(4, "0")}`;

        db.ref(`${gasman}/${orderData.id}`).set(orderData)
                .then(() => {
                    console.log(`Added order with # ${year}${String(snapshot.val() + 1).padStart(4, "0")}`);

                    sendInvoiceEmail(orderData);

                    res.send("Order Created");
            }).catch(err => console.error("❌ Error writing to Firebase:", err));
    }).catch(error => {
        console.error(`Error fetching data`, error);
    });
}

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
    console.log(1)

    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.WEBHOOK_SECRET_KEY;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("⚠️ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Handle successful checkout
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log("✅ Payment successful for session:", session.id);
        // You can now run code here (save to DB, send email, etc.)
    }

    // ✅ Handle cancellation or other event types if needed
    else if (event.type === "checkout.session.expired") {
        console.log("❌ Checkout session expired or cancelled");
    }

    res.sendStatus(200);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/", async (req, res) => {
    let formData = req.body;

    for (let item in formData) {
        if (formData.hasOwnProperty(item) && formData[item] == "") return res.send("Invalid Form");
    }

    formData.quantity = parseInt(formData.quantity);
    formData.cost = Math.round(formData.quantity * 155 * 100) / 100; 
    formData.time = Date.now();
    formData.status = 0;

    if (formData.quantity < 0) return res.send("Invalid Form");

    if (formData.payment === "Card") {
        const stripeCost = Math.round((formData.cost * 1.0175 + 0.30) * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "aud",
                        product_data: {
                            name: `45kg LPG gas cylinder x ${formData.quantity}`
                        },
                        unit_amount: stripeCost,
                    },
                    quantity: 1,
                },
            ],
            success_url: "http://localhost:3000/",
            cancel_url: "http://localhost:3000/order",
        });
        res.redirect(303, session.url);

        return;
    }

    sendOrder(formData, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));