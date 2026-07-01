const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { auditMiddleware } = require('./middleware/auditLog');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
app.set("trust proxy", 1);
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

// Gzip compression for all responses
app.use(compression());

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

// Route loading diagnostics
const routeErrors = [];
function tryRoute(path, modulePath, name) {
  try { app.use(path, require(modulePath)); } catch(e) { routeErrors.push({ name, path, error: e.message }); console.log(name + ' routes not loaded:', e.message); }
}

// V2 routes - email, documents, audit
tryRoute('/api/email', './routes/email', 'Email');
tryRoute('/api/documents', './routes/documents', 'Documents');
tryRoute('/api/audit', './routes/audit', 'Audit');
tryRoute('/api/labels', './routes/labels', 'Labels');
tryRoute('/api/files', './routes/files', 'Files');

// V3 routes - New features (Smart Glazier, Dispatch, Notifications, Scheduling, CRM, Doc Management)
tryRoute('/api/smartglazier', './routes/smartglazier', 'Smart Glazier');
tryRoute('/api/dispatch', './routes/dispatch', 'Dispatch');
tryRoute('/api/notifications', './routes/notifications', 'Notifications');
tryRoute('/api/scheduling', './routes/scheduling', 'Scheduling');
tryRoute('/api/crm', './routes/crm', 'CRM');
tryRoute('/api/docmanagement', './routes/docmanagement', 'Doc Management');
tryRoute('/api/lamination', './routes/lamination', 'Lamination');

// Phase 3 routes - Document Center, Versioning, Customer Portal
tryRoute('/api/document-center', './routes/documentCenter', 'Document Center');

// Phase 4 routes - Advanced Manufacturing (Scheduling, Utilization, Dashboard, Barcode, QC)
tryRoute('/api/manufacturing-advanced', './routes/manufacturingAdvanced', 'Manufacturing Advanced');

// Phase 5 routes - Shipping & Logistics (Routes, Rack Loading, Drivers, POD, Freight)
tryRoute('/api/shipping', './routes/shipping', 'Shipping');

// Phase 7 routes - Advanced Accounting & Finance (Multi-currency, Bank Recon, Budgets, Cash Flow, Tax)
tryRoute('/api/accounting-advanced', './routes/accountingAdvanced', 'Accounting Advanced');

// Phase 8 routes - Dashboard & Promotions (Executive KPI, Role-based Dashboards, Promotions Engine)
tryRoute('/api/dashboard-exec', './routes/dashboardExec', 'Dashboard Exec');

// Phase 9 routes - Mobile App Readiness (Push Notifications, Kiosk Mode, Offline Sync)
tryRoute('/api/mobile', './routes/mobileReady', 'Mobile Ready');

// Phase 11 routes - Service & Operations Modules
tryRoute('/api/maintenance', './routes/maintenance', 'Maintenance');
tryRoute('/api/field-service', './routes/fieldService', 'Field Service');
tryRoute('/api/warranty', './routes/warranty', 'Warranty');
tryRoute('/api/time-attendance', './routes/timeAttendance', 'Time & Attendance');

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '10.0.0',
    name: 'Max TA Group ERP',
    websocket: true,
    phase: 'Phase 10 - Production Ready',
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString(),
    routeErrors: routeErrors.length > 0 ? routeErrors : undefined,
    routesLoaded: 32 - routeErrors.length
  });
});

// In Docker deployment, frontend is served by nginx, not the backend.
// Only serve frontend files if the dist directory exists (non-Docker local dev).
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Catch-all for unmatched routes - return JSON 404
  app.use((req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: 'Route not found', path: req.originalUrl });
    }
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
