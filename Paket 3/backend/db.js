/**
 * db.js — SQLite database using sql.js (pure JS, no native build required)
 * Provides a synchronous API compatible with the route handlers.
 * Database is persisted to disk on every write transaction.
 */
require('dotenv').config();
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './database/finance.db';
const DB_DIR = path.dirname(path.resolve(DB_PATH));

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Singleton promise that resolves once DB is ready ──────────────────────
let _db = null;
let _dbReady = null;

function getDb() {
  if (_db) return _db;
  throw new Error('Database not initialized yet. Call initDb() first and await it.');
}

/**
 * Tiny synchronous-style wrapper around sql.js.
 * sql.js is synchronous by nature once initialized — only the WASM init is async.
 */
class DbWrapper {
  constructor(sqlJs) {
    this._SQL = sqlJs;
    this._inTransaction = false;
    // Load existing database file or create new one
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this._db = new sqlJs.Database(fileBuffer);
    } else {
      this._db = new sqlJs.Database();
    }
  }

  /** Persist current db state to disk (no-op when inside a transaction) */
  _save() {
    if (this._inTransaction) return; // defer until COMMIT
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  pragma(stmt) {
    try { this._db.run(`PRAGMA ${stmt}`); } catch (e) { /* ignore */ }
    return this;
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
    return this;
  }

  /**
   * prepare() returns a statement-like object with .get(), .all(), .run()
   */
  prepare(sql) {
    const self = this;
    return {
      get(...args) {
        return self._runSelect(sql, args)[0] || null;
      },
      all(...args) {
        return self._runSelect(sql, args);
      },
      run(...args) {
        return self._runMutate(sql, args);
      }
    };
  }

  _runSelect(sql, params) {
    const flatParams = params.flat(Infinity);
    const stmt = this._db.prepare(sql);
    stmt.bind(flatParams);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  _runMutate(sql, params) {
    const flatParams = params.flat(Infinity);
    this._db.run(sql, flatParams);
    const changes = this._db.getRowsModified();
    // Get lastInsertRowid via prepared statement (safe inside transactions)
    const stmt = this._db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const lastId = stmt.getAsObject().id || 0;
    stmt.free();
    this._save(); // no-op if _inTransaction
    return { lastInsertRowid: lastId, changes };
  }

  /**
   * transaction(fn) — wraps fn in BEGIN/COMMIT, saves once at end
   */
  transaction(fn) {
    const self = this;
    return function(...args) {
      if (self._inTransaction) {
        // Already inside a transaction — just run fn directly
        return fn(...args);
      }
      self._inTransaction = true;
      self._db.run('BEGIN');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        self._inTransaction = false;
        // Now actually persist to disk
        const data = self._db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
        return result;
      } catch (e) {
        self._db.run('ROLLBACK');
        self._inTransaction = false;
        throw e;
      }
    };
  }
}

// ── Schema DDL ────────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_code TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    project_type TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    location TEXT,
    total_value REAL NOT NULL DEFAULT 0,
    dp_amount REAL NOT NULL DEFAULT 0,
    dp_paid REAL NOT NULL DEFAULT 0,
    remaining_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    reference_project_id INTEGER,
    transaction_date DATE NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    online_payment_id TEXT,
    reconciled INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (reference_project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS payment_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_code TEXT UNIQUE NOT NULL,
    project_id INTEGER NOT NULL,
    payment_type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    midtrans_order_id TEXT UNIQUE,
    midtrans_transaction_id TEXT,
    midtrans_snap_token TEXT,
    midtrans_payment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at DATETIME,
    payment_method_used TEXT,
    raw_notification TEXT,
    reconciled INTEGER NOT NULL DEFAULT 0,
    reconciled_transaction_id INTEGER,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (reconciled_transaction_id) REFERENCES transactions(id)
  );

  CREATE TABLE IF NOT EXISTS payment_notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    midtrans_order_id TEXT,
    transaction_status TEXT,
    fraud_status TEXT,
    raw_payload TEXT,
    processed INTEGER DEFAULT 0,
    received_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 0
  );
`;

const DEFAULT_CATS = [
  ['Pembayaran Proyek', 'income', 'Pemasukan dari proyek klien'],
  ['DP Proyek', 'income', 'Uang muka / down payment proyek'],
  ['Pelunasan Proyek', 'income', 'Pelunasan sisa pembayaran proyek'],
  ['Pemasukan Lain', 'income', 'Pemasukan di luar proyek'],
  ['Peralatan & Perlengkapan', 'expense', 'Pembelian kamera, lensa, drone, dll'],
  ['Transportasi', 'expense', 'Biaya perjalanan ke lokasi pemotretan'],
  ['Sewa Peralatan', 'expense', 'Sewa kamera, lensa, lighting, dll'],
  ['Honor Tim', 'expense', 'Bayar fotografer/videografer tambahan'],
  ['Editing & Post-Production', 'expense', 'Software, hardisk, cetak foto, dll'],
  ['Marketing & Promosi', 'expense', 'Iklan, sosmed, cetak brosur'],
  ['Operasional', 'expense', 'Listrik, internet, sewa studio'],
  ['Pengeluaran Lain', 'expense', 'Pengeluaran di luar kategori utama'],
];

async function initDb() {
  if (_db) return _db;

  const sqlJs = await initSqlJs();
  const wrapper = new DbWrapper(sqlJs);

  // Create tables
  wrapper._db.run(SCHEMA_SQL);

  // Seed categories
  const catCount = wrapper.prepare('SELECT COUNT(*) as c FROM categories').get();
  if (!catCount || catCount.c === 0) {
    for (const [name, type, desc] of DEFAULT_CATS) {
      wrapper._db.run(
        'INSERT INTO categories (name, type, description, is_default) VALUES (?, ?, ?, 1)',
        [name, type, desc]
      );
    }
  }

  // Seed admin
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminRow = wrapper.prepare('SELECT COUNT(*) as c FROM users WHERE username = ?').get(adminUsername);
  if (!adminRow || adminRow.c === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@1234', 10);
    wrapper._db.run(
      'INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)',
      [adminUsername, hash, 'Administrator']
    );
    console.log(`✅ Admin user created: ${adminUsername}`);
  }

  wrapper._save();
  _db = wrapper;
  console.log('✅ Database initialized:', DB_PATH);
  return wrapper;
}

// Lazy synchronous proxy — routes import `db` and call it after init
const db = new Proxy({}, {
  get(_, prop) {
    const instance = _db;
    if (!instance) throw new Error('DB not ready. Ensure initDb() was awaited before use.');
    const val = instance[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

module.exports = { initDb, db };

