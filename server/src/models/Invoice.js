const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../config/constants');

const invoiceItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true },
  color:       { type: String, default: 'bela' },
  serviceName: { type: String, default: '' },
  unitPrice:   { type: Number, required: true },
  totalPrice:  { type: Number, required: true },
  customText:  { type: String, default: '' },
  customImage: { type: String, default: '' },
  itemStatus:  { type: String, default: ORDER_STATUS.ORDERED }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },  // ID fakture (citljiv)
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  printer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  printerName: { type: String, required: true },
  city:        { type: String, default: '' },
  items:       [invoiceItemSchema],
  total:       { type: Number, required: true },
  status:      { type: String, default: ORDER_STATUS.ORDERED },
  paid:        { type: Boolean, default: false },
  paymentRef:  { type: String, default: '' },
  tender:      { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
  orderedAt:   { type: Date, default: Date.now },
  receivedAt:  { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
