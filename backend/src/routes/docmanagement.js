const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

router.use(authenticate);

// ==================== DOCUMENT ATTACHMENTS ====================

// GET /api/docmanagement/attachments - Get attachments for a reference
router.get('/attachments', async (req, res) => {
  try {
    const { reference_type, reference_id } = req.query;
    if (!reference_type || !reference_id) return res.status(400).json({ error: 'reference_type and reference_id required' });
    const [rows] = await pool.query('SELECT da.*, u.first_name as uploaded_by_name FROM document_attachments da LEFT JOIN users u ON da.uploaded_by = u.id WHERE da.reference_type = ? AND da.reference_id = ? ORDER BY da.created_at DESC',
      [reference_type, reference_id]);
    res.json({ attachments: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docmanagement/attachments - Upload attachment
router.post('/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { reference_type, reference_id, category, description } = req.body;
    const [result] = await pool.query('INSERT INTO document_attachments (file_name, file_path, file_type, file_size, mime_type, reference_type, reference_id, category, uploaded_by, description) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [req.file.originalname, req.file.filename, path.extname(req.file.originalname).slice(1), req.file.size, req.file.mimetype, reference_type, reference_id, category || 'document', req.user.id, description]);
    res.json({ id: result.insertId, message: 'File uploaded', filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docmanagement/attachments/:id/download - Download file
router.get('/attachments/:id/download', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM document_attachments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const filePath = path.join(__dirname, '../../uploads/documents', rows[0].file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
    res.download(filePath, rows[0].file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/docmanagement/attachments/:id
router.delete('/attachments/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM document_attachments WHERE id = ?', [req.params.id]);
    if (rows.length) {
      const filePath = path.join(__dirname, '../../uploads/documents', rows[0].file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM document_attachments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EMAIL TEMPLATES ====================

// GET /api/docmanagement/email-templates
router.get('/email-templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY template_name');
    res.json({ templates: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/docmanagement/email-templates/:id
router.put('/email-templates/:id', async (req, res) => {
  try {
    const { template_name, subject, body_html, body_text, is_active } = req.body;
    await pool.query('UPDATE email_templates SET template_name=?, subject=?, body_html=?, body_text=?, is_active=? WHERE id=?',
      [template_name, subject, body_html, body_text, is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Template updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docmanagement/email-templates
router.post('/email-templates', async (req, res) => {
  try {
    const { template_name, template_type, subject, body_html, body_text, variables } = req.body;
    const [result] = await pool.query('INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES (?,?,?,?,?,?)',
      [template_name, template_type || 'custom', subject, body_html, body_text, JSON.stringify(variables || [])]);
    res.json({ id: result.insertId, message: 'Template created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EMAIL QUEUE ====================

// GET /api/docmanagement/email-queue
router.get('/email-queue', async (req, res) => {
  try {
    const { status } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND eq.status = ?'; params.push(status); }
    const [rows] = await pool.query(`SELECT eq.*, u.first_name as created_by_name FROM email_queue eq LEFT JOIN users u ON eq.created_by = u.id WHERE ${where} ORDER BY eq.created_at DESC LIMIT 100`, params);
    res.json({ emails: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docmanagement/send-email - Queue an email
router.post('/send-email', async (req, res) => {
  try {
    const { to_email, to_name, cc_email, subject, body_html, body_text, template_id, reference_type, reference_id, attachments } = req.body;
    let finalSubject = subject;
    let finalBody = body_html;
    // If using template, populate it
    if (template_id) {
      const [templates] = await pool.query('SELECT * FROM email_templates WHERE id = ?', [template_id]);
      if (templates.length) {
        finalSubject = finalSubject || templates[0].subject;
        finalBody = finalBody || templates[0].body_html;
      }
    }
    const [result] = await pool.query('INSERT INTO email_queue (to_email, to_name, cc_email, subject, body_html, body_text, template_id, reference_type, reference_id, attachments, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [to_email, to_name, cc_email, finalSubject, finalBody, body_text, template_id, reference_type, reference_id, JSON.stringify(attachments || []), 'queued', req.user.id]);
    // Try to send immediately using nodemailer if configured
    try {
      const nodemailer = require('nodemailer');
      const [settings] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'smtp_%'");
      const smtp = {};
      settings.forEach(s => { smtp[s.setting_key] = s.setting_value; });
      if (smtp.smtp_host && smtp.smtp_user) {
        const transporter = nodemailer.createTransport({
          host: smtp.smtp_host,
          port: parseInt(smtp.smtp_port) || 587,
          secure: smtp.smtp_secure === 'true',
          auth: { user: smtp.smtp_user, pass: smtp.smtp_pass }
        });
        await transporter.sendMail({
          from: smtp.smtp_from || smtp.smtp_user,
          to: to_email,
          cc: cc_email,
          subject: finalSubject,
          html: finalBody,
          text: body_text
        });
        await pool.query("UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = ?", [result.insertId]);
        return res.json({ id: result.insertId, message: 'Email sent successfully', status: 'sent' });
      }
    } catch (emailErr) {
      await pool.query("UPDATE email_queue SET status = 'failed', error_message = ?, attempts = 1 WHERE id = ?", [emailErr.message, result.insertId]);
    }
    res.json({ id: result.insertId, message: 'Email queued', status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docmanagement/email-queue/:id/retry - Retry failed email
router.post('/email-queue/:id/retry', async (req, res) => {
  try {
    await pool.query("UPDATE email_queue SET status = 'queued', attempts = 0, error_message = NULL WHERE id = ?", [req.params.id]);
    res.json({ message: 'Email requeued for retry' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docmanagement/stats - Document stats
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_docs }]] = await pool.query('SELECT COUNT(*) as total_docs FROM document_attachments');
    const [[{ total_size }]] = await pool.query('SELECT COALESCE(SUM(file_size), 0) as total_size FROM document_attachments');
    const [[{ emails_sent }]] = await pool.query("SELECT COUNT(*) as emails_sent FROM email_queue WHERE status = 'sent'");
    const [[{ emails_failed }]] = await pool.query("SELECT COUNT(*) as emails_failed FROM email_queue WHERE status = 'failed'");
    const [by_type] = await pool.query('SELECT reference_type, COUNT(*) as count FROM document_attachments GROUP BY reference_type');
    res.json({ stats: { total_docs, total_size_mb: Math.round(total_size / 1024 / 1024 * 100) / 100, emails_sent, emails_failed }, by_type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
