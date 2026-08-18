const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }
}, { _id: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  subcategories: [subcategorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
