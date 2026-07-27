require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const locationsRouter = require('./routes/location');
const donorRoutes = require('./routes/donor');
const adminRoutes = require('./routes/admin');
const donorController = require('./controllers/donorController');
const { protect } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// ---------------------- Security middleware ----------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // static HTML loads CDN fonts/icons
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser tools (no Origin) and same-origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) {
        // Dev default: allow all when CORS_ORIGINS unset
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Rate limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP attempts, please try again later.' },
});

const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down.' },
});

app.use('/api/', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/donors/register', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/auth/forgot-password', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);

// ---------------------- API routes ----------------------
app.use('/api/locations', locationsRouter);
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is healthy!' });
});

// Authenticated recent requests (dashboard)
app.get('/api/requests', protect, donorController.listRequests);

// ---------------------- Static files ----------------------
app.use('/HTML', express.static(path.join(__dirname, '../client/HTML')));
app.use('/CSS', express.static(path.join(__dirname, '../client/CSS')));
app.use('/SCRIPT', express.static(path.join(__dirname, '../client/SCRIPT')));
app.use('/assets', express.static(path.join(__dirname, '../client/assets')));
app.use(express.static(path.join(__dirname, '../client')));

// ---------------------- Frontend routes ----------------------
app.get('/', (req, res) => {
  res.redirect(301, '/HTML/index.html');
});

// 404 for unknown API; redirect other unknown paths to home
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found' });
  }
  if (
    !req.path.startsWith('/HTML/') &&
    !req.path.startsWith('/CSS/') &&
    !req.path.startsWith('/SCRIPT/') &&
    !req.path.startsWith('/assets/')
  ) {
    return res.redirect(301, '/HTML/index.html');
  }
  res.status(404).send('404 - Not Found');
});

// ---------------------- Start ----------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
