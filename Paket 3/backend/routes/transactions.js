const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// ── CSV helper ────────────────────────────────────────────────────────────────
function toCSV(rows, columns) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = String(row[c.key] ?? '').replace(/"/g, '""');
      return /[,"\n\r]/.test(val) ? `"${val}"` : val;
    }).join(',')
  ).join('\r\n');
  return '\uFEFF' + header + '\r\n' + body;
}

function generateCode() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `TRX-${ts}-${uuidv4().substring(0,6).toUpperCase()}`;
}

// GET /api/transactions — list with filters
router.get('/', (req, res) => {
  const {
    type, category, source, project_id,
    date_from, date_to, page = 1, limit = 20, search
  } = req.query;

  let where = [];
  let params = [];

  if (type) { where.push("t.type = ?"); params.push(type); }
  if (category) { where.push("t.category = ?"); params.push(category); }
  if (source) { where.push("t.source = ?"); params.push(source); }
  if (project_id) { where.push("t.reference_project_id = ?"); params.push(project_id); }
  if (date_from) { where.push("t.transaction_date >= ?"); params.push(date_from); }
  if (date_to) { where.push("t.transaction_date <= ?"); params.push(date_to); }
  if (search) {
    where.push("(t.description LIKE ? OR t.transaction_code LIKE ? OR t.notes LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`
    SELECT COUNT(*) as c FROM transactions t ${whereClause}
  `).get(...params).c;

  const rows = db.prepare(`
    SELECT t.*, p.title as project_title, p.project_code
    FROM transactions t
    LEFT JOIN projects p ON t.reference_project_id = p.id
    ${whereClause}
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  // Totals for the filtered set
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense
    FROM transactions t ${whereClause}
  `).get(...params);

  res.json({
    data: rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    totals
  });
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT t.*, p.title as project_title, p.project_code
    FROM transactions t
    LEFT JOIN projects p ON t.reference_project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  res.json(row);
});

// POST /api/transactions — create manual transaction
router.post('/', (req, res) => {
  const {
    type, category, amount, description,
    reference_project_id, transaction_date, payment_method, notes
  } = req.body;

  if (!type || !category || !amount || !transaction_date) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap (type, category, amount, transaction_date)' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type harus income atau expense' });
  }
  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Jumlah harus lebih dari 0' });
  }

  const code = generateCode();

  const info = db.prepare(`
    INSERT INTO transactions
      (transaction_code, type, category, amount, description, reference_project_id,
       transaction_date, payment_method, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).run(
    code, type, category, parseFloat(amount), description || null,
    reference_project_id || null, transaction_date,
    payment_method || 'cash', notes || null
  );

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/transactions/:id — update manual transaction
router.put('/:id', (req, res) => {
  const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  if (trx.source === 'online') {
    return res.status(400).json({ error: 'Transaksi online tidak bisa diubah manual' });
  }

  const {
    type, category, amount, description,
    reference_project_id, transaction_date, payment_method, notes
  } = req.body;

  db.prepare(`
    UPDATE transactions SET
      type = COALESCE(?, type),
      category = COALESCE(?, category),
      amount = COALESCE(?, amount),
      description = COALESCE(?, description),
      reference_project_id = ?,
      transaction_date = COALESCE(?, transaction_date),
      payment_method = COALESCE(?, payment_method),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    type || null, category || null,
    amount ? parseFloat(amount) : null,
    description !== undefined ? description : null,
    reference_project_id || null,
    transaction_date || null,
    payment_method || null,
    notes !== undefined ? notes : null,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id));
});

// DELETE /api/transactions/:id — delete manual transaction
router.delete('/:id', (req, res) => {
  const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  if (trx.source === 'online') {
    return res.status(400).json({ error: 'Transaksi online tidak bisa dihapus' });
  }
  if (trx.reconciled) {
    return res.status(400).json({ error: 'Transaksi yang sudah direkonsiliasi tidak bisa dihapus' });
  }

  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/transactions/export-csv
router.get('/export-csv', (req, res) => {
  const { type, source, project_id, date_from, date_to } = req.query;

  let where = [];
  let params = [];
  if (type)       { where.push("t.type = ?");                    params.push(type); }
  if (source)     { where.push("t.source = ?");                  params.push(source); }
  if (project_id) { where.push("t.reference_project_id = ?");    params.push(project_id); }
  if (date_from)  { where.push("t.transaction_date >= ?");       params.push(date_from); }
  if (date_to)    { where.push("t.transaction_date <= ?");       params.push(date_to); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT t.*, p.title as project_title, p.project_code
    FROM transactions t
    LEFT JOIN projects p ON t.reference_project_id = p.id
    ${whereClause}
    ORDER BY t.transaction_date DESC
  `).all(...params);

  const cols = [
    { key: 'transaction_date',  label: 'Tanggal' },
    { key: 'transaction_code',  label: 'Kode' },
    { key: 'type',              label: 'Jenis' },
    { key: 'category',          label: 'Kategori' },
    { key: 'description',       label: 'Deskripsi' },
    { key: 'amount',            label: 'Jumlah' },
    { key: 'payment_method',    label: 'Metode' },
    { key: 'source',            label: 'Sumber' },
    { key: 'project_title',     label: 'Proyek' },
    { key: 'notes',             label: 'Catatan' },
  ];

  const csv = toCSV(rows, cols);
  const suffix = date_from && date_to ? `_${date_from}_sd_${date_to}` : '';
  const filename = `transaksi${suffix}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = router;

