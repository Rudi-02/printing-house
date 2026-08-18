const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, trim: true, index: true },
  password:   { type: String, required: true },          // uvek kriptovana (bcrypt)
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  phone:      { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  profileImage: { type: String, default: 'default_profile_image.jpg' },

  role:   { type: String, enum: Object.values(ROLES), required: true },
  status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.PENDING },

  // samo za LEGAL i PRINTER
  institutionName: { type: String, trim: true },
  address:         { type: String, trim: true },
  city:            { type: String, trim: true },
  lat:             { type: Number },
  lng:             { type: Number },
  companyNumber:   { type: String, trim: true, sparse: true, unique: true }, // maticni broj (8)
  pib:             { type: String, trim: true, sparse: true, unique: true }, // PIB (9)

  rejectionReason: { type: String }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function () {
  const o = this.toObject();
  delete o.password;
  return o;
};

module.exports = mongoose.model('User', userSchema);
