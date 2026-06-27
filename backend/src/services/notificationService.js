const pool = require('../config/database');
const emailService = require('./emailService');

/**
 * Notification Service - Automated alerts for critical business events
 * Checks: Low stock, overdue invoices, WO delays, PO overdue deliveries
 */
class NotificationService {
  constructor() {
    this.checkInterval = null;
  }

  // Start periodic checks (every hour)
  start() {
    console.log('[NotificationService] Starting automated notifications (hourly checks)');
    // Run immediately on start, then every hour
    this.runAllChecks();
    this.checkInterval = setInterval(() => this.runAllChecks(), 60 * 60 * 1000);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  async runAllChecks() {
    try {
      await this.checkLowStock();
      await this.checkOverdueInvoices();
      await this.checkOverdueWorkOrders();
      await this.checkOverduePOs();
    } catch (err) {
      console.error('[NotificationService] Error running checks:', err.message);
    }
  }

  // ============ LOW STOCK ALERTS ============
  async checkLowStock() {
    try {
      const [lowStockItems] = await pool.query(`
        SELECT i.id, i.item_number, i.description, i.qty_on_hand, i.reorder_point, i.reorder_qty,
          it.name as item_type
        FROM items i
        LEFT JOIN item_types it ON i.item_type_id = it.id
        WHERE i.is_active = 1 AND i.reorder_point IS NOT NULL AND i.reorder_point > 0
          AND i.qty_on_hand <= i.reorder_point
        ORDER BY (i.qty_on_hand / i.reorder_point) ASC`);

      if (lowStockItems.length === 0) return;

      // Check if we already sent this alert today
      const [recent] = await pool.query(
        `SELECT id FROM notification_log WHERE notification_type = 'low_stock' AND DATE(sent_at) = CURDATE()`);
      if (recent.length > 0) return; // Already sent today

      // Log the notification
      await pool.query(
        `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
         VALUES ('low_stock', ?, ?, ?, NOW())`,
        [`Low Stock Alert: ${lowStockItems.length} items below reorder point`,
         lowStockItems.length,
         JSON.stringify(lowStockItems.map(i => ({ item: i.item_number, qty: i.qty_on_hand, reorder: i.reorder_point })))]);

      // Try to send email (will fail gracefully if not configured)
      try {
        const itemsHtml = lowStockItems.map(i => `
          <tr>
            <td style="padding:6px;border-bottom:1px solid #eee;">${i.item_number}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;">${i.description}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;color:${i.qty_on_hand <= 0 ? '#dc2626' : '#f59e0b'};font-weight:bold;">${i.qty_on_hand}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${i.reorder_point}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${i.reorder_qty || 'N/A'}</td>
          </tr>`).join('');

        const html = `
          <h2 style="color:#dc2626;">⚠️ Low Stock Alert</h2>
          <p>${lowStockItems.length} item(s) are at or below their reorder point:</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Item #</th>
              <th style="padding:8px;text-align:left;">Description</th>
              <th style="padding:8px;text-align:center;">On Hand</th>
              <th style="padding:8px;text-align:center;">Reorder Point</th>
              <th style="padding:8px;text-align:center;">Reorder Qty</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="margin-top:15px;">Please create purchase orders for these items.</p>`;

        // Get admin email
        const [admins] = await pool.query("SELECT email FROM users WHERE role = 'admin' AND is_active = 1 AND email IS NOT NULL LIMIT 3");
        if (admins.length > 0) {
          await emailService.sendEmail({
            to: admins.map(a => a.email),
            subject: `[MaxTA ERP] Low Stock Alert: ${lowStockItems.length} items need reorder`,
            html
          });
        }
      } catch (e) { /* Email not configured - notification still logged */ }

      console.log(`[NotificationService] Low stock: ${lowStockItems.length} items below reorder point`);
    } catch (err) {
      console.error('[NotificationService] Low stock check error:', err.message);
    }
  }

  // ============ OVERDUE INVOICE ALERTS ============
  async checkOverdueInvoices() {
    try {
      const [overdueInvoices] = await pool.query(`
        SELECT ai.id, ai.invoice_number, ai.total, ai.due_date, ai.balance_due,
          c.company_name as customer_name, c.email as customer_email,
          DATEDIFF(CURDATE(), ai.due_date) as days_overdue
        FROM ar_invoices ai
        LEFT JOIN sales_orders so ON ai.sales_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE ai.status = 'posted' AND ai.due_date < CURDATE()
          AND (ai.balance_due > 0 OR ai.balance_due IS NULL)
        ORDER BY ai.due_date ASC`);

      if (overdueInvoices.length === 0) return;

      // Check if we already sent this alert today
      const [recent] = await pool.query(
        `SELECT id FROM notification_log WHERE notification_type = 'overdue_invoices' AND DATE(sent_at) = CURDATE()`);
      if (recent.length > 0) return;

      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || inv.total || 0), 0);

      await pool.query(
        `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
         VALUES ('overdue_invoices', ?, ?, ?, NOW())`,
        [`Overdue Invoices: ${overdueInvoices.length} invoices totaling $${totalOverdue.toFixed(2)}`,
         overdueInvoices.length,
         JSON.stringify(overdueInvoices.map(i => ({ invoice: i.invoice_number, customer: i.customer_name, amount: i.balance_due || i.total, days: i.days_overdue })))]);

      try {
        const invoicesHtml = overdueInvoices.map(i => `
          <tr>
            <td style="padding:6px;border-bottom:1px solid #eee;">${i.invoice_number}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;">${i.customer_name || 'Unknown'}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">$${parseFloat(i.balance_due || i.total).toFixed(2)}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${new Date(i.due_date).toLocaleDateString()}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;color:#dc2626;font-weight:bold;">${i.days_overdue} days</td>
          </tr>`).join('');

        const html = `
          <h2 style="color:#f59e0b;">💰 Overdue Invoice Alert</h2>
          <p><strong>${overdueInvoices.length}</strong> invoice(s) are past due, totaling <strong>$${totalOverdue.toFixed(2)}</strong>:</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Invoice #</th>
              <th style="padding:8px;text-align:left;">Customer</th>
              <th style="padding:8px;text-align:right;">Balance Due</th>
              <th style="padding:8px;text-align:center;">Due Date</th>
              <th style="padding:8px;text-align:center;">Days Overdue</th>
            </tr></thead>
            <tbody>${invoicesHtml}</tbody>
          </table>
          <p style="margin-top:15px;">Please follow up with these customers for payment.</p>`;

        const [admins] = await pool.query("SELECT email FROM users WHERE role IN ('admin','accounting') AND is_active = 1 AND email IS NOT NULL LIMIT 3");
        if (admins.length > 0) {
          await emailService.sendEmail({
            to: admins.map(a => a.email),
            subject: `[MaxTA ERP] Overdue Invoices: $${totalOverdue.toFixed(2)} past due`,
            html
          });
        }
      } catch (e) { /* Email not configured */ }

      console.log(`[NotificationService] Overdue invoices: ${overdueInvoices.length} totaling $${totalOverdue.toFixed(2)}`);
    } catch (err) {
      console.error('[NotificationService] Overdue invoice check error:', err.message);
    }
  }

  // ============ OVERDUE WORK ORDER ALERTS ============
  async checkOverdueWorkOrders() {
    try {
      const [overdueWOs] = await pool.query(`
        SELECT wo.id, wo.wo_number, wo.order_number, wo.status, wo.due_date, wo.product_type,
          c.company_name as customer_name,
          DATEDIFF(CURDATE(), wo.due_date) as days_overdue
        FROM work_orders wo
        LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE wo.status IN ('planned','scheduled','released','in_progress')
          AND wo.due_date IS NOT NULL AND wo.due_date < CURDATE()
        ORDER BY wo.due_date ASC`);

      if (overdueWOs.length === 0) return;

      const [recent] = await pool.query(
        `SELECT id FROM notification_log WHERE notification_type = 'overdue_wos' AND DATE(sent_at) = CURDATE()`);
      if (recent.length > 0) return;

      await pool.query(
        `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
         VALUES ('overdue_wos', ?, ?, ?, NOW())`,
        [`Overdue Work Orders: ${overdueWOs.length} WOs past due date`,
         overdueWOs.length,
         JSON.stringify(overdueWOs.map(w => ({ wo: w.wo_number || w.order_number, customer: w.customer_name, days: w.days_overdue })))]);

      console.log(`[NotificationService] Overdue WOs: ${overdueWOs.length} work orders past due date`);
    } catch (err) {
      console.error('[NotificationService] Overdue WO check error:', err.message);
    }
  }

  // ============ OVERDUE PO DELIVERY ALERTS ============
  async checkOverduePOs() {
    try {
      const [overduePOs] = await pool.query(`
        SELECT po.id, po.po_number, po.required_date, po.status, po.total_amount,
          v.company_name as vendor_name,
          DATEDIFF(CURDATE(), po.required_date) as days_overdue
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.status IN ('approved','sent','partial')
          AND po.required_date IS NOT NULL AND po.required_date < CURDATE()
        ORDER BY po.required_date ASC`);

      if (overduePOs.length === 0) return;

      const [recent] = await pool.query(
        `SELECT id FROM notification_log WHERE notification_type = 'overdue_pos' AND DATE(sent_at) = CURDATE()`);
      if (recent.length > 0) return;

      await pool.query(
        `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
         VALUES ('overdue_pos', ?, ?, ?, NOW())`,
        [`Overdue PO Deliveries: ${overduePOs.length} POs past required date`,
         overduePOs.length,
         JSON.stringify(overduePOs.map(p => ({ po: p.po_number, vendor: p.vendor_name, days: p.days_overdue })))]);

      console.log(`[NotificationService] Overdue POs: ${overduePOs.length} purchase orders past required date`);
    } catch (err) {
      console.error('[NotificationService] Overdue PO check error:', err.message);
    }
  }

  // ============ GET NOTIFICATION HISTORY (for dashboard) ============
  async getNotifications(limit = 50) {
    const [rows] = await pool.query(
      `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT ?`, [limit]);
    return rows;
  }

  // ============ GET ACTIVE ALERTS (unresolved) ============
  async getActiveAlerts() {
    const alerts = [];

    // Low stock
    const [lowStock] = await pool.query(`
      SELECT COUNT(*) as cnt FROM items
      WHERE is_active = 1 AND reorder_point IS NOT NULL AND reorder_point > 0
        AND qty_on_hand <= reorder_point`);
    if (lowStock[0].cnt > 0) {
      alerts.push({ type: 'low_stock', severity: 'warning', count: lowStock[0].cnt, message: `${lowStock[0].cnt} items below reorder point` });
    }

    // Overdue invoices
    const [overdueAR] = await pool.query(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(balance_due), 0) as total
      FROM ar_invoices WHERE status = 'posted' AND due_date < CURDATE() AND (balance_due > 0 OR balance_due IS NULL)`);
    if (overdueAR[0].cnt > 0) {
      alerts.push({ type: 'overdue_invoices', severity: 'danger', count: overdueAR[0].cnt, message: `${overdueAR[0].cnt} overdue invoices ($${parseFloat(overdueAR[0].total).toFixed(2)})` });
    }

    // Overdue WOs
    const [overdueWO] = await pool.query(`
      SELECT COUNT(*) as cnt FROM work_orders
      WHERE status IN ('planned','scheduled','released','in_progress')
        AND due_date IS NOT NULL AND due_date < CURDATE()`);
    if (overdueWO[0].cnt > 0) {
      alerts.push({ type: 'overdue_wos', severity: 'warning', count: overdueWO[0].cnt, message: `${overdueWO[0].cnt} work orders past due date` });
    }

    // Overdue POs
    const [overduePO] = await pool.query(`
      SELECT COUNT(*) as cnt FROM purchase_orders
      WHERE status IN ('approved','sent','partial')
        AND required_date IS NOT NULL AND required_date < CURDATE()`);
    if (overduePO[0].cnt > 0) {
      alerts.push({ type: 'overdue_pos', severity: 'info', count: overduePO[0].cnt, message: `${overduePO[0].cnt} POs past required delivery date` });
    }

    return alerts;
  }
}

module.exports = new NotificationService();
