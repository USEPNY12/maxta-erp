/**
 * MaxTA ERP - Document Auto-Numbering Service (v2)
 * Generates professional document numbers with configurable prefixes
 * Format: PREFIX-YYYY-NNNNN (e.g., QT-2026-00145, SO-2026-00023)
 * 
 * Uses existing `sequences` table (seq_name, prefix, current_value, pad_length)
 * Atomic increment prevents duplicate numbers
 */
const pool = require('../config/database');

class SequenceService {
  /**
   * Get the next document number for a given sequence
   * Uses atomic UPDATE + SELECT to prevent duplicates
   * @param {string} seqName - Sequence name (e.g., 'quote', 'sales_order', 'purchase_order')
   * @returns {string} Formatted document number (e.g., 'QT-2026-01006')
   */
  static async getNextNumber(seqName) {
    const year = new Date().getFullYear();

    // Atomic increment
    const [updateResult] = await pool.query(
      'UPDATE sequences SET current_value = current_value + increment_by WHERE seq_name = ?',
      [seqName]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(`Sequence '${seqName}' not found. Please create it in System Setup.`);
    }

    // Get the updated value
    const [rows] = await pool.query(
      'SELECT current_value, prefix, pad_length FROM sequences WHERE seq_name = ?',
      [seqName]
    );

    if (!rows.length) throw new Error(`Sequence '${seqName}' not found`);

    const { current_value, prefix, pad_length } = rows[0];
    const paddedNum = String(current_value).padStart(pad_length, '0');

    // Format: PREFIX + YEAR + PADDED_NUMBER (e.g., QT-2026-01006)
    return `${prefix}${year}-${paddedNum}`;
  }

  /**
   * Get the next number WITHOUT the year (legacy format)
   * For backward compatibility with existing documents
   * @param {string} seqName - Sequence name
   * @returns {string} Formatted document number (e.g., 'QT-01006')
   */
  static async getNextNumberLegacy(seqName) {
    // Atomic increment
    const [updateResult] = await pool.query(
      'UPDATE sequences SET current_value = current_value + increment_by WHERE seq_name = ?',
      [seqName]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(`Sequence '${seqName}' not found`);
    }

    const [rows] = await pool.query(
      'SELECT current_value, prefix, pad_length FROM sequences WHERE seq_name = ?',
      [seqName]
    );

    const { current_value, prefix, pad_length } = rows[0];
    const paddedNum = String(current_value).padStart(pad_length, '0');

    return `${prefix}${paddedNum}`;
  }

  /**
   * Peek at the next number without incrementing
   * @param {string} seqName - Sequence name
   * @returns {string} What the next number would be
   */
  static async peekNextNumber(seqName) {
    const year = new Date().getFullYear();
    const [rows] = await pool.query(
      'SELECT current_value, prefix, pad_length, increment_by FROM sequences WHERE seq_name = ?',
      [seqName]
    );

    if (!rows.length) return null;

    const { current_value, prefix, pad_length, increment_by } = rows[0];
    const nextVal = current_value + increment_by;
    const paddedNum = String(nextVal).padStart(pad_length, '0');

    return `${prefix}${year}-${paddedNum}`;
  }

  /**
   * Get all sequences with their current values (for System Setup display)
   * @returns {Array} All sequence records
   */
  static async getAllSequences() {
    const [rows] = await pool.query('SELECT * FROM sequences ORDER BY seq_name');
    return rows;
  }

  /**
   * Update a sequence's prefix
   * @param {string} seqName - Sequence name
   * @param {string} newPrefix - New prefix string
   */
  static async updatePrefix(seqName, newPrefix) {
    await pool.query('UPDATE sequences SET prefix = ? WHERE seq_name = ?', [newPrefix, seqName]);
  }

  /**
   * Reset a sequence to a specific value (admin only)
   * @param {string} seqName - Sequence name
   * @param {number} value - New value
   */
  static async resetValue(seqName, value) {
    await pool.query('UPDATE sequences SET current_value = ? WHERE seq_name = ?', [value, seqName]);
  }

  /**
   * Create a new sequence
   * @param {object} params - { seq_name, prefix, current_value, increment_by, pad_length }
   */
  static async createSequence({ seq_name, prefix, current_value = 1000, increment_by = 1, pad_length = 5 }) {
    await pool.query(
      'INSERT INTO sequences (seq_name, prefix, current_value, increment_by, pad_length) VALUES (?, ?, ?, ?, ?)',
      [seq_name, prefix, current_value, increment_by, pad_length]
    );
  }
}

module.exports = SequenceService;
