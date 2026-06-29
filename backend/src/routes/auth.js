const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = TRUE', [username]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Look up role_id from roles table for granular permission checks
    let role_id = 1;
    try {
      const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [user.role]);
      if (roles.length) role_id = roles[0].id;
    } catch(e) { /* use default admin */ }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, role_id, name: `${user.first_name} ${user.last_name}` },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, role_id, name: `${user.first_name} ${user.last_name}` } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, first_name, last_name, role, last_login FROM users WHERE id = ?', [req.user.id]);
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List users (admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at FROM users ORDER BY username');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password required' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, first_name, last_name, role || 'readonly']
    );
    res.status(201).json({ id: result.insertId, message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, first_name, last_name, role, is_active, password } = req.body;
    let query = 'UPDATE users SET email=?, first_name=?, last_name=?, role=?, is_active=? WHERE id=?';
    let params = [email, first_name, last_name, role, is_active, req.params.id];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET email=?, first_name=?, last_name=?, role=?, is_active=?, password_hash=? WHERE id=?';
      params = [email, first_name, last_name, role, is_active, passwordHash, req.params.id];
    }

    await pool.query(query, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Temporary migration endpoint - remove after use
router.post('/run-migration', authenticate, authorize('admin'), async (req, res) => {
  try {
    const results = [];
    
    // Rename CNC/Waterjet to CNC Drilling
    await pool.query("UPDATE work_centers SET name='CNC Drilling', icon='🔩' WHERE code='CNC'");
    results.push('Renamed CNC/Waterjet to CNC Drilling');
    
    // Update routing template operations
    await pool.query("UPDATE routing_template_operations SET operation_name='CNC Drilling', operation_description='Drill holes/notches per drawing' WHERE work_center_id=(SELECT id FROM work_centers WHERE code='CNC')");
    results.push('Updated routing template operations');
    
    // Update existing wo_routing records
    await pool.query("UPDATE wo_routing SET operation_name='CNC Drilling', operation_description='Drill holes/notches per drawing' WHERE work_center_id=(SELECT id FROM work_centers WHERE code='CNC')");
    results.push('Updated wo_routing records');
    
    // Delete Drilling Station if exists
    const [drillCheck] = await pool.query("SELECT id FROM work_centers WHERE code='DRILL'");
    if (drillCheck.length > 0) {
      // Reassign any wo_routing using DRILL to CNC
      const [cncWc] = await pool.query("SELECT id FROM work_centers WHERE code='CNC'");
      if (cncWc.length > 0) {
        await pool.query('UPDATE wo_routing SET work_center_id=? WHERE work_center_id=?', [cncWc[0].id, drillCheck[0].id]);
        await pool.query('UPDATE routing_template_operations SET work_center_id=? WHERE work_center_id=?', [cncWc[0].id, drillCheck[0].id]);
      }
      await pool.query("DELETE FROM work_centers WHERE code='DRILL'");
      results.push('Deleted Drilling Station work center');
    }
    
    // Add new columns if not exist
    const migrations = [
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS notches_count INT DEFAULT 0",
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS hole_diameter VARCHAR(20) DEFAULT NULL",
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS hole_type VARCHAR(50) DEFAULT 'standard'",
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS notch_type VARCHAR(50) DEFAULT 'standard'",
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS cnc_surcharge DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS cnc_notes TEXT DEFAULT NULL",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS has_notches BOOLEAN DEFAULT FALSE",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS notches_count INT DEFAULT 0",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cnc_estimated_cost DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS hole_diameter VARCHAR(20) DEFAULT NULL",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS hole_type VARCHAR(50) DEFAULT 'standard'",
      "ALTER TABLE wo_routing ADD COLUMN IF NOT EXISTS skipped_at DATETIME DEFAULT NULL",
      "ALTER TABLE wo_routing ADD COLUMN IF NOT EXISTS skipped_by INT DEFAULT NULL",
      "ALTER TABLE wo_routing ADD COLUMN IF NOT EXISTS skip_reason VARCHAR(255) DEFAULT NULL"
    ];
    for (const sql of migrations) {
      try { await pool.query(sql); } catch(e) { /* column may already exist */ }
    }
    results.push('Schema migrations applied');
    
    // Get final work centers list
    const [wcs] = await pool.query('SELECT id, name, code FROM work_centers ORDER BY id');
    
    res.json({ success: true, results, work_centers: wcs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
