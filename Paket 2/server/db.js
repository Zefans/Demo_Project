require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.join(dataDir, 'finance.db') },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    idleTimeoutMillis: 30000,
    afterCreate: (conn, cb) => {
      conn.run('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;', cb);
    },
  },
});

// ── Promise-based query helpers ─────────────────────────────────────────────
// We expose a db object that mimics the synchronous better-sqlite3 API
// but uses knex under the hood.  All public methods return Promises.
// Routes use await throughout.

const db = {
  _knex: knex,

  // Raw SELECT returning all rows
  all: (sql, params = []) => knex.raw(sql, params).then(r => r),

  // Raw SELECT returning first row
  get: (sql, params = []) => knex.raw(sql, params).then(r => (r && r[0]) || null),

  // Raw INSERT/UPDATE/DELETE
  run: (sql, params = []) => knex.raw(sql, params),

  // Initialise schema
  init: async () => {
    await knex.raw(`PRAGMA foreign_keys = ON`);

    const tableExists = name => knex.schema.hasTable(name);

    if (!(await tableExists('users'))) {
      await knex.schema.createTable('users', t => {
        t.increments('id');
        t.string('username').unique().notNullable();
        t.string('password').notNullable();
        t.string('email').notNullable();
        t.string('role').notNullable().defaultTo('admin');
        t.datetime('created_at').defaultTo(knex.fn.now());
      });
    }

    if (!(await tableExists('clients'))) {
      await knex.schema.createTable('clients', t => {
        t.increments('id');
        t.string('name').notNullable();
        t.string('email');
        t.string('phone');
        t.text('address');
        t.datetime('created_at').defaultTo(knex.fn.now());
      });
    }

    if (!(await tableExists('projects'))) {
      await knex.schema.createTable('projects', t => {
        t.increments('id');
        t.integer('client_id').notNullable().references('id').inTable('clients');
        t.string('title').notNullable();
        t.string('type').notNullable();
        t.text('description');
        t.string('project_date');
        t.float('total_value').notNullable().defaultTo(0);
        t.float('dp_amount').notNullable().defaultTo(0);
        t.float('dp_paid').notNullable().defaultTo(0);
        t.float('remaining').notNullable().defaultTo(0);
        t.string('status').notNullable().defaultTo('pending');
        t.text('notes');
        t.datetime('created_at').defaultTo(knex.fn.now());
        t.datetime('updated_at').defaultTo(knex.fn.now());
      });
    }

    if (!(await tableExists('invoices'))) {
      await knex.schema.createTable('invoices', t => {
        t.increments('id');
        t.string('invoice_number').unique().notNullable();
        t.integer('project_id').notNullable().references('id').inTable('projects');
        t.string('type').notNullable();
        t.float('amount').notNullable();
        t.string('due_date');
        t.string('status').notNullable().defaultTo('unpaid');
        t.string('midtrans_order_id').unique();
        t.text('midtrans_token');
        t.text('midtrans_redirect_url');
        t.string('payment_method');
        t.datetime('paid_at');
        t.text('snap_token');
        t.text('notes');
        t.datetime('created_at').defaultTo(knex.fn.now());
        t.datetime('updated_at').defaultTo(knex.fn.now());
      });
    }

    if (!(await tableExists('transactions'))) {
      await knex.schema.createTable('transactions', t => {
        t.increments('id');
        t.string('type').notNullable();
        t.string('category').notNullable();
        t.float('amount').notNullable();
        t.text('description').notNullable();
        t.integer('project_id').references('id').inTable('projects');
        t.integer('invoice_id').references('id').inTable('invoices');
        t.string('date').notNullable();
        t.string('payment_method').defaultTo('transfer');
        t.string('reference');
        t.datetime('created_at').defaultTo(knex.fn.now());
      });
    }

    if (!(await tableExists('expense_categories'))) {
      await knex.schema.createTable('expense_categories', t => {
        t.increments('id');
        t.string('name').unique().notNullable();
        t.string('icon').defaultTo('💰');
      });
    }

    // Seed admin
    const admin = await knex('users').where('username', process.env.ADMIN_USERNAME || 'admin').first();
    if (!admin) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await knex('users').insert({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: hash,
        email:    process.env.ADMIN_EMAIL || 'demo@example.invalid',
        role:     'admin',
      });
      console.log('✅  Default admin created:', process.env.ADMIN_USERNAME || 'admin');
    }

    // Seed expense categories
    const cats = [
      ['Peralatan', '📷'], ['Transport', '🚗'], ['Editing / Software', '💻'],
      ['Sewa Venue', '🏠'], ['Asisten / Crew', '👥'], ['Cetak / Album', '🖨️'],
      ['Marketing', '📢'], ['Listrik / Internet', '💡'], ['Lain-lain', '📌'],
    ];
    for (const [name, icon] of cats) {
      const exists = await knex('expense_categories').where('name', name).first();
      if (!exists) await knex('expense_categories').insert({ name, icon });
    }

    console.log('✅  Database initialised');
  },
};

module.exports = db;

