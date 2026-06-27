const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Cache permissions per role_id for 5 minutes to avoid DB hits on every request
const permCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getPermissions(roleId) {
  const cached = permCache.get(roleId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.perms;
  try {
    const [rows] = await pool.query(
      'SELECT module, permission, granted FROM role_permissions WHERE role_id = ?', [roleId]);
    const perms = {};
    rows.forEach(r => {
      if (!perms[r.module]) perms[r.module] = {};
      perms[r.module][r.permission] = r.granted === 1;
    });
    permCache.set(roleId, { perms, ts: Date.now() });
    return perms;
  } catch (e) { return {}; }
}

function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Simple role-based authorization (legacy)
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Granular permission check middleware
 * Usage: requirePermission('sales', 'create')
 * Admin role always passes
 */
function requirePermission(module, permission) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin' || req.user.role_id === 1) return next();
      let roleId = req.user.role_id;
      if (!roleId) {
        const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [req.user.role]);
        if (roles.length) { req.user.role_id = roles[0].id; roleId = roles[0].id; }
        else return res.status(403).json({ error: 'Access denied. Role not found.' });
      }
      const perms = await getPermissions(roleId);
      if (perms[module] && perms[module][permission]) return next();
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.', required: `${module}.${permission}` });
    } catch (err) { return res.status(500).json({ error: 'Permission check failed' }); }
  };
}

/**
 * Module access check - checks if user can access a module at all
 * Usage: requireModuleAccess('manufacturing')
 */
function requireModuleAccess(module) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin' || req.user.role_id === 1) return next();
      let roleId = req.user.role_id;
      if (!roleId) {
        const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [req.user.role]);
        if (roles.length) { req.user.role_id = roles[0].id; roleId = roles[0].id; }
        else return res.status(403).json({ error: 'Access denied. Role not found.' });
      }
      const perms = await getPermissions(roleId);
      if (perms[module] && Object.values(perms[module]).some(v => v === true)) return next();
      return res.status(403).json({ error: 'Access denied. No access to this module.', required_module: module });
    } catch (err) { return res.status(500).json({ error: 'Permission check failed' }); }
  };
}

function clearPermissionCache() { permCache.clear(); }

module.exports = { authenticate, authorize, requirePermission, requireModuleAccess, clearPermissionCache };
