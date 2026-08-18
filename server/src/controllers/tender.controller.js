const Tender = require('../models/Tender');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const User = require('../models/User');
const { getOrCreateCart } = require('./cart.controller');
const { ROLES, USER_STATUS, TENDER_STATUS, ORDER_STATUS } = require('../config/constants');
const { generateTenderReportPDF, saveBuffer } = require('../utils/pdf');
const { sendMail } = require('../utils/mailer');

async function nextTenderNumber() {
  const c = await Tender.countDocuments();
  return `JN-${new Date().getFullYear()}-${String(c + 1).padStart(4, '0')}`;
}
async function nextInvoiceNumber() {
  const c = await Invoice.countDocuments();
  return `INV-${new Date().getFullYear()}-${String(c + 1).padStart(5, '0')}`;
}

// Pravno lice: potvrda e-korpe ne pravi fakture nego raspisuje javnu nabavku
exports.openTender = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    if (!cart.items.length) return res.status(400).json({ message: 'E-korpa je prazna.' });

    const minutes = Number(process.env.TENDER_DURATION_MINUTES || 10);
    const tender = await Tender.create({
      tenderNumber: await nextTenderNumber(),
      client: req.user._id,
      clientName: req.user.institutionName || req.user.username,
      items: cart.items.map(i => ({
        productName: i.productName, quantity: i.quantity, color: i.color,
        serviceName: i.serviceName, customText: i.customText, customImage: i.customImage
      })),
      openedAt: new Date(),
      closesAt: new Date(Date.now() + minutes * 60 * 1000),
      status: TENDER_STATUS.OPEN
    });

    cart.items = [];
    await cart.save();

    const printers = await User.find({ role: ROLES.PRINTER, status: USER_STATUS.APPROVED });
    const list = tender.items.map(i => `<li>${i.productName} - ${i.quantity} kom${i.serviceName ? ' (' + i.serviceName + ')' : ''}</li>`).join('');
    for (const p of printers)
      await sendMail({
        to: p.email,
        subject: `Otvorena javna nabavka ${tender.tenderNumber} - Printing House`,
        html: `<p>Poštovani,</p>
               <p>Naručilac <b>${tender.clientName}</b> je raspisao javnu nabavku <b>${tender.tenderNumber}</b>.
               Licitacija je otvorena do <b>${tender.closesAt.toLocaleString('sr-RS')}</b>.</p>
               <p>Potrebni proizvodi:</p><ul>${list}</ul>
               <p>Ponudu možete poslati kroz sekciju „Licitacije“ u sistemu.</p>`
      });

    res.status(201).json({
      message: `Javna nabavka ${tender.tenderNumber} je raspisana. Licitacija traje ${minutes} minuta.`,
      tender
    });
  } catch (e) { next(e); }
};

// Zakljucivanje isteklih nabavki - poziva se pri prijavi/otvaranju stranice naručioca
async function closeExpiredForClient(clientId) {
  const expired = await Tender.find({
    client: clientId, status: TENDER_STATUS.OPEN, closesAt: { $lte: new Date() }
  });

  for (const tender of expired) {
    const valid = [];
    for (const bid of tender.bids) {
      let ok = true;
      for (const line of bid.lines) {
        const item = tender.items.id(line.tenderItemId);
        const product = line.product ? await Product.findById(line.product) : null;
        if (!line.available || !product || !item || product.quantity < item.quantity) { ok = false; break; }
      }
      if (ok) valid.push(bid);
    }

    let winner = null;
    if (valid.length) {
      winner = valid.reduce((a, b) => (b.total < a.total ? b : a));
      const printer = await User.findById(winner.printer);

      const items = [];
      for (const line of winner.lines) {
        const item = tender.items.id(line.tenderItemId);
        items.push({
          product: line.product, productName: item.productName, quantity: item.quantity,
          color: item.color, serviceName: item.serviceName,
          unitPrice: line.unitPrice, totalPrice: line.unitPrice * item.quantity,
          customText: item.customText, customImage: item.customImage,
          itemStatus: ORDER_STATUS.PRINTING
        });
        await Product.findByIdAndUpdate(line.product, { $inc: { quantity: -item.quantity } });
      }

      const invoice = await Invoice.create({
        invoiceNumber: await nextInvoiceNumber(),
        client: tender.client, printer: winner.printer,
        printerName: winner.printerName,
        city: printer ? printer.city : '',
        items, total: winner.total,
        status: ORDER_STATUS.PRINTING, tender: tender._id
      });

      tender.winnerBidId = winner._id;
      tender.winnerPrinter = winner.printer;
      tender.invoice = invoice._id;
      tender.status = TENDER_STATUS.CLOSED;
    } else {
      tender.status = TENDER_STATUS.FAILED;
    }

    const buf = await generateTenderReportPDF(tender, winner);
    tender.reportFile = saveBuffer(buf, `${tender.tenderNumber}_izvestaj.pdf`);
    await tender.save();

    const client = await User.findById(tender.client);
    if (client) await sendMail({
      to: client.email,
      subject: `Izveštaj o javnoj nabavci ${tender.tenderNumber}`,
      html: `<p>Javna nabavka <b>${tender.tenderNumber}</b> je zaključena.</p>
             <p>${winner ? `Nabavku je dobila štamparija <b>${winner.printerName}</b> sa iznosom ${winner.total} RSD.`
                          : 'Nije pristigla nijedna validna ponuda.'}</p>`,
      attachments: [{ filename: `${tender.tenderNumber}_izvestaj.pdf`, content: buf }]
    });
  }
  return expired.length;
}
exports.closeExpiredForClient = closeExpiredForClient;

exports.myTenders = async (req, res, next) => {
  try {
    await closeExpiredForClient(req.user._id);
    const list = await Tender.find({ client: req.user._id }).sort({ openedAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
};

exports.tenderReport = async (req, res, next) => {
  try {
    const t = await Tender.findOne({ _id: req.params.id, client: req.user._id });
    if (!t) return res.status(404).json({ message: 'Javna nabavka nije pronađena.' });
    const winner = t.winnerBidId ? t.bids.id(t.winnerBidId) : null;
    const buf = await generateTenderReportPDF(t, winner);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${t.tenderNumber}_izvestaj.pdf"`);
    res.send(buf);
  } catch (e) { next(e); }
};

// ---------- stampar ----------
exports.openTenders = async (req, res, next) => {
  try {
    const list = await Tender.find({ status: TENDER_STATUS.OPEN, closesAt: { $gt: new Date() } })
      .sort({ openedAt: -1 });
    res.json(list.map(t => ({
      _id: t._id, tenderNumber: t.tenderNumber, clientName: t.clientName,
      openedAt: t.openedAt, closesAt: t.closesAt, items: t.items,
      alreadyBid: t.bids.some(b => String(b.printer) === String(req.user._id))
    })));
  } catch (e) { next(e); }
};

exports.submitBid = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ message: 'Javna nabavka nije pronađena.' });
    if (tender.status !== TENDER_STATUS.OPEN || tender.closesAt <= new Date())
      return res.status(400).json({ message: 'Licitacija za ovu javnu nabavku je zatvorena.' });
    if (tender.bids.some(b => String(b.printer) === String(req.user._id)))
      return res.status(409).json({ message: 'Već ste poslali ponudu za ovu javnu nabavku.' });

    const lines = req.body.lines || [];
    if (lines.length !== tender.items.length)
      return res.status(400).json({ message: 'Ponuda mora sadržati sve tražene proizvode.' });

    let total = 0;
    const built = [];
    for (const l of lines) {
      const item = tender.items.id(l.tenderItemId);
      if (!item) return res.status(400).json({ message: 'Stavka nabavke ne postoji.' });
      const price = Number(l.unitPrice);
      if (isNaN(price) || price < 0)
        return res.status(400).json({ message: `Cena za "${item.productName}" nije ispravna.` });

      let productId = l.productId;
      if (!productId) {
        const p = await Product.findOne({
          printer: req.user._id, name: new RegExp(`^${item.productName}$`, 'i')
        });
        productId = p ? p._id : undefined;
      }
      built.push({ tenderItemId: item._id, product: productId, unitPrice: price, available: !!l.available });
      total += price * item.quantity;
    }

    tender.bids.push({
      printer: req.user._id,
      printerName: req.user.institutionName || req.user.username,
      lines: built, total
    });
    await tender.save();
    res.status(201).json({ message: `Ponuda u iznosu od ${total} RSD je poslata.`, total });
  } catch (e) { next(e); }
};

exports.myBids = async (req, res, next) => {
  try {
    const list = await Tender.find({ 'bids.printer': req.user._id }).sort({ openedAt: -1 });
    res.json(list.map(t => {
      const mine = t.bids.find(b => String(b.printer) === String(req.user._id));
      return {
        _id: t._id, tenderNumber: t.tenderNumber, clientName: t.clientName,
        status: t.status, closesAt: t.closesAt, myTotal: mine ? mine.total : 0,
        won: t.winnerPrinter && String(t.winnerPrinter) === String(req.user._id)
      };
    }));
  } catch (e) { next(e); }
};
