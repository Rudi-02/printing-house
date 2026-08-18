const Category = require('../models/Category');
const Product = require('../models/Product');

exports.list = async (_req, res, next) => {
  try { res.json(await Category.find().sort('name')); } catch (e) { next(e); }
};

// samo kategorije koje imaju bar jedan aktivan proizvod na stanju
exports.listActive = async (_req, res, next) => {
  try {
    const ids = await Product.distinct('category', { active: true, quantity: { $gt: 0 } });
    res.json(await Category.find({ _id: { $in: ids } }).sort('name'));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Naziv kategorije je obavezan.' });
    if (await Category.findOne({ name: name.trim() }))
      return res.status(409).json({ message: 'Kategorija sa tim nazivom već postoji.' });
    res.status(201).json(await Category.create({ name: name.trim(), subcategories: [] }));
  } catch (e) { next(e); }
};

exports.addSubcategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Naziv potkategorije je obavezan.' });
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Kategorija nije pronađena.' });
    if (cat.subcategories.some(s => s.name.toLowerCase() === name.trim().toLowerCase()))
      return res.status(409).json({ message: 'Potkategorija već postoji.' });
    cat.subcategories.push({ name: name.trim() });
    await cat.save();
    res.status(201).json(cat);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!cat) return res.status(404).json({ message: 'Kategorija nije pronađena.' });
    res.json(cat);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    if (await Product.countDocuments({ category: req.params.id }))
      return res.status(400).json({ message: 'Kategorija se koristi za postojeće proizvode.' });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kategorija je obrisana.' });
  } catch (e) { next(e); }
};
