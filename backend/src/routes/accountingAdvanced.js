const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

/**
 * Phase 7 - Advanced Accounting & Finance Routes
 * Multi-currency, Bank Reconciliation, Budgeting, Cash Flow, Tax Reporting
 */

// ═══════════════════════════════════════════════════════════════
// MULTI-CURRENCY
// ═══════════════════════════════════════════════════════════════

// Get all exchange rates
router.get('/currencies/rates', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exchange_rates ORDER BY to_currency, effective_date DESC');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add/update exchange rate
router.post('/currencies/rates', authenticate, async (req, res) => {
  try {
    const { from_currency, to_currency, rate, effective_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES (?, ?, ?, ?)',
      [from_currency || 'USD', to_currency, rate, effective_date]
    );
    res.json({ id: result.insertId, message: 'Exchange rate added' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Convert amount between currencies
router.post('/currencies/convert', authenticate, async (req, res) => {
  try {
    const { amount, from_currency, to_currency, date } = req.body;
    const effectiveDate = date || new Date().toISOString().split('T')[0];
    
    if (from_currency === to_currency) {
      return res.json({ original_amount: amount, converted_amount: amount, rate: 1, currency: to_currency });
    }

    const [rates] = await pool.query(
      `SELECT rate FROM exchange_rates 
       WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
       ORDER BY effective_date DESC LIMIT 1`,
      [from_currency || 'USD', to_currency, effectiveDate]
    );

    if (rates.length === 0) {
      return res.status(404).json({ error: `No exchange rate found for ${from_currency} to ${to_currency}` });
    }

    const rate = parseFloat(rates[0].rate);
    const converted = parseFloat(amount) * rate;
    res.json({ original_amount: amount, converted_amount: converted.toFixed(2), rate, from_currency, to_currency });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Record a multi-currency transaction
router.post('/currencies/transactions', authenticate, async (req, res) => {
  try {
    const { transaction_type, transaction_id, currency_code, exchange_rate, original_amount } = req.body;
    const base_amount = parseFloat(original_amount) * parseFloat(exchange_rate);
    const [result] = await pool.query(
      `INSERT INTO currency_transactions (transaction_type, transaction_id, currency_code, exchange_rate, original_amount, base_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [transaction_type, transaction_id, currency_code, exchange_rate, original_amount, base_amount]
    );
    res.json({ id: result.insertId, base_amount: base_amount.toFixed(2) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get currency transactions for a document
router.get('/currencies/transactions/:type/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM currency_transactions WHERE transaction_type = ? AND transaction_id = ?',
      [req.params.type, req.params.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Unrealized gain/loss report
router.get('/currencies/gain-loss', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ct.*, 
        (ct.original_amount * (SELECT er.rate FROM exchange_rates er 
          WHERE er.from_currency = 'USD' AND er.to_currency = ct.currency_code 
          ORDER BY er.effective_date DESC LIMIT 1)) as current_base_value,
        ((ct.original_amount * (SELECT er.rate FROM exchange_rates er 
          WHERE er.from_currency = 'USD' AND er.to_currency = ct.currency_code 
          ORDER BY er.effective_date DESC LIMIT 1)) - ct.base_amount) as unrealized_gain_loss
       FROM currency_transactions ct
       WHERE ct.realized_gain_loss = 0
       ORDER BY ct.created_at DESC`
    );
    const totalUnrealized = rows.reduce((sum, r) => sum + parseFloat(r.unrealized_gain_loss || 0), 0);
    res.json({ transactions: rows, total_unrealized_gain_loss: totalUnrealized.toFixed(2) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// BANK RECONCILIATION (Enhanced)
// ═══════════════════════════════════════════════════════════════

// Import bank statement (CSV/manual)
router.post('/bank-recon/statements', authenticate, async (req, res) => {
  try {
    const { bank_id, statement_date, opening_balance, closing_balance, lines } = req.body;
    const totalDeposits = (lines || []).filter(l => l.type === 'deposit').reduce((s, l) => s + parseFloat(l.amount), 0);
    const totalWithdrawals = (lines || []).filter(l => l.type === 'withdrawal').reduce((s, l) => s + Math.abs(parseFloat(l.amount)), 0);

    const [result] = await pool.query(
      `INSERT INTO bank_statements (bank_id, statement_date, opening_balance, closing_balance, total_deposits, total_withdrawals, transaction_count, imported_by, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bank_id, statement_date, opening_balance, closing_balance, totalDeposits, totalWithdrawals, (lines || []).length, req.user.id, req.body.file_name || null]
    );

    const statementId = result.insertId;

    // Insert statement lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query(
          `INSERT INTO bank_statement_lines (statement_id, transaction_date, description, reference, amount, type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [statementId, line.transaction_date, line.description, line.reference, Math.abs(parseFloat(line.amount)), line.type]
        );
      }
    }

    res.json({ id: statementId, message: 'Statement imported', line_count: (lines || []).length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get bank statements
router.get('/bank-recon/statements', authenticate, async (req, res) => {
  try {
    const { bank_id } = req.query;
    let query = `SELECT bs.*, b.bank_name FROM bank_statements bs JOIN banks b ON bs.bank_id = b.id`;
    const params = [];
    if (bank_id) { query += ' WHERE bs.bank_id = ?'; params.push(bank_id); }
    query += ' ORDER BY bs.statement_date DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get statement lines with match status
router.get('/bank-recon/statements/:id/lines', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bsl.*, 
        CASE WHEN bsl.matched_voucher_id IS NOT NULL THEN jv.voucher_number ELSE NULL END as matched_voucher_number
       FROM bank_statement_lines bsl
       LEFT JOIN journal_vouchers jv ON bsl.matched_voucher_id = jv.id
       WHERE bsl.statement_id = ?
       ORDER BY bsl.transaction_date, bsl.id`,
      [req.params.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Auto-match statement lines to GL transactions
router.post('/bank-recon/statements/:id/auto-match', authenticate, async (req, res) => {
  try {
    const statementId = req.params.id;
    const [lines] = await pool.query(
      'SELECT * FROM bank_statement_lines WHERE statement_id = ? AND match_status = ?',
      [statementId, 'unmatched']
    );

    let matched = 0;
    for (const line of lines) {
      // Try to match by amount and date range (+/- 3 days)
      const [candidates] = await pool.query(
        `SELECT jv.id, jv.voucher_number, jv.voucher_date, jv.total_debit as amount,
          ABS(DATEDIFF(jv.voucher_date, ?)) as date_diff
         FROM journal_vouchers jv
         WHERE jv.status = 'posted'
           AND ABS(jv.total_debit - ?) < 0.01
           AND ABS(DATEDIFF(jv.voucher_date, ?)) <= 3
         ORDER BY date_diff ASC
         LIMIT 1`,
        [line.transaction_date, line.amount, line.transaction_date]
      );

      if (candidates.length > 0) {
        const confidence = candidates[0].date_diff === 0 ? 95 : (candidates[0].date_diff === 1 ? 85 : 70);
        await pool.query(
          `UPDATE bank_statement_lines SET matched_voucher_id = ?, match_confidence = ?, match_status = 'auto_matched'
           WHERE id = ?`,
          [candidates[0].id, confidence, line.id]
        );
        matched++;
      }
    }

    res.json({ total_lines: lines.length, matched, unmatched: lines.length - matched });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Manual match a statement line
router.post('/bank-recon/lines/:lineId/match', authenticate, async (req, res) => {
  try {
    const { voucher_id, payment_id } = req.body;
    await pool.query(
      `UPDATE bank_statement_lines SET matched_voucher_id = ?, matched_payment_id = ?, match_status = 'manual_matched', match_confidence = 100
       WHERE id = ?`,
      [voucher_id || null, payment_id || null, req.params.lineId]
    );
    res.json({ message: 'Line matched successfully' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Confirm all matches and reconcile statement
router.post('/bank-recon/statements/:id/reconcile', authenticate, async (req, res) => {
  try {
    const statementId = req.params.id;
    await pool.query(
      `UPDATE bank_statement_lines SET match_status = 'confirmed' WHERE statement_id = ? AND match_status IN ('auto_matched', 'manual_matched')`,
      [statementId]
    );
    await pool.query(
      `UPDATE bank_statements SET status = 'reconciled' WHERE id = ?`,
      [statementId]
    );
    res.json({ message: 'Statement reconciled' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Reconciliation summary
router.get('/bank-recon/summary', authenticate, async (req, res) => {
  try {
    const [banks] = await pool.query(`
      SELECT b.id, b.bank_name, b.current_balance, b.account_number,
        (SELECT COUNT(*) FROM bank_statements bs WHERE bs.bank_id = b.id) as total_statements,
        (SELECT COUNT(*) FROM bank_statements bs WHERE bs.bank_id = b.id AND bs.status = 'reconciled') as reconciled_statements,
        (SELECT bs.statement_date FROM bank_statements bs WHERE bs.bank_id = b.id ORDER BY bs.statement_date DESC LIMIT 1) as last_reconciled_date
      FROM banks b WHERE b.is_active = 1
    `);
    res.json(banks);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// BUDGETING & FORECASTING
// ═══════════════════════════════════════════════════════════════

// Get all budgets
router.get('/budgets', authenticate, async (req, res) => {
  try {
    const { fiscal_year, status } = req.query;
    let query = 'SELECT * FROM budgets WHERE 1=1';
    const params = [];
    if (fiscal_year) { query += ' AND fiscal_year = ?'; params.push(fiscal_year); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY fiscal_year DESC, created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Create budget
router.post('/budgets', authenticate, async (req, res) => {
  try {
    const { name, fiscal_year, budget_type, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO budgets (name, fiscal_year, budget_type, notes, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, fiscal_year, budget_type || 'annual', notes, req.user.id]
    );
    res.json({ id: result.insertId, message: 'Budget created' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get budget detail with lines
router.get('/budgets/:id', authenticate, async (req, res) => {
  try {
    const [budget] = await pool.query('SELECT * FROM budgets WHERE id = ?', [req.params.id]);
    if (budget.length === 0) return res.status(404).json({ error: 'Budget not found' });

    const [lines] = await pool.query(
      `SELECT bl.*, ga.account_number, ga.account_name, ga.account_type
       FROM budget_lines bl
       JOIN gl_accounts ga ON bl.gl_account_id = ga.id
       WHERE bl.budget_id = ?
       ORDER BY ga.account_number`,
      [req.params.id]
    );
    res.json({ ...budget[0], lines });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add/update budget line
router.post('/budgets/:id/lines', authenticate, async (req, res) => {
  try {
    const { gl_account_id, period_1, period_2, period_3, period_4, period_5, period_6,
            period_7, period_8, period_9, period_10, period_11, period_12, notes } = req.body;
    const annual = [period_1, period_2, period_3, period_4, period_5, period_6,
                    period_7, period_8, period_9, period_10, period_11, period_12]
                   .reduce((s, v) => s + parseFloat(v || 0), 0);

    const [existing] = await pool.query(
      'SELECT id FROM budget_lines WHERE budget_id = ? AND gl_account_id = ?',
      [req.params.id, gl_account_id]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE budget_lines SET period_1=?, period_2=?, period_3=?, period_4=?, period_5=?, period_6=?,
         period_7=?, period_8=?, period_9=?, period_10=?, period_11=?, period_12=?, annual_total=?, notes=?
         WHERE id = ?`,
        [period_1||0, period_2||0, period_3||0, period_4||0, period_5||0, period_6||0,
         period_7||0, period_8||0, period_9||0, period_10||0, period_11||0, period_12||0,
         annual, notes, existing[0].id]
      );
      res.json({ id: existing[0].id, message: 'Budget line updated', annual_total: annual });
    } else {
      const [result] = await pool.query(
        `INSERT INTO budget_lines (budget_id, gl_account_id, period_1, period_2, period_3, period_4, period_5, period_6,
         period_7, period_8, period_9, period_10, period_11, period_12, annual_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, gl_account_id, period_1||0, period_2||0, period_3||0, period_4||0, period_5||0, period_6||0,
         period_7||0, period_8||0, period_9||0, period_10||0, period_11||0, period_12||0, annual, notes]
      );
      res.json({ id: result.insertId, message: 'Budget line added', annual_total: annual });
    }

    // Update budget total
    const [totals] = await pool.query('SELECT SUM(annual_total) as total FROM budget_lines WHERE budget_id = ?', [req.params.id]);
    await pool.query('UPDATE budgets SET total_amount = ? WHERE id = ?', [totals[0].total || 0, req.params.id]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Budget vs Actual report
router.get('/budgets/:id/variance', authenticate, async (req, res) => {
  try {
    const [budget] = await pool.query('SELECT * FROM budgets WHERE id = ?', [req.params.id]);
    if (budget.length === 0) return res.status(404).json({ error: 'Budget not found' });

    const fiscalYear = budget[0].fiscal_year;
    const [lines] = await pool.query(
      `SELECT bl.*, ga.account_number, ga.account_name, ga.account_type,
        COALESCE((SELECT SUM(jl.debit_amount - jl.credit_amount) 
          FROM journal_lines jl 
          JOIN journal_vouchers jv ON jl.voucher_id = jv.id
          WHERE jl.gl_account_id = bl.gl_account_id 
            AND jv.status = 'posted'
            AND YEAR(jv.voucher_date) = ?), 0) as ytd_actual
       FROM budget_lines bl
       JOIN gl_accounts ga ON bl.gl_account_id = ga.id
       WHERE bl.budget_id = ?
       ORDER BY ga.account_number`,
      [fiscalYear, req.params.id]
    );

    const result = lines.map(line => ({
      ...line,
      ytd_actual: parseFloat(line.ytd_actual),
      variance: parseFloat(line.annual_total) - parseFloat(line.ytd_actual),
      variance_pct: line.annual_total > 0 ? ((parseFloat(line.ytd_actual) / parseFloat(line.annual_total)) * 100).toFixed(1) : 0
    }));

    res.json({ budget: budget[0], lines: result });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Approve budget
router.post('/budgets/:id/approve', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE budgets SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['approved', req.user.id, req.params.id]
    );
    res.json({ message: 'Budget approved' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// CASH FLOW PROJECTIONS
// ═══════════════════════════════════════════════════════════════

// Get cash flow projection (next 30/60/90 days)
router.get('/cash-flow/projection', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    // Current cash position (from bank accounts)
    const [banks] = await pool.query('SELECT SUM(current_balance) as total FROM banks WHERE is_active = 1');
    const currentCash = parseFloat(banks[0].total || 0);

    // Expected AR collections (from open invoices)
    const [arInflows] = await pool.query(
      `SELECT SUM(total - COALESCE(amount_paid, 0)) as expected, 
        COUNT(*) as invoice_count
       FROM ar_invoices 
       WHERE status IN ('posted','partial') AND due_date BETWEEN ? AND ?`,
      [today, endDate]
    );

    // Expected AP outflows (from open AP invoices)
    const [apOutflows] = await pool.query(
      `SELECT SUM(total - COALESCE(amount_paid, 0)) as expected,
        COUNT(*) as invoice_count
       FROM ap_invoices
       WHERE status IN ('posted','partial') AND due_date BETWEEN ? AND ?`,
      [today, endDate]
    );

    // Weekly breakdown
    const weeks = [];
    let runningBalance = currentCash;
    for (let w = 0; w < Math.ceil(days / 7); w++) {
      const weekStart = new Date(Date.now() + w * 7 * 86400000).toISOString().split('T')[0];
      const weekEnd = new Date(Date.now() + (w + 1) * 7 * 86400000).toISOString().split('T')[0];

      const [weekAR] = await pool.query(
        `SELECT COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0) as amount
         FROM ar_invoices WHERE status IN ('posted','partial') AND due_date BETWEEN ? AND ?`,
        [weekStart, weekEnd]
      );
      const [weekAP] = await pool.query(
        `SELECT COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0) as amount
         FROM ap_invoices WHERE status IN ('posted','partial') AND due_date BETWEEN ? AND ?`,
        [weekStart, weekEnd]
      );

      const inflow = parseFloat(weekAR[0].amount);
      const outflow = parseFloat(weekAP[0].amount);
      runningBalance += inflow - outflow;

      weeks.push({
        week: w + 1,
        start_date: weekStart,
        end_date: weekEnd,
        inflows: inflow,
        outflows: outflow,
        net: inflow - outflow,
        projected_balance: runningBalance
      });
    }

    res.json({
      current_cash: currentCash,
      projection_days: days,
      expected_collections: parseFloat(arInflows[0].expected || 0),
      expected_payments: parseFloat(apOutflows[0].expected || 0),
      ar_invoice_count: arInflows[0].invoice_count,
      ap_invoice_count: apOutflows[0].invoice_count,
      projected_end_balance: runningBalance,
      weekly_breakdown: weeks
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Cash flow categories
router.get('/cash-flow/categories', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cash_flow_categories ORDER BY sort_order');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Cash flow statement (actual - for a date range)
router.get('/cash-flow/statement', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate2 = end_date || new Date().toISOString().split('T')[0];

    // Operating: Customer receipts
    const [customerReceipts] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE payment_date BETWEEN ? AND ?`,
      [startDate, endDate2]
    );
    // Operating: Vendor payments
    const [vendorPayments] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payments WHERE payment_date BETWEEN ? AND ?`,
      [startDate, endDate2]
    );

    const operating = {
      customer_collections: parseFloat(customerReceipts[0].total),
      vendor_payments: parseFloat(vendorPayments[0].total),
      net_operating: parseFloat(customerReceipts[0].total) - parseFloat(vendorPayments[0].total)
    };

    res.json({
      period: { start_date: startDate, end_date: endDate2 },
      operating,
      investing: { net_investing: 0 },
      financing: { net_financing: 0 },
      net_change: operating.net_operating,
      beginning_cash: 0,
      ending_cash: operating.net_operating
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// TAX REPORTING
// ═══════════════════════════════════════════════════════════════

// Get tax jurisdictions
router.get('/tax/jurisdictions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tax_jurisdictions WHERE is_active = 1 ORDER BY jurisdiction_type, name');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add tax jurisdiction
router.post('/tax/jurisdictions', authenticate, async (req, res) => {
  try {
    const { name, jurisdiction_code, jurisdiction_type, tax_rate, effective_date, parent_jurisdiction_id } = req.body;
    const [result] = await pool.query(
      `INSERT INTO tax_jurisdictions (name, jurisdiction_code, jurisdiction_type, tax_rate, effective_date, parent_jurisdiction_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, jurisdiction_code, jurisdiction_type, tax_rate, effective_date, parent_jurisdiction_id || null]
    );
    res.json({ id: result.insertId, message: 'Jurisdiction added' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Record tax transaction
router.post('/tax/transactions', authenticate, async (req, res) => {
  try {
    const { transaction_type, jurisdiction_id, document_type, document_id, document_number,
            customer_id, vendor_id, taxable_amount, tax_rate, tax_amount, transaction_date } = req.body;
    const [result] = await pool.query(
      `INSERT INTO tax_transactions (transaction_type, jurisdiction_id, document_type, document_id, document_number,
       customer_id, vendor_id, taxable_amount, tax_rate, tax_amount, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_type, jurisdiction_id, document_type, document_id, document_number,
       customer_id || null, vendor_id || null, taxable_amount, tax_rate, tax_amount, transaction_date]
    );
    res.json({ id: result.insertId, message: 'Tax transaction recorded' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Tax liability summary by jurisdiction
router.get('/tax/liability', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate2 = end_date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT tj.id, tj.name, tj.jurisdiction_code, tj.jurisdiction_type, tj.tax_rate,
        COALESCE(SUM(CASE WHEN tt.transaction_type = 'collected' THEN tt.tax_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN tt.transaction_type = 'paid' THEN tt.tax_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN tt.transaction_type = 'collected' THEN tt.taxable_amount ELSE 0 END), 0) as taxable_sales,
        COUNT(tt.id) as transaction_count
       FROM tax_jurisdictions tj
       LEFT JOIN tax_transactions tt ON tj.id = tt.jurisdiction_id AND tt.transaction_date BETWEEN ? AND ?
       WHERE tj.is_active = 1
       GROUP BY tj.id
       ORDER BY tj.jurisdiction_type, tj.name`,
      [startDate, endDate2]
    );

    const summary = rows.map(r => ({
      ...r,
      total_collected: parseFloat(r.total_collected),
      total_paid: parseFloat(r.total_paid),
      taxable_sales: parseFloat(r.taxable_sales),
      net_liability: parseFloat(r.total_collected) - parseFloat(r.total_paid)
    }));

    const totalLiability = summary.reduce((s, r) => s + r.net_liability, 0);
    res.json({ period: { start_date: startDate, end_date: endDate2 }, jurisdictions: summary, total_net_liability: totalLiability });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Tax returns
router.get('/tax/returns', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tr.*, tj.name as jurisdiction_name, tj.jurisdiction_code
       FROM tax_returns tr
       JOIN tax_jurisdictions tj ON tr.jurisdiction_id = tj.id
       ORDER BY tr.period_end DESC`
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Create/file tax return
router.post('/tax/returns', authenticate, async (req, res) => {
  try {
    const { jurisdiction_id, period_start, period_end, filing_frequency } = req.body;

    // Calculate totals from tax_transactions
    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'collected' THEN taxable_amount ELSE 0 END), 0) as total_taxable_sales,
        COALESCE(SUM(CASE WHEN transaction_type = 'collected' THEN tax_amount ELSE 0 END), 0) as total_tax_collected,
        COALESCE(SUM(CASE WHEN transaction_type = 'paid' THEN tax_amount ELSE 0 END), 0) as total_tax_paid
       FROM tax_transactions
       WHERE jurisdiction_id = ? AND transaction_date BETWEEN ? AND ?`,
      [jurisdiction_id, period_start, period_end]
    );

    const netDue = parseFloat(totals[0].total_tax_collected) - parseFloat(totals[0].total_tax_paid);

    const [result] = await pool.query(
      `INSERT INTO tax_returns (jurisdiction_id, period_start, period_end, filing_frequency, total_taxable_sales, total_tax_collected, total_tax_paid, net_tax_due)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jurisdiction_id, period_start, period_end, filing_frequency,
       totals[0].total_taxable_sales, totals[0].total_tax_collected, totals[0].total_tax_paid, netDue]
    );

    res.json({ id: result.insertId, net_tax_due: netDue, message: 'Tax return created' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Mark tax return as filed
router.post('/tax/returns/:id/file', authenticate, async (req, res) => {
  try {
    const { confirmation_number, payment_date } = req.body;
    await pool.query(
      `UPDATE tax_returns SET status = 'filed', filed_date = CURDATE(), confirmation_number = ?, payment_date = ? WHERE id = ?`,
      [confirmation_number, payment_date || null, req.params.id]
    );
    res.json({ message: 'Tax return filed' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD (Advanced)
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    // Cash position
    const [cashPos] = await pool.query('SELECT SUM(current_balance) as total FROM banks WHERE is_active = 1');
    
    // AR aging
    const [arAging] = await pool.query(`
      SELECT 
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as current_ar,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ar_1_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ar_31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ar_61_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ar_over_90
      FROM ar_invoices WHERE status IN ('posted','partial')
    `);

    // AP aging
    const [apAging] = await pool.query(`
      SELECT 
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as current_ap,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ap_1_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ap_31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN total - COALESCE(amount_paid,0) ELSE 0 END) as ap_over_60
      FROM ap_invoices WHERE status IN ('posted','partial')
    `);

    // MTD revenue & expenses
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [mtdRevenue] = await pool.query(
      `SELECT COALESCE(SUM(jl.credit_amount - jl.debit_amount), 0) as total
       FROM journal_lines jl JOIN journal_vouchers jv ON jl.voucher_id = jv.id
       JOIN gl_accounts ga ON jl.gl_account_id = ga.id
       WHERE ga.account_type = 'revenue' AND jv.status = 'posted' AND jv.voucher_date >= ?`,
      [monthStart]
    );
    const [mtdExpenses] = await pool.query(
      `SELECT COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) as total
       FROM journal_lines jl JOIN journal_vouchers jv ON jl.voucher_id = jv.id
       JOIN gl_accounts ga ON jl.gl_account_id = ga.id
       WHERE ga.account_type = 'expense' AND jv.status = 'posted' AND jv.voucher_date >= ?`,
      [monthStart]
    );

    // Budget utilization
    const [budgetUtil] = await pool.query(
      `SELECT b.name, b.total_amount, 
        COALESCE((SELECT SUM(bl.annual_total) FROM budget_lines bl WHERE bl.budget_id = b.id), 0) as budgeted,
        b.status
       FROM budgets b WHERE b.status = 'active' ORDER BY b.fiscal_year DESC LIMIT 1`
    );

    res.json({
      cash_position: parseFloat(cashPos[0].total || 0),
      ar_aging: {
        current: parseFloat(arAging[0].current_ar || 0),
        days_1_30: parseFloat(arAging[0].ar_1_30 || 0),
        days_31_60: parseFloat(arAging[0].ar_31_60 || 0),
        days_61_90: parseFloat(arAging[0].ar_61_90 || 0),
        over_90: parseFloat(arAging[0].ar_over_90 || 0)
      },
      ap_aging: {
        current: parseFloat(apAging[0].current_ap || 0),
        days_1_30: parseFloat(apAging[0].ap_1_30 || 0),
        days_31_60: parseFloat(apAging[0].ap_31_60 || 0),
        over_60: parseFloat(apAging[0].ap_over_60 || 0)
      },
      mtd_revenue: parseFloat(mtdRevenue[0].total),
      mtd_expenses: parseFloat(mtdExpenses[0].total),
      mtd_net_income: parseFloat(mtdRevenue[0].total) - parseFloat(mtdExpenses[0].total),
      active_budget: budgetUtil.length > 0 ? budgetUtil[0] : null
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
