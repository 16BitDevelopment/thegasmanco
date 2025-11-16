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
  const ACCESS_TOKEN = await oAuth2Client.getAccessToken();
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: MY_EMAIL,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      accessToken: ACCESS_TOKEN,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  getInvoicePdf(orderData);

  //EMAIL OPTIONS
  return new Promise((resolve, reject) => {
    transport.sendMail({
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
    }, (err, info) => {
      if (err) reject(err);
      console.log("Email sent")
      deleteInvoice(orderData.id);
      resolve(info);
    });
  });
};