const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

function generateProjectCode() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = uuidv4().substring(0, 4).toUpperCase();
  return `PRJ-${y}${m}-${rand}`;
}

// GET /api/projects
router.get('/', (req, res) => {
  const { status, type, client_id, date_from, date_to, search, page = 1, limit = 20 } = req.query;

  let where = [];
  let params = [];

  if (status) { where.push("p.status = ?"); params.push(status); }
  if (type) { where.push("p.project_type = ?"); params.push(type); }
  if (client_id) { where.push("p.client_id = ?"); params.push(client_id); }
  if (date_from) { where.push("p.event_date >= ?"); params.push(date_from); }
  if (date_to) { where.push("p.event_date <= ?"); params.push(date_to); }
  if (search) {
    where.push("(p.title LIKE ? OR p.project_code LIKE ? OR c.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`
    SELECT COUNT(*) as c FROM projects p
    JOIN clients c ON p.client_id = c.id
    ${whereClause}
  `).get(...params).c;

  const rows = db.prepare(`
    SELECT p.*, c.name as client_name, c.phone as client_phone,
      (p.total_value - p.dp_paid - p.remaining_paid) as outstanding
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    data: rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
  });
});

// GET /api/projects/:id — full project detail
router.get('/:id', (req, res) => {
  const project = db.prepare(`
    SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email,
      (p.total_value - p.dp_paid - p.remaining_paid) as outstanding
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE reference_project_id = ? ORDER BY transaction_date DESC'
  ).all(req.params.id);

  const invoices = db.prepare(
    'SELECT * FROM payment_invoices WHERE project_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);

  res.json({ ...project, transactions, invoices });
});

// POST /api/projects
router.post('/', (req, res) => {
  const {
    client_id, title, project_type, description,
    event_date, location, total_value, dp_amount, notes
  } = req.body;

  if (!client_id || !title || !project_type || !total_value) {
    return res.status(400).json({ error: 'Field wajib: client_id, title, project_type, total_value' });
  }

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(400).json({ error: 'Klien tidak ditemukan' });

  const dpAmt = parseFloat(dp_amount) || 0;
  const totalVal = parseFloat(total_value);
  if (dpAmt > totalVal) {
    return res.status(400).json({ error: 'DP tidak boleh melebihi total nilai proyek' });
  }

  const code = generateProjectCode();

  const info = db.prepare(`
    INSERT INTO projects
      (project_code, client_id, title, project_type, description, event_date,
       location, total_value, dp_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, client_id, title, project_type,
    description || null, event_date || null,
    location || null, totalVal, dpAmt, notes || null
  );

  res.status(201).json(db.prepare('SELECT p.*, c.name as client_name FROM projects p JOIN clients c ON p.client_id=c.id WHERE p.id = ?').get(info.lastInsertRowid));
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

  const {
    title, project_type, description, event_date, location,
    total_value, dp_amount, status, notes
  } = req.body;

  db.prepare(`
    UPDATE projects SET
      title = COALESCE(?, title),
      project_type = COALESCE(?, project_type),
      description = COALESCE(?, description),
      event_date = COALESCE(?, event_date),
      location = COALESCE(?, location),
      total_value = COALESCE(?, total_value),
      dp_amount = COALESCE(?, dp_amount),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, project_type || null, description || null,
    event_date || null, location || null,
    total_value ? parseFloat(total_value) : null,
    dp_amount ? parseFloat(dp_amount) : null,
    status || null, notes || null, req.params.id
  );

  res.json(db.prepare('SELECT p.*, c.name as client_name FROM projects p JOIN clients c ON p.client_id=c.id WHERE p.id = ?').get(req.params.id));
});

// POST /api/projects/:id/record-payment — record manual payment for project
router.post('/:id/record-payment', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

  const { payment_type, amount, payment_method, transaction_date, notes } = req.body;

  if (!payment_type || !amount || !transaction_date) {
    return res.status(400).json({ error: 'Field wajib: payment_type, amount, transaction_date' });
  }

  const amt = parseFloat(amount);
  if (amt <= 0) return res.status(400).json({ error: 'Jumlah harus lebih dari 0' });

  // Determine category
  const categoryMap = { dp: 'DP Proyek', remaining: 'Pelunasan Proyek', full: 'Pembayaran Proyek', custom: 'Pembayaran Proyek' };
  const category = categoryMap[payment_type] || 'Pembayaran Proyek';

  const updateProjectPayment = db.transaction(() => {
    // Create transaction
    const code = `TRX-${Date.now()}-${uuidv4().substring(0,4).toUpperCase()}`;
    const txInfo = db.prepare(`
      INSERT INTO transactions
        (transaction_code, type, category, amount, description, reference_project_id,
         transaction_date, payment_method, notes, source)
      VALUES (?, 'income', ?, ?, ?, ?, ?, ?, ?, 'manual')
    `).run(
      code, category, amt,
      `Pembayaran ${payment_type === 'dp' ? 'DP' : payment_type === 'remaining' ? 'Pelunasan' : 'Proyek'} - ${project.project_code}`,
      project.id, transaction_date, payment_method || 'transfer', notes || null
    );

    // Update project payment amounts
    if (payment_type === 'dp') {
      db.prepare('UPDATE projects SET dp_paid = dp_paid + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amt, project.id);
    } else {
      db.prepare('UPDATE projects SET remaining_paid = remaining_paid + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amt, project.id);
    }

    // Auto-update status based on payment
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
    const totalPaid = updated.dp_paid + updated.remaining_paid;
    let newStatus = updated.status;

    if (totalPaid >= updated.total_value) {
      newStatus = 'paid_off';
    } else if (updated.dp_paid >= updated.dp_amount && updated.dp_amount > 0) {
      newStatus = newStatus === 'pending' ? 'dp_paid' : newStatus;
    }

    if (newStatus !== updated.status) {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(newStatus, project.id);
    }

    return txInfo.lastInsertRowid;
  });

  const txId = updateProjectPayment();
  const updatedProject = db.prepare('SELECT p.*, c.name as client_name FROM projects p JOIN clients c ON p.client_id=c.id WHERE p.id = ?').get(project.id);
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);

  res.json({ project: updatedProject, transaction });
});

module.exports = router;

