const express = require('express');
const router = express.Router();
const { _knex: knex } = require('../db');
const { v4: uuidv4 } = require('uuid');
const midtransClient = require('midtrans-client');

const auth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

function getSnap() {
  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey:    process.env.MIDTRANS_SERVER_KEY,
    clientKey:    process.env.MIDTRANS_CLIENT_KEY,
  });
}

async function generateInvoiceNumber() {
  const now  = new Date();
  const yymm = `${now.getFullYear().toString().slice(2)}${String(now.getMonth()+1).padStart(2,'0')}`;
  const count = await knex('invoices').whereRaw(`invoice_number LIKE ?`, [`INV/${yymm}/%`]).count('id as cnt').first();
  const seq = (count?.cnt || 0) + 1;
  return `INV/${yymm}/${String(seq).padStart(4,'0')}`;
}

// GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    const { project_id, status } = req.query;
    let q = knex('invoices as i')
      .select('i.*', 'p.title as project_title', 'c.name as client_name', 'c.email as client_email', 'c.phone as client_phone')
      .join('projects as p', 'p.id', 'i.project_id')
      .join('clients as c', 'c.id', 'p.client_id')
      .orderBy('i.created_at', 'desc');
    if (project_id) q = q.where('i.project_id', project_id);
    if (status)     q = q.where('i.status', status);
    res.json(await q);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/invoices/:id  (public – needed for payment page)
router.get('/:id', async (req, res) => {
  try {
    const inv = await knex('invoices as i')
      .select('i.*', 'p.title as project_title', 'p.type as project_type',
        'c.name as client_name', 'c.email as client_email', 'c.phone as client_phone')
      .join('projects as p', 'p.id', 'i.project_id')
      .join('clients as c', 'c.id', 'p.client_id')
      .where('i.id', req.params.id)
      .first();
    if (!inv) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
    res.json(inv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/invoices
router.post('/', auth, async (req, res) => {
  try {
    const { project_id, type, amount, due_date, notes } = req.body;
    if (!project_id || !type || !amount)
      return res.status(400).json({ error: 'project_id, type, amount wajib diisi.' });

    const project = await knex('projects as p')
      .select('p.*', 'c.name as client_name', 'c.email as client_email', 'c.phone as client_phone')
      .join('clients as c', 'c.id', 'p.client_id')
      .where('p.id', project_id).first();
    if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan.' });

    const invNum = await generateInvoiceNumber();
    const orderId = `ORD-${uuidv4().split('-')[0].toUpperCase()}`;
    const amt = parseFloat(amount);

    const [invoiceId] = await knex('invoices').insert({
      invoice_number: invNum,
      project_id,
      type,
      amount: amt,
      due_date: due_date || null,
      notes: notes || null,
      midtrans_order_id: orderId,
    });

    // Request Snap token from Midtrans
    const serverKeyConfigured = process.env.MIDTRANS_SERVER_KEY &&
      !process.env.MIDTRANS_SERVER_KEY.includes('XXXX');

    if (serverKeyConfigured) {
      try {
        const snap = getSnap();
        const parameter = {
          transaction_details: { order_id: orderId, gross_amount: Math.round(amt) },
          credit_card: { secure: true },
          customer_details: {
            first_name: project.client_name,
            email: project.client_email || '',
            phone: project.client_phone || '',
          },
          item_details: [{
            id: `INV-${invoiceId}`,
            price: Math.round(amt),
            quantity: 1,
            name: `${invNum} – ${project.title}`,
          }],
          callbacks: {
            finish:  `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish`,
            error:   `${process.env.APP_URL || 'http://localhost:3000'}/payment/error`,
            pending: `${process.env.APP_URL || 'http://localhost:3000'}/payment/pending`,
          },
        };
        const snapRes = await snap.createTransaction(parameter);
        await knex('invoices').where('id', invoiceId).update({
          snap_token: snapRes.token,
          midtrans_redirect_url: snapRes.redirect_url,
          status: 'pending',
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Midtrans error:', err.message);
      }
    }

    const invoice = await knex('invoices').where('id', invoiceId).first();
    res.status(201).json(invoice);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/invoices/:id/manual-paid
router.post('/:id/manual-paid', auth, async (req, res) => {
  try {
    const { payment_method, notes } = req.body;
    const inv = await knex('invoices').where('id', req.params.id).first();
    if (!inv)              return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
    if (inv.status === 'paid') return res.status(400).json({ error: 'Invoice sudah lunas.' });

    const now = new Date().toISOString();
    await knex('invoices').where('id', inv.id).update({
      status: 'paid',
      payment_method: payment_method || 'transfer',
      paid_at: now,
      updated_at: now,
      notes: notes ? ((inv.notes || '') + ' | ' + notes).trim() : inv.notes,
    });

    const project = await knex('projects').where('id', inv.project_id).first();
    await knex('transactions').insert({
      type: 'income',
      category: 'Pembayaran Proyek',
      amount: inv.amount,
      description: `Pembayaran ${inv.invoice_number} – ${project.title}`,
      project_id: inv.project_id,
      invoice_id: inv.id,
      date: now.split('T')[0],
      payment_method: payment_method || 'transfer',
      reference: inv.invoice_number,
    });

    const paidRow = await knex('invoices').where('project_id', inv.project_id).where('status', 'paid').sum('amount as s').first();
    const paidSum   = paidRow?.s || 0;
    const remaining = Math.max(0, project.total_value - paidSum);
    const projStatus = remaining <= 0 ? 'completed' : paidSum >= project.dp_amount ? 'in_progress' : 'dp_paid';

    await knex('projects').where('id', inv.project_id).update({ remaining, status: projStatus, updated_at: now });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/invoices/webhook  – Midtrans notification
router.post('/webhook', express.json(), async (req, res) => {
  const serverKeyConfigured = process.env.MIDTRANS_SERVER_KEY &&
    !process.env.MIDTRANS_SERVER_KEY.includes('XXXX');

  if (!serverKeyConfigured) return res.status(200).json({ ok: true });

  try {
    const core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey:    process.env.MIDTRANS_SERVER_KEY,
      clientKey:    process.env.MIDTRANS_CLIENT_KEY,
    });

    const notif = await core.transaction.notification(req.body);
    const { order_id: orderId, transaction_status: txStatus, fraud_status: fraudStatus, payment_type } = notif;

    const inv = await knex('invoices').where('midtrans_order_id', orderId).first();
    if (!inv) return res.status(404).json({ error: 'Order not found' });

    let newStatus = inv.status;
    if (txStatus === 'capture')    newStatus = fraudStatus === 'accept' ? 'paid' : 'pending';
    else if (txStatus === 'settlement') newStatus = 'paid';
    else if (['cancel','deny','expire'].includes(txStatus)) newStatus = txStatus === 'expire' ? 'expired' : 'cancelled';
    else if (txStatus === 'pending') newStatus = 'pending';

    const now = new Date().toISOString();
    await knex('invoices').where('id', inv.id).update({
      status: newStatus,
      payment_method: payment_type || null,
      paid_at: newStatus === 'paid' ? now : inv.paid_at,
      updated_at: now,
    });

    if (newStatus === 'paid' && inv.status !== 'paid') {
      const project = await knex('projects').where('id', inv.project_id).first();
      await knex('transactions').insert({
        type: 'income', category: 'Pembayaran Proyek', amount: inv.amount,
        description: `Pembayaran ${inv.invoice_number} – ${project.title}`,
        project_id: inv.project_id, invoice_id: inv.id,
        date: now.split('T')[0], payment_method: payment_type || 'gateway', reference: orderId,
      });
      const paidRow = await knex('invoices').where('project_id', inv.project_id).where('status', 'paid').sum('amount as s').first();
      const paidSum = paidRow?.s || 0;
      const remaining = Math.max(0, project.total_value - paidSum);
      const projStatus = remaining <= 0 ? 'completed' : paidSum >= project.dp_amount ? 'in_progress' : 'dp_paid';
      await knex('projects').where('id', inv.project_id).update({ remaining, status: projStatus, updated_at: now });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const inv = await knex('invoices').where('id', req.params.id).first();
    if (!inv)              return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
    if (inv.status === 'paid') return res.status(400).json({ error: 'Invoice lunas tidak dapat dihapus.' });
    await knex('invoices').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

