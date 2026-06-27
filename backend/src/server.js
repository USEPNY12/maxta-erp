const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { auditMiddleware } = require('./middleware/auditLog');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit middleware - attaches req.audit() helper to every request
app.use(auditMiddleware);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/manufacturing', require('./routes/manufacturing'));
app.use('/api/purchasing', require('./routes/purchasing'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/setup', require('./routes/setup'));
app.use('/api/cutting', require('./routes/cutting'));

// New V2 routes - email, documents, audit
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
  res.json({ status: 'ok', version: '5.0.0', name: 'Max TA Group ERP', websocket: true });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============ WebSocket Server (Real-time Updates) ============
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

// ============ Server Start ============
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Max TA Group ERP Server v5.0 running on port ${PORT}`);
  try { const migrate = require('./migrate'); await migrate(); } catch(e) { console.log('Migration:', e.message); }
  // Start automated notification checks (low stock, overdue invoices, WO delays)
  try { const notifService = require('./services/notificationService'); notifService.start(); } catch(e) { console.log('NotificationService:', e.message); }
});

module.exports = app;
