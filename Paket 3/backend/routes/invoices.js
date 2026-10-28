const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

let midtransSnap = null;

function getMidtrans() {
  if (!midtransSnap) {
    try {
      const midtrans = require('midtrans-client');
      midtransSnap = new midtrans.Snap({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY
      });
    } catch (e) {
      console.error('Midtrans init error:', e.message);
    }
  }
  return midtransSnap;
}

function generateInvoiceCode() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `INV-${ts}-${uuidv4().substring(0,6).toUpperCase()}`;
}

// GET /api/invoices
router.get('/', (req, res) => {
  const { status, project_id, page = 1, limit = 20 } = req.query;
  let where = [];
  let params = [];

  if (status) { where.push("i.status = ?"); params.push(status); }
  if (project_id) { where.push("i.project_id = ?"); params.push(project_id); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM payment_invoices i ${whereClause}`).get(...params).c;
  const rows = db.prepare(`
    SELECT i.*, p.title as project_title, p.project_code, c.name as client_name
    FROM payment_invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    data: rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
  });
});

// GET /api/invoices/:id
router.get('/:id', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, p.title as project_title, p.project_code, p.total_value,
      p.dp_paid, p.remaining_paid, c.name as client_name, c.phone as client_phone, c.email as client_email
    FROM payment_invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!inv) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
  res.json(inv);
});

// POST /api/invoices — create invoice + get Midtrans Snap token
router.post('/', async (req, res) => {
  const { project_id, payment_type, amount, description } = req.body;

  if (!project_id || !payment_type || !amount) {
    return res.status(400).json({ error: 'project_id, payment_type, amount wajib diisi' });
  }

  const project = db.prepare(`
    SELECT p.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM projects p JOIN clients c ON p.client_id = c.id WHERE p.id = ?
  `).get(project_id);

  if (!project) return res.status(400).json({ error: 'Proyek tidak ditemukan' });
  if (project.status === 'cancelled') return res.status(400).json({ error: 'Proyek sudah dibatalkan' });
  if (project.status === 'paid_off') return res.status(400).json({ error: 'Proyek sudah lunas' });

  const amt = parseFloat(amount);
  if (amt <= 0) return res.status(400).json({ error: 'Jumlah harus lebih dari 0' });

  const invoiceCode = generateInvoiceCode();
  const orderId = `${invoiceCode}-${Date.now()}`;

  // Check for existing pending invoice for same project + type to prevent duplicates
  const existingPending = db.prepare(
    "SELECT id FROM payment_invoices WHERE project_id = ? AND payment_type = ? AND status = 'pending'"
  ).get(project_id, payment_type);

  if (existingPending) {
    return res.status(400).json({
      error: `Sudah ada invoice ${payment_type} yang pending untuk proyek ini. Batalkan dulu sebelum membuat yang baru.`,
      existing_id: existingPending.id
    });
  }

  // Save invoice first (pending, no token yet)
  const invInfo = db.prepare(`
    INSERT INTO payment_invoices
      (invoice_code, project_id, payment_type, amount, description, midtrans_order_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(invoiceCode, project_id, payment_type, amt, description || null, orderId);

  const invoiceId = invInfo.lastInsertRowid;

  // Try to create Midtrans Snap token
  const snap = getMidtrans();
  const serverKeyConfigured = process.env.MIDTRANS_SERVER_KEY &&
    !process.env.MIDTRANS_SERVER_KEY.includes('XXXX');

  if (snap && serverKeyConfigured) {
    try {
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(amt)
        },
        customer_details: {
          first_name: project.client_name,
          email: project.client_email || 'noreply@example.com',
          phone: project.client_phone || ''
        },
        item_details: [{
          id: invoiceCode,
          price: Math.round(amt),
          quantity: 1,
          name: description || `${payment_type === 'dp' ? 'DP' : 'Pembayaran'} ${project.project_code}`
        }],
        callbacks: {
          finish: `${process.env.APP_BASE_URL}/pages/payment-result.html?invoice_id=${invoiceId}`,
          error: `${process.env.APP_BASE_URL}/pages/payment-result.html?invoice_id=${invoiceId}&status=error`,
          pending: `${process.env.APP_BASE_URL}/pages/payment-result.html?invoice_id=${invoiceId}&status=pending`
        }
      };

      const transaction = await snap.createTransaction(parameter);
      db.prepare(`
        UPDATE payment_invoices SET
          midtrans_snap_token = ?,
          midtrans_payment_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(transaction.token, transaction.redirect_url, invoiceId);

    } catch (err) {
      console.error('Midtrans error:', err.message);
      // Invoice still created, just without snap token — notify client
      db.prepare("UPDATE payment_invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(invoiceId);
    }
  }

  const created = db.prepare(`
    SELECT i.*, p.title as project_title, p.project_code, c.name as client_name
    FROM payment_invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.id = ?
  `).get(invoiceId);

  res.status(201).json(created);
});

// POST /api/invoices/:id/cancel
router.post('/:id/cancel', (req, res) => {
  const inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
  if (inv.status !== 'pending') {
    return res.status(400).json({ error: 'Hanya invoice pending yang bisa dibatalkan' });
  }

  db.prepare("UPDATE payment_invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.params.id);

  res.json({ success: true });
});

// GET /api/invoices/:id/status — check status from Midtrans
router.get('/:id/status', async (req, res) => {
  const inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
  if (!inv.midtrans_order_id) return res.json({ local_status: inv.status, midtrans_status: null });

  const snap = getMidtrans();
  const serverKeyConfigured = process.env.MIDTRANS_SERVER_KEY &&
    !process.env.MIDTRANS_SERVER_KEY.includes('XXXX');

  if (!snap || !serverKeyConfigured) {
    return res.json({ local_status: inv.status, midtrans_status: 'unconfigured' });
  }

  try {
    const midtransCore = new (require('midtrans-client').CoreApi)({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY
    });
    const status = await midtransCore.transaction.status(inv.midtrans_order_id);
    res.json({ local_status: inv.status, midtrans_status: status });
  } catch (err) {
    res.json({ local_status: inv.status, midtrans_status: null, error: err.message });
  }
});

module.exports = router;

