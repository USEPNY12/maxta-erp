const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
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
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url } = req.body;
    await pool.query(`INSERT INTO company_settings (id, company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url) 
      VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_name=?, address1=?, address2=?, city=?, state=?, zip=?, country=?, phone=?, fax=?, email=?, website=?, tax_id=?, logo_url=?`,
      [company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url,
       company_name, address1, address2, city, state, zip, country, phone, fax, email, website, tax_id, logo_url]);
    res.json({ message: 'Company settings updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ USER SECURITY ============
// Get all users
router.get('/users', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(`SELECT id, username, email, first_name, last_name, role, department, is_active, last_login, created_at FROM users ORDER BY last_name, first_name`);
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get single user
router.get('/users/:id', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(`SELECT id, username, email, first_name, last_name, role, department, is_active, last_login, created_at FROM users WHERE id = ?`, [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create new user
router.post('/users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { username, email, password, first_name, last_name, role, department } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });
    
    // Check for duplicate username or email
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username or email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, department, is_active) VALUES (?,?,?,?,?,?,?,1)`,
      [username, email, hashedPassword, first_name || '', last_name || '', role || 'readonly', department || null]
    );
    res.status(201).json({ id: result.insertId, message: 'User created successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update user
router.put('/users/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { email, first_name, last_name, role, department, is_active } = req.body;
    await pool.query(
      `UPDATE users SET email=?, first_name=?, last_name=?, role=?, department=?, is_active=? WHERE id=?`,
      [email, first_name, last_name, role, department, is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update user role
router.put('/users/:id/role', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { role } = req.body;
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Reset user password
router.put('/users/:id/password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Can only change your own password or admin required' });
    }
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ message: 'Password updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Deactivate user
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ROLES ============
// Get all roles
router.get('/roles/list', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(roles);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get role with permissions
router.get('/roles/:id', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (roles.length === 0) return res.status(404).json({ error: 'Role not found' });
    const [permissions] = await pool.query('SELECT module, permission, granted FROM role_permissions WHERE role_id = ?', [req.params.id]);
    res.json({ ...roles[0], permissions });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create new role
router.post('/roles', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });
    const [result] = await pool.query('INSERT INTO roles (name, description) VALUES (?,?)', [name.toLowerCase().replace(/\s+/g, '_'), description || '']);
    res.status(201).json({ id: result.insertId, message: 'Role created' });
  } catch (error) { 
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Role name already exists' });
    res.status(500).json({ error: error.message }); 
  }
});

// Update role
router.put('/roles/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { description, is_active } = req.body;
    await pool.query('UPDATE roles SET description=?, is_active=? WHERE id=?', [description, is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Delete role (only non-system roles)
router.delete('/roles/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const [role] = await pool.query('SELECT is_system FROM roles WHERE id = ?', [req.params.id]);
    if (role.length === 0) return res.status(404).json({ error: 'Role not found' });
    if (role[0].is_system) return res.status(400).json({ error: 'Cannot delete system roles' });
    // Check if any users have this role
    const [users] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE role = (SELECT name FROM roles WHERE id = ?)', [req.params.id]);
    if (users[0].cnt > 0) return res.status(400).json({ error: 'Cannot delete role - users are assigned to it' });
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
    await pool.query('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Role deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ROLE PERMISSIONS ============
// Get permissions matrix for all roles
router.get('/permissions/matrix', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT id, name, description FROM roles WHERE is_active = 1 ORDER BY id');
    const [permissions] = await pool.query('SELECT role_id, module, permission, granted FROM role_permissions ORDER BY role_id, module, permission');
    
    // Build matrix: { roleId: { module: [permissions] } }
    const matrix = {};
    roles.forEach(r => { matrix[r.id] = { role: r, permissions: {} }; });
    permissions.forEach(p => {
      if (!matrix[p.role_id]) return;
      if (!matrix[p.role_id].permissions[p.module]) matrix[p.role_id].permissions[p.module] = [];
      if (p.granted) matrix[p.role_id].permissions[p.module].push(p.permission);
    });
    res.json({ roles, matrix });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get permissions for current user
router.get('/permissions/me', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole === 'admin') {
      // Admin gets all permissions
      const modules = ['system_setup', 'inventory', 'sales', 'manufacturing', 'purchasing', 'accounting', 'reports'];
      const perms = ['view', 'create', 'edit', 'delete', 'approve', 'post'];
      const permissions = {};
      modules.forEach(m => { permissions[m] = perms; });
      return res.json({ role: userRole, permissions });
    }
    const [roleRow] = await pool.query('SELECT id FROM roles WHERE name = ?', [userRole]);
    if (roleRow.length === 0) return res.json({ role: userRole, permissions: {} });
    const [perms] = await pool.query('SELECT module, permission FROM role_permissions WHERE role_id = ? AND granted = 1', [roleRow[0].id]);
    const permissions = {};
    perms.forEach(p => {
      if (!permissions[p.module]) permissions[p.module] = [];
      permissions[p.module].push(p.permission);
    });
    res.json({ role: userRole, permissions });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update permissions for a role
router.put('/permissions/:roleId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { permissions } = req.body; // { module: [permission1, permission2, ...] }
    const roleId = req.params.roleId;
    
    // Delete existing permissions for this role
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    
    // Insert new permissions
    const inserts = [];
    Object.entries(permissions).forEach(([module, perms]) => {
      perms.forEach(perm => {
        inserts.push([roleId, module, perm, 1]);
      });
    });
    
    if (inserts.length > 0) {
      await pool.query('INSERT INTO role_permissions (role_id, module, permission, granted) VALUES ?', [inserts]);
    }
    res.json({ message: 'Permissions updated' });
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


// ============ GL DEFAULTS ============
router.get("/gl-defaults", authenticate, async (req, res) => {
  try {
    const [settings] = await pool.query("SELECT setting_key, setting_value, description FROM system_settings WHERE category = 'accounting' ORDER BY setting_key");
    const [accounts] = await pool.query("SELECT account_number, account_name FROM gl_accounts WHERE is_active = 1 ORDER BY account_number");
    res.json({ settings, accounts });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put("/gl-defaults", authenticate, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?", [value, key]);
    }
    res.json({ message: "GL defaults updated successfully" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
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
// Column name validator - prevents SQL injection via dynamic column names
const isValidColumnName = (col) => /^[a-z_][a-z0-9_]{0,63}$/i.test(col);

router.post('/:table', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'readonly') return res.status(403).json({ error: 'Read-only users cannot create records' });
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    const fields = req.body;
    const columns = Object.keys(fields).filter(k => isValidColumnName(k) && !['id','created_at','updated_at'].includes(k));
    if (columns.length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const values = columns.map(k => fields[k]);
    const [result] = await pool.query(
      `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, values);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT update record in setup table
router.put('/:table/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'readonly') return res.status(403).json({ error: 'Read-only users cannot edit records' });
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    const fields = req.body;
    const columns = Object.keys(fields).filter(k => isValidColumnName(k) && !['id','created_at','updated_at'].includes(k));
    if (columns.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE ${tableName} SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE record from setup table
router.delete('/:table/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: 'Admin or Manager required to delete records' });
    const tableName = setupTables[req.params.table];
    if (!tableName) return res.status(404).json({ error: 'Setup table not found' });
    // Try soft delete first, fall back to hard delete
    try {
      await pool.query(`UPDATE ${tableName} SET is_active = FALSE WHERE id = ?`, [req.params.id]);
    } catch {
      await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
    }
    res.json({ message: 'Deactivated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
