const mongoose = require('mongoose');

// Usluga = specijalizovani tip stampe / preslikaca koji povecava cenu po komadu
const serviceSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },   // npr. "Digitalna FLEKS stampa"
  maxWidth:   { type: Number, default: 0 },                   // mm
  maxHeight:  { type: Number, default: 0 },                   // mm
  extraPrice: { type: Number, required: true, default: 0 }    // dodatna cena po komadu (RSD)
}, { _id: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },       // jedinicna cena
  quantity:    { type: Number, required: true, min: 0, default: 0 },
  colors:      { type: [String], default: ['bela'] },

  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId },
  subcategoryName: { type: String },

  printer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  mainImage: { type: String, default: 'default_product.jpg' },
  images:    { type: [String], default: [] },                  // najvise 3 thumbnail-a

  services:  [serviceSchema],

  likes:    { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  active:   { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
