const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pool = require('../config/database');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const DOCS_DIR = path.join(__dirname, '..', '..', 'uploads', 'documents');
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// ============================================
// COMPANY BRANDING
// ============================================

// GET /api/document-center/branding - Get all branding settings
router.get('/branding', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM company_branding ORDER BY setting_key');
    const branding = {};
    rows.forEach(r => { branding[r.setting_key] = r.setting_value; });
    res.json(branding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/document-center/branding - Update branding settings
router.put('/branding', authenticate, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO company_branding (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value || '', value || '']
      );
    }
    // Clear cached company info in template service
    try {
      const templateService = require('../services/templateService');
      templateService.companyInfo = null;
    } catch (e) { /* ignore */ }
    
    await req.audit('company_branding', 0, 'UPDATE', null, settings);
    res.json({ message: 'Branding updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DOCUMENT VERSIONING
// ============================================

// GET /api/document-center/versions/:type/:id - Get version history for a document
router.get('/versions/:type/:id', authenticate, async (req, res) => {
  try {
    const [versions] = await pool.query(
      `SELECT dv.*, u.username as generated_by_name 
       FROM document_versions dv 
       LEFT JOIN users u ON dv.generated_by = u.id
       WHERE dv.document_type = ? AND dv.document_id = ?
       ORDER BY dv.version DESC`,
      [req.params.type, req.params.id]
    );
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/document-center/versions/:type/:id - Save a new version
router.post('/versions/:type/:id', authenticate, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { method } = req.body || {};
    
    // Get next version number
    const [maxVer] = await pool.query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM document_versions WHERE document_type = ? AND document_id = ?',
      [type, id]
    );
    const nextVersion = maxVer[0].next_version;

    // Generate the PDF
    let templateService;
    try { templateService = require('../services/templateService'); } catch(e) {}
    if (!templateService) return res.status(500).json({ error: 'Template service not available' });

    const pdfBuffer = await templateService.generateDocument(type, id);
    
    // Save to disk
    const fileName = `${type}_${id}_v${nextVersion}_${Date.now()}.pdf`;
    const filePath = path.join(DOCS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Save version record
    const [result] = await pool.query(
      `INSERT INTO document_versions (document_type, document_id, version, file_path, file_size, generated_by, generation_method, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, id, nextVersion, fileName, pdfBuffer.length, req.user?.id || null, method || 'manual', checksum]
    );

    res.json({ 
      id: result.insertId, 
      version: nextVersion, 
      file_size: pdfBuffer.length,
      checksum 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/versions/:versionId/download - Download a specific version
router.get('/versions/:versionId/download', authenticate, async (req, res) => {
  try {
    const [versions] = await pool.query('SELECT * FROM document_versions WHERE id = ?', [req.params.versionId]);
    if (!versions.length) return res.status(404).json({ error: 'Version not found' });
    
    const version = versions[0];
    const filePath = path.join(DOCS_DIR, version.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${version.document_type}_${version.document_id}_v${version.version}.pdf"`);
    res.send(fs.readFileSync(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DOCUMENT CENTER - Search & Browse
// ============================================

// GET /api/document-center/search - Search all documents
router.get('/search', authenticate, async (req, res) => {
  try {
    const { type, customer_id, vendor_id, date_from, date_to, q, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT dv.id, dv.document_type, dv.document_id, dv.version, dv.file_size, 
             dv.generation_method, dv.created_at, u.username as generated_by_name,
             CASE 
               WHEN dv.document_type = 'quote' THEN (SELECT quote_number FROM quotes WHERE id = dv.document_id)
               WHEN dv.document_type = 'sales_order' THEN (SELECT order_number FROM sales_orders WHERE id = dv.document_id)
               WHEN dv.document_type = 'ar_invoice' THEN (SELECT invoice_number FROM ar_invoices WHERE id = dv.document_id)
               WHEN dv.document_type = 'purchase_order' THEN (SELECT po_number FROM purchase_orders WHERE id = dv.document_id)
               WHEN dv.document_type = 'packing_slip' THEN (SELECT shipment_number FROM shipments WHERE id = dv.document_id)
               WHEN dv.document_type = 'work_order' THEN (SELECT wo_number FROM work_orders WHERE id = dv.document_id)
               ELSE CONCAT(dv.document_type, '-', dv.document_id)
             END as document_number
      FROM document_versions dv
      LEFT JOIN users u ON dv.generated_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) { query += ' AND dv.document_type = ?'; params.push(type); }
    if (date_from) { query += ' AND dv.created_at >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND dv.created_at <= ?'; params.push(date_to + ' 23:59:59'); }

    query += ' ORDER BY dv.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [docs] = await pool.query(query, params);
    
    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM document_versions' + (type ? ' WHERE document_type = ?' : ''),
      type ? [type] : []
    );

    res.json({ documents: docs, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/stats - Document statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [typeStats] = await pool.query(
      `SELECT document_type, COUNT(*) as count, MAX(created_at) as last_generated
       FROM document_versions GROUP BY document_type ORDER BY count DESC`
    );
    const [totalDocs] = await pool.query('SELECT COUNT(*) as total FROM document_versions');
    const [totalSize] = await pool.query('SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM document_versions');
    const [recentEmails] = await pool.query('SELECT COUNT(*) as count FROM email_log WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [pendingApprovals] = await pool.query("SELECT COUNT(*) as count FROM approval_queue WHERE status = 'pending'");

    res.json({
      total_documents: totalDocs[0].total,
      total_size_mb: Math.round(totalSize[0].total_bytes / 1024 / 1024 * 100) / 100,
      emails_last_30_days: recentEmails[0].count,
      pending_approvals: pendingApprovals[0].count,
      by_type: typeStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// BATCH DOCUMENT GENERATION
// ============================================

// POST /api/document-center/batch/generate - Start a batch generation job
router.post('/batch/generate', authenticate, async (req, res) => {
  try {
    const { job_type, document_ids, options } = req.body;
    // job_type: 'statements', 'invoices', 'quotes', 'purchase_orders'
    
    if (!job_type || !document_ids || !document_ids.length) {
      return res.status(400).json({ error: 'job_type and document_ids are required' });
    }

    // Create batch job
    const [jobResult] = await pool.query(
      `INSERT INTO batch_document_jobs (job_type, status, total_documents, started_by, started_at, parameters)
       VALUES (?, 'processing', ?, ?, NOW(), ?)`,
      [job_type, document_ids.length, req.user?.id, JSON.stringify(options || {})]
    );
    const jobId = jobResult.insertId;

    // Create batch items
    const docTypeMap = { statements: 'statement', invoices: 'ar_invoice', quotes: 'quote', purchase_orders: 'purchase_order' };
    const docType = docTypeMap[job_type] || job_type;

    for (const docId of document_ids) {
      await pool.query(
        'INSERT INTO batch_document_items (job_id, document_type, document_id, status) VALUES (?, ?, ?, ?)',
        [jobId, docType, docId, 'pending']
      );
    }

    // Process documents (in background-like fashion)
    let templateService;
    try { templateService = require('../services/templateService'); } catch(e) {}
    
    let processed = 0, failed = 0;
    for (const docId of document_ids) {
      try {
        if (templateService) {
          const pdfBuffer = await templateService.generateDocument(docType, docId);
          const fileName = `batch_${jobId}_${docType}_${docId}.pdf`;
          const filePath = path.join(DOCS_DIR, fileName);
          fs.writeFileSync(filePath, pdfBuffer);

          // Save version
          const [maxVer] = await pool.query(
            'SELECT COALESCE(MAX(version), 0) + 1 as nv FROM document_versions WHERE document_type = ? AND document_id = ?',
            [docType, docId]
          );
          await pool.query(
            `INSERT INTO document_versions (document_type, document_id, version, file_path, file_size, generated_by, generation_method)
             VALUES (?, ?, ?, ?, ?, ?, 'batch')`,
            [docType, docId, maxVer[0].nv, fileName, pdfBuffer.length, req.user?.id]
          );

          await pool.query(
            "UPDATE batch_document_items SET status = 'generated', file_path = ?, processed_at = NOW() WHERE job_id = ? AND document_id = ?",
            [fileName, jobId, docId]
          );
          processed++;
        }
      } catch (e) {
        await pool.query(
          "UPDATE batch_document_items SET status = 'failed', error_message = ?, processed_at = NOW() WHERE job_id = ? AND document_id = ?",
          [e.message, jobId, docId]
        );
        failed++;
      }
    }

    // Update job status
    await pool.query(
      `UPDATE batch_document_jobs SET status = 'completed', processed_documents = ?, failed_documents = ?, completed_at = NOW() WHERE id = ?`,
      [processed, failed, jobId]
    );

    res.json({ job_id: jobId, processed, failed, total: document_ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/batch/:jobId - Get batch job status
router.get('/batch/:jobId', authenticate, async (req, res) => {
  try {
    const [jobs] = await pool.query('SELECT * FROM batch_document_jobs WHERE id = ?', [req.params.jobId]);
    if (!jobs.length) return res.status(404).json({ error: 'Job not found' });
    
    const [items] = await pool.query('SELECT * FROM batch_document_items WHERE job_id = ? ORDER BY id', [req.params.jobId]);
    res.json({ ...jobs[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/batch - List recent batch jobs
router.get('/batch', authenticate, async (req, res) => {
  try {
    const [jobs] = await pool.query(
      `SELECT bdj.*, u.username as started_by_name 
       FROM batch_document_jobs bdj 
       LEFT JOIN users u ON bdj.started_by = u.id
       ORDER BY bdj.created_at DESC LIMIT 20`
    );
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CUSTOMER STATEMENTS
// ============================================

// POST /api/document-center/statements/generate - Generate statement for a customer
router.post('/statements/generate', authenticate, async (req, res) => {
  try {
    const { customer_id, period_start, period_end } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

    const startDate = period_start || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const endDate = period_end || new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    // Get customer info
    const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customers.length) return res.status(404).json({ error: 'Customer not found' });
    const customer = customers[0];

    // Get invoices in period
    const [invoices] = await pool.query(
      `SELECT id, invoice_number, invoice_date, due_date, total_amount, amount_paid, status
       FROM ar_invoices WHERE customer_id = ? AND invoice_date BETWEEN ? AND ?
       ORDER BY invoice_date`,
      [customer_id, startDate, endDate]
    );

    // Get payments in period
    const [payments] = await pool.query(
      `SELECT cp.id, cp.payment_date, cp.amount, cp.payment_method, cp.reference_number, ai.invoice_number
       FROM customer_payments cp
       LEFT JOIN ar_invoices ai ON cp.invoice_id = ai.id
       WHERE cp.customer_id = ? AND cp.payment_date BETWEEN ? AND ?
       ORDER BY cp.payment_date`,
      [customer_id, startDate, endDate]
    );

    // Calculate opening balance (unpaid invoices before period start)
    const [openBal] = await pool.query(
      `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as balance
       FROM ar_invoices WHERE customer_id = ? AND invoice_date < ? AND status != 'cancelled'`,
      [customer_id, startDate]
    );
    const openingBalance = parseFloat(openBal[0].balance);

    // Build transactions list
    const transactions = [];
    let runningBalance = openingBalance;

    // Merge invoices and payments chronologically
    const allTx = [
      ...invoices.map(inv => ({ date: inv.invoice_date, type: 'Invoice', reference: inv.invoice_number, description: `Invoice ${inv.invoice_number}`, due_date: inv.due_date, charge: parseFloat(inv.total_amount), payment: null, is_overdue: new Date(inv.due_date) < new Date() && inv.status !== 'paid' })),
      ...payments.map(pmt => ({ date: pmt.payment_date, type: 'Payment', reference: pmt.reference_number || `PMT-${pmt.id}`, description: `Payment - ${pmt.payment_method}${pmt.invoice_number ? ' (Inv ' + pmt.invoice_number + ')' : ''}`, due_date: null, charge: null, payment: parseFloat(pmt.amount), is_overdue: false }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const tx of allTx) {
      if (tx.charge) runningBalance += tx.charge;
      if (tx.payment) runningBalance -= tx.payment;
      transactions.push({ ...tx, running_balance: runningBalance });
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + parseFloat(pmt.amount), 0);

    // Calculate aging
    const [agingData] = await pool.query(
      `SELECT 
        SUM(CASE WHEN DATEDIFF(NOW(), due_date) <= 0 THEN total_amount - amount_paid ELSE 0 END) as current_amt,
        SUM(CASE WHEN DATEDIFF(NOW(), due_date) BETWEEN 1 AND 30 THEN total_amount - amount_paid ELSE 0 END) as days_30,
        SUM(CASE WHEN DATEDIFF(NOW(), due_date) BETWEEN 31 AND 60 THEN total_amount - amount_paid ELSE 0 END) as days_60,
        SUM(CASE WHEN DATEDIFF(NOW(), due_date) BETWEEN 61 AND 90 THEN total_amount - amount_paid ELSE 0 END) as days_90,
        SUM(CASE WHEN DATEDIFF(NOW(), due_date) > 90 THEN total_amount - amount_paid ELSE 0 END) as over_90
       FROM ar_invoices WHERE customer_id = ? AND status NOT IN ('paid','cancelled')`,
      [customer_id]
    );

    // Save statement record
    const [stmtResult] = await pool.query(
      `INSERT INTO customer_statements (customer_id, statement_date, period_start, period_end, opening_balance, total_invoiced, total_payments, closing_balance)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [customer_id, startDate, endDate, openingBalance, totalInvoiced, totalPayments, runningBalance]
    );

    // Generate PDF via template service
    let templateService;
    try { templateService = require('../services/templateService'); } catch(e) {}
    
    let pdfGenerated = false;
    if (templateService) {
      try {
        const company = await templateService.getCompanyInfo();
        // Get branding
        const [brandingRows] = await pool.query('SELECT setting_key, setting_value FROM company_branding');
        const branding = {};
        brandingRows.forEach(r => { branding[r.setting_key] = r.setting_value; });
        
        const templateHtml = await templateService.getTemplate('statement');
        const data = {
          company: { ...company, ...branding, primary_color: branding.primary_color || '#1e40af' },
          customer,
          statement_date: new Date(),
          period_start: startDate,
          period_end: endDate,
          opening_balance: openingBalance,
          total_invoiced: totalInvoiced,
          total_payments: totalPayments,
          closing_balance: runningBalance,
          is_overdue: runningBalance > 0,
          available_credit: Math.max(0, parseFloat(customer.credit_limit || 0) - runningBalance),
          transactions,
          aging: {
            current: parseFloat(agingData[0].current_amt || 0),
            days_30: parseFloat(agingData[0].days_30 || 0),
            days_60: parseFloat(agingData[0].days_60 || 0),
            days_90: parseFloat(agingData[0].days_90 || 0),
            over_90: parseFloat(agingData[0].over_90 || 0)
          }
        };
        const html = templateService.compileTemplate(templateHtml, data);
        const pdfBuffer = await templateService.generatePdf(html);
        
        const fileName = `statement_${customer_id}_${endDate}.pdf`;
        const filePath = path.join(DOCS_DIR, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        await pool.query('UPDATE customer_statements SET file_path = ? WHERE id = ?', [fileName, stmtResult.insertId]);
        pdfGenerated = true;
      } catch (e) {
        console.log('Statement PDF generation error:', e.message);
      }
    }

    res.json({
      statement_id: stmtResult.insertId,
      customer: customer.company_name,
      period: `${startDate} to ${endDate}`,
      opening_balance: openingBalance,
      total_invoiced: totalInvoiced,
      total_payments: totalPayments,
      closing_balance: runningBalance,
      transactions_count: transactions.length,
      pdf_generated: pdfGenerated,
      aging: agingData[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/statements - List generated statements
router.get('/statements', authenticate, async (req, res) => {
  try {
    const { customer_id } = req.query;
    let query = `SELECT cs.*, c.company_name as customer_name 
                 FROM customer_statements cs 
                 LEFT JOIN customers c ON cs.customer_id = c.id`;
    const params = [];
    if (customer_id) { query += ' WHERE cs.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY cs.statement_date DESC LIMIT 100';
    
    const [statements] = await pool.query(query, params);
    res.json(statements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CUSTOMER PORTAL
// ============================================

// POST /api/document-center/portal/generate-link - Generate a portal access link for a customer
router.post('/portal/generate-link', authenticate, async (req, res) => {
  try {
    const { customer_id, document_type, document_id, expires_days = 30 } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000);
    const tokenType = document_type ? 'document_link' : 'session';

    await pool.query(
      `INSERT INTO customer_portal_tokens (customer_id, token, token_type, document_type, document_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, token, tokenType, document_type || null, document_id || null, expiresAt]
    );

    // Build the portal URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    const portalUrl = document_type 
      ? `${baseUrl}/portal/document/${token}`
      : `${baseUrl}/portal/${token}`;

    res.json({ token, portal_url: portalUrl, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/portal/validate/:token - Validate a portal token (no auth required)
router.get('/portal/validate/:token', async (req, res) => {
  try {
    const [tokens] = await pool.query(
      `SELECT cpt.*, c.company_name as customer_name 
       FROM customer_portal_tokens cpt
       LEFT JOIN customers c ON cpt.customer_id = c.id
       WHERE cpt.token = ? AND cpt.is_active = 1 AND cpt.expires_at > NOW()`,
      [req.params.token]
    );
    
    if (!tokens.length) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const tokenData = tokens[0];
    
    // Update access count
    await pool.query(
      'UPDATE customer_portal_tokens SET last_accessed = NOW(), access_count = access_count + 1 WHERE id = ?',
      [tokenData.id]
    );

    // Log access
    await pool.query(
      `INSERT INTO customer_portal_access_log (customer_id, token_id, action, document_type, document_id, ip_address, user_agent)
       VALUES (?, ?, 'validate', ?, ?, ?, ?)`,
      [tokenData.customer_id, tokenData.id, tokenData.document_type, tokenData.document_id, 
       req.ip, req.get('user-agent')]
    );

    res.json({
      valid: true,
      customer_id: tokenData.customer_id,
      customer_name: tokenData.customer_name,
      token_type: tokenData.token_type,
      document_type: tokenData.document_type,
      document_id: tokenData.document_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/portal/documents/:token - Get customer documents via portal token
router.get('/portal/documents/:token', async (req, res) => {
  try {
    const [tokens] = await pool.query(
      'SELECT * FROM customer_portal_tokens WHERE token = ? AND is_active = 1 AND expires_at > NOW()',
      [req.params.token]
    );
    if (!tokens.length) return res.status(401).json({ error: 'Invalid or expired token' });

    const customerId = tokens[0].customer_id;

    // Get recent invoices
    const [invoices] = await pool.query(
      `SELECT id, invoice_number, invoice_date, due_date, total_amount, amount_paid, status
       FROM ar_invoices WHERE customer_id = ? ORDER BY invoice_date DESC LIMIT 50`,
      [customerId]
    );

    // Get recent quotes
    const [quotes] = await pool.query(
      `SELECT id, quote_number, quote_date, total, status
       FROM quotes WHERE customer_id = ? ORDER BY quote_date DESC LIMIT 20`,
      [customerId]
    );

    // Get recent orders
    const [orders] = await pool.query(
      `SELECT id, order_number, order_date, total, status
       FROM sales_orders WHERE customer_id = ? ORDER BY order_date DESC LIMIT 20`,
      [customerId]
    );

    // Get statements
    const [statements] = await pool.query(
      `SELECT id, statement_date, period_start, period_end, closing_balance, file_path
       FROM customer_statements WHERE customer_id = ? ORDER BY statement_date DESC LIMIT 12`,
      [customerId]
    );

    // Log access
    await pool.query(
      `INSERT INTO customer_portal_access_log (customer_id, token_id, action, ip_address, user_agent)
       VALUES (?, ?, 'view_documents', ?, ?)`,
      [customerId, tokens[0].id, req.ip, req.get('user-agent')]
    );

    res.json({ invoices, quotes, orders, statements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/portal/pdf/:token/:type/:id - Download a document via portal
router.get('/portal/pdf/:token/:type/:id', async (req, res) => {
  try {
    const [tokens] = await pool.query(
      'SELECT * FROM customer_portal_tokens WHERE token = ? AND is_active = 1 AND expires_at > NOW()',
      [req.params.token]
    );
    if (!tokens.length) return res.status(401).json({ error: 'Invalid or expired token' });

    const customerId = tokens[0].customer_id;
    const { type, id } = req.params;

    // Verify the document belongs to this customer
    let ownerCheck = false;
    if (type === 'ar_invoice') {
      const [inv] = await pool.query('SELECT id FROM ar_invoices WHERE id = ? AND customer_id = ?', [id, customerId]);
      ownerCheck = inv.length > 0;
    } else if (type === 'quote') {
      const [qt] = await pool.query('SELECT id FROM quotes WHERE id = ? AND customer_id = ?', [id, customerId]);
      ownerCheck = qt.length > 0;
    } else if (type === 'sales_order') {
      const [so] = await pool.query('SELECT id FROM sales_orders WHERE id = ? AND customer_id = ?', [id, customerId]);
      ownerCheck = so.length > 0;
    } else if (type === 'statement') {
      const [st] = await pool.query('SELECT id FROM customer_statements WHERE id = ? AND customer_id = ?', [id, customerId]);
      ownerCheck = st.length > 0;
    }

    if (!ownerCheck) return res.status(403).json({ error: 'Access denied' });

    // Generate PDF
    let templateService;
    try { templateService = require('../services/templateService'); } catch(e) {}
    if (!templateService) return res.status(500).json({ error: 'PDF service unavailable' });

    const pdfBuffer = await templateService.generateDocument(type, id);
    
    // Log access
    await pool.query(
      `INSERT INTO customer_portal_access_log (customer_id, token_id, action, document_type, document_id, ip_address, user_agent)
       VALUES (?, ?, 'download_pdf', ?, ?, ?, ?)`,
      [customerId, tokens[0].id, type, id, req.ip, req.get('user-agent')]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/document-center/portal/tokens - List active portal tokens (admin view)
router.get('/portal/tokens', authenticate, async (req, res) => {
  try {
    const [tokens] = await pool.query(
      `SELECT cpt.*, c.company_name as customer_name
       FROM customer_portal_tokens cpt
       LEFT JOIN customers c ON cpt.customer_id = c.id
       WHERE cpt.is_active = 1
       ORDER BY cpt.created_at DESC LIMIT 50`
    );
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/document-center/portal/tokens/:id - Revoke a portal token
router.delete('/portal/tokens/:id', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE customer_portal_tokens SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Token revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EMAIL LOG & HISTORY
// ============================================

// GET /api/document-center/email-log - Get email history
router.get('/email-log', authenticate, async (req, res) => {
  try {
    const { document_type, limit = 50 } = req.query;
    let query = `SELECT el.*, u.username as sent_by_name 
                 FROM email_log el 
                 LEFT JOIN users u ON el.sent_by = u.id`;
    const params = [];
    if (document_type) { query += ' WHERE el.document_type = ?'; params.push(document_type); }
    query += ' ORDER BY el.sent_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [logs] = await pool.query(query, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
