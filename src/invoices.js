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
const gst = 0.1;

export function getInvoicePdf(orderData) {
    const cylinderCost = orderData.gasCost / 1.1;

    editPdf("invoices/template.pdf", `invoices/invoice-${orderData.id}.pdf`, [
        // Acc details
        {
            text: `${orderData.id}`,
            xPos: 410,
            yPos: 134,
            textSize: 10
        },
        {
            text: `${orderData.id}`,
            xPos: 180,
            yPos: 162,
            textSize: 10
        },
        // Order info
        {
            text: `45kg LPG gas cylinder`,
            xPos: 75,
            yPos: 423,
            textSize: 10
        },
        {
            text: `${orderData.quantity}`,
            xPos: 275,
            yPos: 423,
            textSize: 10
        },
        {
            text: `$${Math.round(cylinderCost * 100) / 100}`,
            xPos: 333,
            yPos: 423,
            textSize: 10
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * 100) / 100}`,
            xPos: 453,
            yPos: 423,
            textSize: 10
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * 100) / 100}`,
            xPos: 453,
            yPos: 403,
            textSize: 10
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * gst * 100) / 100}`,
            xPos: 453,
            yPos: 382,
            textSize: 10
        },
        {
            text: `$${Math.round(cylinderCost * orderData.quantity * (gst + 1) * 100) / 100}`,
            xPos: 453,
            yPos: 360,
            textSize: 10
        },
        // Top info
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
        console.log('Order invoice deleted');
    });
}