const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ==================== LEADS ====================

// GET /api/crm/leads
router.get('/leads', async (req, res) => {
  try {
    const { status, assigned_to, source } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND l.status = ?'; params.push(status); }
    if (assigned_to) { where += ' AND l.assigned_to = ?'; params.push(assigned_to); }
    if (source) { where += ' AND l.source = ?'; params.push(source); }
    const [rows] = await pool.query(`
      SELECT l.*, u.first_name as assigned_name, c.company_name as customer_company
      FROM crm_leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN customers c ON l.customer_id = c.id
      ORDER BY l.created_at DESC
    `, params.length ? params : undefined);
    // Also get pipeline stats
    const [stats] = await pool.query("SELECT status, COUNT(*) as count, SUM(estimated_value) as total_value FROM crm_leads GROUP BY status");
    res.json({ leads: rows, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/leads
router.post('/leads', async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, source, status, estimated_value, assigned_to, notes } = req.body;
    const [result] = await pool.query('INSERT INTO crm_leads (company_name, contact_name, email, phone, source, status, estimated_value, assigned_to, notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [company_name, contact_name, email, phone, source || 'other', status || 'new', estimated_value, assigned_to, notes]);
    res.json({ id: result.insertId, message: 'Lead created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/leads/:id
router.get('/leads/:id', async (req, res) => {
  try {
    const [leads] = await pool.query('SELECT l.*, u.first_name as assigned_name FROM crm_leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?', [req.params.id]);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const [activities] = await pool.query('SELECT a.*, u.first_name as created_by_name FROM crm_activities a LEFT JOIN users u ON a.created_by = u.id WHERE a.lead_id = ? ORDER BY a.created_at DESC', [req.params.id]);
    res.json({ lead: leads[0], activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/leads/:id
router.put('/leads/:id', async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, source, status, estimated_value, assigned_to, notes, lost_reason } = req.body;
    let wonDate = null;
    if (status === 'won') wonDate = new Date().toISOString().split('T')[0];
    await pool.query('UPDATE crm_leads SET company_name=?, contact_name=?, email=?, phone=?, source=?, status=?, estimated_value=?, assigned_to=?, notes=?, lost_reason=?, won_date=? WHERE id=?',
      [company_name, contact_name, email, phone, source, status, estimated_value, assigned_to, notes, lost_reason, wonDate, req.params.id]);
    res.json({ message: 'Lead updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/leads/:id/convert - Convert lead to customer
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const [leads] = await pool.query('SELECT * FROM crm_leads WHERE id = ?', [req.params.id]);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];
    // Create customer
    const [seq] = await pool.query("SELECT current_value FROM sequences WHERE sequence_name = 'customer_number'");
    const nextNum = (seq.length ? seq[0].current_value : 0) + 1;
    await pool.query("UPDATE sequences SET current_value = ? WHERE sequence_name = 'customer_number'", [nextNum]);
    const custNum = `CUST-${String(nextNum).padStart(4, '0')}`;
    const [result] = await pool.query('INSERT INTO customers (customer_number, company_name, contact_name, email, phone, payment_terms) VALUES (?,?,?,?,?,?)',
      [custNum, lead.company_name, lead.contact_name, lead.email, lead.phone, 'Net 30']);
    // Update lead
    await pool.query('UPDATE crm_leads SET status = ?, customer_id = ?, won_date = CURDATE() WHERE id = ?', ['won', result.insertId, req.params.id]);
    res.json({ message: 'Lead converted to customer', customer_id: result.insertId, customer_number: custNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACTIVITIES ====================

// GET /api/crm/activities
router.get('/activities', async (req, res) => {
  try {
    const { customer_id, lead_id, type, status, upcoming } = req.query;
    let where = '1=1';
    const params = [];
    if (customer_id) { where += ' AND a.customer_id = ?'; params.push(customer_id); }
    if (lead_id) { where += ' AND a.lead_id = ?'; params.push(lead_id); }
    if (type) { where += ' AND a.activity_type = ?'; params.push(type); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (upcoming === 'true') { where += ' AND a.scheduled_at >= NOW() AND a.status = ?'; params.push('planned'); }
    const [rows] = await pool.query(`
      SELECT a.*, u.first_name as assigned_name, u2.first_name as created_by_name,
             c.company_name as customer_name, l.company_name as lead_name
      FROM crm_activities a
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN users u2 ON a.created_by = u2.id
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN crm_leads l ON a.lead_id = l.id
      WHERE ${where}
      ORDER BY COALESCE(a.scheduled_at, a.created_at) DESC
      LIMIT 100
    `, params);
    res.json({ activities: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/activities
router.post('/activities', async (req, res) => {
  try {
    const { activity_type, subject, description, customer_id, lead_id, contact_name, scheduled_at, duration_minutes, assigned_to } = req.body;
    const [result] = await pool.query('INSERT INTO crm_activities (activity_type, subject, description, customer_id, lead_id, contact_name, scheduled_at, duration_minutes, status, assigned_to, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [activity_type, subject, description, customer_id, lead_id, contact_name, scheduled_at, duration_minutes, scheduled_at ? 'planned' : 'completed', assigned_to || req.user.id, req.user.id]);
    res.json({ id: result.insertId, message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/activities/:id
router.put('/activities/:id', async (req, res) => {
  try {
    const { activity_type, subject, description, scheduled_at, duration_minutes, status, assigned_to } = req.body;
    let completedAt = null;
    if (status === 'completed') completedAt = new Date();
    await pool.query('UPDATE crm_activities SET activity_type=?, subject=?, description=?, scheduled_at=?, duration_minutes=?, status=?, assigned_to=?, completed_at=? WHERE id=?',
      [activity_type, subject, description, scheduled_at, duration_minutes, status, assigned_to, completedAt, req.params.id]);
    res.json({ message: 'Activity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/pipeline - Get pipeline view data
router.get('/pipeline', async (req, res) => {
  try {
    const [pipeline] = await pool.query('SELECT * FROM crm_pipeline WHERE is_default = 1 LIMIT 1');
    const stages = pipeline.length ? JSON.parse(pipeline[0].stages) : ['New Lead', 'Initial Contact', 'Qualification', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
    // Map stages to lead statuses
    const statusMap = { 'New Lead': 'new', 'Initial Contact': 'contacted', 'Qualification': 'qualified', 'Proposal Sent': 'proposal', 'Negotiation': 'negotiation', 'Closed Won': 'won', 'Closed Lost': 'lost' };
    const pipelineData = [];
    for (const stage of stages) {
      const status = statusMap[stage] || stage.toLowerCase();
      const [leads] = await pool.query('SELECT id, company_name, contact_name, estimated_value, created_at FROM crm_leads WHERE status = ? ORDER BY created_at DESC', [status]);
      pipelineData.push({ stage, status, leads, count: leads.length, total_value: leads.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0) });
    }
    res.json({ pipeline: pipelineData, stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/dashboard - CRM dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_leads }]] = await pool.query("SELECT COUNT(*) as total_leads FROM crm_leads WHERE status NOT IN ('won','lost')");
    const [[{ total_value }]] = await pool.query("SELECT COALESCE(SUM(estimated_value), 0) as total_value FROM crm_leads WHERE status NOT IN ('won','lost')");
    const [[{ won_this_month }]] = await pool.query("SELECT COUNT(*) as won_this_month FROM crm_leads WHERE status = 'won' AND won_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
    const [[{ activities_due }]] = await pool.query("SELECT COUNT(*) as activities_due FROM crm_activities WHERE status = 'planned' AND scheduled_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)");
    const [recent_activities] = await pool.query("SELECT a.*, c.company_name as customer_name FROM crm_activities a LEFT JOIN customers c ON a.customer_id = c.id ORDER BY a.created_at DESC LIMIT 10");
    res.json({ stats: { total_leads, total_value, won_this_month, activities_due }, recent_activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
