import dotenv from "dotenv";
import nodemailer from 'nodemailer'
import { getInvoicePdf, deleteInvoice } from "./invoices.js";

dotenv.config();


const MY_EMAIL = "gasmanorder@gmail.com"

export async function sendInvoiceEmail(orderData) {
    getInvoicePdf(orderData);

    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "gasmanorder@gmail.com",
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    let mailOptions = {
        from: "The Gas Man Co",
        to: orderData.email,
        subject: `Gas Man Co Order Invoice #${orderData.id}`,
        html: `<p>Hello <strong>${orderData.name}</strong>,</p><p>Thank you for your gas order. Please find attatched your order invoice.</p><p>Best,</p><p><strong>The Gas Man Co.</strong></p>`,
        attachments: [
            {
                filename: "invoice.pdf",
                path: `invoices/invoice-${orderData.id}.pdf`,
            }
        ]
    };

    transport.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log("Order invoice email sent");
            deleteInvoice(orderData.id);
        }
    });
};

export async function sendNotificationEmail(orderData, toEmail) {
    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "gasmanorder@gmail.com",
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    let mailOptions = {
        from: "The Gas Man Co",
        to: toEmail,
        subject: `New Order #${orderData.id}`,
        html: `
            <p>Hello,</p>
            <p>You got a new order #${orderData.id} from ${orderData.name}.</p>
            <p>To see the information on this order, go to the admin panel at the <a href="https://thegasmanco.com/admin">Gas Man Co. Website</a>.</p>
        `
    };

    transport.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log(`Order notification email sent to ${toEmail}`);
        }
    });
}

export async function sendContactEmail(emailData) {
    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "gasmanorder@gmail.com",
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    let mailOptions = {
        from: "The Gas Man Co",
        to: MY_EMAIL,
        subject: `New message from ${emailData.name}`,
        html: `
            <p><strong>Name:</strong> ${emailData.name}</p>
            <p><strong>Email:</strong> ${emailData.email}</p>
            <p><strong>Message:</strong><br>${emailData.message}</p>
        `
    };

    transport.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log(`Contact email sent`);
        }
    });
}