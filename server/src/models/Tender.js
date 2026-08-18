const mongoose = require('mongoose');
const { TENDER_STATUS } = require('../config/constants');

const tenderItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true },
  color:       { type: String, default: 'bela' },
  serviceName: { type: String, default: '' },
  customText:  { type: String, default: '' },
  customImage: { type: String, default: '' }
}, { _id: true });

const bidLineSchema = new mongoose.Schema({
  tenderItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  unitPrice:    { type: Number, required: true },
  available:    { type: Boolean, default: true }
}, { _id: false });

const bidSchema = new mongoose.Schema({
  printer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  printerName: { type: String, required: true },
  lines:       [bidLineSchema],
  total:       { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
}, { _id: true });

const tenderSchema = new mongoose.Schema({
  tenderNumber: { type: String, required: true, unique: true },
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientName:   { type: String, required: true },
  items:        [tenderItemSchema],
  openedAt:     { type: Date, default: Date.now },
  closesAt:     { type: Date, required: true },
  status:       { type: String, enum: Object.values(TENDER_STATUS), default: TENDER_STATUS.OPEN },
  bids:         [bidSchema],
  winnerBidId:  { type: mongoose.Schema.Types.ObjectId },
  winnerPrinter:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoice:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  reportFile:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Tender', tenderSchema);
