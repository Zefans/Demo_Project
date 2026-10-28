const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/categories
router.get('/', (req, res) => {
  const { type } = req.query;
  let where = type ? 'WHERE type = ?' : '';
  const params = type ? [type] : [];
  const rows = db.prepare(`SELECT * FROM categories ${where} ORDER BY type, name`).all(...params);
  res.json(rows);
});

// POST /api/categories
router.post('/', (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name dan type wajib diisi' });
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type harus income atau expense' });

  const info = db.prepare('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)').run(name, type, description || null);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  if (cat.is_default) return res.status(400).json({ error: 'Kategori default tidak bisa dihapus' });

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

