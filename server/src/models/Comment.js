const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:{ type: String, required: true },
  text:    { type: String, required: true, trim: true },
  reaction:{ type: String, enum: ['LIKE', 'DISLIKE', 'NONE'], default: 'NONE' }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
