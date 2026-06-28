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
    const existingItem = watchlist.items.find(i => i.animeId.toString() === animeId.toString());
    
    if (existingItem) {
      if (existingItem.isSaved) {
        return res.status(400).json({ message: 'Already in watchlist' });
      } else {
        existingItem.isSaved = true;
      }
    } else {
      watchlist.items.push({
        animeId, mediaType: 'anime', title, posterPath, backdropPath, voteAverage, releaseDate,
        order: watchlist.items.length,
        isSaved: true
      });
    }
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

    const item = watchlist.items.find(i => i.animeId.toString() === req.params.animeId);
    if (item) {
      if (item.watchedEpisodesList && item.watchedEpisodesList.length > 0) {
        // Keep it for watch history, just unsave it
        item.isSaved = false;
      } else {
        // No watch history, safe to completely remove
        watchlist.items = watchlist.items.filter(i => i.animeId.toString() !== req.params.animeId);
      }
      await watchlist.save();
    }
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
      // Auto-add if not in list (for watch history only)
      item = {
        animeId: req.params.animeId,
        mediaType: 'anime',
        title: title || 'Unknown Title',
        posterPath,
        backdropPath,
        voteAverage,
        releaseDate,
        order: watchlist.items.length,
        isSaved: false // Crucial: don't mix into manually saved watchlist!
      };
      watchlist.items.push(item);
      item = watchlist.items[watchlist.items.length - 1];
    }

    if (lastSeason !== undefined) item.lastSeason = lastSeason;
    if (lastEpisode !== undefined) {
      const epNum = Number(lastEpisode);
      item.lastEpisode = epNum;
      
      // Initialize if null
      if (!item.watchedEpisodesList) item.watchedEpisodesList = [];
      
      // Deduplicate existing entries (self-healing for any previous bugs)
      let uniqueEps = [...new Set(item.watchedEpisodesList.map(Number))];
      
      // Add new episode if not present
      if (!uniqueEps.includes(epNum)) {
        uniqueEps.push(epNum);
      }
      
      item.watchedEpisodesList = uniqueEps;
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
