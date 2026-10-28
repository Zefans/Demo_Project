const express = require('express');
const router = express.Router();
const { _knex: knex } = require('../db');

const auth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// GET /api/clients
router.get('/', auth, async (req, res) => {
  try {
    const clients = await knex('clients as c')
      .select('c.*',
        knex.raw('COUNT(DISTINCT p.id) as project_count'),
        knex.raw('COALESCE(SUM(p.total_value),0) as total_project_value'))
      .leftJoin('projects as p', 'p.client_id', 'c.id')
      .groupBy('c.id')
      .orderBy('c.created_at', 'desc');
    res.json(clients);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/clients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await knex('clients').where('id', req.params.id).first();
    if (!client) return res.status(404).json({ error: 'Client tidak ditemukan.' });
    const projects = await knex('projects').where('client_id', req.params.id).orderBy('created_at', 'desc');
    res.json({ ...client, projects });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/clients
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama client wajib diisi.' });
    const [id] = await knex('clients').insert({ name, email: email||null, phone: phone||null, address: address||null });
    res.status(201).json({ id, name, email, phone, address });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/clients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    await knex('clients').where('id', req.params.id).update({ name, email: email||null, phone: phone||null, address: address||null });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/clients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const projects = await knex('projects').where('client_id', req.params.id);
    if (projects.length > 0)
      return res.status(400).json({ error: 'Tidak dapat menghapus client yang memiliki proyek.' });
    await knex('clients').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

