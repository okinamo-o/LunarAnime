const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const watchlistRoutes = require('./routes/watchlist');
const ratingRoutes = require('./routes/ratings');
const proxyRoutes = require('./routes/proxy');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// trust proxy is required for express-rate-limit on Render
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean).flatMap(o => o.split(',')).map(o => o.trim().replace(/\/$/, ""));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Clean current origin for comparison
    const cleanOrigin = origin.replace(/\/$/, "");
    
    if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Set security HTTP headers
app.use(helmet());

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size

// Cookie parser for secure httpOnly JWT tokens
app.use(cookieParser());

// Sanitize data to prevent NoSQL Injection
app.use(mongoSanitize());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lunaranime')
  .then(() => console.log('✅ MongoDB connected to lunaranime'))
  .catch(err => {
    console.error('❌ FATAL: MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Reconnection handling
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Rate limiter for proxy routes to prevent abuse (SEC-010)
const proxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/proxy', proxyLimiter, proxyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const status = dbState === 1 ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({ status, database: dbStatus });
});

app.listen(PORT, () => {
  console.log(`🚀 LunarAnime API running on port ${PORT}`);
});
