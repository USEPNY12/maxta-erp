const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');
const pool = require('../config/database');

// Send Quote to Customer
router.post('/quote/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendQuote(req.params.id, req.user.id);
    await pool.query("UPDATE quotes SET email_sent = 1, email_sent_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('quotes', req.params.id, 'EMAIL', null, { action: 'email_sent' });
    res.json({ success: true, message: 'Quote emailed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Order Confirmation to Customer
router.post('/order-confirmation/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendOrderConfirmation(req.params.id, req.user.id);
    await pool.query("UPDATE sales_orders SET email_sent = 1, email_sent_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('sales_orders', req.params.id, 'EMAIL', null, { action: 'confirmation_sent' });
    res.json({ success: true, message: 'Order confirmation emailed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Invoice to Customer
router.post('/invoice/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendInvoice(req.params.id, req.user.id);
    await pool.query("UPDATE ar_invoices SET email_sent = 1, email_sent_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('ar_invoices', req.params.id, 'EMAIL', null, { action: 'invoice_sent' });
    res.json({ success: true, message: 'Invoice emailed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Purchase Order to Vendor
router.post('/purchase-order/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendPurchaseOrder(req.params.id, req.user.id);
    await pool.query("UPDATE purchase_orders SET email_sent = 1, email_sent_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'EMAIL', null, { action: 'po_sent_to_vendor' });
    res.json({ success: true, message: 'Purchase Order emailed to vendor successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Packing List to Customer
router.post('/packing-list/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendPackingList(req.params.id, req.user.id);
    await pool.query("UPDATE shipments SET email_sent = 1, email_sent_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('shipments', req.params.id, 'EMAIL', null, { action: 'packing_list_sent' });
    res.json({ success: true, message: 'Packing list emailed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Credit Memo to Customer
router.post('/credit-memo/:id', authenticate, async (req, res) => {
  try {
    await emailService.sendCreditMemo(req.params.id, req.user.id);
    await req.audit('credit_memos', req.params.id, 'EMAIL', null, { action: 'credit_memo_sent' });
    res.json({ success: true, message: 'Credit memo emailed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get email log for a document
router.get('/log/:documentType/:documentId', authenticate, async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT el.*, u.username, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as sent_by_name 
       FROM email_log el LEFT JOIN users u ON el.sent_by = u.id
       WHERE el.document_type = ? AND el.document_id = ?
       ORDER BY el.sent_at DESC`,
      [req.params.documentType, req.params.documentId]
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
