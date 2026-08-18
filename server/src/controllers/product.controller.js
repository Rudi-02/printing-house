const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { ROLES, USER_STATUS } = require('../config/constants');

// ---------- javna pretraga ----------
exports.search = async (req, res, next) => {
  try {
    const { name = '', category = '', sort = 'name', dir = 'asc' } = req.query;
    const filter = { active: true, quantity: { $gt: 0 } };
    if (name.trim()) filter.name = { $regex: name.trim(), $options: 'i' };
    if (category) filter.category = category;

    const sortObj = {};
    sortObj[['name', 'price', 'likes'].includes(sort) ? sort : 'name'] = dir === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('printer', 'institutionName city username')
      .populate('category', 'name')
      .sort(sortObj);

    res.json(products.map(p => ({
      _id: p._id, name: p.name, price: p.price, quantity: p.quantity,
      mainImage: p.mainImage, likes: p.likes, dislikes: p.dislikes,
      categoryName: p.category ? p.category.name : '',
      subcategoryName: p.subcategoryName || '',
      printerName: p.printer ? (p.printer.institutionName || p.printer.username) : '',
      city: p.printer ? p.printer.city : ''
    })));
  } catch (e) { next(e); }
};

exports.publicStats = async (_req, res, next) => {
  try {
    const printersCount = await User.countDocuments({ role: ROLES.PRINTER, status: USER_STATUS.APPROVED });
    const top = await Product.find({ active: true })
      .sort({ likes: -1 }).limit(5)
      .populate('printer', 'institutionName city username');
    res.json({
      printersCount,
      topProducts: top.map(p => ({
        _id: p._id, name: p.name, likes: p.likes, dislikes: p.dislikes, mainImage: p.mainImage,
        printerName: p.printer ? (p.printer.institutionName || p.printer.username) : '',
        city: p.printer ? p.printer.city : ''
      }))
    });
  } catch (e) { next(e); }
};

// detalji - prosireni podaci samo za prijavljene klijente
exports.details = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id)
      .populate('printer', 'institutionName city address username lat lng')
      .populate('category', 'name');
    if (!p) return res.status(404).json({ message: 'Proizvod nije pronađen.' });

    const comments = await Comment.find({ product: p._id }).sort({ createdAt: -1 }).limit(5);

    const base = {
      _id: p._id, name: p.name, likes: p.likes, dislikes: p.dislikes,
      mainImage: p.mainImage, images: p.images,
      categoryName: p.category ? p.category.name : '',
      subcategoryName: p.subcategoryName || '',
      printerId: p.printer ? p.printer._id : null,
      printerName: p.printer ? (p.printer.institutionName || p.printer.username) : '',
      city: p.printer ? p.printer.city : '',
      comments: comments.map(c => ({
        _id: c._id, username: c.username, text: c.text,
        createdAt: c.createdAt, reaction: c.reaction,
        mine: req.user ? String(c.author) === String(req.user._id) : false
      }))
    };

    const isClient = req.user && [ROLES.INDIVIDUAL, ROLES.LEGAL].includes(req.user.role);
    if (!isClient) return res.json({ ...base, extended: false });

    res.json({
      ...base, extended: true,
      description: p.description, price: p.price, quantity: p.quantity,
      colors: p.colors && p.colors.length ? p.colors : ['bela'],
      services: p.services,
      address: p.printer ? p.printer.address : '',
      lat: p.printer ? p.printer.lat : null,
      lng: p.printer ? p.printer.lng : null
    });
  } catch (e) { next(e); }
};

// ---------- stampar ----------
exports.myProducts = async (req, res, next) => {
  try {
    const list = await Product.find({ printer: req.user._id }).populate('category', 'name').sort('name');
    res.json(list);
  } catch (e) { next(e); }
};

function parseServices(raw) {
  if (!raw) return [];
  const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return arr.map(s => ({
    name: s.name,
    maxWidth: Number(s.maxWidth || 0),
    maxHeight: Number(s.maxHeight || 0),
    extraPrice: Number(s.extraPrice || 0)
  }));
}

exports.create = async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name || !b.price || !b.category)
      return res.status(400).json({ message: 'Naziv, cena i kategorija su obavezni.' });
    if (Number(b.price) < 0 || Number(b.quantity || 0) < 0)
      return res.status(400).json({ message: 'Cena i količina ne mogu biti negativni.' });

    const cat = await Category.findById(b.category);
    if (!cat) return res.status(400).json({ message: 'Kategorija ne postoji.' });

    let subName = '';
    if (b.subcategoryId) {
      const sub = cat.subcategories.id(b.subcategoryId);
      if (!sub) return res.status(400).json({ message: 'Potkategorija ne postoji.' });
      subName = sub.name;
    }

    const files = req.files || {};
    const main = files.mainImage ? files.mainImage[0].filename : 'default_product.jpg';
    const gallery = (files.images || []).slice(0, 3).map(f => f.filename);

    const product = await Product.create({
      name: b.name.trim(),
      description: b.description || '',
      price: Number(b.price),
      quantity: Number(b.quantity || 0),
      colors: b.colors ? String(b.colors).split(',').map(c => c.trim()).filter(Boolean) : ['bela'],
      category: cat._id,
      subcategoryId: b.subcategoryId || undefined,
      subcategoryName: subName,
      printer: req.user._id,
      mainImage: main,
      images: gallery,
      services: parseServices(b.services)
    });
    res.status(201).json(product);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, printer: req.user._id });
    if (!p) return res.status(404).json({ message: 'Proizvod nije pronađen.' });
    const b = req.body;

    if (b.name) p.name = b.name;
    if (b.description !== undefined) p.description = b.description;
    if (b.price !== undefined) p.price = Number(b.price);
    if (b.quantity !== undefined) p.quantity = Math.max(0, Number(b.quantity));
    if (b.colors) p.colors = String(b.colors).split(',').map(c => c.trim()).filter(Boolean);
    if (b.services) p.services = parseServices(b.services);
    if (b.active !== undefined) p.active = b.active === 'true' || b.active === true;

    const files = req.files || {};
    if (files.mainImage) p.mainImage = files.mainImage[0].filename;
    if (files.images) p.images = files.images.slice(0, 3).map(f => f.filename);

    await p.save();
    res.json({ message: 'Proizvod je ažuriran.', product: p });
  } catch (e) { next(e); }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    const qty = Number(req.body.quantity);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ message: 'Količina nije ispravna.' });
    const p = await Product.findOneAndUpdate(
      { _id: req.params.id, printer: req.user._id }, { quantity: qty }, { new: true });
    if (!p) return res.status(404).json({ message: 'Proizvod nije pronađen.' });
    res.json({ message: 'Količina je ažurirana.', product: p });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const p = await Product.findOneAndDelete({ _id: req.params.id, printer: req.user._id });
    if (!p) return res.status(404).json({ message: 'Proizvod nije pronađen.' });
    res.json({ message: 'Proizvod je obrisan.' });
  } catch (e) { next(e); }
};

// ---------- uvoz lager liste iz JSON fajla ----------
exports.importJson = async (req, res, next) => {
  try {
    let payload;
    if (req.file) {
      payload = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
      fs.unlink(req.file.path, () => {});
    } else if (req.body && req.body.products) {
      payload = req.body;
    } else {
      return res.status(400).json({ message: 'Nije poslat JSON fajl.' });
    }

    const items = payload.products || payload.proizvodi || [];
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ message: 'JSON ne sadrži listu proizvoda.' });

    const created = [], skipped = [];
    for (const it of items) {
      const catName = it.category || it.kategorija;
      const cat = await Category.findOne({ name: new RegExp(`^${catName}$`, 'i') });
      if (!cat) { skipped.push({ name: it.name, reason: `Kategorija "${catName}" ne postoji.` }); continue; }

      let subId, subName = '';
      const subRaw = it.subcategory || it.potkategorija;
      if (subRaw) {
        const sub = cat.subcategories.find(s => s.name.toLowerCase() === String(subRaw).toLowerCase());
        if (sub) { subId = sub._id; subName = sub.name; }
      }

      const p = await Product.create({
        name: it.name || it.naziv,
        description: it.description || it.opis || '',
        price: Number(it.price || it.cena || 0),
        quantity: Number(it.quantity || it.kolicina || 0),
        colors: it.colors || it.boje || ['bela'],
        category: cat._id, subcategoryId: subId, subcategoryName: subName,
        printer: req.user._id,
        services: (it.services || it.usluge || []).map(s => ({
          name: s.name || s.naziv,
          maxWidth: Number(s.maxWidth || s.maxSirina || 0),
          maxHeight: Number(s.maxHeight || s.maxVisina || 0),
          extraPrice: Number(s.extraPrice || s.dodatnaCena || 0)
        }))
      });
      created.push({ _id: p._id, name: p.name });
    }
    res.status(201).json({
      message: `Uvezeno ${created.length} proizvoda. U sledećem koraku dodajte slike.`,
      created, skipped
    });
  } catch (e) {
    if (e instanceof SyntaxError)
      return res.status(400).json({ message: 'JSON fajl nije ispravno formatiran.' });
    next(e);
  }
};

// drugi korak uvoza - dodavanje slika za vec kreiran proizvod
exports.uploadImages = async (req, res, next) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, printer: req.user._id });
    if (!p) return res.status(404).json({ message: 'Proizvod nije pronađen.' });
    const files = req.files || {};
    if (files.mainImage) p.mainImage = files.mainImage[0].filename;
    if (files.images) p.images = files.images.slice(0, 3).map(f => f.filename);
    await p.save();
    res.json({ message: 'Slike su dodate.', product: p });
  } catch (e) { next(e); }
};
