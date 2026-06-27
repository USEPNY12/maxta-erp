const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/notifications/fix-schema - One-time fix for missing columns
router.post('/fix-schema', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notifications');
    await pool.query(`CREATE TABLE notifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, title VARCHAR(255), message TEXT, category VARCHAR(50) DEFAULT 'general', priority ENUM('low','normal','high','urgent') DEFAULT 'normal', reference_type VARCHAR(50), reference_id INT, is_read BOOLEAN DEFAULT FALSE, is_dismissed BOOLEAN DEFAULT FALSE, read_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    // Also fix work_orders table for lamination
    const alterResults = [];
    try { await pool.query("ALTER TABLE work_orders ADD COLUMN parent_wo_id INT DEFAULT NULL"); alterResults.push("parent_wo_id added"); } catch(e) { alterResults.push("parent_wo_id exists"); }
    try { await pool.query("ALTER TABLE work_orders ADD COLUMN wo_category ENUM('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard'"); alterResults.push("wo_category added"); } catch(e) { alterResults.push("wo_category exists"); }
    res.json({ success: true, message: "Schema fixed", alterResults });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/notifications - Get user's notifications
router.get('/', async (req, res) => {
  try {
    const { unread_only, category, limit = 50 } = req.query;
    let where = 'n.user_id = ?';
    const params = [req.user.id];
    if (unread_only === 'true') { where += ' AND n.is_read = 0'; }
    if (category) { where += ' AND n.category = ?'; params.push(category); }
    const [rows] = await pool.query(`SELECT n.* FROM notifications n WHERE ${where} AND n.is_dismissed = 0 ORDER BY n.created_at DESC LIMIT ?`, [...params, parseInt(limit)]);
    const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0', [req.user.id]);
    res.json({ notifications: rows, unread_count: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/count - Get unread count (lightweight)
router.get('/count', async (req, res) => {
  try {
    const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0', [req.user.id]);
    res.json({ unread_count: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/dismiss - Dismiss notification
router.put('/:id/dismiss', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_dismissed = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Dismissed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/rules - Get notification rules
router.get('/rules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notification_rules ORDER BY rule_name');
    res.json({ rules: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/rules/:id - Update rule
router.put('/rules/:id', async (req, res) => {
  try {
    const { is_active, conditions, notify_roles, notify_users, notify_method, frequency } = req.body;
    await pool.query('UPDATE notification_rules SET is_active=?, conditions=?, notify_roles=?, notify_users=?, notify_method=?, frequency=? WHERE id=?',
      [is_active ? 1 : 0, JSON.stringify(conditions), JSON.stringify(notify_roles), JSON.stringify(notify_users), notify_method, frequency, req.params.id]);
    res.json({ message: 'Rule updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/rules - Create rule
router.post('/rules', async (req, res) => {
  try {
    const { rule_name, rule_type, conditions, notify_roles, notify_users, notify_method, frequency } = req.body;
    const [result] = await pool.query('INSERT INTO notification_rules (rule_name, rule_type, conditions, notify_roles, notify_users, notify_method, frequency) VALUES (?,?,?,?,?,?,?)',
      [rule_name, rule_type, JSON.stringify(conditions || {}), JSON.stringify(notify_roles || []), JSON.stringify(notify_users || []), notify_method || 'in_app', frequency || 'immediate']);
    res.json({ id: result.insertId, message: 'Rule created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/check - Run notification checks (called by cron or manually)
router.post('/check', async (req, res) => {
  try {
    let created = 0;
    // Check low stock
    const [lowStock] = await pool.query("SELECT i.id, i.item_number, i.description, i.reorder_point, COALESCE(ib.quantity_on_hand, 0) as on_hand FROM items i LEFT JOIN inventory_balances ib ON i.id = ib.item_id WHERE i.reorder_point > 0 AND COALESCE(ib.quantity_on_hand, 0) <= i.reorder_point");
    for (const item of lowStock) {
      const [existing] = await pool.query("SELECT id FROM notifications WHERE reference_type = 'item' AND reference_id = ? AND category = 'inventory' AND is_dismissed = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)", [item.id]);
      if (!existing.length) {
        const [users] = await pool.query("SELECT id FROM users WHERE role IN ('admin','inventory_manager')");
        for (const u of users) {
          await pool.query("INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id) VALUES (?,?,?,?,?,?,?)",
            [u.id, `Low Stock: ${item.item_number}`, `${item.description} is at ${item.on_hand} units (reorder point: ${item.reorder_point})`, 'warning', 'inventory', 'item', item.id]);
          created++;
        }
      }
    }
    // Check overdue invoices
    const [overdue] = await pool.query("SELECT id, invoice_number, customer_id, due_date, balance FROM ar_invoices WHERE status IN ('open','posted') AND due_date < CURDATE() AND balance > 0");
    for (const inv of overdue) {
      const [existing] = await pool.query("SELECT id FROM notifications WHERE reference_type = 'ar_invoice' AND reference_id = ? AND is_dismissed = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)", [inv.id]);
      if (!existing.length) {
        const daysPast = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
        const [users] = await pool.query("SELECT id FROM users WHERE role IN ('admin','accounting')");
        for (const u of users) {
          await pool.query("INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id) VALUES (?,?,?,?,?,?,?)",
            [u.id, `Overdue Invoice: ${inv.invoice_number}`, `Invoice ${inv.invoice_number} is ${daysPast} days overdue. Balance: $${inv.balance}`, 'error', 'accounting', 'ar_invoice', inv.id]);
          created++;
        }
      }
    }
    // Check WO deadlines (due tomorrow)
    const [woDue] = await pool.query("SELECT id, wo_number, due_date FROM work_orders WHERE status IN ('open','released','in-progress') AND due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)");
    for (const wo of woDue) {
      const [existing] = await pool.query("SELECT id FROM notifications WHERE reference_type = 'work_order' AND reference_id = ? AND is_dismissed = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)", [wo.id]);
      if (!existing.length) {
        const [users] = await pool.query("SELECT id FROM users WHERE role IN ('admin','production_manager')");
        for (const u of users) {
          await pool.query("INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id) VALUES (?,?,?,?,?,?,?)",
            [u.id, `WO Due Tomorrow: ${wo.wo_number}`, `Work Order ${wo.wo_number} is due tomorrow (${wo.due_date})`, 'warning', 'manufacturing', 'work_order', wo.id]);
          created++;
        }
      }
    }
    res.json({ message: `Notification check complete. ${created} new notifications created.`, created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/preferences - Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notification_preferences WHERE user_id = ?', [req.user.id]);
    if (!rows.length) {
      return res.json({ preferences: { email_enabled: true, in_app_enabled: true, digest_frequency: 'immediate', muted_categories: [] } });
    }
    res.json({ preferences: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/preferences - Update preferences
router.put('/preferences', async (req, res) => {
  try {
    const { email_enabled, in_app_enabled, digest_frequency, muted_categories } = req.body;
    const [existing] = await pool.query('SELECT id FROM notification_preferences WHERE user_id = ?', [req.user.id]);
    if (existing.length) {
      await pool.query('UPDATE notification_preferences SET email_enabled=?, in_app_enabled=?, digest_frequency=?, muted_categories=? WHERE user_id=?',
        [email_enabled ? 1 : 0, in_app_enabled ? 1 : 0, digest_frequency, JSON.stringify(muted_categories || []), req.user.id]);
    } else {
      await pool.query('INSERT INTO notification_preferences (user_id, email_enabled, in_app_enabled, digest_frequency, muted_categories) VALUES (?,?,?,?,?)',
        [req.user.id, email_enabled ? 1 : 0, in_app_enabled ? 1 : 0, digest_frequency, JSON.stringify(muted_categories || [])]);
    }
    res.json({ message: 'Preferences updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/alerts - Get active system alerts (low stock, overdue, etc.)
router.get('/alerts', async (req, res) => {
  try {
    const notifService = require('../services/notificationService');
    const alerts = await notifService.getActiveAlerts();
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/log - Get notification history log
router.get('/log', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const notifService = require('../services/notificationService');
    const log = await notifService.getNotifications(parseInt(limit));
    res.json({ log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/run-checks - Manually trigger all notification checks
router.post('/run-checks', async (req, res) => {
  try {
    const notifService = require('../services/notificationService');
    await notifService.runAllChecks();
    res.json({ message: 'All notification checks completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
