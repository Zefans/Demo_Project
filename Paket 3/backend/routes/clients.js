const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/clients
router.get('/', (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  let where = '';
  let params = [];
  if (search) {
    where = "WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?";
    params = [`%${search}%`, `%${search}%`, `%${search}%`];
  }
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total = db.prepare(`SELECT COUNT(*) as c FROM clients ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM clients ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
    .all(...params, parseInt(limit), offset);

  res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Klien tidak ditemukan' });

  const projects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...client, projects });
});

// POST /api/clients
router.post('/', (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama klien wajib diisi' });

  const info = db.prepare(
    'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), phone || null, email || null, address || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Klien tidak ditemukan' });

  const { name, phone, email, address, notes } = req.body;
  db.prepare(`
    UPDATE clients SET
      name = COALESCE(?, name), phone = ?, email = ?, address = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name || null, phone || null, email || null, address || null, notes || null, req.params.id);

  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  const projects = db.prepare('SELECT COUNT(*) as c FROM projects WHERE client_id = ?').get(req.params.id).c;
  if (projects > 0) {
    return res.status(400).json({ error: 'Tidak bisa menghapus klien yang masih memiliki proyek' });
  }
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

