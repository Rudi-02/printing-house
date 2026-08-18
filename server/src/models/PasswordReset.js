const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false }
}, { timestamps: true });

// TTL indeks - dokument nestaje nakon isteka (link vazi 5 minuta)
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
