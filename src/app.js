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

async function addOrder(orderData, orderFbData, res) {
    let gasman = "admin"
    if (orderData.location != "Other") {
        gasman = getGasman(orderData.location);
    }

    await db.ref(`${gasman}/${orderData.id}`).set(orderFbData);

    console.log(`Added order with # ${orderData.id}`);

    // Emails

    sendInvoiceEmail(orderData);

    let gasmanEmail = "gasmanorder@gmail.com";

    sendNotificationEmail(orderData, gasmanEmail);

    if (gasman == "mullum") {
        gasmanEmail = "mullumgasman@gmail.com";
    } else if (gasman == "byron") {
        gasmanEmail = "byrongasman@gmail.com";
    } else if (gasman == "federal") {
        gasmanEmail = "federalgasman@gmail.com";
    }

    sendNotificationEmail(orderData, gasmanEmail);

    res.render("order", { serverMsg: "Order Created", colour: "green" });
}

async function getClientId(orderData) {
    let orderPhone = orderData.phone;
    orderPhone = orderPhone.replace(" ", "");
    if (orderPhone.replace("+61", "").length >= 9 && orderPhone[0] !== "0") {
        orderPhone = orderPhone.replace("+61", "");
        orderPhone = "0" + orderPhone;
    }

    let orderEmail = orderData.email;
    orderEmail = orderEmail.replace(" ", "");

    let clientId;

    const clientIdSnapshot = await db
        .ref("clients")
        .orderByChild("phone")
        .equalTo(orderPhone)
        .get(); 

    if (clientIdSnapshot.exists()) {
        clientId = Object.keys(clientIdSnapshot.val())[0];

        return parseInt(clientId);
    }

    // Make a client
    const clientSnapshot = await db.ref(`client`).get();

    if (clientSnapshot.exists()) {
        clientId = clientSnapshot.val() + 1;

        try {
            await db.ref("client").set(clientId);
            console.log(`Set client number to ${clientId}`);
        } catch (error) {
            console.error("❌ Error writing to Firebase:", error);
        }
    } else {
        clientId = 1;

        try {
            await db.ref("client").set(1);
            console.log(`Set client number to ${1}`);
        } catch (error) {
            console.error("❌ Error writing to Firebase:", error);
        }
    }

    db.ref(`clients/${clientId}`).set({
        name: orderData.name,
        address: orderData.address,
        postcode: orderData.postcode,
        email: orderEmail,
        phone: orderPhone
    });

    return parseInt(clientId);
}

async function sendOrder(orderData, res) {
    const year = new Date().getFullYear() - 2000;

    const snapshot = await db.ref(`${year}`).get();

    if (snapshot.exists()) {
        try {
            await db.ref(`${year}`).set(snapshot.val() + 1);
            console.log(`Set order number for 20${year} to ${snapshot.val() + 1}`);
        } catch (error) {
            console.error("❌ Error writing to Firebase:", error);
        }
    } else {
        try {
            await db.ref(`${year}`).set(1);
            console.log(`Set order number for 20${year} to 1`);
        } catch (error) {
            console.error("❌ Error writing to Firebase:", error);
        }
    }

    orderData.id = `${year}${String(snapshot.val() + 1).padStart(4, "0")}`;

    // Get client id
    orderData.clientId = await getClientId(orderData);

    const orderFbData = {...orderData};

    delete orderFbData.name;
    delete orderFbData.address;
    delete orderFbData.postcode;
    delete orderFbData.email;
    delete orderFbData.phone;

    addOrder(orderData, orderFbData, res);
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
    const coupons = JSON.parse(process.env.COUPONS);
    const verification = {
        name: /^[a-zA-Z\s'-]{2,}$/,
        phone: /^\+?[0-9\s-]{6,15}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        address: /^.{5,}$/,
        postcode: /^[a-zA-Z0-9\s]{3,10}$/,
        quantity: /^[1-9][0-9]{0,3}$/,
        instructions: /^(?:\S+(?:\s+|$)){0,150}$/
    };

    let formData = req.body;
    formData.gasCost = 155;

    for (let item in verification) {
        if (verification.hasOwnProperty(item) && !verification[item].test(formData[item])) {
            res.render("order", { serverMsg: `Invalid ${item} value`, colour: "red" });
            return;
        }
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