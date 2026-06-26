const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAuditHistory } = require('../middleware/auditLog');
const pool = require('../config/database');

// Get recent activity across all tables (dashboard) - MUST be before /:tableName/:recordId
router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [rows] = await pool.query(
      `SELECT al.*, u.username, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as user_full_name
       FROM audit_log al
       LEFT JOIN users u ON al.changed_by = u.id
       ORDER BY al.changed_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity by user - MUST be before /:tableName/:recordId
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [rows] = await pool.query(
      `SELECT al.*, u.username, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as user_full_name
       FROM audit_log al
       LEFT JOIN users u ON al.changed_by = u.id
       WHERE al.changed_by = ?
       ORDER BY al.changed_at DESC
       LIMIT ?`,
      [req.params.userId, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get audit history for a specific record (generic parameterized route - LAST)
router.get('/:tableName/:recordId', authenticate, async (req, res) => {
  try {
    const history = await getAuditHistory(req.params.tableName, req.params.recordId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
