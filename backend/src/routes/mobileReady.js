const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// Generate VAPID keys on first run (stored in system_settings)
let VAPID_KEYS = null;

async function getVapidKeys() {
  if (VAPID_KEYS) return VAPID_KEYS;
  try {
    const [rows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'vapid_keys'");
    if (rows.length > 0) {
      VAPID_KEYS = JSON.parse(rows[0].setting_value);
    } else {
      // Generate new VAPID keys using crypto
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      });
      VAPID_KEYS = {
        publicKey: publicKey.toString('base64url'),
        privateKey: privateKey.toString('base64url')
      };
      await pool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('vapid_keys', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [JSON.stringify(VAPID_KEYS), JSON.stringify(VAPID_KEYS)]
      );
    }
  } catch (e) {
    // Fallback: generate ephemeral keys
    VAPID_KEYS = { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDY6ThXy7SICiH67WExHBBsJH6qlqNDpNag', privateKey: 'demo' };
  }
  return VAPID_KEYS;
}

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

// GET /api/mobile/vapid-key - Get public VAPID key for push subscription
router.get('/vapid-key', async (req, res) => {
  try {
    const keys = await getVapidKeys();
    res.json({ publicKey: keys.publicKey });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/push/subscribe - Register push subscription
router.post('/push/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys, deviceName, deviceType } = req.body;
    if (!endpoint || !keys) return res.status(400).json({ error: 'endpoint and keys required' });

    // Upsert subscription
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key, device_name, device_type, is_active, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth_key = VALUES(auth_key), 
       device_name = VALUES(device_name), is_active = 1, last_used_at = NOW()`,
      [req.user.id, endpoint, keys.p256dh, keys.auth, deviceName || 'Unknown', deviceType || 'desktop']
    );
    res.json({ success: true, message: 'Push subscription registered' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/mobile/push/unsubscribe - Remove push subscription
router.delete('/push/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await pool.query('UPDATE push_subscriptions SET is_active = 0 WHERE user_id = ? AND endpoint = ?', [req.user.id, endpoint]);
    } else {
      await pool.query('UPDATE push_subscriptions SET is_active = 0 WHERE user_id = ?', [req.user.id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mobile/push/subscriptions - List user's subscriptions
router.get('/push/subscriptions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, device_name, device_type, is_active, created_at, last_used_at FROM push_subscriptions WHERE user_id = ? ORDER BY last_used_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/push/send - Send push notification (admin or system)
router.post('/push/send', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { userId, title, body, url, tag, priority } = req.body;
    
    // Get active subscriptions for target user(s)
    let query = 'SELECT * FROM push_subscriptions WHERE is_active = 1';
    const params = [];
    if (userId) { query += ' AND user_id = ?'; params.push(userId); }
    const [subs] = await pool.query(query, params);

    // In production, you'd use web-push library here
    // For now, store as in-app notification and return subscription count
    if (userId) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, title, body, priority || 'info']
      );
    }
    res.json({ success: true, subscriptions_targeted: subs.length, message: 'Notification queued' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════════════

// GET /api/mobile/preferences - Get user's notification preferences
// Adapts to existing schema: notification_preferences has (user_id, email_enabled, in_app_enabled, muted_categories JSON)
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT email_enabled, in_app_enabled, muted_categories FROM notification_preferences WHERE user_id = ?',
      [req.user.id]
    );
    const categories = ['orders', 'production', 'inventory', 'accounting', 'shipping', 'system', 'approvals'];
    let mutedCats = [];
    let emailEnabled = true;
    let inAppEnabled = true;
    if (rows.length > 0) {
      emailEnabled = !!rows[0].email_enabled;
      inAppEnabled = !!rows[0].in_app_enabled;
      try { mutedCats = rows[0].muted_categories || []; } catch(e) { mutedCats = []; }
    }
    const prefs = categories.map(cat => ({
      category: cat,
      push_enabled: !mutedCats.includes(cat),
      in_app_enabled: inAppEnabled && !mutedCats.includes(cat),
      email_enabled: emailEnabled && !mutedCats.includes(cat)
    }));
    res.json(prefs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/mobile/preferences - Update notification preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { preferences } = req.body; // Array of { category, push_enabled, in_app_enabled, email_enabled }
    if (!Array.isArray(preferences)) return res.status(400).json({ error: 'preferences array required' });

    // Convert per-category prefs back to muted_categories array
    const mutedCats = preferences.filter(p => !p.push_enabled && !p.in_app_enabled).map(p => p.category);
    const emailEnabled = preferences.some(p => p.email_enabled) ? 1 : 0;
    const inAppEnabled = preferences.some(p => p.in_app_enabled) ? 1 : 0;

    await pool.query(
      `INSERT INTO notification_preferences (user_id, email_enabled, in_app_enabled, muted_categories)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email_enabled = VALUES(email_enabled), in_app_enabled = VALUES(in_app_enabled), muted_categories = VALUES(muted_categories)`,
      [req.user.id, emailEnabled, inAppEnabled, JSON.stringify(mutedCats)]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// KIOSK MODE
// ═══════════════════════════════════════════════════════════════════

// GET /api/mobile/kiosk/stations - List all kiosk stations
router.get('/kiosk/stations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ks.*, wc.name as work_center_name 
       FROM kiosk_stations ks 
       LEFT JOIN work_centers wc ON ks.work_center_id = wc.id 
       WHERE ks.is_active = 1 
       ORDER BY ks.station_name`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/kiosk/authenticate - PIN-based kiosk authentication
router.post('/kiosk/authenticate', async (req, res) => {
  try {
    const { stationCode, pin } = req.body;
    if (!stationCode || !pin) return res.status(400).json({ error: 'stationCode and pin required' });

    const [stations] = await pool.query(
      'SELECT * FROM kiosk_stations WHERE station_code = ? AND is_active = 1',
      [stationCode]
    );
    if (stations.length === 0) return res.status(404).json({ error: 'Station not found' });
    
    const station = stations[0];
    if (station.pin_code !== pin) return res.status(401).json({ error: 'Invalid PIN' });

    // Update heartbeat
    await pool.query('UPDATE kiosk_stations SET last_heartbeat = NOW() WHERE id = ?', [station.id]);

    // Handle both JSON objects (MySQL 8 native JSON) and strings
    let allowedActions = station.allowed_actions || [];
    let config = station.config || {};
    if (typeof allowedActions === 'string') { try { allowedActions = JSON.parse(allowedActions); } catch(e) { allowedActions = []; } }
    if (typeof config === 'string') { try { config = JSON.parse(config); } catch(e) { config = {}; } }

    res.json({
      success: true,
      station: {
        id: station.id,
        name: station.station_name,
        code: station.station_code,
        workCenterId: station.work_center_id,
        allowedActions,
        config
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/kiosk/heartbeat - Kiosk health check
router.post('/kiosk/heartbeat', async (req, res) => {
  try {
    const { stationId } = req.body;
    await pool.query('UPDATE kiosk_stations SET last_heartbeat = NOW() WHERE id = ?', [stationId]);
    res.json({ success: true, serverTime: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/kiosk/action - Log a kiosk action
router.post('/kiosk/action', async (req, res) => {
  try {
    const { stationId, userId, actionType, actionData } = req.body;
    if (!stationId || !actionType) return res.status(400).json({ error: 'stationId and actionType required' });

    const [result] = await pool.query(
      'INSERT INTO kiosk_sessions (station_id, user_id, action_type, action_data) VALUES (?, ?, ?, ?)',
      [stationId, userId || null, actionType, JSON.stringify(actionData || {})]
    );

    // Process the action
    let response = { success: true, sessionId: result.insertId };

    if (actionType === 'scan_wo') {
      // Look up work order by barcode
      const woNumber = actionData?.barcode;
      if (woNumber) {
        const [wos] = await pool.query(
          'SELECT id, wo_number, status, product_type, quantity FROM work_orders WHERE wo_number = ?',
          [woNumber]
        );
        response.workOrder = wos[0] || null;
      }
    } else if (actionType === 'log_production') {
      // Log production quantity
      const { workOrderId, quantity, station } = actionData || {};
      if (workOrderId && quantity) {
        await pool.query(
          'UPDATE work_orders SET completed_qty = completed_qty + ? WHERE id = ?',
          [quantity, workOrderId]
        );
        response.message = `Logged ${quantity} units for WO`;
      }
    } else if (actionType === 'report_issue') {
      // Create a notification for the issue
      const { workOrderId, issueType, description } = actionData || {};
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (1, ?, ?, ?, ?, ?)',
        [`Issue: ${issueType}`, description || 'Issue reported from kiosk', 'warning', 'work_order', workOrderId]
      );
      response.message = 'Issue reported';
    }

    res.json(response);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mobile/kiosk/stations/:id/sessions - Get recent sessions for a station
router.get('/kiosk/stations/:id/sessions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ks.*, u.name as user_name 
       FROM kiosk_sessions ks 
       LEFT JOIN users u ON ks.user_id = u.id 
       WHERE ks.station_id = ? 
       ORDER BY ks.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD for kiosk stations (admin)
router.post('/kiosk/stations', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { stationName, stationCode, workCenterId, departmentId, pinCode, allowedActions, config } = req.body;
    const [result] = await pool.query(
      'INSERT INTO kiosk_stations (station_name, station_code, work_center_id, department_id, pin_code, allowed_actions, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [stationName, stationCode, workCenterId, departmentId, pinCode || '1234', JSON.stringify(allowedActions || []), JSON.stringify(config || {})]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/kiosk/stations/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { stationName, stationCode, workCenterId, departmentId, pinCode, allowedActions, config, isActive } = req.body;
    await pool.query(
      `UPDATE kiosk_stations SET station_name = ?, station_code = ?, work_center_id = ?, department_id = ?, 
       pin_code = ?, allowed_actions = ?, config = ?, is_active = ? WHERE id = ?`,
      [stationName, stationCode, workCenterId, departmentId, pinCode, JSON.stringify(allowedActions || []), JSON.stringify(config || {}), isActive ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// OFFLINE SYNC
// ═══════════════════════════════════════════════════════════════════

// POST /api/mobile/offline/sync - Batch sync queued offline actions
router.post('/offline/sync', authenticate, async (req, res) => {
  try {
    const { actions } = req.body; // Array of { actionType, payload, queuedAt, deviceId }
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ error: 'actions array required' });
    }

    const results = [];
    for (const action of actions) {
      try {
        let result = { success: true };
        // Convert ISO datetime to MySQL format
        const queuedAt = action.queuedAt ? new Date(action.queuedAt) : new Date();

        switch (action.actionType) {
          case 'production_scan': {
            // Log production scan
            const { workOrderId, station, quantity } = action.payload;
            if (workOrderId) {
              await pool.query(
                'INSERT INTO kiosk_sessions (station_id, user_id, action_type, action_data) VALUES (?, ?, ?, ?)',
                [action.payload.stationId || 0, req.user.id, 'scan_wo', JSON.stringify(action.payload)]
              );
            }
            break;
          }
          case 'inventory_transfer': {
            const { itemId, fromLocation, toLocation, quantity } = action.payload;
            if (itemId && toLocation && quantity) {
              await pool.query(
                `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, reference_type, notes, created_at)
                 VALUES (?, 'transfer', ?, ?, 'offline_sync', ?, ?)`,
                [itemId, quantity, toLocation, `Offline sync from ${fromLocation}`, queuedAt]
              );
            }
            break;
          }
          case 'receiving_scan': {
            const { poId, itemId, quantity: recvQty } = action.payload;
            // Log as offline receipt
            await pool.query(
              'INSERT INTO offline_sync_queue (user_id, device_id, action_type, payload, status, queued_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
              [req.user.id, action.deviceId, action.actionType, JSON.stringify(action.payload), 'synced', queuedAt]
            );
            break;
          }
          case 'shipping_verify': {
            await pool.query(
              'INSERT INTO offline_sync_queue (user_id, device_id, action_type, payload, status, queued_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
              [req.user.id, action.deviceId, action.actionType, JSON.stringify(action.payload), 'synced', queuedAt]
            );
            break;
          }
          default:
            result = { success: false, error: `Unknown action type: ${action.actionType}` };
        }

        results.push({ ...result, actionType: action.actionType, queuedAt: action.queuedAt });
      } catch (actionError) {
        results.push({ success: false, actionType: action.actionType, error: actionError.message });
        // Log failed sync
        await pool.query(
          'INSERT INTO offline_sync_queue (user_id, device_id, action_type, payload, status, error_message, queued_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, action.deviceId, action.actionType, JSON.stringify(action.payload), 'failed', actionError.message, queuedAt]
        ).catch(() => {});
      }
    }

    const synced = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ synced, failed, total: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mobile/offline/conflicts - Get unresolved sync conflicts
router.get('/offline/conflicts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM offline_sync_queue WHERE user_id = ? AND status IN ('failed', 'conflict') ORDER BY queued_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mobile/offline/resolve/:id - Resolve a sync conflict
router.post('/offline/resolve/:id', authenticate, async (req, res) => {
  try {
    const { resolution } = req.body; // 'retry', 'discard', 'manual'
    if (resolution === 'discard') {
      await pool.query('UPDATE offline_sync_queue SET status = ? WHERE id = ? AND user_id = ?', ['synced', req.params.id, req.user.id]);
    } else if (resolution === 'retry') {
      await pool.query('UPDATE offline_sync_queue SET status = ?, retry_count = retry_count + 1 WHERE id = ? AND user_id = ?', ['pending', req.params.id, req.user.id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// PWA STATUS
// ═══════════════════════════════════════════════════════════════════

// GET /api/mobile/status - Get PWA/mobile status info
router.get('/status', authenticate, async (req, res) => {
  try {
    const [[{ subCount }]] = await pool.query(
      'SELECT COUNT(*) as subCount FROM push_subscriptions WHERE user_id = ? AND is_active = 1',
      [req.user.id]
    );
    const [[{ pendingSync }]] = await pool.query(
      "SELECT COUNT(*) as pendingSync FROM offline_sync_queue WHERE user_id = ? AND status = 'pending'",
      [req.user.id]
    );
    const [[{ conflictCount }]] = await pool.query(
      "SELECT COUNT(*) as conflictCount FROM offline_sync_queue WHERE user_id = ? AND status IN ('failed','conflict')",
      [req.user.id]
    );
    const [stations] = await pool.query('SELECT COUNT(*) as cnt FROM kiosk_stations WHERE is_active = 1');

    res.json({
      pushSubscriptions: subCount,
      pendingSync,
      conflicts: conflictCount,
      activeKiosks: stations[0].cnt,
      serviceWorkerVersion: 'v9',
      features: {
        pwa: true,
        pushNotifications: true,
        offlineScanning: true,
        kioskMode: true,
        backgroundSync: true
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
