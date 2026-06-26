const pool = require('../config/database');

/**
 * Document Locking Middleware
 * Prevents modification or deletion of posted/finalized financial documents
 * Posted invoices, payments, and journal entries are IMMUTABLE
 * They can only be voided (with a reversal entry) or credited (with a credit memo)
 */

const LOCKED_STATUSES = ['posted', 'paid', 'partially_paid', 'void', 'closed'];

/**
 * Check if a document is locked (cannot be modified)
 */
async function isDocumentLocked(tableName, recordId) {
  try {
    const [rows] = await pool.query(
      `SELECT status FROM ${tableName} WHERE id = ?`, [recordId]
    );
    if (!rows.length) return false;
    return LOCKED_STATUSES.includes(rows[0].status);
  } catch (err) {
    return false;
  }
}

/**
 * Middleware factory - prevents PUT/DELETE on locked documents
 * Usage: router.put('/:id', checkDocumentLock('ar_invoices'), handler)
 */
function checkDocumentLock(tableName) {
  return async (req, res, next) => {
    const recordId = req.params.id;
    if (!recordId) return next();

    const locked = await isDocumentLocked(tableName, recordId);
    if (locked) {
      return res.status(403).json({
        error: 'Document is locked',
        message: `This ${tableName.replace(/_/g, ' ')} has been posted and cannot be modified. To make changes, void the document and create a new one, or issue a credit memo.`
      });
    }
    next();
  };
}

/**
 * Prevent deletion of financial documents entirely
 * Financial documents should NEVER be deleted - only voided
 */
function preventDelete(tableName) {
  return async (req, res, next) => {
    return res.status(403).json({
      error: 'Deletion not allowed',
      message: `${tableName.replace(/_/g, ' ')} cannot be deleted. To reverse this document, use the Void function which creates a reversal entry for audit trail purposes.`
    });
  };
}

module.exports = { isDocumentLocked, checkDocumentLock, preventDelete };
