const express = require('express');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/ratings/:animeId — get user's rating for a title
router.get('/:animeId', protect, async (req, res) => {
  try {
    const rating = await Rating.findOne({
      userId: req.user._id,
      animeId: req.params.animeId
    });
    res.json(rating ? { rating: rating.rating } : { rating: null });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/ratings — create or update rating
router.post('/', protect, async (req, res) => {
  const { animeId, rating } = req.body;
  try {
    const existing = await Rating.findOne({ userId: req.user._id, animeId });
    if (existing) {
      existing.rating = rating;
      await existing.save();
      return res.json(existing);
    }
    const newRating = await Rating.create({ userId: req.user._id, animeId, rating });
    res.status(201).json(newRating);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
