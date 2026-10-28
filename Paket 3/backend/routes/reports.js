const express = require('express');
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

// GET /api/reports/monthly?year=2024&month=1
router.get('/monthly', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthStart = `${monthStr}-01`;
  const nextMonthDate = new Date(year, month, 1);
  const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth()+1).padStart(2,'0')}-01`;

  // Income by category
  const incomeByCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income' AND transaction_date >= ? AND transaction_date < ?
    GROUP BY category ORDER BY total DESC
  `).all(monthStart, monthEnd);

  // Expense by category
  const expenseByCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'expense' AND transaction_date >= ? AND transaction_date < ?
    GROUP BY category ORDER BY total DESC
  `).all(monthStart, monthEnd);

  // Total summary
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as total_expense,
      COUNT(CASE WHEN type='income' THEN 1 END) as income_count,
      COUNT(CASE WHEN type='expense' THEN 1 END) as expense_count
    FROM transactions
    WHERE transaction_date >= ? AND transaction_date < ?
  `).get(monthStart, monthEnd);

  // Daily breakdown for chart
  const dailyData = db.prepare(`
    SELECT
      transaction_date,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE transaction_date >= ? AND transaction_date < ?
    GROUP BY transaction_date ORDER BY transaction_date ASC
  `).all(monthStart, monthEnd);

  // All transactions this month
  const transactions = db.prepare(`
    SELECT t.*, p.title as project_title, p.project_code
    FROM transactions t
    LEFT JOIN projects p ON t.reference_project_id = p.id
    WHERE t.transaction_date >= ? AND t.transaction_date < ?
    ORDER BY t.transaction_date DESC
  `).all(monthStart, monthEnd);

  res.json({
    period: { year, month, monthStr },
    summary: { ...summary, net: summary.total_income - summary.total_expense },
    incomeByCategory,
    expenseByCategory,
    dailyData,
    transactions
  });
});

// GET /api/reports/annual?year=2024
router.get('/annual', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const monthlyBreakdown = db.prepare(`
    SELECT
      strftime('%m', transaction_date) as month,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE strftime('%Y', transaction_date) = ?
    GROUP BY strftime('%m', transaction_date)
    ORDER BY month ASC
  `).all(String(year));

  const annualSummary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as total_expense
    FROM transactions
    WHERE strftime('%Y', transaction_date) = ?
  `).get(String(year));

  const categoryBreakdown = db.prepare(`
    SELECT type, category, SUM(amount) as total
    FROM transactions
    WHERE strftime('%Y', transaction_date) = ?
    GROUP BY type, category ORDER BY type, total DESC
  `).all(String(year));

  res.json({
    year,
    summary: { ...annualSummary, net: annualSummary.total_income - annualSummary.total_expense },
    monthlyBreakdown,
    categoryBreakdown
  });
});

// GET /api/reports/projects — project financial summary
router.get('/projects', (req, res) => {
  const { status, year } = req.query;
  let where = [];
  let params = [];

  if (status) { where.push("p.status = ?"); params.push(status); }
  if (year) {
    where.push("strftime('%Y', p.created_at) = ?");
    params.push(String(year));
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const projects = db.prepare(`
    SELECT
      p.*,
      c.name as client_name,
      (p.dp_paid + p.remaining_paid) as total_paid,
      (p.total_value - p.dp_paid - p.remaining_paid) as outstanding,
      ROUND((p.dp_paid + p.remaining_paid) * 100.0 / NULLIF(p.total_value, 0), 1) as payment_pct
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `).all(...params);

  const projectSummary = db.prepare(`
    SELECT
      COUNT(*) as total_projects,
      COALESCE(SUM(total_value),0) as total_value,
      COALESCE(SUM(dp_paid + remaining_paid),0) as total_collected,
      COALESCE(SUM(total_value - dp_paid - remaining_paid),0) as total_outstanding,
      COUNT(CASE WHEN status='paid_off' THEN 1 END) as fully_paid,
      COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count
    FROM projects p ${whereClause}
  `).get(...params);

  res.json({ projects, summary: projectSummary });
});

// GET /api/reports/reconciliation — reconciliation status
router.get('/reconciliation', (req, res) => {
  // Online invoices paid but not reconciled
  const unreconciled = db.prepare(`
    SELECT i.*, p.title as project_title, p.project_code, c.name as client_name
    FROM payment_invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE i.status = 'paid' AND i.reconciled = 0
  `).all();

  // Reconciled invoices
  const reconciled = db.prepare(`
    SELECT i.*, p.title as project_title, p.project_code, c.name as client_name,
      t.transaction_code, t.created_at as reconciled_at
    FROM payment_invoices i
    JOIN projects p ON i.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN transactions t ON i.reconciled_transaction_id = t.id
    WHERE i.status = 'paid' AND i.reconciled = 1
    ORDER BY i.paid_at DESC LIMIT 30
  `).all();

  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status='paid' AND reconciled=1 THEN 1 END) as reconciled_count,
      COUNT(CASE WHEN status='paid' AND reconciled=0 THEN 1 END) as unreconciled_count,
      COALESCE(SUM(CASE WHEN status='paid' AND reconciled=1 THEN amount ELSE 0 END),0) as reconciled_amount,
      COALESCE(SUM(CASE WHEN status='paid' AND reconciled=0 THEN amount ELSE 0 END),0) as unreconciled_amount
    FROM payment_invoices
  `).get();

  res.json({ stats, unreconciled, reconciled });
});

// POST /api/reports/reconciliation/:invoiceId/manual — manual reconcile
router.post('/reconciliation/:invoiceId/manual', (req, res) => {
  const inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(req.params.invoiceId);
  if (!inv) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
  if (inv.status !== 'paid') return res.status(400).json({ error: 'Hanya invoice paid yang bisa direkonsiliasi' });
  if (inv.reconciled) return res.status(400).json({ error: 'Invoice sudah direkonsiliasi' });

  const { transaction_date, notes } = req.body;

  const doReconcile = db.transaction(() => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(inv.project_id);
    const categoryMap = { dp: 'DP Proyek', remaining: 'Pelunasan Proyek', full: 'Pembayaran Proyek', custom: 'Pembayaran Proyek' };
    const category = categoryMap[inv.payment_type] || 'Pembayaran Proyek';

    const txCode = `TRX-REC-${Date.now()}`;
    const txInfo = db.prepare(`
      INSERT INTO transactions
        (transaction_code, type, category, amount, description, reference_project_id,
         transaction_date, payment_method, notes, source, online_payment_id, reconciled)
      VALUES (?, 'income', ?, ?, ?, ?, ?, 'transfer', ?, 'online', ?, 1)
    `).run(
      txCode, category, inv.amount,
      `[Rekonsiliasi Manual] ${inv.invoice_code}`,
      inv.project_id,
      transaction_date || new Date().toISOString().split('T')[0],
      notes || null,
      inv.midtrans_order_id
    );

    db.prepare(`
      UPDATE payment_invoices SET reconciled=1, reconciled_transaction_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(txInfo.lastInsertRowid, inv.id);

    // Update project
    if (inv.payment_type === 'dp') {
      db.prepare('UPDATE projects SET dp_paid = dp_paid + ?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(inv.amount, inv.project_id);
    } else {
      db.prepare('UPDATE projects SET remaining_paid = remaining_paid + ?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(inv.amount, inv.project_id);
    }

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id=?').get(inv.project_id);
    const totalPaid = updatedProject.dp_paid + updatedProject.remaining_paid;
    if (totalPaid >= updatedProject.total_value) {
      db.prepare("UPDATE projects SET status='paid_off', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(inv.project_id);
    }
  });

  doReconcile();
  res.json({ success: true });
});

// GET /api/reports/export-csv?type=monthly&year=2025&month=1
router.get('/export-csv', (req, res) => {
  const { type = 'transactions', year, month } = req.query;

  if (type === 'projects') {
    const projects = db.prepare(`
      SELECT p.project_code, c.name as client_name, p.title, p.project_type,
        p.total_value, p.dp_paid, p.remaining_paid,
        (p.dp_paid + p.remaining_paid) as total_paid,
        (p.total_value - p.dp_paid - p.remaining_paid) as outstanding,
        p.status, p.event_date, p.created_at
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `).all();

    const cols = [
      { key: 'project_code',  label: 'Kode Proyek' },
      { key: 'client_name',   label: 'Klien' },
      { key: 'title',         label: 'Nama Proyek' },
      { key: 'project_type',  label: 'Jenis' },
      { key: 'total_value',   label: 'Nilai Total' },
      { key: 'dp_paid',       label: 'DP Terbayar' },
      { key: 'total_paid',    label: 'Total Dibayar' },
      { key: 'outstanding',   label: 'Sisa Tagihan' },
      { key: 'status',        label: 'Status' },
      { key: 'event_date',    label: 'Tanggal Event' },
    ];
    const csv = toCSV(projects, cols);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan_proyek.csv"`);
    return res.send(csv);
  }

  // Default: monthly/annual transactions
  let where = [];
  let params = [];
  if (year)  { where.push("strftime('%Y', transaction_date) = ?"); params.push(String(year)); }
  if (month) { where.push("strftime('%m', transaction_date) = ?"); params.push(String(month).padStart(2,'0')); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT t.transaction_date, t.transaction_code, t.type, t.category, t.description,
      t.amount, t.payment_method, t.source, p.title as project_title
    FROM transactions t
    LEFT JOIN projects p ON t.reference_project_id = p.id
    ${whereClause}
    ORDER BY t.transaction_date DESC
  `).all(...params);

  const cols = [
    { key: 'transaction_date', label: 'Tanggal' },
    { key: 'transaction_code', label: 'Kode' },
    { key: 'type',             label: 'Jenis' },
    { key: 'category',         label: 'Kategori' },
    { key: 'description',      label: 'Deskripsi' },
    { key: 'amount',           label: 'Jumlah' },
    { key: 'payment_method',   label: 'Metode' },
    { key: 'source',           label: 'Sumber' },
    { key: 'project_title',    label: 'Proyek' },
  ];

  const csv = toCSV(rows, cols);
  const yearStr = year ? `_${year}` : '';
  const monthStr = month ? `_${String(month).padStart(2,'0')}` : '';
  const filename = `laporan${yearStr}${monthStr}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = router;

