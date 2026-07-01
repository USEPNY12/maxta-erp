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

// Phase 3 routes - Document Center, Versioning, Customer Portal
try { app.use('/api/document-center', require('./routes/documentCenter')); } catch(e) { console.log('Document Center routes not loaded:', e.message); }

// Phase 4 routes - Advanced Manufacturing (Scheduling, Utilization, Dashboard, Barcode, QC)
try { app.use('/api/manufacturing-advanced', require('./routes/manufacturingAdvanced')); } catch(e) { console.log('Manufacturing Advanced routes not loaded:', e.message); }

// Phase 5 routes - Shipping & Logistics (Routes, Rack Loading, Drivers, POD, Freight)
try { app.use('/api/shipping', require('./routes/shipping')); } catch(e) { console.log('Shipping routes not loaded:', e.message); }

// Phase 7 routes - Advanced Accounting & Finance (Multi-currency, Bank Recon, Budgets, Cash Flow, Tax)
try { app.use('/api/accounting-advanced', require('./routes/accountingAdvanced')); } catch(e) { console.log('Accounting Advanced routes not loaded:', e.message); }

// Phase 8 routes - Dashboard & Promotions (Executive KPI, Role-based Dashboards, Promotions Engine)
try { app.use('/api/dashboard-exec', require('./routes/dashboardExec')); } catch(e) { console.log('Dashboard Exec routes not loaded:', e.message); }

// Phase 9 routes - Mobile App Readiness (Push Notifications, Kiosk Mode, Offline Sync)
try { app.use('/api/mobile', require('./routes/mobileReady')); } catch(e) { console.log('Mobile Ready routes not loaded:', e.message); }

// Phase 11 routes - Service & Operations Modules
try { app.use('/api/maintenance', require('./routes/maintenance')); } catch(e) { console.log('Maintenance routes not loaded:', e.message); }
try { app.use('/api/field-service', require('./routes/fieldService')); } catch(e) { console.log('Field Service routes not loaded:', e.message); }
try { app.use('/api/warranty', require('./routes/warranty')); } catch(e) { console.log('Warranty routes not loaded:', e.message); }
try { app.use('/api/time-attendance', require('./routes/timeAttendance')); } catch(e) { console.log('Time & Attendance routes not loaded:', e.message); }

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
    timestamp: new Date().toISOString()
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
