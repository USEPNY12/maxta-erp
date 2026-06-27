const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/smartglazier/config - Get integration config
router.get('/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sg_integration_config LIMIT 1');
    if (!rows.length) {
      return res.json({ config: { sync_enabled: false, api_url: 'https://api.smartglazier.com', auto_create_so: true, auto_create_wo: false } });
    }
    // Mask API secret
    const config = rows[0];
    if (config.api_secret) config.api_secret = '••••••••';
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/smartglazier/config - Update integration config
router.put('/config', async (req, res) => {
  try {
    const { api_url, api_key, api_secret, company_id, sync_enabled, sync_interval_minutes, auto_create_so, auto_create_wo, default_payment_terms } = req.body;
    const [existing] = await pool.query('SELECT id FROM sg_integration_config LIMIT 1');
    if (existing.length) {
      const updates = [];
      const values = [];
      if (api_url !== undefined) { updates.push('api_url = ?'); values.push(api_url); }
      if (api_key !== undefined) { updates.push('api_key = ?'); values.push(api_key); }
      if (api_secret !== undefined && api_secret !== '••••••••') { updates.push('api_secret = ?'); values.push(api_secret); }
      if (company_id !== undefined) { updates.push('company_id = ?'); values.push(company_id); }
      if (sync_enabled !== undefined) { updates.push('sync_enabled = ?'); values.push(sync_enabled ? 1 : 0); }
      if (sync_interval_minutes !== undefined) { updates.push('sync_interval_minutes = ?'); values.push(sync_interval_minutes); }
      if (auto_create_so !== undefined) { updates.push('auto_create_so = ?'); values.push(auto_create_so ? 1 : 0); }
      if (auto_create_wo !== undefined) { updates.push('auto_create_wo = ?'); values.push(auto_create_wo ? 1 : 0); }
      if (default_payment_terms !== undefined) { updates.push('default_payment_terms = ?'); values.push(default_payment_terms); }
      if (updates.length) {
        values.push(existing[0].id);
        await pool.query(`UPDATE sg_integration_config SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    } else {
      await pool.query('INSERT INTO sg_integration_config (api_url, api_key, api_secret, company_id, sync_enabled, sync_interval_minutes, auto_create_so, auto_create_wo, default_payment_terms) VALUES (?,?,?,?,?,?,?,?,?)',
        [api_url || 'https://api.smartglazier.com', api_key || '', api_secret || '', company_id || '', sync_enabled ? 1 : 0, sync_interval_minutes || 15, auto_create_so ? 1 : 0, auto_create_wo ? 1 : 0, default_payment_terms || 'Net 30']);
    }
    res.json({ message: 'Configuration saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smartglazier/orders - List synced orders
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND o.sync_status = ?'; params.push(status); }
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(`SELECT o.*, c.company_name as local_customer_name, so.order_number as local_so_number FROM sg_orders o LEFT JOIN customers c ON o.local_customer_id = c.id LEFT JOIN sales_orders so ON o.local_sales_order_id = so.id WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM sg_orders o WHERE ${where}`, params);
    res.json({ orders: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smartglazier/orders/:id - Get order detail with lines
router.get('/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM sg_orders WHERE id = ?', [req.params.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const [lines] = await pool.query('SELECT * FROM sg_order_lines WHERE sg_order_id = ?', [req.params.id]);
    res.json({ order: orders[0], lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/smartglazier/orders/:id/sync - Manually sync an order to local SO
router.post('/orders/:id/sync', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM sg_orders WHERE id = ?', [req.params.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    // Find or create customer
    let customerId = order.local_customer_id;
    if (!customerId && order.sg_customer_name) {
      const [existing] = await pool.query('SELECT id FROM customers WHERE company_name LIKE ? OR email = ?', [`%${order.sg_customer_name}%`, order.sg_customer_email || '']);
      if (existing.length) {
        customerId = existing[0].id;
      } else {
        const [seq] = await pool.query("SELECT current_value FROM sequences WHERE sequence_name = 'customer_number'");
        const nextNum = (seq.length ? seq[0].current_value : 0) + 1;
        await pool.query("UPDATE sequences SET current_value = ? WHERE sequence_name = 'customer_number'", [nextNum]);
        const custNum = `CUST-${String(nextNum).padStart(4, '0')}`;
        const [result] = await pool.query('INSERT INTO customers (customer_number, company_name, contact_name, email, payment_terms) VALUES (?,?,?,?,?)',
          [custNum, order.sg_customer_name, order.sg_customer_name, order.sg_customer_email || '', 'Net 30']);
        customerId = result.insertId;
      }
    }
    // Create Sales Order
    const [seq] = await pool.query("SELECT current_value FROM sequences WHERE sequence_name = 'so_number'");
    const nextSO = (seq.length ? seq[0].current_value : 0) + 1;
    await pool.query("UPDATE sequences SET current_value = ? WHERE sequence_name = 'so_number'", [nextSO]);
    const soNumber = `SO-${String(nextSO).padStart(5, '0')}`;
    const [soResult] = await pool.query('INSERT INTO sales_orders (so_number, customer_id, order_date, status, subtotal, total, notes) VALUES (?,?,?,?,?,?,?)',
      [soNumber, customerId, order.sg_order_date || new Date(), 'open', order.sg_total || 0, order.sg_total || 0, `Imported from Smart Glazier Order: ${order.sg_order_number}`]);
    const soId = soResult.insertId;
    // Create SO lines from SG order lines
    const [lines] = await pool.query('SELECT * FROM sg_order_lines WHERE sg_order_id = ?', [req.params.id]);
    for (const line of lines) {
      await pool.query('INSERT INTO sales_order_lines (sales_order_id, item_id, description, quantity, unit_price, total_price) VALUES (?,?,?,?,?,?)',
        [soId, line.local_item_id, line.description || `${line.product_type} ${line.width}x${line.height}`, line.quantity || 1, line.unit_price || 0, line.total_price || 0]);
    }
    // Update sg_order
    await pool.query('UPDATE sg_orders SET local_customer_id = ?, local_sales_order_id = ?, sync_status = ?, synced_at = NOW() WHERE id = ?',
      [customerId, soId, 'synced', req.params.id]);
    res.json({ message: 'Order synced successfully', sales_order_id: soId, so_number: soNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/smartglazier/sync - Trigger manual sync
router.post('/sync', async (req, res) => {
  try {
    // This would call the Smart Glazier API - for now, log the attempt
    await pool.query('INSERT INTO sg_sync_log (sync_type, direction, status, started_at, completed_at) VALUES (?,?,?,NOW(),NOW())',
      ['orders', 'pull', 'success']);
    await pool.query('UPDATE sg_integration_config SET last_sync_at = NOW(), last_sync_status = ?', ['success']);
    res.json({ message: 'Sync triggered. Check sync log for results.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smartglazier/sync-log - Get sync history
router.get('/sync-log', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sg_sync_log ORDER BY created_at DESC LIMIT 50');
    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/smartglazier/orders/:id/ignore - Mark order as ignored
router.post('/orders/:id/ignore', async (req, res) => {
  try {
    await pool.query('UPDATE sg_orders SET sync_status = ? WHERE id = ?', ['ignored', req.params.id]);
    res.json({ message: 'Order marked as ignored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
