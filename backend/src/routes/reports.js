const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============ DASHBOARD KPIs ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openSO] = await pool.query("SELECT COUNT(*) as count FROM sales_orders WHERE status IN ('open','partial')");
    const [openMfg] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('released','in_progress')");
    const [openPO] = await pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('open','partial')");
    
    const [salesMTD] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM sales_orders WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [salesQTD] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM sales_orders WHERE QUARTER(order_date) = QUARTER(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [salesYTD] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM sales_orders WHERE YEAR(order_date) = YEAR(NOW())");
    
    const [bankBalance] = await pool.query("SELECT COALESCE(SUM(current_balance),0) as total FROM bank_accounts WHERE is_active = TRUE");
    const [inventoryValue] = await pool.query("SELECT COALESCE(SUM(qty_on_hand * standard_cost),0) as total FROM items WHERE is_active = TRUE");

    // Bookings by customer (top 10)
    const [bookingsByCustomer] = await pool.query(`
      SELECT c.company_name, COALESCE(SUM(so.total),0) as total 
      FROM sales_orders so JOIN customers c ON so.customer_id = c.id 
      WHERE YEAR(so.order_date) = YEAR(NOW()) GROUP BY c.id ORDER BY total DESC LIMIT 10`);

    // Open AR by customer (top 10)
    const [arByCustomer] = await pool.query(`
      SELECT c.company_name, COALESCE(SUM(ari.balance),0) as total 
      FROM ar_invoices ari JOIN customers c ON ari.customer_id = c.id 
      WHERE ari.status = 'open' GROUP BY c.id ORDER BY total DESC LIMIT 10`);

    // Sales by salesperson
    const [salesBySalesperson] = await pool.query(`
      SELECT CONCAT(u.first_name,' ',u.last_name) as name, COALESCE(SUM(so.total),0) as total 
      FROM sales_orders so JOIN users u ON so.salesperson_id = u.id 
      WHERE YEAR(so.order_date) = YEAR(NOW()) GROUP BY u.id ORDER BY total DESC`);

    // Overdue shipments
    const [overdueShipments] = await pool.query("SELECT COUNT(*) as count FROM sales_orders WHERE required_date < CURDATE() AND status IN ('open','partial')");
    
    // Overdue jobs
    const [overdueJobs] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE finish_date < CURDATE() AND status IN ('released','in_progress')");

    res.json({
      summary: { open_sales_orders: openSO[0].count, open_mfg_orders: openMfg[0].count, open_purchase_orders: openPO[0].count,
        sales_mtd: salesMTD[0].total, sales_qtd: salesQTD[0].total, sales_ytd: salesYTD[0].total,
        bank_balance: bankBalance[0].total, inventory_value: inventoryValue[0].total,
        overdue_shipments: overdueShipments[0].count, overdue_jobs: overdueJobs[0].count },
      bookings_by_customer: bookingsByCustomer,
      ar_by_customer: arByCustomer,
      sales_by_salesperson: salesBySalesperson
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ REPORT GENERATORS ============
// Open Payables
router.get('/accounts-payable/open', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT api.invoice_number, v.company_name as vendor_name, api.invoice_date, api.due_date, api.amount, api.amount_paid, (api.amount - api.amount_paid) as balance_due, v.company_name, DATEDIFF(CURDATE(), api.due_date) as days_overdue
      FROM ap_invoices api JOIN vendors v ON api.vendor_id = v.id WHERE api.status = 'open' ORDER BY api.due_date`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Aged Payables
router.get('/accounts-payable/aged', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT v.company_name,
        SUM(CASE WHEN DATEDIFF(CURDATE(), api.due_date) <= 0 THEN api.balance ELSE 0 END) as current_amt,
        SUM(CASE WHEN DATEDIFF(CURDATE(), api.due_date) BETWEEN 1 AND 30 THEN api.balance ELSE 0 END) as days_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), api.due_date) BETWEEN 31 AND 60 THEN api.balance ELSE 0 END) as days_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), api.due_date) > 60 THEN api.balance ELSE 0 END) as days_90_plus,
        SUM(api.balance) as total
      FROM ap_invoices api JOIN vendors v ON api.vendor_id = v.id WHERE api.status = 'open' GROUP BY v.id ORDER BY total DESC`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Open Receivables
router.get('/accounts-receivable/open', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT ari.*, c.company_name, DATEDIFF(CURDATE(), ari.due_date) as days_overdue
      FROM ar_invoices ari JOIN customers c ON ari.customer_id = c.id WHERE ari.status = 'open' ORDER BY ari.due_date`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Aged Receivables
router.get('/accounts-receivable/aged', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT c.company_name,
        SUM(CASE WHEN DATEDIFF(CURDATE(), ari.due_date) <= 0 THEN ari.balance ELSE 0 END) as current_amt,
        SUM(CASE WHEN DATEDIFF(CURDATE(), ari.due_date) BETWEEN 1 AND 30 THEN ari.balance ELSE 0 END) as days_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), ari.due_date) BETWEEN 31 AND 60 THEN ari.balance ELSE 0 END) as days_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), ari.due_date) > 60 THEN ari.balance ELSE 0 END) as days_90_plus,
        SUM(ari.balance) as total
      FROM ar_invoices ari JOIN customers c ON ari.customer_id = c.id WHERE ari.status = 'open' GROUP BY c.id ORDER BY total DESC`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// General Ledger Report
router.get('/general-ledger', authenticate, async (req, res) => {
  try {
    const { account_id, start_date, end_date } = req.query;
    let query = `SELECT glt.*, ga.account_number, ga.account_name FROM gl_transactions glt JOIN gl_accounts ga ON glt.gl_account_id = ga.id WHERE 1=1`;
    const params = [];
    if (account_id) { query += ' AND glt.gl_account_id = ?'; params.push(account_id); }
    if (start_date) { query += ' AND glt.transaction_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND glt.transaction_date <= ?'; params.push(end_date); }
    query += ' ORDER BY glt.transaction_date, glt.id';
    const [data] = await pool.query(query, params);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Trial Balance
router.get('/trial-balance', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT ga.account_number, ga.account_name, ga.account_type,
        CASE WHEN ga.balance >= 0 THEN ga.balance ELSE 0 END as debit_balance,
        CASE WHEN ga.balance < 0 THEN ABS(ga.balance) ELSE 0 END as credit_balance
      FROM gl_accounts ga WHERE ga.is_active = TRUE ORDER BY ga.account_number`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Inventory Value Report
router.get('/inventory/value', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT i.item_number, i.description, i.item_type, i.qty_on_hand, i.standard_cost, i.weighted_avg_cost,
        (i.qty_on_hand * i.standard_cost) as std_value, (i.qty_on_hand * i.weighted_avg_cost) as avg_value
      FROM items i WHERE i.qty_on_hand > 0 ORDER BY i.item_number`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Work Order Status Report
router.get('/manufacturing/wo-status', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT wo.order_number, wo.status, wo.priority, i.item_number, i.description as item_description, wo.quantity, wo.quantity_completed, wo.quantity_scrapped, wo.start_date, wo.finish_date, wo.actual_finish_date, wo.notes, c.company_name as customer_name, i.item_number, i.description as item_description, c.company_name as customer_name
      FROM work_orders wo JOIN items i ON wo.item_id = i.id LEFT JOIN customers c ON wo.customer_id = c.id
      WHERE wo.status IN ('released','in_progress','scheduled') ORDER BY wo.finish_date`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Sales by Customer
router.get('/sales/by-customer', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT c.company_name, COUNT(so.id) as order_count, COALESCE(SUM(so.total),0) as total
      FROM sales_orders so JOIN customers c ON so.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (start_date) { query += ' AND so.order_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND so.order_date <= ?'; params.push(end_date); }
    query += ' GROUP BY c.id ORDER BY total DESC';
    const [data] = await pool.query(query, params);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ADDITIONAL REPORTS ============
// Purchase Order Status Report
router.get('/purchasing/po-status', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT po.po_number, v.company_name as vendor_name, po.po_type, po.order_date, po.required_date, po.status, po.subtotal, po.tax_amount, po.total, po.notes, v.company_name as vendor_name
      FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.order_date DESC LIMIT 100`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Reorder Report
router.get('/inventory/reorder', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT i.item_number, i.description, i.item_type, i.qty_on_hand, i.minimum_qty,
        (i.minimum_qty - i.qty_on_hand) as qty_to_order, i.lead_time_days
      FROM items i WHERE i.qty_on_hand <= i.minimum_qty AND i.is_active = TRUE
      ORDER BY (i.minimum_qty - i.qty_on_hand) DESC`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Stock Status Report
router.get('/inventory/stock-status', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT i.item_number, i.description, i.item_type, i.qty_on_hand, i.minimum_qty,
        i.standard_cost, (i.qty_on_hand * i.standard_cost) as value,
        CASE WHEN i.qty_on_hand <= 0 THEN 'Out of Stock'
             WHEN i.qty_on_hand <= i.minimum_qty THEN 'Low Stock'
             ELSE 'In Stock' END as status
      FROM items i WHERE i.is_active = TRUE ORDER BY i.item_number`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Production Efficiency Report
router.get('/manufacturing/efficiency', authenticate, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT wo.order_number, i.item_number, i.description as item_description,
        wo.quantity as quantity_ordered, wo.quantity_completed, wo.status,
        wo.start_date, wo.finish_date,
        DATEDIFF(COALESCE(wo.finish_date, CURDATE()), wo.start_date) as actual_days
      FROM work_orders wo JOIN items i ON wo.item_id = i.id
      WHERE wo.status IN ('completed','closed','in_progress')
      ORDER BY wo.start_date DESC LIMIT 50`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INCOME STATEMENT REPORT ============
router.get('/financial/income-statement', authenticate, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let dateFilter = '';
    const params = [];
    if (from_date && to_date) {
      dateFilter = ' AND glt.transaction_date BETWEEN ? AND ?';
      params.push(from_date, to_date);
    }
    const [revenue] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(SUM(glt.credit - glt.debit), 0) as balance FROM gl_accounts ga LEFT JOIN gl_transactions glt ON ga.id = glt.gl_account_id${dateFilter ? dateFilter : ''} WHERE ga.account_type = 'revenue' AND ga.is_active = TRUE GROUP BY ga.id ORDER BY ga.account_number`, params);
    const [cogs] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(SUM(glt.debit - glt.credit), 0) as balance FROM gl_accounts ga LEFT JOIN gl_transactions glt ON ga.id = glt.gl_account_id${dateFilter ? dateFilter : ''} WHERE ga.account_type = 'cogs' AND ga.is_active = TRUE GROUP BY ga.id ORDER BY ga.account_number`, params);
    const [expenses] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(SUM(glt.debit - glt.credit), 0) as balance FROM gl_accounts ga LEFT JOIN gl_transactions glt ON ga.id = glt.gl_account_id${dateFilter ? dateFilter : ''} WHERE ga.account_type = 'expense' AND ga.is_active = TRUE GROUP BY ga.id ORDER BY ga.account_number`, params);
    const total_revenue = revenue.reduce((s, a) => s + Number(a.balance), 0);
    const total_cogs = cogs.reduce((s, a) => s + Number(a.balance), 0);
    const total_expenses = expenses.reduce((s, a) => s + Number(a.balance), 0);
    res.json({ revenue, cogs, expenses, total_revenue, total_cogs, gross_profit: total_revenue - total_cogs, total_expenses, net_income: total_revenue - total_cogs - total_expenses });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BALANCE SHEET REPORT ============
router.get('/financial/balance-sheet', authenticate, async (req, res) => {
  try {
    const [assets] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'asset' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [liabilities] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'liability' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const [equity] = await pool.query(`SELECT ga.account_number, ga.account_name, COALESCE(ga.balance, 0) as balance FROM gl_accounts ga WHERE ga.account_type = 'equity' AND ga.is_active = TRUE ORDER BY ga.account_number`);
    const total_assets = assets.reduce((s, a) => s + Number(a.balance), 0);
    const total_liabilities = liabilities.reduce((s, a) => s + Number(a.balance), 0);
    const total_equity = equity.reduce((s, a) => s + Number(a.balance), 0);
    res.json({ assets, liabilities, equity, total_assets, total_liabilities, total_equity });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SALES BY PRODUCT REPORT ============
router.get('/sales/by-product', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.item_number, i.description, i.item_type,
        COUNT(DISTINCT sol.sales_order_id) as order_count,
        SUM(sol.quantity_ordered) as total_qty_ordered,
        SUM(sol.quantity_shipped) as total_qty_shipped,
        SUM(sol.quantity_ordered * sol.unit_price) as total_revenue,
        AVG(sol.unit_price) as avg_price
      FROM sales_order_lines sol
      JOIN items i ON sol.item_id = i.id
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE so.status != 'cancelled'
      GROUP BY i.id ORDER BY total_revenue DESC`);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ WO COST SUMMARY REPORT ============
router.get('/manufacturing/wo-cost', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT wo.order_number, wo.status, i.item_number, i.description,
        wo.quantity, wo.quantity_completed,
        COALESCE(i.standard_cost, 0) * wo.quantity_completed as standard_cost_total,
        COALESCE((SELECT SUM(wm.quantity_issued * COALESCE(mi.standard_cost, 0))
          FROM wo_materials wm JOIN items mi ON wm.item_id = mi.id WHERE wm.work_order_id = wo.id), 0) as actual_material_cost,
        wo.start_date, wo.finish_date
      FROM work_orders wo
      JOIN items i ON wo.item_id = i.id
      ORDER BY wo.created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INVENTORY MOVEMENT REPORT ============
router.get('/inventory/movement', authenticate, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let dateFilter = 'WHERE 1=1';
    const params = [];
    if (from_date) { dateFilter += ' AND it.created_at >= ?'; params.push(from_date); }
    if (to_date) { dateFilter += ' AND it.created_at <= ?'; params.push(to_date); }
    const [rows] = await pool.query(`
      SELECT it.created_at, it.transaction_type, i.item_number, i.description,
        it.quantity, it.reference_type, it.reference_id, it.notes
      FROM inventory_transactions it
      JOIN items i ON it.item_id = i.id
      ${dateFilter}
      ORDER BY it.created_at DESC, it.id DESC LIMIT 500`, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
