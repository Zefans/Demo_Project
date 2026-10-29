require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Initialise DB (runs schema + seed)
const db = require('./db');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'dev-secret-change-me');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '../data');

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required in production.');
}
fs.mkdirSync(dataDir, { recursive: true });
if (isProduction) app.set('trust proxy', 1);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

const SQLiteStore = require('connect-sqlite3')(session);
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: dataDir }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  },
}));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/transactions', require('./routes/transactions'));

// ── Static Frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// Payment result pages (public)
app.get('/payment/:result', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/payment-result.html'));
});

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀  Server running at http://localhost:${PORT}`);
    console.log(`📊  Finance Manager ready`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

