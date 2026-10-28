const express = require('express');
const router = express.Router();
const { _knex: knex } = require('../db');

const auth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    const { status, type, client_id } = req.query;
    let q = knex('projects as p')
      .select('p.*', 'c.name as client_name', 'c.phone as client_phone', 'c.email as client_email',
        knex.raw('(SELECT COUNT(*) FROM invoices i WHERE i.project_id = p.id AND i.status = ?) as paid_invoices', ['paid']),
        knex.raw('(SELECT COALESCE(SUM(amount),0) FROM invoices i WHERE i.project_id = p.id AND i.status = ?) as total_paid', ['paid']))
      .join('clients as c', 'c.id', 'p.client_id')
      .orderBy('p.created_at', 'desc');
    if (status)    q = q.where('p.status', status);
    if (type)      q = q.where('p.type', type);
    if (client_id) q = q.where('p.client_id', client_id);
    res.json(await q);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await knex('projects as p')
      .select('p.*', 'c.name as client_name', 'c.phone as client_phone', 'c.email as client_email')
      .join('clients as c', 'c.id', 'p.client_id')
      .where('p.id', req.params.id)
      .first();
    if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan.' });
    const invoices     = await knex('invoices').where('project_id', req.params.id).orderBy('created_at', 'desc');
    const transactions = await knex('transactions').where('project_id', req.params.id).orderBy('date', 'desc');
    res.json({ ...project, invoices, transactions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/projects
router.post('/', auth, async (req, res) => {
  try {
    const { client_id, title, type, description, project_date, total_value, dp_amount, notes } = req.body;
    if (!client_id || !title || !type || !total_value)
      return res.status(400).json({ error: 'Field wajib: client_id, title, type, total_value.' });
    const tv        = parseFloat(total_value);
    const dp        = parseFloat(dp_amount) || 0;
    const remaining = tv - dp;
    const [id] = await knex('projects').insert({
      client_id, title, type,
      description: description || null,
      project_date: project_date || null,
      total_value: tv, dp_amount: dp, remaining,
      notes: notes || null,
    });
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, type, description, project_date, total_value, dp_amount, status, notes } = req.body;
    const tv = parseFloat(total_value);
    const dp = parseFloat(dp_amount) || 0;
    const paidRow = await knex('invoices')
      .where('project_id', req.params.id).where('status', 'paid')
      .sum('amount as s').first();
    const paidSum = paidRow?.s || 0;
    const remaining = Math.max(0, tv - paidSum);
    await knex('projects').where('id', req.params.id).update({
      title, type, description: description||null, project_date: project_date||null,
      total_value: tv, dp_amount: dp, remaining, status, notes: notes||null,
      updated_at: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const inv = await knex('invoices').where('project_id', req.params.id).where('status', 'paid').first();
    if (inv) return res.status(400).json({ error: 'Tidak dapat menghapus proyek yang sudah memiliki pembayaran.' });
    await knex('invoices').where('project_id', req.params.id).delete();
    await knex('transactions').where('project_id', req.params.id).delete();
    await knex('projects').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

