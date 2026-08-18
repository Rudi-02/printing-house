const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const { getOrCreateCart } = require('./cart.controller');
const { ORDER_STATUS, ROLES } = require('../config/constants');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendMail } = require('../utils/mailer');

async function nextInvoiceNumber() {
  const count = await Invoice.countDocuments();
  return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

// POTVRDI iz e-korpe: jedna faktura po stampariji
exports.checkout = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    if (!cart.items.length) return res.status(400).json({ message: 'E-korpa je prazna.' });

    // provera zaliha pre formiranja faktura
    for (const it of cart.items) {
      const p = await Product.findById(it.product);
      if (!p || p.quantity < it.quantity)
        return res.status(400).json({ message: `Nema dovoljno proizvoda trenutno na stanju (${it.productName}).` });
    }

    const byPrinter = new Map();
    for (const it of cart.items) {
      const key = String(it.printer);
      if (!byPrinter.has(key)) byPrinter.set(key, []);
      byPrinter.get(key).push(it);
    }

    const invoices = [];
    for (const [printerId, items] of byPrinter) {
      const printer = await User.findById(printerId);
      const total = items.reduce((s, i) => s + i.totalPrice, 0);
      const invoice = await Invoice.create({
        invoiceNumber: await nextInvoiceNumber(),
        client: req.user._id,
        printer: printerId,
        printerName: printer ? (printer.institutionName || printer.username) : 'Štamparija',
        city: printer ? printer.city : '',
        items: items.map(i => ({
          product: i.product, productName: i.productName, quantity: i.quantity,
          color: i.color, serviceName: i.serviceName, unitPrice: i.unitPrice,
          totalPrice: i.totalPrice, customText: i.customText, customImage: i.customImage,
          itemStatus: ORDER_STATUS.ORDERED
        })),
        total, status: ORDER_STATUS.ORDERED
      });

      for (const i of items)
        await Product.findByIdAndUpdate(i.product, { $inc: { quantity: -i.quantity } });

      invoices.push(invoice);
    }

    cart.items = [];
    await cart.save();

    // PDF fakture na i-mejl klijenta
    const attachments = [];
    for (const inv of invoices) {
      const buf = await generateInvoicePDF(inv, req.user);
      attachments.push({ filename: `${inv.invoiceNumber}.pdf`, content: buf });
    }
    await sendMail({
      to: req.user.email,
      subject: `Vaše fakture (${invoices.length}) - Printing House`,
      html: `<p>Poštovani ${req.user.firstName},</p>
             <p>U prilogu se nalaze fakture za Vašu narudžbinu:</p>
             <ul>${invoices.map(i => `<li>${i.invoiceNumber} - ${i.printerName} - ${i.total} RSD</li>`).join('')}</ul>`,
      attachments
    });

    res.status(201).json({
      message: `Formirano je ${invoices.length} faktura. PDF fakture su poslate na Vaš i-mejl.`,
      invoices
    });
  } catch (e) { next(e); }
};

exports.myInvoices = async (req, res, next) => {
  try {
    const list = await Invoice.find({ client: req.user._id }).sort({ orderedAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
};

exports.cancel = async (req, res, next) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, client: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Faktura nije pronađena.' });
    if (inv.status !== ORDER_STATUS.ORDERED)
      return res.status(400).json({ message: 'Otkazivanje je moguće samo dok je status "naručeno".' });

    for (const it of inv.items)
      await Product.findByIdAndUpdate(it.product, { $inc: { quantity: it.quantity } });

    await inv.deleteOne();
    res.json({ message: 'Narudžbina je otkazana.' });
  } catch (e) { next(e); }
};

exports.invoicePdf = async (req, res, next) => {
  try {
    const q = req.user.role === ROLES.PRINTER
      ? { _id: req.params.id, printer: req.user._id }
      : { _id: req.params.id, client: req.user._id };
    const inv = await Invoice.findOne(q);
    if (!inv) return res.status(404).json({ message: 'Faktura nije pronađena.' });
    const client = await User.findById(inv.client);
    const buf = await generateInvoicePDF(inv, client);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNumber}.pdf"`);
    res.send(buf);
  } catch (e) { next(e); }
};

// ---------- placanje (Stripe test mode / simulacija) ----------
exports.pay = async (req, res, next) => {
  try {
    const { invoiceIds, cardNumber, cvc, expiry, cardType } = req.body;
    if (!Array.isArray(invoiceIds) || !invoiceIds.length)
      return res.status(400).json({ message: 'Nije izabrana nijedna faktura.' });

    const digits = String(cardNumber || '').replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(digits)) return res.status(400).json({ message: 'Broj kartice nije ispravan.' });
    if (!/^\d{3,4}$/.test(String(cvc || ''))) return res.status(400).json({ message: 'CVC kod nije ispravan.' });
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry || '')))
      return res.status(400).json({ message: 'Datum isteka mora biti u formatu MM/GG.' });

    const [mm, yy] = String(expiry).split('/').map(Number);
    const exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
    if (exp < new Date()) return res.status(400).json({ message: 'Kartica je istekla.' });
    if (!cardType) return res.status(400).json({ message: 'Izaberite tip kartice.' });

    // Luhn provera - u test rezimu odbija ocigledno nevalidne brojeve
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    if (sum % 10 !== 0)
      return res.status(402).json({ message: 'Plaćanje nije uspelo. Proverite podatke o kartici i pokušajte ponovo.' });

    const ref = `pay_${Date.now()}`;
    const updated = [];
    for (const id of invoiceIds) {
      const inv = await Invoice.findOne({ _id: id, client: req.user._id });
      if (!inv || inv.status !== ORDER_STATUS.ORDERED) continue;
      inv.status = ORDER_STATUS.PAID;
      inv.paid = true;
      inv.paymentRef = ref;
      inv.items.forEach(i => i.itemStatus = ORDER_STATUS.PAID);
      await inv.save();
      updated.push(inv.invoiceNumber);
    }
    res.json({ message: `Plaćanje je uspešno izvršeno (${updated.join(', ')}).`, paymentRef: ref });
  } catch (e) { next(e); }
};

// ---------- stampar: promena statusa ----------
exports.printerOrders = async (req, res, next) => {
  try {
    const list = await Invoice.find({ printer: req.user._id })
      .populate('client', 'username firstName lastName institutionName city')
      .sort({ orderedAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
};

exports.advanceStatus = async (req, res, next) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, printer: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Narudžbina nije pronađena.' });

    let next_;
    if (inv.status === ORDER_STATUS.ORDERED || inv.status === ORDER_STATUS.PAID)
      next_ = ORDER_STATUS.PRINTING;
    else if (inv.status === ORDER_STATUS.PRINTING) next_ = ORDER_STATUS.DELIVERED;
    else return res.status(400).json({ message: 'Status se ne može dalje menjati od strane štamparije.' });

    inv.status = next_;
    inv.items.forEach(i => i.itemStatus = next_);
    await inv.save();
    res.json({ message: `Status je promenjen u "${next_}".`, invoice: inv });
  } catch (e) { next(e); }
};

// ---------- arhiva proizvoda (klijent) ----------
exports.archive = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      client: req.user._id,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RECEIVED] }
    }).sort({ orderedAt: -1 });

    const rows = [];
    for (const inv of invoices)
      for (const it of inv.items)
        rows.push({
          invoiceId: inv._id, invoiceNumber: inv.invoiceNumber,
          itemId: it._id, productId: it.product, productName: it.productName,
          quantity: it.quantity, printerName: inv.printerName, city: inv.city,
          orderedAt: inv.orderedAt, status: inv.status, total: it.totalPrice
        });
    res.json(rows);
  } catch (e) { next(e); }
};

exports.markReceived = async (req, res, next) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, client: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Narudžbina nije pronađena.' });
    if (inv.status !== ORDER_STATUS.DELIVERED)
      return res.status(400).json({ message: 'Samo isporučene narudžbine mogu biti označene kao primljene.' });
    inv.status = ORDER_STATUS.RECEIVED;
    inv.receivedAt = new Date();
    inv.items.forEach(i => i.itemStatus = ORDER_STATUS.RECEIVED);
    await inv.save();
    res.json({ message: 'Narudžbina je označena kao primljena.' });
  } catch (e) { next(e); }
};

// ---------- ocene i komentari ----------
exports.rateProduct = async (req, res, next) => {
  try {
    const { productId, value, text } = req.body;
    if (!['LIKE', 'DISLIKE'].includes(value))
      return res.status(400).json({ message: 'Ocena mora biti "LIKE" ili "DISLIKE".' });

    // klijent sme oceniti samo primljen proizvod
    const owned = await Invoice.findOne({
      client: req.user._id, status: ORDER_STATUS.RECEIVED, 'items.product': productId
    });
    if (!owned)
      return res.status(403).json({ message: 'Možete oceniti samo proizvode koje ste primili.' });

    const existing = await Rating.findOne({ product: productId, user: req.user._id });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Proizvod nije pronađen.' });

    if (existing) {
      if (existing.value !== value) {
        if (existing.value === 'LIKE') product.likes = Math.max(0, product.likes - 1);
        else product.dislikes = Math.max(0, product.dislikes - 1);
        if (value === 'LIKE') product.likes++; else product.dislikes++;
        existing.value = value;
        await existing.save();
      }
    } else {
      await Rating.create({ product: productId, user: req.user._id, value });
      if (value === 'LIKE') product.likes++; else product.dislikes++;
    }
    await product.save();

    if (text && text.trim())
      await Comment.create({
        product: productId, author: req.user._id, username: req.user.username,
        text: text.trim(), reaction: value
      });

    res.json({ message: 'Hvala na oceni!', likes: product.likes, dislikes: product.dislikes });
  } catch (e) { next(e); }
};
