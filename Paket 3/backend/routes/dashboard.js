const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/dashboard — summary stats
router.get('/', (req, res) => {
  try {
    // Current month range
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Total balance (all time income - expense)
    const totalIncome = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income'"
    ).get().total;

    const totalExpense = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense'"
    ).get().total;

    const balance = totalIncome - totalExpense;

    // This month
    const monthIncome = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND transaction_date >= ? AND transaction_date < ?"
    ).get(monthStart, monthEnd).total;

    const monthExpense = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND transaction_date >= ? AND transaction_date < ?"
    ).get(monthStart, monthEnd).total;

    // Projects summary
    const projectStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('dp_paid','in_progress','done') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'paid_off' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(total_value),0) as total_value,
        COALESCE(SUM(dp_paid + remaining_paid),0) as total_collected,
        COALESCE(SUM(total_value - dp_paid - remaining_paid),0) as total_outstanding
      FROM projects WHERE status != 'cancelled'
    `).get();

    // Pending invoices (unpaid online invoices)
    const pendingInvoices = db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payment_invoices WHERE status='pending'"
    ).get();

    // Recent transactions (last 7)
    const recentTransactions = db.prepare(`
      SELECT t.*, p.title as project_title, p.project_code
      FROM transactions t
      LEFT JOIN projects p ON t.reference_project_id = p.id
      ORDER BY t.created_at DESC LIMIT 7
    `).all();

    // Recent projects (last 5)
    const recentProjects = db.prepare(`
      SELECT p.*, c.name as client_name
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC LIMIT 5
    `).all();

    // Monthly chart data (last 6 months)
    const monthlyData = db.prepare(`
      SELECT
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `).all();

    res.json({
      balance,
      totalIncome,
      totalExpense,
      monthIncome,
      monthExpense,
      projectStats,
      pendingInvoices,
      recentTransactions,
      recentProjects,
      monthlyData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data dashboard' });
  }
});

module.exports = router;

