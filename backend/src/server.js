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

// New V2 routes - email, documents, audit
try { app.use('/api/email', require('./routes/email')); } catch(e) { console.log('Email routes not loaded:', e.message); }
try { app.use('/api/documents', require('./routes/documents')); } catch(e) { console.log('Documents routes not loaded:', e.message); }
try { app.use('/api/audit', require('./routes/audit')); } catch(e) { console.log('Audit routes not loaded:', e.message); }
try { app.use('/api/labels', require('./routes/labels')); } catch(e) { console.log('Labels routes not loaded:', e.message); }

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

// DB init endpoint for Coolify deployment (pure Node.js - no shell commands)
app.get('/api/init-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const https = require('https');
    const fs = require('fs');
    
    // Check if tables exist
    const [rows] = await pool.query("SHOW TABLES LIKE 'users'");
    if (rows.length > 0) {
      return res.json({ message: 'Database already initialized', tables: rows.length });
    }
    
    // Download the SQL dump using Node.js https
    console.log('Downloading SQL dump...');
    const sqlContent = await new Promise((resolve, reject) => {
      https.get('https://raw.githubusercontent.com/USEPNY12/maxta-erp/main/database/maxta_erp_dump.sql', (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
        response.on('error', reject);
      }).on('error', reject);
    });
    
    console.log(`Downloaded ${sqlContent.length} bytes of SQL`);
    
    // Split by semicolons and execute each statement
    const statements = sqlContent.split(/;\s*\n/).filter(s => s.trim().length > 0);
    console.log(`Executing ${statements.length} SQL statements...`);
    
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (stmt && !stmt.startsWith('--') && !stmt.startsWith('/*')) {
          try {
            await conn.query(stmt);
          } catch (e) {
            // Skip errors for individual statements (like DROP IF EXISTS)
            if (!e.message.includes('already exists') && !e.message.includes("doesn't exist")) {
              console.log(`Warning on statement ${i}: ${e.message.substring(0, 100)}`);
            }
          }
        }
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
    
    console.log('Database imported successfully!');
    res.json({ message: 'Database imported successfully!', statements: statements.length });
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
