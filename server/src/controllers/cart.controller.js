const Cart = require('../models/Cart');
const Product = require('../models/Product');

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    await cart.populate('printer');
    const printers = {};
    for (const it of cart.items) {
      const key = String(it.printer);
      if (!printers[key]) {
        const User = require('../models/User');
        const pr = await User.findById(it.printer);
        printers[key] = {
          printerId: key,
          printerName: pr ? (pr.institutionName || pr.username) : 'Nepoznata štamparija',
          city: pr ? pr.city : '', items: [], subtotal: 0
        };
      }
      printers[key].items.push(it);
      printers[key].subtotal += it.totalPrice;
    }
    const groups = Object.values(printers);
    res.json({ groups, total: groups.reduce((s, g) => s + g.subtotal, 0) });
  } catch (e) { next(e); }
};

exports.addItem = async (req, res, next) => {
  try {
    const b = req.body;
    const product = await Product.findById(b.productId);
    if (!product || !product.active)
      return res.status(404).json({ message: 'Proizvod nije pronađen.' });

    const qty = Number(b.quantity);
    if (!qty || qty < 1) return res.status(400).json({ message: 'Količina mora biti bar 1.' });
    if (qty > product.quantity)
      return res.status(400).json({ message: 'Nema dovoljno proizvoda trenutno na stanju' });

    let serviceName = '', extra = 0, serviceId;
    if (b.serviceId) {
      const svc = product.services.id(b.serviceId);
      if (!svc) return res.status(400).json({ message: 'Izabrana vrsta štampe ne postoji.' });
      serviceName = svc.name; extra = svc.extraPrice; serviceId = svc._id;
    }

    const unitPrice = product.price + extra;
    const cart = await getOrCreateCart(req.user._id);
    cart.items.push({
      product: product._id, printer: product.printer, productName: product.name,
      quantity: qty, color: b.color || 'bela',
      serviceId, serviceName, unitPrice, totalPrice: unitPrice * qty,
      customText: b.customText || '',
      customImage: req.file ? req.file.filename : (b.customImage || ''),
      previewX: Number(b.previewX || 50), previewY: Number(b.previewY || 50)
    });
    await cart.save();
    res.status(201).json({ message: 'Proizvod je dodat u e-korpu.' });
  } catch (e) { next(e); }
};

exports.removeItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Stavka nije pronađena.' });
    item.deleteOne();
    await cart.save();
    res.json({ message: 'Stavka je uklonjena iz e-korpe.' });
  } catch (e) { next(e); }
};

exports.clear = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.json({ message: 'E-korpa je ispražnjena.' });
  } catch (e) { next(e); }
};

module.exports.getOrCreateCart = getOrCreateCart;
