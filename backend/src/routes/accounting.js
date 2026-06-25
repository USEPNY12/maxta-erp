const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');

// ============ GL ACCOUNTS (Chart of Accounts) ============
router.get('/gl-accounts', authenticate, async (req, res) => {
  try {
    const { account_type, search } = req.query;
    let query = 'SELECT * FROM gl_accounts WHERE 1=1';
    const params = [];
    if (account_type) { query += ' AND account_type = ?'; params.push(account_type); }
    if (search) { query += ' AND (account_number LIKE ? OR account_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY account_number';
    const [accounts] = await pool.query(query, params);
    res.json(accounts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/gl-accounts', authenticate, async (req, res) => {
  try {
    const { account_number, account_name, account_type, sub_type, parent_account_id, description, is_active } = req.body;
    const [result] = await pool.query(
      'INSERT INTO gl_accounts (account_number, account_name, account_type, sub_type, parent_account_id, description, is_active) VALUES (?,?,?,?,?,?,?)',
      [account_number, account_name, account_type, sub_type, parent_account_id, description, is_active !== false]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ JOURNAL VOUCHERS ============
router.get('/journal-vouchers', authenticate, async (req, res) => {
  try {
    const { status, period } = req.query;
    let query = 'SELECT jv.*, u.first_name, u.last_name FROM journal_vouchers jv LEFT JOIN users u ON jv.created_by = u.id WHERE 1=1';
    const params = [];
    if (status) { query += ' AND jv.status = ?'; params.push(status); }
    if (period) { query += ' AND jv.period = ?'; params.push(period); }
    query += ' ORDER BY jv.voucher_date DESC LIMIT 100';
    const [vouchers] = await pool.query(query, params);
    res.json(vouchers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/journal-vouchers/:id', authenticate, async (req, res) => {
  try {
    const [vouchers] = await pool.query('SELECT * FROM journal_vouchers WHERE id = ?', [req.params.id]);
    if (vouchers.length === 0) return res.status(404).json({ error: 'Journal voucher not found' });
    const [lines] = await pool.query(`
      SELECT jvl.*, ga.account_number, ga.account_name FROM journal_voucher_lines jvl 
      JOIN gl_accounts ga ON jvl.gl_account_id = ga.id WHERE jvl.journal_voucher_id = ? ORDER BY jvl.line_number`, [req.params.id]);
    res.json({ ...vouchers[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/journal-vouchers', authenticate, async (req, res) => {
  try {
    const voucherNumber = await getNextNumber('journal_voucher');
    const { voucher_date, period, memo, reference, lines } = req.body;

    // Validate debits = credits
    let totalDebit = 0, totalCredit = 0;
    if (lines) {
      lines.forEach(l => { totalDebit += (l.debit || 0); totalCredit += (l.credit || 0); });
    }
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: `Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)})` });
    }

    const [result] = await pool.query(
      "INSERT INTO journal_vouchers (voucher_number, voucher_date, period, memo, reference, total_debit, total_credit, status, created_by) VALUES (?,?,?,?,?,?,?,'draft',?)",
      [voucherNumber, voucher_date || new Date(), period, memo, reference, totalDebit, totalCredit, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await pool.query(
          'INSERT INTO journal_voucher_lines (journal_voucher_id, line_number, gl_account_id, debit, credit, memo) VALUES (?,?,?,?,?,?)',
          [result.insertId, i + 1, l.gl_account_id, l.debit || 0, l.credit || 0, l.memo]
        );
      }
    }
    res.status(201).json({ id: result.insertId, voucher_number: voucherNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post journal voucher
router.post('/journal-vouchers/:id/post', authenticate, async (req, res) => {
  try {
    const [vouchers] = await pool.query('SELECT * FROM journal_vouchers WHERE id = ? AND status = "draft"', [req.params.id]);
    if (vouchers.length === 0) return res.status(400).json({ error: 'Voucher not found or already posted' });

    const [lines] = await pool.query('SELECT * FROM journal_voucher_lines WHERE journal_voucher_id = ?', [req.params.id]);
    
    // Post to GL
    for (const line of lines) {
      await pool.query(
        'INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, source_type, source_id, memo, posted_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [line.gl_account_id, vouchers[0].voucher_date, vouchers[0].period, line.debit, line.credit, 'journal_voucher', req.params.id, line.memo, req.user.id]
      );
      // Update account balance
      const netAmount = (line.debit || 0) - (line.credit || 0);
      await pool.query('UPDATE gl_accounts SET balance = balance + ? WHERE id = ?', [netAmount, line.gl_account_id]);
    }

    await pool.query("UPDATE journal_vouchers SET status = 'posted', posted_date = NOW(), posted_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    res.json({ message: 'Journal voucher posted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AR INVOICES ============
router.get('/ar-invoices', authenticate, async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let query = 'SELECT ari.*, c.company_name as customer_name FROM ar_invoices ari JOIN customers c ON ari.customer_id = c.id WHERE 1=1';
    const params = [];
    if (status) { query += ' AND ari.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND ari.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY ari.invoice_date DESC LIMIT 100';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/ar-invoices', authenticate, async (req, res) => {
  try {
    const invoiceNumber = await getNextNumber('ar_invoice');
    const { customer_id, sales_order_id, shipment_id, invoice_date, due_date, subtotal, tax_amount, freight, total, notes } = req.body;
    const balance = total || ((subtotal || 0) + (tax_amount || 0) + (freight || 0));
    const [result] = await pool.query(
      `INSERT INTO ar_invoices (invoice_number, customer_id, sales_order_id, shipment_id, invoice_date, due_date, subtotal, tax_amount, freight, total, balance, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'open',?)`,
      [invoiceNumber, customer_id, sales_order_id, shipment_id, invoice_date || new Date(), due_date, subtotal, tax_amount || 0, freight || 0, balance, balance, notes, req.user.id]
    );
    res.status(201).json({ id: result.insertId, invoice_number: invoiceNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ CUSTOMER PAYMENTS ============
router.get('/customer-payments', authenticate, async (req, res) => {
  try {
    const [payments] = await pool.query(`
      SELECT cp.*, c.company_name as customer_name FROM customer_payments cp 
      JOIN customers c ON cp.customer_id = c.id ORDER BY cp.payment_date DESC LIMIT 100`);
    res.json(payments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/customer-payments', authenticate, async (req, res) => {
  try {
    const paymentNumber = await getNextNumber('payment');
    const { customer_id, payment_date, amount, payment_method, reference_number, bank_account_id, notes, applied_invoices } = req.body;

    const [result] = await pool.query(
      'INSERT INTO customer_payments (payment_number, customer_id, payment_date, amount, payment_method, reference_number, bank_account_id, notes, received_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [paymentNumber, customer_id, payment_date || new Date(), amount, payment_method, reference_number, bank_account_id, notes, req.user.id]
    );

    // Apply to invoices
    if (applied_invoices && applied_invoices.length > 0) {
      for (const ai of applied_invoices) {
        await pool.query(
          'INSERT INTO payment_applications (payment_id, ar_invoice_id, amount_applied) VALUES (?,?,?)',
          [result.insertId, ai.invoice_id, ai.amount]
        );
        await pool.query('UPDATE ar_invoices SET balance = balance - ?, amount_paid = amount_paid + ? WHERE id = ?', [ai.amount, ai.amount, ai.invoice_id]);
        // Check if fully paid
        await pool.query("UPDATE ar_invoices SET status = 'paid' WHERE id = ? AND balance <= 0", [ai.invoice_id]);
      }
    }
    res.status(201).json({ id: result.insertId, payment_number: paymentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BANK ACCOUNTS ============
router.get('/bank-accounts', authenticate, async (req, res) => {
  try {
    const [accounts] = await pool.query('SELECT * FROM bank_accounts WHERE is_active = TRUE ORDER BY account_name');
    res.json(accounts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BANK RECONCILIATION ============
router.get('/bank-reconciliation', authenticate, async (req, res) => {
  try {
    const { bank_account_id, status } = req.query;
    let query = 'SELECT br.*, ba.account_name FROM bank_reconciliations br JOIN bank_accounts ba ON br.bank_account_id = ba.id WHERE 1=1';
    const params = [];
    if (bank_account_id) { query += ' AND br.bank_account_id = ?'; params.push(bank_account_id); }
    if (status) { query += ' AND br.status = ?'; params.push(status); }
    query += ' ORDER BY br.statement_date DESC';
    const [recons] = await pool.query(query, params);
    res.json(recons);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ DASHBOARD ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openAR] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE status = 'open'");
    const [openAP] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ap_invoices WHERE status = 'open'");
    const [bankBalance] = await pool.query("SELECT COALESCE(SUM(current_balance),0) as total FROM bank_accounts WHERE is_active = TRUE");
    const [mtdRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM ar_invoices WHERE MONTH(invoice_date) = MONTH(NOW()) AND YEAR(invoice_date) = YEAR(NOW())");
    const [ytdRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM ar_invoices WHERE YEAR(invoice_date) = YEAR(NOW())");
    const [overdueAR] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE due_date < CURDATE() AND status = 'open'");
    
    // AR Aging
    const [arCurrent] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE status='open' AND DATEDIFF(CURDATE(), due_date) <= 0");
    const [ar30] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE status='open' AND DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30");
    const [ar60] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE status='open' AND DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60");
    const [ar90] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ar_invoices WHERE status='open' AND DATEDIFF(CURDATE(), due_date) > 60");

    res.json({
      open_ar: openAR[0].total, open_ap: openAP[0].total, bank_balance: bankBalance[0].total,
      mtd_revenue: mtdRevenue[0].total, ytd_revenue: ytdRevenue[0].total, overdue_ar: overdueAR[0].total,
      ar_aging: { current: arCurrent[0].total, days_30: ar30[0].total, days_60: ar60[0].total, days_90_plus: ar90[0].total }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
