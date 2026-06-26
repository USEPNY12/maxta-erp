const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============ COMPANY SETTINGS ============
router.get('/company', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM company_settings LIMIT 1');
    res.json(settings[0] || {});
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/company', authenticate, async (req, res) => {
  try {
    const { company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url } = req.body;
    await pool.query(`INSERT INTO company_settings (id, company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url) 
      VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_name=?, address1=?, address2=?, city=?, state=?, zip=?, country=?, phone=?, fax=?, email=?, website=?, tax_id=?, logo_url=?`,
      [company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url,
       company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url]);
    res.json({ message: 'Company settings updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ GENERIC SETUP CRUD (for all lookup tables) ============
const setupTables = {
  'customer-types': 'customer_types',
  'vendor-types': 'vendor_types',
  'item-types': 'item_types',
  'locations': 'locations',
  'location-groups': 'location_groups',
  'work-centers': 'work_centers',
  'carriers': 'carriers',
  'tax-codes': 'tax_codes',
  'users': 'users',
  'price-lists': 'price_lists',
  'salespeople': 'users',
  'currencies': 'currencies',
  'accounting-periods': 'accounting_periods',
  'departments': 'departments',
  'scrap-codes': 'scrap_codes',
  'adjustment-codes': 'adjustment_codes',
  'payment-terms': 'payment_terms',
  'tax-groups': 'tax_groups',
  'banks': 'banks',
  'bank-accounts': 'bank_accounts'
};

// GET all records for a setup table
router.get('/:table', authenticate, async (req, res) => {
  try {
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    const [cols] = await pool.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='maxta_erp' AND TABLE_NAME=? AND COLUMN_NAME='name'`, [tableName]);
    const orderCol = cols.length > 0 ? 'name' : 'id';
    const [rows] = await pool.query(`SELECT * FROM ${tableName} ORDER BY ${orderCol}`);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST new record to setup table
router.post('/:table', authenticate, async (req, res) => {
  try {
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    const fields = req.body;
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    const [result] = await pool.query(
      `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, values);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT update record in setup table
router.put('/:table/:id', authenticate, async (req, res) => {
  try {
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    const fields = req.body;
    delete fields.id; delete fields.created_at;
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE ${tableName} SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE record from setup table
router.delete('/:table/:id', authenticate, async (req, res) => {
  try {
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    await pool.query(`UPDATE ${tableName} SET is_active = FALSE WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ USER SECURITY ============
router.get('/users', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, first_name, last_name, role, department, is_active, last_login FROM users ORDER BY last_name');
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/users/:id/role', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { role } = req.body;
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
