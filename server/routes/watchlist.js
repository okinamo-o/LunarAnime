const express = require('express');
const Watchlist = require('../models/Watchlist');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/watchlist — get user's watchlist
router.get('/', protect, async (req, res) => {
  try {
    let watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) watchlist = { items: [] };
    res.json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/watchlist — add item
router.post('/', protect, async (req, res) => {
  const { animeId, title, posterPath, backdropPath, voteAverage, releaseDate } = req.body;
  try {
    let watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) {
      watchlist = new Watchlist({ userId: req.user._id, items: [] });
    }
    const exists = watchlist.items.find(i => i.animeId.toString() === animeId.toString());
    if (exists) return res.status(400).json({ message: 'Already in watchlist' });

    watchlist.items.push({
      animeId, mediaType: 'anime', title, posterPath, backdropPath, voteAverage, releaseDate,
      order: watchlist.items.length
    });
    await watchlist.save();
    res.status(201).json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/watchlist/:animeId — remove item
router.delete('/:animeId', protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) return res.status(404).json({ message: 'Watchlist not found' });

    watchlist.items = watchlist.items.filter(
      i => i.animeId.toString() !== req.params.animeId
    );
    await watchlist.save();
    res.json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/watchlist/reorder — reorder items (drag-and-drop)
router.put('/reorder', protect, async (req, res) => {
  const { orderedIds } = req.body;
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) return res.status(404).json({ message: 'Watchlist not found' });

    const reordered = orderedIds.map((id, index) => {
      const item = watchlist.items.id(id);
      if (item) item.order = index;
      return item;
    }).filter(Boolean);

    watchlist.items = reordered;
    await watchlist.save();
    res.json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/watchlist/toggle-watched/:animeId
router.put('/toggle-watched/:animeId', protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) return res.status(404).json({ message: 'Watchlist not found' });

    const item = watchlist.items.find(
      i => i.animeId.toString() === req.params.animeId
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.watched = !item.watched;
    await watchlist.save();
    res.json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/watchlist/progress/:animeId — update last watched progress
router.put('/progress/:animeId', protect, async (req, res) => {
  const { lastSeason, lastEpisode, title, posterPath, backdropPath, voteAverage, releaseDate } = req.body;
  try {
    let watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) {
      watchlist = new Watchlist({ userId: req.user._id, items: [] });
    }

    let item = watchlist.items.find(
      i => i.animeId.toString() === req.params.animeId
    );
    
    if (!item) {
      // Auto-add if not in list
      item = {
        animeId: req.params.animeId,
        mediaType: 'anime',
        title: title || 'Unknown Title',
        posterPath,
        backdropPath,
        voteAverage,
        releaseDate,
        order: watchlist.items.length
      };
      watchlist.items.push(item);
      item = watchlist.items[watchlist.items.length - 1];
    }

    if (lastSeason !== undefined) item.lastSeason = lastSeason;
    if (lastEpisode !== undefined) {
      item.lastEpisode = lastEpisode;
      if (!item.watchedEpisodesList) item.watchedEpisodesList = [];
      if (!item.watchedEpisodesList.includes(lastEpisode)) {
        item.watchedEpisodesList.push(lastEpisode);
      }
    }
    if (title) item.title = title;
    if (posterPath) item.posterPath = posterPath;
    if (backdropPath) item.backdropPath = backdropPath;
    
    await watchlist.save();
    res.json(watchlist.items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
