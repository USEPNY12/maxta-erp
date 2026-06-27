const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const { preventDelete } = require('../middleware/documentLock');
const GLService = require('../services/glService');

// ============ GL ACCOUNTS (Chart of Accounts) ============
router.get('/gl-accounts', authenticate, async (req, res) => {
  try {
    const { account_type, search, is_active } = req.query;
    let query = 'SELECT * FROM gl_accounts WHERE 1=1';
    const params = [];
    if (account_type) { query += ' AND account_type = ?'; params.push(account_type); }
    if (search) { query += ' AND (account_number LIKE ? OR account_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (is_active !== undefined) { query += ' AND is_active = ?'; params.push(is_active === 'true'); }
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
    await req.audit('gl_accounts', result.insertId, 'INSERT', null, { account_number, account_name, account_type });
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/gl-accounts/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM gl_accounts WHERE id = ?', [req.params.id]);
    const fields = req.body;
    delete fields.id; delete fields.created_at;
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE gl_accounts SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    await req.audit('gl_accounts', req.params.id, 'UPDATE', old[0], fields);
    res.json({ message: 'GL Account updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ GL TRANSACTIONS ============
router.get('/gl-transactions', authenticate, async (req, res) => {
  try {
    const { account_id, period, date_from, date_to, source_type } = req.query;
    let query = `SELECT glt.*, ga.account_number, ga.account_name FROM gl_transactions glt 
                 JOIN gl_accounts ga ON glt.gl_account_id = ga.id WHERE 1=1`;
    const params = [];
    if (account_id) { query += ' AND glt.gl_account_id = ?'; params.push(account_id); }
    if (period) { query += ' AND glt.period = ?'; params.push(period); }
    if (date_from) { query += ' AND glt.transaction_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND glt.transaction_date <= ?'; params.push(date_to); }
    if (source_type) { query += ' AND glt.source_type = ?'; params.push(source_type); }
    query += ' ORDER BY glt.transaction_date DESC, glt.id DESC LIMIT 500';
    const [transactions] = await pool.query(query, params);
    res.json(transactions);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ JOURNAL VOUCHERS ============
router.get('/journal-vouchers', authenticate, async (req, res) => {
  try {
    const { status, period } = req.query;
    let query = 'SELECT jv.*, u.first_name, u.last_name FROM journal_vouchers jv LEFT JOIN users u ON jv.created_by = u.id WHERE 1=1';
    const params = [];
    if (status && status !== 'all') { query += ' AND jv.status = ?'; params.push(status); }
    if (period) { query += ' AND jv.period = ?'; params.push(period); }
    query += ' ORDER BY jv.voucher_date DESC LIMIT 200';
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
        const accountId = l.gl_account_id || l.account_id;
        const lineMemo = l.memo || l.description || '';
        await pool.query(
          'INSERT INTO journal_voucher_lines (journal_voucher_id, line_number, gl_account_id, debit, credit, memo) VALUES (?,?,?,?,?,?)',
          [result.insertId, i + 1, accountId, l.debit || 0, l.credit || 0, lineMemo]
        );
      }
    }
    await req.audit('journal_vouchers', result.insertId, 'INSERT', null, { voucher_number: voucherNumber, total_debit: totalDebit });
    res.status(201).json({ id: result.insertId, voucher_number: voucherNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post journal voucher (locks it and posts to GL)
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
      await pool.query('UPDATE gl_accounts SET balance = COALESCE(balance,0) + ? WHERE id = ?', [netAmount, line.gl_account_id]);
    }

    await pool.query("UPDATE journal_vouchers SET status = 'posted', posted_date = NOW(), posted_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('journal_vouchers', req.params.id, 'POST', { status: 'draft' }, { status: 'posted' });
    res.json({ message: 'Journal voucher posted successfully. It is now locked.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Reverse a posted JV (creates a new reversing JV)
router.post('/journal-vouchers/:id/reverse', authenticate, async (req, res) => {
  try {
    const [vouchers] = await pool.query('SELECT * FROM journal_vouchers WHERE id = ? AND status = "posted"', [req.params.id]);
    if (vouchers.length === 0) return res.status(400).json({ error: 'Only posted vouchers can be reversed' });

    const reverseNumber = await getNextNumber('journal_voucher');
    const [lines] = await pool.query('SELECT * FROM journal_voucher_lines WHERE journal_voucher_id = ?', [req.params.id]);

    // Create reversing JV
    const [result] = await pool.query(
      "INSERT INTO journal_vouchers (voucher_number, voucher_date, period, memo, reference, total_debit, total_credit, status, created_by, reversing_id) VALUES (?,NOW(),?,?,?,?,?,'posted',?,?)",
      [reverseNumber, vouchers[0].period, `Reversal of ${vouchers[0].voucher_number}`, vouchers[0].voucher_number, vouchers[0].total_credit, vouchers[0].total_debit, req.user.id, req.params.id]
    );

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await pool.query(
        'INSERT INTO journal_voucher_lines (journal_voucher_id, line_number, gl_account_id, debit, credit, memo) VALUES (?,?,?,?,?,?)',
        [result.insertId, i + 1, l.gl_account_id, l.credit, l.debit, `Reversal: ${l.memo || ''}`]
      );
      // Post reversal to GL
      await pool.query(
        'INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, source_type, source_id, memo, posted_by) VALUES (?,NOW(),?,?,?,?,?,?,?)',
        [l.gl_account_id, vouchers[0].period, l.credit, l.debit, 'journal_voucher', result.insertId, `Reversal: ${l.memo || ''}`, req.user.id]
      );
      const netAmount = (l.credit || 0) - (l.debit || 0);
      await pool.query('UPDATE gl_accounts SET balance = COALESCE(balance,0) + ? WHERE id = ?', [netAmount, l.gl_account_id]);
    }

    await pool.query("UPDATE journal_vouchers SET status = 'reversed' WHERE id = ?", [req.params.id]);
    await req.audit('journal_vouchers', req.params.id, 'REVERSE', { status: 'posted' }, { status: 'reversed', reversing_jv: reverseNumber });
    res.json({ id: result.insertId, voucher_number: reverseNumber, message: 'Reversal JV created and posted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// JVs cannot be deleted
router.delete('/journal-vouchers/:id', authenticate, preventDelete('journal_vouchers'));

// ============ CUSTOMER PAYMENTS ============
router.get('/customer-payments', authenticate, async (req, res) => {
  try {
    const { customer_id, date_from, date_to, payment_method } = req.query;
    let query = `SELECT cp.*, c.company_name as customer_name FROM customer_payments cp 
      JOIN customers c ON cp.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (customer_id) { query += ' AND cp.customer_id = ?'; params.push(customer_id); }
    if (date_from) { query += ' AND cp.payment_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND cp.payment_date <= ?'; params.push(date_to); }
    if (payment_method) { query += ' AND cp.payment_method = ?'; params.push(payment_method); }
    query += ' ORDER BY cp.payment_date DESC LIMIT 200';
    const [payments] = await pool.query(query, params);
    res.json(payments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/customer-payments', authenticate, async (req, res) => {
  try {
    const paymentNumber = await getNextNumber('payment');
    const { customer_id, payment_date, amount, payment_method, reference_number, bank_account_id, notes, applied_invoices } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Payment amount must be greater than 0' });

    const [result] = await pool.query(
      'INSERT INTO customer_payments (payment_number, customer_id, payment_date, amount, payment_method, reference_number, bank_account_id, notes, status, received_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [paymentNumber, customer_id, payment_date || new Date(), amount, payment_method || 'check', reference_number, bank_account_id, notes, 'posted', req.user.id]
    );

    // Apply to invoices
    let totalApplied = 0;
    if (applied_invoices && applied_invoices.length > 0) {
      for (const ai of applied_invoices) {
        await pool.query(
          'INSERT INTO payment_applications (payment_id, ar_invoice_id, amount_applied) VALUES (?,?,?)',
          [result.insertId, ai.invoice_id, ai.amount]
        );
        await pool.query('UPDATE ar_invoices SET amount_paid = COALESCE(amount_paid,0) + ? WHERE id = ?', [ai.amount, ai.invoice_id]);
        // Check if fully paid
        const [inv] = await pool.query('SELECT total, COALESCE(amount_paid,0) as amount_paid FROM ar_invoices WHERE id = ?', [ai.invoice_id]);
        if (inv.length && inv[0].amount_paid >= inv[0].total) {
          await pool.query("UPDATE ar_invoices SET status = 'paid' WHERE id = ?", [ai.invoice_id]);
        } else {
          await pool.query("UPDATE ar_invoices SET status = 'partial' WHERE id = ?", [ai.invoice_id]);
        }
        totalApplied += ai.amount;
      }
    }

    // Update bank balance
    if (bank_account_id) {
      await pool.query('UPDATE bank_accounts SET current_balance = COALESCE(current_balance,0) + ? WHERE id = ?', [amount, bank_account_id]);
    }

    await req.audit('customer_payments', result.insertId, 'INSERT', null, { payment_number: paymentNumber, customer_id, amount, payment_method, applied: totalApplied });
    res.status(201).json({ id: result.insertId, payment_number: paymentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Customer payments cannot be deleted
router.delete('/customer-payments/:id', authenticate, preventDelete('customer_payments'));

// ============ VENDOR PAYMENTS ============
router.get('/vendor-payments', authenticate, async (req, res) => {
  try {
    const { vendor_id, date_from, date_to, payment_method, status } = req.query;
    let query = `SELECT vp.*, v.company_name as vendor_name FROM vendor_payments vp 
      JOIN vendors v ON vp.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (vendor_id) { query += ' AND vp.vendor_id = ?'; params.push(vendor_id); }
    if (date_from) { query += ' AND vp.payment_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND vp.payment_date <= ?'; params.push(date_to); }
    if (payment_method) { query += ' AND vp.payment_method = ?'; params.push(payment_method); }
    if (status && status !== 'all') { query += ' AND vp.status = ?'; params.push(status); }
    query += ' ORDER BY vp.payment_date DESC LIMIT 200';
    const [payments] = await pool.query(query, params);
    res.json(payments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/vendor-payments', authenticate, async (req, res) => {
  try {
    const paymentNumber = await getNextNumber('vendor_payment');
    const { vendor_id, payment_date, amount, payment_method, check_number, bank_id, ap_invoice_id, notes } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Payment amount must be greater than 0' });

    const [result] = await pool.query(
      `INSERT INTO vendor_payments (payment_number, vendor_id, payment_date, amount, payment_method, check_number, bank_id, ap_invoice_id, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,'posted',?)`,
      [paymentNumber, vendor_id, payment_date || new Date(), amount, payment_method || 'check', check_number, bank_id, ap_invoice_id, notes, req.user.id]
    );

    // Apply payment to AP invoice
    if (ap_invoice_id) {
      await pool.query('UPDATE ap_invoices SET amount_paid = COALESCE(amount_paid,0) + ?, balance = GREATEST(0, balance - ?) WHERE id = ?', [amount, amount, ap_invoice_id]);
      const [inv] = await pool.query('SELECT total, COALESCE(amount_paid,0) as amount_paid FROM ap_invoices WHERE id = ?', [ap_invoice_id]);
      if (inv.length && inv[0].amount_paid >= inv[0].total) {
        await pool.query("UPDATE ap_invoices SET status = 'paid' WHERE id = ?", [ap_invoice_id]);
      } else {
        await pool.query("UPDATE ap_invoices SET status = 'partial' WHERE id = ?", [ap_invoice_id]);
      }
    }

    // Update bank balance (debit - money going out)
    if (bank_id) {
      await pool.query('UPDATE banks SET current_balance = COALESCE(current_balance,0) - ? WHERE id = ?', [amount, bank_id]);
    }

    await req.audit('vendor_payments', result.insertId, 'INSERT', null, { payment_number: paymentNumber, vendor_id, amount, payment_method });
    res.status(201).json({ id: result.insertId, payment_number: paymentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Vendor payments cannot be deleted
router.delete('/vendor-payments/:id', authenticate, preventDelete('vendor_payments'));

// ============ BANK ACCOUNTS ============
router.get('/bank-accounts', authenticate, async (req, res) => {
  try {
    const [accounts] = await pool.query('SELECT * FROM bank_accounts WHERE is_active = TRUE ORDER BY account_name');
    res.json(accounts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bank-accounts', authenticate, async (req, res) => {
  try {
    const { account_name, bank_name, account_number, routing_number, account_type, gl_account_id, current_balance } = req.body;
    const [result] = await pool.query(
      'INSERT INTO bank_accounts (account_name, bank_name, account_number, routing_number, account_type, gl_account_id, current_balance) VALUES (?,?,?,?,?,?,?)',
      [account_name, bank_name, account_number, routing_number, account_type || 'checking', gl_account_id, current_balance || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BANK RECONCILIATION ============
router.get('/bank-reconciliation', authenticate, async (req, res) => {
  try {
    const { bank_account_id, status } = req.query;
    let query = 'SELECT br.*, ba.account_name FROM bank_reconciliations br JOIN bank_accounts ba ON br.bank_account_id = ba.id WHERE 1=1';
    const params = [];
    if (bank_account_id) { query += ' AND br.bank_account_id = ?'; params.push(bank_account_id); }
    if (status && status !== 'all') { query += ' AND br.status = ?'; params.push(status); }
    query += ' ORDER BY br.statement_date DESC';
    const [recons] = await pool.query(query, params);
    res.json(recons);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bank-reconciliation', authenticate, async (req, res) => {
  try {
    const { bank_account_id, statement_date, statement_balance, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO bank_reconciliations (bank_account_id, statement_date, statement_balance, status, notes, created_by) VALUES (?,?,?,'in_progress',?,?)",
      [bank_account_id, statement_date, statement_balance, notes, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ DASHBOARD ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openAR] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE status IN ('posted','partial')");
    const [openAP] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ap_invoices WHERE status IN ('open','posted','partial')");
    const [bankBalance] = await pool.query("SELECT COALESCE(SUM(current_balance),0) as total FROM bank_accounts WHERE is_active = TRUE");
    const [mtdRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM ar_invoices WHERE MONTH(invoice_date) = MONTH(NOW()) AND YEAR(invoice_date) = YEAR(NOW()) AND status != 'void'");
    const [ytdRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM ar_invoices WHERE YEAR(invoice_date) = YEAR(NOW()) AND status != 'void'");
    const [overdueAR] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE due_date < CURDATE() AND status IN ('posted','partial')");
    
    // AR Aging
    const [arCurrent] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE status IN ('posted','partial') AND DATEDIFF(CURDATE(), due_date) <= 0");
    const [ar30] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE status IN ('posted','partial') AND DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30");
    const [ar60] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE status IN ('posted','partial') AND DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60");
    const [ar90] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE status IN ('posted','partial') AND DATEDIFF(CURDATE(), due_date) > 60");

    res.json({
      open_ar: openAR[0].total, open_ap: openAP[0].total, bank_balance: bankBalance[0].total,
      mtd_revenue: mtdRevenue[0].total, ytd_revenue: ytdRevenue[0].total, overdue_ar: overdueAR[0].total,
      ar_aging: { current: arCurrent[0].total, days_30: ar30[0].total, days_60: ar60[0].total, days_90_plus: ar90[0].total }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ TRIAL BALANCE ============
router.get('/trial-balance', authenticate, async (req, res) => {
  try {
    const [accounts] = await pool.query(`
      SELECT ga.id, ga.account_number, ga.account_name, ga.account_type, ga.normal_balance,
        COALESCE(ga.balance, 0) as balance,
        COALESCE(SUM(CASE WHEN glt.debit > 0 THEN glt.debit ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN glt.credit > 0 THEN glt.credit ELSE 0 END), 0) as total_credits
      FROM gl_accounts ga
      LEFT JOIN gl_transactions glt ON ga.id = glt.gl_account_id
      WHERE ga.is_active = TRUE
      GROUP BY ga.id ORDER BY ga.account_number`);
    const total_debits = accounts.reduce((s, a) => s + Number(a.total_debits), 0);
    const total_credits = accounts.reduce((s, a) => s + Number(a.total_credits), 0);
    res.json({ accounts, total_debits, total_credits, is_balanced: Math.abs(total_debits - total_credits) < 0.01 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INCOME STATEMENT ============
router.get('/income-statement', authenticate, async (req, res) => {
  try {
    const [revenue] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'revenue' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [cogs] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'cogs' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [expenses] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'expense' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const total_revenue = revenue.reduce((s, a) => s + Number(a.balance), 0);
    const total_cogs = cogs.reduce((s, a) => s + Number(a.balance), 0);
    const total_expenses = expenses.reduce((s, a) => s + Number(a.balance), 0);
    const gross_profit = total_revenue - total_cogs;
    const net_income = gross_profit - total_expenses;
    res.json({ revenue, cogs, expenses, total_revenue, total_cogs, gross_profit, total_expenses, net_income });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BALANCE SHEET ============
router.get('/balance-sheet', authenticate, async (req, res) => {
  try {
    const [assets] = await pool.query(`SELECT ga.account_number, ga.account_name, ga.sub_type, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'asset' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [liabilities] = await pool.query(`SELECT ga.account_number, ga.account_name, ga.sub_type, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'liability' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [equity] = await pool.query(`SELECT ga.account_number, ga.account_name, ga.sub_type, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'equity' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const total_assets = assets.reduce((s, a) => s + Number(a.balance), 0);
    const total_liabilities = liabilities.reduce((s, a) => s + Number(a.balance), 0);
    const total_equity = equity.reduce((s, a) => s + Number(a.balance), 0);
    res.json({ assets, liabilities, equity, total_assets, total_liabilities, total_equity, is_balanced: Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PERIOD CLOSE ============
router.post('/period-close', authenticate, async (req, res) => {
  try {
    const { period_id } = req.body;
    await pool.query('UPDATE accounting_periods SET status = ? WHERE id = ?', ['closed', period_id]);
    res.json({ success: true, message: 'Period closed successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ============ BANK TRANSACTIONS ============
router.get('/bank-reconciliation/:bankId/transactions', authenticate, async (req, res) => {
  try {
    const { bankId } = req.params;
    const { status } = req.query; // 'uncleared', 'cleared', 'all'
    let query = 'SELECT * FROM bank_transactions WHERE bank_account_id = ?';
    const params = [bankId];
    if (status === 'uncleared') { query += ' AND cleared = 0'; }
    else if (status === 'cleared') { query += ' AND cleared = 1'; }
    query += ' ORDER BY transaction_date DESC, id DESC';
    const [transactions] = await pool.query(query, params);
    res.json(transactions);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bank-reconciliation/:bankId/transactions', authenticate, async (req, res) => {
  try {
    const { bankId } = req.params;
    const { transaction_date, type, reference, description, amount } = req.body;
    const [result] = await pool.query(
      'INSERT INTO bank_transactions (bank_account_id, transaction_date, type, reference, description, amount) VALUES (?,?,?,?,?,?)',
      [bankId, transaction_date, type || 'withdrawal', reference, description, amount]
    );
    // Update bank account balance
    await pool.query('UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?', [parseFloat(amount), bankId]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bank-reconciliation/:bankId/reconcile', authenticate, async (req, res) => {
  try {
    const { bankId } = req.params;
    const { statement_date, statement_balance, cleared_transaction_ids, notes } = req.body;
    // Create reconciliation record
    const [result] = await pool.query(
      "INSERT INTO bank_reconciliations (bank_account_id, statement_date, statement_balance, status, notes, created_by) VALUES (?,?,?,'reconciled',?,?)",
      [bankId, statement_date, statement_balance, notes, req.user.id]
    );
    const reconId = result.insertId;
    // Mark transactions as cleared
    if (cleared_transaction_ids && cleared_transaction_ids.length > 0) {
      await pool.query(
        'UPDATE bank_transactions SET cleared = 1, reconciliation_id = ? WHERE id IN (?) AND bank_account_id = ?',
        [reconId, cleared_transaction_ids, bankId]
      );
    }
    // Update reconciliation with book balance
    const [bookBal] = await pool.query('SELECT current_balance FROM bank_accounts WHERE id = ?', [bankId]);
    await pool.query('UPDATE bank_reconciliations SET book_balance = ?, adjusted_balance = ?, difference = ?, reconciled_date = NOW() WHERE id = ?',
      [bookBal[0].current_balance, statement_balance, parseFloat(statement_balance) - parseFloat(bookBal[0].current_balance), reconId]);
    res.json({ success: true, reconciliation_id: reconId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/bank-reconciliation/:bankId/history', authenticate, async (req, res) => {
  try {
    const { bankId } = req.params;
    const [history] = await pool.query(
      'SELECT * FROM bank_reconciliations WHERE bank_account_id = ? ORDER BY statement_date DESC LIMIT 20', [bankId]
    );
    res.json(history);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
