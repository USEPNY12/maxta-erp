const pool = require('../config/database');

async function getNextNumber(seqName) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT prefix, current_value, increment_by, pad_length FROM sequences WHERE seq_name = ? FOR UPDATE',
      [seqName]
    );
    if (rows.length === 0) throw new Error(`Sequence '${seqName}' not found`);
    
    const { prefix, current_value, increment_by, pad_length } = rows[0];
    const newValue = current_value + increment_by;
    
    await conn.query('UPDATE sequences SET current_value = ? WHERE seq_name = ?', [newValue, seqName]);
    await conn.commit();
    
    return prefix + String(newValue).padStart(pad_length, '0');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { getNextNumber };
