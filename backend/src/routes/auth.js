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

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: `${user.first_name} ${user.last_name}` },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: `${user.first_name} ${user.last_name}` } });
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

module.exports = router;
