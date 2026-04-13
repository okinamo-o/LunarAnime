const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  animeId: { type: String, required: true },
  rating: { type: Number, min: 0, max: 10, required: true },
  createdAt: { type: Date, default: Date.now }
});

ratingSchema.index({ userId: 1, animeId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
