const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

/**
 * POST /api/payment/notification
 * Midtrans server-to-server webhook.
 * Verified using SHA-512 signature.
 */
router.post('/', express.json(), async (req, res) => {
  const payload = req.body;

  try {
    // 1. Log the raw notification immediately
    const logId = db.prepare(`
      INSERT INTO payment_notification_log
        (midtrans_order_id, transaction_status, fraud_status, raw_payload)
      VALUES (?, ?, ?, ?)
    `).run(
      payload.order_id || null,
      payload.transaction_status || null,
      payload.fraud_status || null,
      JSON.stringify(payload)
    ).lastInsertRowid;

    // 2. Verify signature (skip if server key not configured)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isConfigured = serverKey && !serverKey.includes('XXXX');

    if (isConfigured) {
      const signatureString = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
      const expectedSig = crypto.createHash('sha512').update(signatureString).digest('hex');

      if (payload.signature_key !== expectedSig) {
        console.warn('⚠️ Invalid Midtrans signature for order:', payload.order_id);
        db.prepare("UPDATE payment_notification_log SET processed = -1 WHERE id = ?").run(logId);
        return res.status(200).json({ status: 'ignored', reason: 'invalid_signature' });
      }
    }

    // 3. Find the invoice
    const invoice = db.prepare(
      "SELECT * FROM payment_invoices WHERE midtrans_order_id = ?"
    ).get(payload.order_id);

    if (!invoice) {
      console.warn('⚠️ No invoice found for order:', payload.order_id);
      db.prepare("UPDATE payment_notification_log SET processed = 2 WHERE id = ?").run(logId);
      return res.status(200).json({ status: 'ignored', reason: 'invoice_not_found' });
    }

    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    // 4. Determine effective payment status
    let newInvoiceStatus = invoice.status; // keep existing by default
    let markPaid = false;

    if (transactionStatus === 'capture') {
      markPaid = fraudStatus === 'accept' || fraudStatus === 'challenge';
      if (fraudStatus === 'challenge') newInvoiceStatus = 'challenge';
      else if (fraudStatus === 'accept') newInvoiceStatus = 'paid';
    } else if (transactionStatus === 'settlement') {
      newInvoiceStatus = 'paid';
      markPaid = true;
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      newInvoiceStatus = transactionStatus === 'cancel' ? 'cancelled'
        : transactionStatus === 'expire' ? 'expired' : 'failed';
    } else if (transactionStatus === 'pending') {
      newInvoiceStatus = 'pending';
    }

    // 5. If invoice already paid, skip to prevent duplicate
    if (invoice.status === 'paid' && newInvoiceStatus === 'paid') {
      console.log('ℹ️ Invoice already paid, skipping:', invoice.invoice_code);
      db.prepare("UPDATE payment_notification_log SET processed = 3 WHERE id = ?").run(logId);
      return res.status(200).json({ status: 'already_processed' });
    }

    // 6. Process in a transaction
    const processPayment = db.transaction(() => {
      // Update invoice status
      db.prepare(`
        UPDATE payment_invoices SET
          status = ?,
          midtrans_transaction_id = COALESCE(?, midtrans_transaction_id),
          payment_method_used = COALESCE(?, payment_method_used),
          raw_notification = ?,
          paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newInvoiceStatus,
        payload.transaction_id || null,
        payload.payment_type || null,
        JSON.stringify(payload),
        newInvoiceStatus,
        invoice.id
      );

      // 7. Auto-reconcile: create income transaction + update project
      if (markPaid && newInvoiceStatus === 'paid') {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(invoice.project_id);
        if (!project) return;

        // Check if already reconciled
        if (invoice.reconciled) return;

        const categoryMap = { dp: 'DP Proyek', remaining: 'Pelunasan Proyek', full: 'Pembayaran Proyek', custom: 'Pembayaran Proyek' };
        const category = categoryMap[invoice.payment_type] || 'Pembayaran Proyek';

        const txCode = `TRX-ONLINE-${uuidv4().substring(0,8).toUpperCase()}`;
        const txInfo = db.prepare(`
          INSERT INTO transactions
            (transaction_code, type, category, amount, description, reference_project_id,
             transaction_date, payment_method, notes, source, online_payment_id, reconciled)
          VALUES (?, 'income', ?, ?, ?, ?, date('now'), ?, 'Auto-reconciled dari pembayaran online', 'online', ?, 1)
        `).run(
          txCode, category, invoice.amount,
          `[Online] ${invoice.description || invoice.invoice_code} via ${payload.payment_type || 'gateway'}`,
          invoice.project_id,
          payload.payment_type || 'transfer',
          invoice.midtrans_order_id
        );

        // Mark invoice as reconciled
        db.prepare(`
          UPDATE payment_invoices SET
            reconciled = 1,
            reconciled_transaction_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(txInfo.lastInsertRowid, invoice.id);

        // Update project payment amounts
        if (invoice.payment_type === 'dp') {
          db.prepare('UPDATE projects SET dp_paid = dp_paid + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(invoice.amount, invoice.project_id);
        } else {
          db.prepare('UPDATE projects SET remaining_paid = remaining_paid + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(invoice.amount, invoice.project_id);
        }

        // Auto-update project status
        const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(invoice.project_id);
        const totalPaid = updatedProject.dp_paid + updatedProject.remaining_paid;
        let newStatus = updatedProject.status;

        if (totalPaid >= updatedProject.total_value) {
          newStatus = 'paid_off';
        } else if (updatedProject.dp_paid >= updatedProject.dp_amount && updatedProject.dp_amount > 0) {
          if (newStatus === 'pending') newStatus = 'dp_paid';
        }

        if (newStatus !== updatedProject.status) {
          db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newStatus, invoice.project_id);
        }
      }
    });

    processPayment();

    db.prepare("UPDATE payment_notification_log SET processed = 1 WHERE id = ?").run(logId);
    console.log(`✅ Payment notification processed: ${payload.order_id} → ${newInvoiceStatus}`);

    // Midtrans expects HTTP 200
    res.status(200).json({ status: 'ok' });

  } catch (err) {
    console.error('Payment notification error:', err);
    res.status(200).json({ status: 'error', message: err.message });
  }
});

// GET /api/payment/notification/logs — admin view notification history
router.get('/logs', (req, res) => {
  // Check auth manually (this route doesn't go through requireAuth middleware)
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const logs = db.prepare(
    'SELECT * FROM payment_notification_log ORDER BY received_at DESC LIMIT 50'
  ).all();
  res.json(logs);
});

module.exports = router;

