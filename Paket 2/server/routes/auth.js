const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { _knex: knex } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });

    const user = await knex('users').where('username', username).first();
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Username atau password salah.' });

    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    res.json({ ok: true, username: user.username, role: user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Belum login.' });
  res.json({ userId: req.session.userId, username: req.session.username, role: req.session.role });
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await knex('users').where('id', req.session.userId).first();
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ error: 'Password lama salah.' });
    const hash = bcrypt.hashSync(newPassword, 10);
    await knex('users').where('id', req.session.userId).update({ password: hash });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

