const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Helper: Check if user's role is allowed for a widget
function isRoleAllowed(userRole, allowedRoles, minRoleLevel) {
  if (userRole === 'admin') return true;
  if (allowedRoles) {
    const roles = typeof allowedRoles === 'string' ? JSON.parse(allowedRoles) : allowedRoles;
    return roles.includes(userRole);
  }
  // Fallback to min_role_level
  const roleLevels = { readonly: 1, shipping: 2, production: 2, purchasing: 2, sales: 2, accounting: 2, manager: 3, admin: 4 };
  return (roleLevels[userRole] || 0) >= minRoleLevel;
}

// ═══════════════════════════════════════════════════════════════
// PROMOTIONS ENGINE
// ═══════════════════════════════════════════════════════════════

// GET /promotions/active - Get active promotions for current user
router.get('/promotions/active', authenticate, async (req, res) => {
  try {
    const [promos] = await pool.query(`
      SELECT * FROM promotions 
      WHERE is_active = 1 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY priority DESC, created_at DESC
    `);
    
    // Filter by user's role
    const userRole = req.user.role;
    const filtered = promos.filter(p => {
      if (!p.target_roles) return true; // null = all roles
      const roles = typeof p.target_roles === 'string' ? JSON.parse(p.target_roles) : p.target_roles;
      return roles.includes(userRole);
    });

    // Exclude already dismissed ones
    const [dismissed] = await pool.query(
      `SELECT promotion_id FROM promotion_interactions WHERE user_id = ? AND interaction_type = 'dismiss'`,
      [req.user.id]
    );
    const dismissedIds = new Set(dismissed.map(d => d.promotion_id));
    const result = filtered.filter(p => !dismissedIds.has(p.id) || !p.is_dismissible);

    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /promotions - List all promotions (admin only)
router.get('/promotions', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const [promos] = await pool.query(`
      SELECT p.*, u.first_name as creator_name 
      FROM promotions p 
      LEFT JOIN users u ON p.created_by = u.id 
      ORDER BY p.created_at DESC
    `);
    res.json(promos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /promotions - Create promotion (admin only)
router.post('/promotions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, message, promo_type, priority, display_type, target_roles, target_departments, start_date, end_date, is_dismissible, action_url, action_label, bg_color, icon } = req.body;
    const [result] = await pool.query(
      `INSERT INTO promotions (title, message, promo_type, priority, display_type, target_roles, target_departments, start_date, end_date, is_dismissible, action_url, action_label, bg_color, icon, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, message, promo_type || 'announcement', priority || 'normal', display_type || 'banner', 
       target_roles ? JSON.stringify(target_roles) : null, 
       target_departments ? JSON.stringify(target_departments) : null,
       start_date, end_date || null, is_dismissible !== false ? 1 : 0, action_url || null, action_label || null, bg_color || '#3b82f6', icon || 'info', req.user.id]
    );
    res.json({ id: result.insertId, message: 'Promotion created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /promotions/:id - Update promotion
router.put('/promotions/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, message, promo_type, priority, display_type, target_roles, target_departments, start_date, end_date, is_active, is_dismissible, action_url, action_label, bg_color, icon } = req.body;
    await pool.query(
      `UPDATE promotions SET title=?, message=?, promo_type=?, priority=?, display_type=?, target_roles=?, target_departments=?, start_date=?, end_date=?, is_active=?, is_dismissible=?, action_url=?, action_label=?, bg_color=?, icon=? WHERE id=?`,
      [title, message, promo_type, priority, display_type, 
       target_roles ? JSON.stringify(target_roles) : null,
       target_departments ? JSON.stringify(target_departments) : null,
       start_date, end_date || null, is_active ? 1 : 0, is_dismissible ? 1 : 0, action_url || null, action_label || null, bg_color || '#3b82f6', icon || 'info', req.params.id]
    );
    res.json({ message: 'Promotion updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /promotions/:id
router.delete('/promotions/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM promotion_interactions WHERE promotion_id = ?', [req.params.id]);
    await pool.query('DELETE FROM promotions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Promotion deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /promotions/:id/interact - Log interaction
router.post('/promotions/:id/interact', authenticate, async (req, res) => {
  try {
    const { interaction_type } = req.body;
    await pool.query(
      `INSERT INTO promotion_interactions (promotion_id, user_id, interaction_type) VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, interaction_type]
    );
    // Update counters
    const counterMap = { view: 'view_count', dismiss: 'dismiss_count', click: 'click_count' };
    if (counterMap[interaction_type]) {
      await pool.query(`UPDATE promotions SET ${counterMap[interaction_type]} = ${counterMap[interaction_type]} + 1 WHERE id = ?`, [req.params.id]);
    }
    res.json({ message: 'Interaction logged' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /promotions/analytics - Promotion performance (admin)
router.get('/promotions/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [promos] = await pool.query(`
      SELECT id, title, promo_type, display_type, view_count, dismiss_count, click_count,
        CASE WHEN view_count > 0 THEN ROUND(click_count / view_count * 100, 1) ELSE 0 END as ctr,
        CASE WHEN view_count > 0 THEN ROUND(dismiss_count / view_count * 100, 1) ELSE 0 END as dismiss_rate,
        start_date, end_date, is_active
      FROM promotions ORDER BY created_at DESC
    `);
    res.json(promos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// GET /config - Get user's dashboard config (or role default)
router.get('/config', authenticate, async (req, res) => {
  try {
    // First try user-specific config
    let [configs] = await pool.query('SELECT * FROM dashboard_configs WHERE user_id = ?', [req.user.id]);
    if (!configs.length) {
      // Fall back to role default
      [configs] = await pool.query('SELECT * FROM dashboard_configs WHERE role = ? AND is_default = 1', [req.user.role]);
    }
    if (!configs.length) {
      // Fall back to admin default
      [configs] = await pool.query('SELECT * FROM dashboard_configs WHERE role = ? AND is_default = 1', ['admin']);
    }
    const config = configs[0] || { layout: [] };
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /config - Save user's dashboard layout
router.put('/config', authenticate, async (req, res) => {
  try {
    const { layout } = req.body;
    const [existing] = await pool.query('SELECT id FROM dashboard_configs WHERE user_id = ?', [req.user.id]);
    if (existing.length) {
      await pool.query('UPDATE dashboard_configs SET layout = ? WHERE user_id = ?', [JSON.stringify(layout), req.user.id]);
    } else {
      await pool.query('INSERT INTO dashboard_configs (user_id, layout) VALUES (?, ?)', [req.user.id, JSON.stringify(layout)]);
    }
    res.json({ message: 'Dashboard config saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /widgets - List available widgets filtered by user's role permissions
router.get('/widgets', authenticate, async (req, res) => {
  try {
    const [widgets] = await pool.query('SELECT * FROM dashboard_widgets WHERE is_active = 1 ORDER BY category, title');
    const filtered = widgets.filter(w => isRoleAllowed(req.user.role, w.allowed_roles, w.min_role_level));
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// KPI ENDPOINTS (with drill-down data)
// ═══════════════════════════════════════════════════════════════

router.get('/kpi/sales-mtd', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as value 
      FROM ar_invoices 
      WHERE status IN ('posted','paid','partial') 
        AND invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    // Drill-down: daily breakdown
    const [daily] = await pool.query(`
      SELECT DATE(invoice_date) as date, SUM(total) as amount, COUNT(*) as count
      FROM ar_invoices 
      WHERE status IN ('posted','paid','partial') 
        AND invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY DATE(invoice_date) ORDER BY date
    `);
    // Last month comparison
    const [lastMonth] = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as value 
      FROM ar_invoices 
      WHERE status IN ('posted','paid','partial') 
        AND invoice_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND invoice_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    const current = parseFloat(rows[0].value);
    const previous = parseFloat(lastMonth[0].value);
    const change = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 0;
    res.json({ value: current, previous, change: parseFloat(change), trend: current >= previous ? 'up' : 'down', drilldown: daily });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/sales-pipeline', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query(`SELECT COALESCE(SUM(total), 0) as value, COUNT(*) as count FROM quotes WHERE status IN ('pending','sent')`);
    const [orders] = await pool.query(`SELECT COALESCE(SUM(total), 0) as value, COUNT(*) as count FROM sales_orders WHERE status IN ('open','in_progress','released')`);
    res.json({ 
      value: parseFloat(quotes[0].value) + parseFloat(orders[0].value),
      quotes: { value: parseFloat(quotes[0].value), count: quotes[0].count },
      orders: { value: parseFloat(orders[0].value), count: orders[0].count }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/open-orders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT COUNT(*) as value FROM sales_orders WHERE status IN ('open','in_progress','released')`);
    const [drilldown] = await pool.query(`
      SELECT so.id, so.order_number, so.order_date, so.total, so.status, c.company_name as customer
      FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.status IN ('open','in_progress','released') ORDER BY so.order_date DESC LIMIT 20
    `);
    res.json({ value: rows[0].value, drilldown });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/cash-position', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","manager","admin"]', 3)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`SELECT COALESCE(SUM(current_balance), 0) as value FROM bank_accounts WHERE is_active = 1`);
    const [accounts] = await pool.query(`SELECT account_name, current_balance FROM bank_accounts WHERE is_active = 1 ORDER BY current_balance DESC`);
    res.json({ value: parseFloat(rows[0].value), drilldown: accounts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/profit-margin', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","manager","admin"]', 3)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [revenue] = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as val FROM ar_invoices 
      WHERE status IN ('posted','paid','partial') AND invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    const [cogs] = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN gl.account_id IN (SELECT id FROM gl_accounts WHERE account_number LIKE '5%') THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as val
      FROM gl_transactions gl WHERE gl.transaction_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    const rev = parseFloat(revenue[0].val);
    const cost = parseFloat(cogs[0].val);
    const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : 0;
    res.json({ value: parseFloat(margin), revenue: rev, cogs: cost });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/wo-throughput', authenticate, async (req, res) => {
  try {
    const [thisWeek] = await pool.query(`
      SELECT COUNT(*) as value FROM work_orders 
      WHERE status = 'completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    `);
    const [lastWeek] = await pool.query(`
      SELECT COUNT(*) as value FROM work_orders 
      WHERE status = 'completed' 
        AND updated_at >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
        AND updated_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    `);
    res.json({ value: thisWeek[0].value, previous: lastWeek[0].value, trend: thisWeek[0].value >= lastWeek[0].value ? 'up' : 'down' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/inventory-value', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["purchasing","accounting","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`SELECT COALESCE(SUM(quantity_on_hand * standard_cost), 0) as value FROM items WHERE is_active = 1`);
    const [byType] = await pool.query(`
      SELECT it.name as type, COALESCE(SUM(i.quantity_on_hand * i.standard_cost), 0) as value, COUNT(*) as items
      FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id
      WHERE i.is_active = 1 GROUP BY it.name ORDER BY value DESC
    `);
    res.json({ value: parseFloat(rows[0].value), drilldown: byType });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kpi/active-users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const [rows] = await pool.query(`SELECT COUNT(*) as value FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND is_active = 1`);
    const [users] = await pool.query(`SELECT username, first_name, last_name, role, last_login FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND is_active = 1 ORDER BY last_login DESC`);
    res.json({ value: rows[0].value, drilldown: users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// CHART ENDPOINTS
// ═══════════════════════════════════════════════════════════════

router.get('/charts/ar-aging', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN total ELSE 0 END) as current_amount,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN total ELSE 0 END) as days_1_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN total ELSE 0 END) as days_31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN total ELSE 0 END) as days_61_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN total ELSE 0 END) as days_over_90
      FROM ar_invoices WHERE status IN ('posted','partial')
    `);
    const data = rows[0];
    res.json({
      labels: ['Current', '1-30', '31-60', '61-90', '90+'],
      datasets: [{ label: 'AR Aging', data: [parseFloat(data.current_amount)||0, parseFloat(data.days_1_30)||0, parseFloat(data.days_31_60)||0, parseFloat(data.days_61_90)||0, parseFloat(data.days_over_90)||0] }]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/charts/ap-aging', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","purchasing","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN total ELSE 0 END) as current_amount,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN total ELSE 0 END) as days_1_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN total ELSE 0 END) as days_31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN total ELSE 0 END) as days_61_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN total ELSE 0 END) as days_over_90
      FROM ap_invoices WHERE status IN ('posted','partial')
    `);
    const data = rows[0];
    res.json({
      labels: ['Current', '1-30', '31-60', '61-90', '90+'],
      datasets: [{ label: 'AP Aging', data: [parseFloat(data.current_amount)||0, parseFloat(data.days_1_30)||0, parseFloat(data.days_31_60)||0, parseFloat(data.days_61_90)||0, parseFloat(data.days_over_90)||0] }]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/charts/revenue-trend', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","manager","admin"]', 3)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(invoice_date, '%Y-%m') as month, SUM(total) as revenue
      FROM ar_invoices WHERE status IN ('posted','paid','partial') AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m') ORDER BY month
    `);
    res.json({
      labels: rows.map(r => r.month),
      datasets: [{ label: 'Revenue', data: rows.map(r => parseFloat(r.revenue) || 0) }]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/charts/production-status', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT status, COUNT(*) as count FROM work_orders 
      WHERE status NOT IN ('cancelled') GROUP BY status
    `);
    res.json({
      labels: rows.map(r => r.status),
      datasets: [{ label: 'Work Orders', data: rows.map(r => r.count) }]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/charts/bookings-weekly', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["sales","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT YEARWEEK(order_date, 1) as week, SUM(total) as bookings, COUNT(*) as count
      FROM sales_orders WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
      GROUP BY YEARWEEK(order_date, 1) ORDER BY week
    `);
    res.json({
      labels: rows.map(r => `W${String(r.week).slice(-2)}`),
      datasets: [{ label: 'Bookings', data: rows.map(r => parseFloat(r.bookings) || 0) }]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// LIST ENDPOINTS
// ═══════════════════════════════════════════════════════════════

router.get('/lists/low-stock', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.item_number, i.description, i.quantity_on_hand, i.reorder_point, i.reorder_qty,
        it.name as item_type
      FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id
      WHERE i.is_active = 1 AND i.reorder_point > 0 AND i.quantity_on_hand <= i.reorder_point
      ORDER BY (i.quantity_on_hand / i.reorder_point) ASC LIMIT 20
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/lists/overdue-pos', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["purchasing","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT po.id, po.po_number, po.order_date, po.promised_date, po.total, po.status,
        v.company_name as vendor, DATEDIFF(CURDATE(), po.promised_date) as days_overdue
      FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.status IN ('open','sent','partial') AND po.promised_date IS NOT NULL AND po.promised_date < CURDATE()
      ORDER BY po.promised_date ASC LIMIT 20
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/lists/shipments-today', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.shipment_number, s.shipment_date, s.status, s.tracking_number,
        c.company_name as customer, so.order_number
      FROM shipments s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sales_orders so ON s.sales_order_id = so.id
      WHERE DATE(s.shipment_date) = CURDATE() OR (s.status = 'draft' AND DATE(s.shipment_date) <= CURDATE())
      ORDER BY s.shipment_date ASC LIMIT 20
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/lists/overdue-invoices', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["accounting","sales","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.total, i.status,
        c.company_name as customer, DATEDIFF(CURDATE(), i.due_date) as days_overdue
      FROM ar_invoices i LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status IN ('posted','partial') AND i.due_date < CURDATE()
      ORDER BY i.due_date ASC LIMIT 20
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// TABLE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

router.get('/tables/top-customers', authenticate, async (req, res) => {
  try {
    if (!isRoleAllowed(req.user.role, '["sales","accounting","manager","admin"]', 2)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [rows] = await pool.query(`
      SELECT c.id, c.company_name, 
        COALESCE(SUM(i.total), 0) as mtd_revenue,
        COUNT(i.id) as invoice_count
      FROM customers c 
      LEFT JOIN ar_invoices i ON c.id = i.customer_id 
        AND i.status IN ('posted','paid','partial')
        AND i.invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY c.id, c.company_name
      HAVING mtd_revenue > 0
      ORDER BY mtd_revenue DESC LIMIT 10
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// KPI SNAPSHOTS (for historical trend)
// ═══════════════════════════════════════════════════════════════

// POST /snapshot - Record KPI snapshot (called by cron or admin)
router.post('/snapshot', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Auto-capture all key KPIs
    const [salesMtd] = await pool.query(`SELECT COALESCE(SUM(total), 0) as val FROM ar_invoices WHERE status IN ('posted','paid','partial') AND invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`);
    const [cashPos] = await pool.query(`SELECT COALESCE(SUM(current_balance), 0) as val FROM bank_accounts WHERE is_active = 1`);
    const [invVal] = await pool.query(`SELECT COALESCE(SUM(quantity_on_hand * standard_cost), 0) as val FROM items WHERE is_active = 1`);
    const [openOrders] = await pool.query(`SELECT COUNT(*) as val FROM sales_orders WHERE status IN ('open','in_progress','released')`);
    const [openWOs] = await pool.query(`SELECT COUNT(*) as val FROM work_orders WHERE status IN ('released','in_progress')`);

    const snapshots = [
      ['sales_mtd', salesMtd[0].val],
      ['cash_position', cashPos[0].val],
      ['inventory_value', invVal[0].val],
      ['open_orders', openOrders[0].val],
      ['open_work_orders', openWOs[0].val]
    ];
    for (const [key, val] of snapshots) {
      await pool.query(`INSERT INTO kpi_snapshots (snapshot_date, kpi_key, kpi_value) VALUES (CURDATE(), ?, ?) ON DUPLICATE KEY UPDATE kpi_value = ?`, [key, val, val]);
    }
    res.json({ message: 'Snapshots recorded', count: snapshots.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /trends/:key - Get historical KPI trend
router.get('/trends/:key', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT snapshot_date, kpi_value FROM kpi_snapshots WHERE kpi_key = ? ORDER BY snapshot_date DESC LIMIT 90`,
      [req.params.key]
    );
    res.json(rows.reverse());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
