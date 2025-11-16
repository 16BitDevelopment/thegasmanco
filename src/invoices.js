import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function editPdf(inputPath, outputPath, texts) {
  const existingPdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Example: Modify the first page's text by overlaying new text
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  texts.forEach(text => {
    firstPage.drawText(text.text, {
        x: text.xPos,
        y: text.yPos,
        size: text.textSize
    });
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

const time = new Date();
const gst = 0.1
const cylinderCost = 155 / 1.1

export function getInvoicePdf(orderData) {
    editPdf("invoices/template.pdf", `invoices/invoice-${orderData.id}.pdf`, [
        {
            text: `${orderData.id}`,
            xPos: 180,
            yPos: 180,
            textSize: 10
        },
        {
            text: `${time.getDate()}/${time.getMonth() + 1}/${time.getFullYear()}`,
            xPos: 75,
            yPos: 420,
            textSize: 14
        },
        {
            text: `45kg LPG gas cylinder`,
            xPos: 165,
            yPos: 420,
            textSize: 14
        },
        {
            text: `$${Math.round(cylinderCost * 100) / 100}`,
            xPos: 353,
            yPos: 420,
            textSize: 14
        },
        {
            text: `${orderData.quantity}`,
            xPos: 414,
            yPos: 420,
            textSize: 14
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * 100) / 100}`,
            xPos: 458,
            yPos: 420,
            textSize: 14
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * (gst + 1) * 100) / 100}`,
            xPos: 458,
            yPos: 397,
            textSize: 14
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * gst * 100) / 100}`,
            xPos: 458,
            yPos: 375,
            textSize: 14
        },
        {
            text: `${time.getDate()}/${time.getMonth() + 1}/${time.getFullYear()}`,
            xPos: 150,
            yPos: 474,
            textSize: 10
        },
        {
            text: `${orderData.id}`,
            xPos: 150,
            yPos: 496,
            textSize: 10
        },
        {
            text: `${orderData.address}, ${orderData.location}, ${orderData.postcode}`,
            xPos: 150,
            yPos: 540,
            textSize: 10
        },
        {
            text: `${orderData.name}`,
            xPos: 150,
            yPos: 562,
            textSize: 10
        }
    ]);
}

export function deleteInvoice(invoiceId) {
    fs.unlink(`invoices/invoice-${invoiceId}.pdf`, (err) => {
        if (err) {
            console.error('Error deleting invoice:', err);
            return;
        }
        console.log('Invoice deleted successfully!');
    });
}