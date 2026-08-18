const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  printer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  color:       { type: String, default: 'bela' },
  serviceId:   { type: mongoose.Schema.Types.ObjectId },
  serviceName: { type: String, default: '' },
  unitPrice:   { type: Number, required: true },   // cena proizvoda + dodatak usluge
  totalPrice:  { type: Number, required: true },
  customText:  { type: String, default: '' },
  customImage: { type: String, default: '' },      // fajl otpremljen u pripremi proizvoda
  previewX:    { type: Number, default: 50 },      // % pozicija preko slike proizvoda
  previewY:    { type: Number, default: 50 }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
