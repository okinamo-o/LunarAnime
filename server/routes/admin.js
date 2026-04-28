const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Watchlist = require('../models/Watchlist');
const Rating = require('../models/Rating');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', protect, requireAdmin, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const watchlistCount = await Watchlist.countDocuments();
    const ratingCount = await Rating.countDocuments();

    res.json({
      success: true,
      data: {
        userCount,
        watchlistCount,
        ratingCount
      }
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ message: 'Failed to fetch admin stats', error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
      
    const total = await User.countDocuments();
    
    res.json({
      success: true,
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Admin Users Error:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete another admin' });
    }

    await User.findByIdAndDelete(req.params.id);
    await Watchlist.deleteMany({ user: req.params.id });
    await Rating.deleteMany({ user: req.params.id });
    
    res.json({ success: true, message: 'User and their data deleted successfully' });
  } catch (err) {
    console.error('Admin Delete User Error:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});
// ⚠️ TEMPORARY: One-time admin setup — REMOVE after use
router.get('/setup-temp-admin', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: 'louayhamdi438@gmail.com' },
      { role: 'admin' },
      { new: true }
    );
    if (user) {
      res.json({ success: true, message: `✅ ${user.username} is now an admin!` });
    } else {
      res.json({ success: false, message: '❌ User not found with that email' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
