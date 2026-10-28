require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://app.sandbox.midtrans.com', 'https://app.midtrans.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    }
  }
}));
app.use(morgan('dev'));
app.use(cors({ origin: process.env.APP_BASE_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, '../database/sessions');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({
    path: SESSION_DIR,
    ttl: 8 * 60 * 60,       // 8 hours in seconds
    retries: 1,
    logFn: () => {}          // silence verbose logs
  }),
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  },
  name: 'pvfm.sid'
}));

// ── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Auth Middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/');
};

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/transactions', requireAuth, require('./routes/transactions'));
app.use('/api/projects', requireAuth, require('./routes/projects'));
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/invoices', requireAuth, require('./routes/invoices'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/categories', requireAuth, require('./routes/categories'));

// Midtrans webhook — no auth (verified by signature)
app.use('/api/payment/notification', require('./routes/paymentNotification'));

// ── Public config endpoint — exposes only client-safe values ─────────────────
app.get('/api/config', (req, res) => {
  res.json({
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    appName: 'FinancePhoto'
  });
});

// ── SPA Fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 Photography & Videography Finance Manager`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Midtrans mode: ${process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'PRODUCTION' : 'SANDBOX'}\n`);
  });
}

startServer().catch(err => { console.error('Failed to start server:', err); process.exit(1); });

module.exports = app;

