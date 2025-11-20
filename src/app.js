import express from "express";
import admin from "firebase-admin";
import dotenv from "dotenv";
import Stripe from "stripe";
import { sendInvoiceEmail, sendNotificationEmail } from "./send-email.js";
import { getGasman } from "./gasman.js";

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

app.set('view engine', 'ejs');
app.set('views', 'views');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public'));

function sendOrder(orderData, res) {
    let gasman = "admin"
    if (orderData.location != "Other") {
        gasman = getGasman(orderData.location);
    }

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

                    sendNotificationEmail(orderData)

                    res.render("order", { serverMsg: "Order Created", colour: "green" });
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

app.post("/order", async (req, res) => {
    const coupons = JSON.parse(process.env.COUPONS)

    let formData = req.body;
    formData.gasCost = 155;

    for (let item in formData) {
        if (formData.hasOwnProperty(item) && formData[item] == "" && item != "coupon") return res.render("order", { serverMsg: "Invalid Form", colour: "red" });
    }

    if (formData.coupon !== "") {
        if (coupons.hasOwnProperty(formData.coupon)) {
            formData.gasCost = coupons[formData.coupon];
        } else {
            res.render("order", {serverMsg: "Invalid Coupon", colour: "red"})
        }
    }

    formData.quantity = parseInt(formData.quantity);
    formData.cost = Math.round(formData.quantity * formData.gasCost * 100) / 100; 
    formData.time = Date.now();
    formData.status = 0;

    if (formData.quantity < 0) return res.render("order", { serverMsg: "Invalid Form", colour: "red" });

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