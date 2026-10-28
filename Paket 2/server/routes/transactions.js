const express = require('express');
const router = express.Router();
const { _knex: knex } = require('../db');

const auth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

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

// GET /api/transactions
router.get('/', auth, async (req, res) => {
  try {
    const { type, month, year, project_id } = req.query;
    let q = knex('transactions as t')
      .select('t.*', 'p.title as project_title')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .orderBy([{ column: 't.date', order: 'desc' }, { column: 't.id', order: 'desc' }]);
    if (type)       q = q.where('t.type', type);
    if (project_id) q = q.where('t.project_id', project_id);
    if (month)      q = q.whereRaw(`strftime('%m', t.date) = ?`, [String(month).padStart(2,'0')]);
    if (year)       q = q.whereRaw(`strftime('%Y', t.date) = ?`, [String(year)]);
    res.json(await q);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { year, month } = req.query;

    let incQ = knex('transactions').where('type', 'income');
    let expQ = knex('transactions').where('type', 'expense');
    if (year && month) {
      const ym = `${year}-${String(month).padStart(2,'0')}`;
      incQ = incQ.whereRaw(`strftime('%Y-%m', date) = ?`, [ym]);
      expQ = expQ.whereRaw(`strftime('%Y-%m', date) = ?`, [ym]);
    } else if (year) {
      incQ = incQ.whereRaw(`strftime('%Y', date) = ?`, [String(year)]);
      expQ = expQ.whereRaw(`strftime('%Y', date) = ?`, [String(year)]);
    }

    const [incRow, expRow, balRow, pendRow, actRow, compRow] = await Promise.all([
      incQ.sum('amount as total').first(),
      expQ.sum('amount as total').first(),
      knex.raw(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) as balance FROM transactions`),
      knex('invoices').whereIn('status', ['unpaid','pending']).select(
        knex.raw('COUNT(*) as cnt'),
        knex.raw('COALESCE(SUM(amount),0) as total')
      ).first(),
      knex('projects').whereNotIn('status', ['completed','cancelled']).count('id as cnt').first(),
      knex('projects').where('status', 'completed').count('id as cnt').first(),
    ]);

    const income  = incRow?.total || 0;
    const expense = expRow?.total || 0;
    const balance = Array.isArray(balRow) ? (balRow[0]?.balance || 0) : (balRow?.balance || 0);

    res.json({
      income, expense, profit: income - expense, balance,
      pendingInvoices: { cnt: pendRow?.cnt || 0, total: pendRow?.total || 0 },
      activeProjects: actRow?.cnt || 0,
      completedProjects: compRow?.cnt || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions/monthly-chart
router.get('/monthly-chart', auth, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const rows = await knex('transactions')
      .select(knex.raw(`strftime('%m', date) as month`))
      .select(knex.raw(`SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income`))
      .select(knex.raw(`SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense`))
      .whereRaw(`strftime('%Y', date) = ?`, [String(year)])
      .groupByRaw(`strftime('%m', date)`)
      .orderBy('month');

    const months = Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
    const data = months.map(m => {
      const r = rows.find(x => x.month === m) || { income: 0, expense: 0 };
      return { month: m, income: r.income || 0, expense: r.expense || 0, profit: (r.income||0) - (r.expense||0) };
    });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions/categories
router.get('/categories', auth, async (req, res) => {
  try {
    const { type, year, month } = req.query;
    let q = knex('transactions')
      .where('type', type || 'expense')
      .select('category')
      .sum('amount as total')
      .count('id as count')
      .groupBy('category')
      .orderBy('total', 'desc');
    if (year && month) q = q.whereRaw(`strftime('%Y-%m', date) = ?`, [`${year}-${String(month).padStart(2,'0')}`]);
    res.json(await q);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions/expense-categories
router.get('/expense-categories', auth, async (req, res) => {
  try {
    res.json(await knex('expense_categories').orderBy('name'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/transactions
router.post('/', auth, async (req, res) => {
  try {
    const { type, category, amount, description, project_id, date, payment_method, reference } = req.body;
    if (!type || !category || !amount || !description)
      return res.status(400).json({ error: 'type, category, amount, description wajib diisi.' });
    const [id] = await knex('transactions').insert({
      type, category, amount: parseFloat(amount), description,
      project_id: project_id || null,
      date: date || new Date().toISOString().split('T')[0],
      payment_method: payment_method || 'transfer',
      reference: reference || null,
    });
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/transactions/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { type, category, amount, description, date, payment_method, reference } = req.body;
    await knex('transactions').where('id', req.params.id).update({
      type, category, amount: parseFloat(amount), description, date,
      payment_method: payment_method || 'transfer', reference: reference || null,
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/transactions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await knex('transactions').where('id', req.params.id).first();
    if (!tx)          return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    if (tx.invoice_id) return res.status(400).json({ error: 'Transaksi terkait invoice tidak dapat dihapus langsung.' });
    await knex('transactions').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions/export-csv?type=income&year=2025&month=1
router.get('/export-csv', auth, async (req, res) => {
  try {
    const { type, month, year, project_id } = req.query;
    let q = knex('transactions as t')
      .select('t.*', 'p.title as project_title')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .orderBy([{ column: 't.date', order: 'desc' }]);
    if (type)       q = q.where('t.type', type);
    if (project_id) q = q.where('t.project_id', project_id);
    if (month)      q = q.whereRaw(`strftime('%m', t.date) = ?`, [String(month).padStart(2,'0')]);
    if (year)       q = q.whereRaw(`strftime('%Y', t.date) = ?`, [String(year)]);

    const rows = await q;
    const cols = [
      { key: 'date',          label: 'Tanggal' },
      { key: 'type',          label: 'Jenis' },
      { key: 'category',      label: 'Kategori' },
      { key: 'description',   label: 'Deskripsi' },
      { key: 'amount',        label: 'Jumlah' },
      { key: 'payment_method',label: 'Metode' },
      { key: 'reference',     label: 'Referensi' },
      { key: 'project_title', label: 'Proyek' },
    ];
    const csv = toCSV(rows, cols);
    const filename = `transaksi${year ? '_' + year : ''}${month ? '_' + String(month).padStart(2,'0') : ''}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

