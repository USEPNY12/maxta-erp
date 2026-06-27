const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { auditMiddleware } = require('./middleware/auditLog');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// ═══════════════════════════════════════════════════════════════════
// SECURITY & MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

// Helmet - HTTP security headers (disable CSP for SPA)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors());

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth endpoints (prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20, // max 20 login attempts per IP per window
  message: { error: 'Too many login attempts. Please try again in 15 minutes.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

// General API rate limiting (generous for normal use)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 300, // 300 requests per minute per IP
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Audit middleware - attaches req.audit() helper to every request
app.use(auditMiddleware);

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/manufacturing', require('./routes/manufacturing'));
app.use('/api/purchasing', require('./routes/purchasing'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/setup', require('./routes/setup'));
app.use('/api/cutting', require('./routes/cutting'));
app.use('/api/cpq', require('./routes/cpq'));

// V2 routes - email, documents, audit
try { app.use('/api/email', require('./routes/email')); } catch(e) { console.log('Email routes not loaded:', e.message); }
try { app.use('/api/documents', require('./routes/documents')); } catch(e) { console.log('Documents routes not loaded:', e.message); }
try { app.use('/api/audit', require('./routes/audit')); } catch(e) { console.log('Audit routes not loaded:', e.message); }
try { app.use('/api/labels', require('./routes/labels')); } catch(e) { console.log('Labels routes not loaded:', e.message); }
try { app.use('/api/files', require('./routes/files')); } catch(e) { console.log('Files routes not loaded:', e.message); }

// V3 routes - New features (Smart Glazier, Dispatch, Notifications, Scheduling, CRM, Doc Management)
try { app.use('/api/smartglazier', require('./routes/smartglazier')); } catch(e) { console.log('Smart Glazier routes not loaded:', e.message); }
try { app.use('/api/dispatch', require('./routes/dispatch')); } catch(e) { console.log('Dispatch routes not loaded:', e.message); }
try { app.use('/api/notifications', require('./routes/notifications')); } catch(e) { console.log('Notifications routes not loaded:', e.message); }
try { app.use('/api/scheduling', require('./routes/scheduling')); } catch(e) { console.log('Scheduling routes not loaded:', e.message); }
try { app.use('/api/crm', require('./routes/crm')); } catch(e) { console.log('CRM routes not loaded:', e.message); }
try { app.use('/api/docmanagement', require('./routes/docmanagement')); } catch(e) { console.log('Doc Management routes not loaded:', e.message); }
try { app.use('/api/lamination', require('./routes/lamination')); } catch(e) { console.log('Lamination routes not loaded:', e.message); }

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '6.0.0', name: 'Max TA Group ERP', websocket: true, phase: 'Phase 1 - Architecture Upgrade' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// ═══════════════════════════════════════════════════════════════════
// CENTRALIZED ERROR HANDLING (MUST be last middleware)
// ═══════════════════════════════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER (Real-time Updates)
// ═══════════════════════════════════════════════════════════════════
let WebSocket, wss;
try {
  WebSocket = require('ws');
  wss = new WebSocket.Server({ server, path: '/ws' });

  const clients = new Set();

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`[WS] Client connected (${clients.size} total)`);

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active', timestamp: new Date().toISOString() }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
      clients.delete(ws);
    });

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Heartbeat interval to detect dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  // Broadcast function - available globally for other modules to emit events
  global.wsBroadcast = (eventType, data) => {
    const message = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  console.log('[WS] WebSocket server initialized on /ws');
} catch (e) {
  console.log('[WS] WebSocket not available (install ws package):', e.message);
  global.wsBroadcast = () => {}; // no-op fallback
}

// ═══════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Max TA Group ERP Server v6.0 running on port ${PORT}`);
  console.log(`[SECURITY] Helmet enabled, Rate limiting active (auth: 20/15min, api: 300/min)`);
  try { const migrate = require('./migrate'); await migrate(); } catch(e) { console.log('Migration:', e.message); }
  // Start automated notification checks (low stock, overdue invoices, WO delays)
  try { const notifService = require('./services/notificationService'); notifService.start(); } catch(e) { console.log('NotificationService:', e.message); }
});

module.exports = app;

// ============================================
// Admin Migration Endpoint - Creates Phase 2 tables if missing
// ============================================
app.post('/api/admin/migrate', async (req, res) => {
  const pool = require('./db');
  const migrations = [
    `CREATE TABLE IF NOT EXISTS pricing_matrix (
      id INT AUTO_INCREMENT PRIMARY KEY,
      glass_type VARCHAR(100) NOT NULL,
      thickness DECIMAL(5,3) NOT NULL,
      price_per_sqft DECIMAL(10,2) NOT NULL,
      min_sqft DECIMAL(10,2) DEFAULT 3.00,
      cost_per_sqft DECIMAL(10,2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_glass_thickness (glass_type, thickness)
    )`,
    `CREATE TABLE IF NOT EXISTS approval_workflows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      document_type ENUM('quote','sales_order','purchase_order','work_order') NOT NULL,
      condition_field VARCHAR(50) NOT NULL,
      condition_operator ENUM('>','<','>=','<=','=','!=') NOT NULL,
      condition_value DECIMAL(15,2) NOT NULL,
      approver_role VARCHAR(50) DEFAULT 'manager',
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS approval_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_type VARCHAR(50) NOT NULL,
      document_id INT NOT NULL,
      document_number VARCHAR(50),
      workflow_id INT,
      submitted_by INT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      reviewed_by INT,
      reviewed_at TIMESTAMP NULL,
      comments TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS exchange_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      from_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      to_currency VARCHAR(3) NOT NULL,
      rate DECIMAL(12,6) NOT NULL,
      effective_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_currency_date (from_currency, to_currency, effective_date)
    )`,
    `CREATE TABLE IF NOT EXISTS commission_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      condition_type ENUM('default','high_value','new_customer','product_category') NOT NULL,
      condition_value VARCHAR(100),
      commission_rate DECIMAL(5,2) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS commission_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      salesperson_id INT NOT NULL,
      invoice_id INT,
      invoice_number VARCHAR(50),
      invoice_total DECIMAL(15,2),
      commission_rate DECIMAL(5,2),
      commission_amount DECIMAL(15,2),
      status ENUM('pending','earned','paid') DEFAULT 'pending',
      earned_date DATE,
      paid_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fabrication_charges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      charge_type ENUM('per_sqft','per_linear_ft','per_hole','per_piece','flat') NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  const seeds = [
    `INSERT IGNORE INTO pricing_matrix (glass_type, thickness, price_per_sqft, cost_per_sqft, min_sqft) VALUES
    ('Clear Annealed', 0.125, 6.00, 2.50, 3.00),('Clear Annealed', 0.188, 7.00, 3.00, 3.00),
    ('Clear Annealed', 0.250, 8.50, 3.50, 3.00),('Clear Annealed', 0.375, 12.00, 5.00, 3.00),
    ('Clear Annealed', 0.500, 16.00, 7.00, 3.00),('Clear Annealed', 0.750, 24.00, 10.00, 4.00),
    ('Clear Tempered', 0.125, 9.00, 4.00, 3.00),('Clear Tempered', 0.188, 10.50, 4.50, 3.00),
    ('Clear Tempered', 0.250, 12.50, 5.50, 3.00),('Clear Tempered', 0.375, 17.00, 7.50, 3.00),
    ('Clear Tempered', 0.500, 22.00, 10.00, 3.00),('Clear Tempered', 0.750, 32.00, 14.00, 4.00),
    ('Laminated', 0.250, 15.00, 6.50, 3.00),('Laminated', 0.375, 20.00, 9.00, 3.00),
    ('Laminated', 0.500, 26.00, 12.00, 3.00),('Low-E', 0.250, 14.00, 6.00, 3.00),
    ('Low-E', 0.375, 18.00, 8.00, 3.00),('Low-E', 0.500, 24.00, 11.00, 3.00),
    ('Mirror', 0.125, 8.00, 3.50, 3.00),('Mirror', 0.188, 9.50, 4.00, 3.00),
    ('Mirror', 0.250, 11.00, 5.00, 3.00),('Starphire', 0.250, 16.00, 7.00, 3.00),
    ('Starphire', 0.375, 22.00, 10.00, 3.00),('Starphire', 0.500, 28.00, 13.00, 3.00),
    ('Tinted Bronze', 0.250, 10.00, 4.50, 3.00),('Tinted Gray', 0.250, 10.00, 4.50, 3.00),
    ('Tinted Green', 0.250, 10.00, 4.50, 3.00)`,
    `INSERT IGNORE INTO fabrication_charges (category, name, charge_type, price, cost) VALUES
    ('Edge Work', 'Seamed Edge', 'per_linear_ft', 2.00, 0.80),
    ('Edge Work', 'Flat Polish', 'per_linear_ft', 4.50, 1.80),
    ('Edge Work', 'Pencil Polish', 'per_linear_ft', 3.50, 1.40),
    ('Edge Work', 'Beveled Edge', 'per_linear_ft', 8.00, 3.20),
    ('Edge Work', 'Mitered Edge', 'per_linear_ft', 6.00, 2.40),
    ('Holes', 'Standard Hole', 'per_hole', 12.00, 4.00),
    ('Holes', 'Large Hole', 'per_hole', 18.00, 6.00),
    ('Holes', 'Countersink', 'per_hole', 22.00, 8.00),
    ('Cutouts', 'Standard Notch', 'per_piece', 35.00, 12.00),
    ('Cutouts', 'L-Shape Cutout', 'per_piece', 45.00, 16.00),
    ('Cutouts', 'U-Shape Cutout', 'per_piece', 55.00, 20.00),
    ('Coatings', 'Hydrophobic Coating', 'per_sqft', 3.00, 1.20),
    ('Coatings', 'Low-E Coating', 'per_sqft', 5.00, 2.00),
    ('Coatings', 'Acid Etch', 'per_sqft', 4.00, 1.60),
    ('Tempering', 'Heat Strengthened', 'per_sqft', 3.50, 1.50),
    ('Tempering', 'Fully Tempered', 'per_sqft', 4.50, 2.00)`,
    `INSERT IGNORE INTO approval_workflows (name, document_type, condition_field, condition_operator, condition_value, approver_role) VALUES
    ('High Value Quote', 'quote', 'total_amount', '>', 10000.00, 'manager'),
    ('Large Discount', 'quote', 'discount_percent', '>', 15.00, 'manager'),
    ('Low Margin Alert', 'quote', 'margin_percent', '<', 20.00, 'director'),
    ('High Value PO', 'purchase_order', 'total_amount', '>', 25000.00, 'manager')`,
    `INSERT IGNORE INTO commission_rules (name, condition_type, condition_value, commission_rate) VALUES
    ('Default Commission', 'default', NULL, 5.00),
    ('High Value Orders (>$10K)', 'high_value', '10000', 7.50),
    ('New Customer Bonus', 'new_customer', NULL, 8.00)`,
    `INSERT IGNORE INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
    ('USD', 'CAD', 1.3600, '2026-06-27'),('USD', 'EUR', 0.9200, '2026-06-27'),
    ('USD', 'GBP', 0.7900, '2026-06-27'),('USD', 'MXN', 17.2000, '2026-06-27')`
  ];

  try {
    const results = [];
    for (const sql of migrations) {
      await pool.query(sql);
      results.push('OK');
    }
    for (const sql of seeds) {
      await pool.query(sql);
      results.push('Seeded');
    }
    const [tables] = await pool.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='maxta_erp'");
    res.json({ success: true, migrations: results.length, totalTables: tables[0].cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
