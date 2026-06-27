const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { auditMiddleware } = require('./middleware/auditLog');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', name: 'Max TA Group ERP' });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Max TA Group ERP Server v2.0 running on port ${PORT}`);
});

module.exports = app;
