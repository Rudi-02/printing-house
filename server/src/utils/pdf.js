const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', '..', 'uploads', 'pdf');
fs.mkdirSync(OUT_DIR, { recursive: true });

function money(n) { return `${Number(n).toLocaleString('sr-RS')} RSD`; }

function buildToBuffer(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { draw(doc); doc.end(); } catch (e) { reject(e); }
  });
}

function header(doc, title) {
  doc.fontSize(20).text('PRINTING HOUSE', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(13).fillColor('#555').text(title);
  doc.fillColor('#000').moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).stroke();
  doc.moveDown(1);
}

async function generateInvoicePDF(invoice, client) {
  return buildToBuffer(doc => {
    header(doc, `Faktura br. ${invoice.invoiceNumber}`);
    doc.fontSize(10);
    doc.text(`Datum: ${new Date(invoice.orderedAt).toLocaleString('sr-RS')}`);
    doc.text(`Kupac: ${client.firstName} ${client.lastName} (${client.username})`);
    if (client.institutionName) doc.text(`Institucija: ${client.institutionName}, PIB: ${client.pib}`);
    doc.text(`Stamparija: ${invoice.printerName}${invoice.city ? ', ' + invoice.city : ''}`);
    doc.text(`Status: ${invoice.status}`);
    doc.moveDown(1);

    doc.fontSize(11).text('Stavke:', { underline: true });
    doc.moveDown(0.4).fontSize(10);
    invoice.items.forEach((it, i) => {
      const svc = it.serviceName ? ` | stampa: ${it.serviceName}` : '';
      doc.text(`${i + 1}. ${it.productName} (${it.quantity} kom) | boja: ${it.color}${svc}`);
      doc.text(`     jed. cena ${money(it.unitPrice)}  ->  ${money(it.totalPrice)}`, { indent: 10 });
      doc.moveDown(0.2);
    });

    doc.moveDown(0.8);
    doc.fontSize(13).text(`UKUPNO: ${money(invoice.total)}`, { align: 'right' });
    doc.moveDown(2).fontSize(8).fillColor('#777')
       .text('Dokument je generisan automatski od strane sistema Printing House.', { align: 'center' });
  });
}

async function generateTenderReportPDF(tender, winnerBid) {
  return buildToBuffer(doc => {
    header(doc, `Izveštaj o javnoj nabavci ${tender.tenderNumber}`);
    doc.fontSize(10);
    doc.text(`Naručilac: ${tender.clientName}`);
    doc.text(`Otvorena: ${new Date(tender.openedAt).toLocaleString('sr-RS')}`);
    doc.text(`Zatvorena: ${new Date(tender.closesAt).toLocaleString('sr-RS')}`);
    doc.moveDown(0.8);

    doc.fontSize(11).text('Tražene stavke:', { underline: true });
    doc.fontSize(10).moveDown(0.3);
    tender.items.forEach((it, i) =>
      doc.text(`${i + 1}. ${it.productName} - ${it.quantity} kom${it.serviceName ? ' | ' + it.serviceName : ''}`));

    doc.moveDown(0.8).fontSize(11).text('Pristigle ponude:', { underline: true });
    doc.fontSize(10).moveDown(0.3);
    if (!tender.bids.length) doc.text('Nije pristigla nijedna ponuda.');
    [...tender.bids].sort((a, b) => a.total - b.total).forEach((b, i) => {
      const win = winnerBid && String(b._id) === String(winnerBid._id);
      doc.fillColor(win ? '#0a7d29' : '#000')
         .text(`${i + 1}. ${b.printerName} - ${money(b.total)}${win ? '   <-- IZABRANA PONUDA' : ''}`);
    });
    doc.fillColor('#000').moveDown(1);
    doc.fontSize(12).text(winnerBid
      ? `Nabavku je dobila štamparija: ${winnerBid.printerName} sa iznosom ${money(winnerBid.total)}.`
      : 'Nabavka nije realizovana - nema validnih ponuda.');
  });
}

function saveBuffer(buffer, filename) {
  const full = path.join(OUT_DIR, filename);
  fs.writeFileSync(full, buffer);
  return `/uploads/pdf/${filename}`;
}

module.exports = { generateInvoicePDF, generateTenderReportPDF, saveBuffer, OUT_DIR };
