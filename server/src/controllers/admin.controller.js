const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Rating = require('../models/Rating');
const { ROLES, USER_STATUS, ORDER_STATUS } = require('../config/constants');
const { sendMail } = require('../utils/mailer');

// ---------- upravljanje korisnicima ----------
exports.listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users.map(u => u.toPublic()));
  } catch (e) { next(e); }
};

exports.pendingUsers = async (_req, res, next) => {
  try {
    const users = await User.find({ status: USER_STATUS.PENDING }).sort({ createdAt: 1 });
    res.json(users.map(u => u.toPublic()));
  } catch (e) { next(e); }
};

exports.approveUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    u.status = USER_STATUS.APPROVED;
    u.rejectionReason = undefined;
    await u.save();
    await sendMail({
      to: u.email, subject: 'Vaš nalog je odobren - Printing House',
      html: `<p>Poštovani ${u.firstName},</p><p>Vaš zahtev za registraciju je <b>odobren</b>. Možete se prijaviti u sistem.</p>`
    });
    res.json({ message: 'Zahtev je prihvaćen.', user: u.toPublic() });
  } catch (e) { next(e); }
};

exports.rejectUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    u.status = USER_STATUS.REJECTED;
    u.rejectionReason = req.body.reason || '';
    await u.save();
    await sendMail({
      to: u.email, subject: 'Vaš zahtev za registraciju - Printing House',
      html: `<p>Poštovani ${u.firstName},</p><p>Vaš zahtev za registraciju je <b>odbijen</b>.</p>
             ${u.rejectionReason ? `<p>Razlog: ${u.rejectionReason}</p>` : ''}`
    });
    res.json({ message: 'Zahtev je odbijen.', user: u.toPublic() });
  } catch (e) { next(e); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    const allowed = ['firstName', 'lastName', 'phone', 'email', 'institutionName',
                     'address', 'city', 'companyNumber', 'pib', 'status'];
    for (const k of allowed) if (req.body[k] !== undefined) u[k] = req.body[k];
    if (req.body.password) u.password = req.body.password;  // hash-uje se u pre('save')
    await u.save();
    res.json({ message: 'Korisnik je ažuriran.', user: u.toPublic() });
  } catch (e) { next(e); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id))
      return res.status(400).json({ message: 'Ne možete obrisati sopstveni nalog.' });
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    if (u.role === ROLES.PRINTER) await Product.deleteMany({ printer: u._id });
    res.json({ message: 'Korisnik je obrisan.' });
  } catch (e) { next(e); }
};

// ---------- statistike ----------

// 1) bar grafikon: stamparije sa najvecim prometom u poslednjem kvartalu
exports.revenueByPrinter = async (_req, res, next) => {
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const rows = await Invoice.aggregate([
      { $match: { orderedAt: { $gte: from } } },
      { $group: { _id: '$printer', printerName: { $first: '$printerName' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } }
    ]);
    res.json(rows.map(r => ({ printerName: r.printerName, revenue: r.revenue, orders: r.orders })));
  } catch (e) { next(e); }
};

// 2) pie grafikon: najcesce narucivani proizvodi u poslednjih mesec dana
exports.topProducts = async (_req, res, next) => {
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const rows = await Invoice.aggregate([
      { $match: { orderedAt: { $gte: from } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);
    const total = rows.reduce((s, r) => s + r.quantity, 0) || 1;
    res.json(rows.map(r => ({
      productName: r._id, quantity: r.quantity,
      percentage: Number(((r.quantity / total) * 100).toFixed(2))
    })));
  } catch (e) { next(e); }
};

// 3) linijski grafikon: kretanje ocene proizvoda kroz vreme (kumulativni skor)
exports.ratingTrend = async (_req, res, next) => {
  try {
    const ratings = await Rating.find().populate('product', 'name').sort({ createdAt: 1 });
    const series = {};
    const running = {};
    for (const r of ratings) {
      if (!r.product) continue;
      const key = r.product.name;
      if (!series[key]) { series[key] = []; running[key] = 0; }
      running[key] += r.value === 'LIKE' ? 1 : -1;
      series[key].push({
        date: r.createdAt.toISOString().slice(0, 10),
        score: running[key]
      });
    }
    res.json(Object.entries(series).map(([productName, points]) => ({ productName, points })));
  } catch (e) { next(e); }
};

exports.overview = async (_req, res, next) => {
  try {
    res.json({
      users: await User.countDocuments(),
      printers: await User.countDocuments({ role: ROLES.PRINTER, status: USER_STATUS.APPROVED }),
      pending: await User.countDocuments({ status: USER_STATUS.PENDING }),
      products: await Product.countDocuments(),
      invoices: await Invoice.countDocuments(),
      received: await Invoice.countDocuments({ status: ORDER_STATUS.RECEIVED })
    });
  } catch (e) { next(e); }
};
