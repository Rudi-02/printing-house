const mongoose = require('mongoose');

// jedan zapis po (klijent, proizvod) - koristi se i za linijski grafikon ocena kroz vreme
const ratingSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  value:   { type: String, enum: ['LIKE', 'DISLIKE'], required: true }
}, { timestamps: true });

ratingSchema.index({ product: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
