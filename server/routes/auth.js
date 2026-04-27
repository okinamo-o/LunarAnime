const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Rate limiters to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: { message: 'عدد كبير جداً من محاولات تسجيل الدخول. حاول مرة أخرى بعد 15 دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  message: { message: 'عدد كبير جداً من محاولات إنشاء الحساب. حاول مرة أخرى لاحقاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً' });
    }
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ username, email, password });
    
    // Convert _id to string to ensure JWT compatibility
    const token = generateToken(user._id.toString());

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token
    });
  } catch (err) {
    console.error('Registration Error Details:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ 
      $or: [
        { username: username.trim() }, 
        { email: username.trim().toLowerCase() } 
      ] 
    });
    
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString())
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login Error Details:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

module.exports = router;
