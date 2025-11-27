import dotenv from "dotenv";
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { getInvoicePdf, deleteInvoice } from "./invoices.js";

dotenv.config();

/*POPULATE BELOW FIELDS WITH YOUR CREDETIALS*/

const MY_EMAIL = "gasmanorder@gmail.com"
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; //DONT EDIT THIS
/*POPULATE ABOVE FIELDS WITH YOUR CREDETIALS*/

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

//YOU CAN PASS MORE ARGUMENTS TO THIS FUNCTION LIKE CC, TEMPLATES, ATTACHMENTS ETC. IM JUST KEEPING IT SIMPLE
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
        from: MY_EMAIL,
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
            console.log("Order invoice deleted");
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
        from: 'MY_EMAIL',
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