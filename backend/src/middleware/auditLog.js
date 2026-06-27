const pool = require('../config/database');

/**
 * Audit Log Middleware
 * Records all data changes (INSERT, UPDATE, DELETE, POST, VOID, CONVERT, EMAIL, PRINT)
 * Append-only - audit records can never be modified or deleted
 */

async function logAudit(tableName, recordId, operation, changedBy, oldData, newData, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, operation, changed_by, changed_at, old_data, new_data, ip_address)
       VALUES (?, ?, ?, ?, NOW(3), ?, ?, ?)`,
      [
        tableName,
        recordId,
        operation,
        changedBy,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
    // Don't throw - audit failures shouldn't break the operation
  }
}

/**
 * Get audit history for a specific record
 */
async function getAuditHistory(tableName, recordId) {
  const [rows] = await pool.query(
    `SELECT al.*, u.username, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as user_full_name
     FROM audit_log al
     LEFT JOIN users u ON al.changed_by = u.id
     WHERE al.table_name = ? AND al.record_id = ?
     ORDER BY al.changed_at DESC`,
    [tableName, recordId]
  );
  return rows;
}

/**
 * Express middleware that attaches audit helper to request
 */
function auditMiddleware(req, res, next) {
  req.audit = async (tableName, recordId, operation, oldData, newData) => {
    const userId = req.user ? req.user.id : null;
    const ip = req.ip || req.connection.remoteAddress;
    await logAudit(tableName, recordId, operation, userId, oldData, newData, ip);
  };
  next();
}

module.exports = { logAudit, getAuditHistory, auditMiddleware };
