/**
 * Field Service & Installation Management Module
 * ================================================
 * Manage installation projects, field crews, site visits, and customer sign-offs
 * For commercial glazing projects with multi-phase deliveries
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ============ SCHEMA SETUP ============
router.post('/setup-schema', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS installation_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_number VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(300) NOT NULL,
        customer_id INT,
        sales_order_id INT,
        site_address TEXT,
        site_contact_name VARCHAR(200),
        site_contact_phone VARCHAR(50),
        project_type ENUM('residential','commercial','industrial') DEFAULT 'commercial',
        status ENUM('planning','scheduled','in_progress','on_hold','completed','cancelled') DEFAULT 'planning',
        priority ENUM('urgent','high','normal','low') DEFAULT 'normal',
        estimated_start DATE,
        estimated_end DATE,
        actual_start DATE,
        actual_end DATE,
        total_phases INT DEFAULT 1,
        completed_phases INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS installation_phases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        phase_number INT NOT NULL,
        phase_name VARCHAR(200) NOT NULL,
        description TEXT,
        status ENUM('pending','scheduled','in_progress','completed','cancelled') DEFAULT 'pending',
        scheduled_date DATE,
        completed_date DATE,
        assigned_crew_id INT,
        delivery_rack_id INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS field_crews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crew_name VARCHAR(100) NOT NULL,
        lead_installer VARCHAR(200),
        phone VARCHAR(50),
        members JSON,
        vehicle VARCHAR(100),
        status ENUM('available','on_job','off_duty') DEFAULT 'available',
        current_project_id INT,
        skills JSON,
        certifications JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS field_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        phase_id INT,
        crew_id INT,
        task_type ENUM('measurement','installation','inspection','rework','delivery','pickup') DEFAULT 'installation',
        title VARCHAR(300) NOT NULL,
        description TEXT,
        status ENUM('pending','scheduled','in_progress','completed','cancelled') DEFAULT 'pending',
        scheduled_date DATE,
        scheduled_time TIME,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        completed_at DATETIME,
        customer_signature TEXT,
        sign_off_name VARCHAR(200),
        sign_off_date DATETIME,
        photos JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_measurements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        measured_by VARCHAR(200),
        measured_date DATE,
        location_description VARCHAR(300),
        measurements JSON,
        photos JSON,
        notes TEXT,
        status ENUM('draft','confirmed','revised') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed sample data
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM field_crews');
    if (existing[0].cnt === 0) {
      await pool.query(`INSERT INTO field_crews (crew_name, lead_installer, phone, status, skills) VALUES
        ('Crew Alpha', 'Mike Johnson', '724-555-0101', 'available', '["curtain_wall","storefront","railings"]'),
        ('Crew Beta', 'Dave Williams', '724-555-0102', 'available', '["shower_doors","mirrors","residential"]'),
        ('Crew Charlie', 'Tom Anderson', '724-555-0103', 'available', '["curtain_wall","skylights","commercial"]')
      `);
    }
    res.json({ message: 'Field Service schema created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DASHBOARD ============
router.get('/dashboard', async (req, res) => {
  try {
    const [projects] = await pool.query(`SELECT ip.*, c.company_name as customer_name 
      FROM installation_projects ip LEFT JOIN customers c ON ip.customer_id = c.id 
      WHERE ip.status NOT IN ('completed','cancelled') ORDER BY ip.estimated_start`);
    const [crews] = await pool.query('SELECT * FROM field_crews ORDER BY crew_name');
    const [todayTasks] = await pool.query(`SELECT ft.*, ip.project_name, fc.crew_name 
      FROM field_tasks ft 
      LEFT JOIN installation_projects ip ON ft.project_id = ip.id 
      LEFT JOIN field_crews fc ON ft.crew_id = fc.id 
      WHERE ft.scheduled_date = CURDATE() ORDER BY ft.scheduled_time`);
    const [upcomingTasks] = await pool.query(`SELECT ft.*, ip.project_name, fc.crew_name 
      FROM field_tasks ft 
      LEFT JOIN installation_projects ip ON ft.project_id = ip.id 
      LEFT JOIN field_crews fc ON ft.crew_id = fc.id 
      WHERE ft.scheduled_date > CURDATE() AND ft.scheduled_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
      ORDER BY ft.scheduled_date, ft.scheduled_time`);
    const [stats] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM installation_projects WHERE status = 'in_progress') as active_projects,
      (SELECT COUNT(*) FROM field_tasks WHERE status = 'pending' OR status = 'scheduled') as pending_tasks,
      (SELECT COUNT(*) FROM field_crews WHERE status = 'available') as available_crews,
      (SELECT COUNT(*) FROM field_tasks WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as completed_this_week
    `);
    res.json({ projects, crews, todayTasks, upcomingTasks, stats: stats[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ PROJECTS ============
router.get('/projects', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ip.*, c.company_name as customer_name 
      FROM installation_projects ip LEFT JOIN customers c ON ip.customer_id = c.id 
      ORDER BY ip.created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const [projects] = await pool.query(`SELECT ip.*, c.company_name as customer_name 
      FROM installation_projects ip LEFT JOIN customers c ON ip.customer_id = c.id WHERE ip.id = ?`, [req.params.id]);
    if (!projects.length) return res.status(404).json({ error: 'Project not found' });
    const [phases] = await pool.query('SELECT * FROM installation_phases WHERE project_id = ? ORDER BY phase_number', [req.params.id]);
    const [tasks] = await pool.query(`SELECT ft.*, fc.crew_name FROM field_tasks ft LEFT JOIN field_crews fc ON ft.crew_id = fc.id WHERE ft.project_id = ? ORDER BY ft.scheduled_date`, [req.params.id]);
    const [measurements] = await pool.query('SELECT * FROM site_measurements WHERE project_id = ? ORDER BY measured_date DESC', [req.params.id]);
    res.json({ project: projects[0], phases, tasks, measurements });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/projects', async (req, res) => {
  try {
    const { project_name, customer_id, sales_order_id, site_address, site_contact_name, site_contact_phone, project_type, priority, estimated_start, estimated_end, total_phases, notes } = req.body;
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM installation_projects');
    const projectNumber = `INST-${String(count[0].cnt + 1).padStart(4, '0')}`;
    const [result] = await pool.query(
      'INSERT INTO installation_projects (project_number, project_name, customer_id, sales_order_id, site_address, site_contact_name, site_contact_phone, project_type, priority, estimated_start, estimated_end, total_phases, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [projectNumber, project_name, customer_id, sales_order_id, site_address, site_contact_name, site_contact_phone, project_type, priority, estimated_start, estimated_end, total_phases || 1, notes]
    );
    res.json({ id: result.insertId, project_number: projectNumber, message: 'Project created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const fields = req.body;
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE installation_projects SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Project updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ PHASES ============
router.post('/projects/:id/phases', async (req, res) => {
  try {
    const { phase_number, phase_name, description, scheduled_date, assigned_crew_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO installation_phases (project_id, phase_number, phase_name, description, scheduled_date, assigned_crew_id) VALUES (?,?,?,?,?,?)',
      [req.params.id, phase_number, phase_name, description, scheduled_date, assigned_crew_id]
    );
    res.json({ id: result.insertId, message: 'Phase added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/phases/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.status === 'completed') {
      fields.completed_date = new Date().toISOString().split('T')[0];
      // Update project completed_phases count
      const [phase] = await pool.query('SELECT project_id FROM installation_phases WHERE id = ?', [req.params.id]);
      if (phase.length) {
        await pool.query('UPDATE installation_projects SET completed_phases = completed_phases + 1 WHERE id = ?', [phase[0].project_id]);
      }
    }
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE installation_phases SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Phase updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ FIELD TASKS ============
router.get('/tasks', async (req, res) => {
  try {
    const { status, crew_id, date } = req.query;
    let query = `SELECT ft.*, ip.project_name, ip.project_number, fc.crew_name 
      FROM field_tasks ft 
      LEFT JOIN installation_projects ip ON ft.project_id = ip.id 
      LEFT JOIN field_crews fc ON ft.crew_id = fc.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND ft.status = ?'; params.push(status); }
    if (crew_id) { query += ' AND ft.crew_id = ?'; params.push(crew_id); }
    if (date) { query += ' AND ft.scheduled_date = ?'; params.push(date); }
    query += ' ORDER BY ft.scheduled_date, ft.scheduled_time';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks', async (req, res) => {
  try {
    const { project_id, phase_id, crew_id, task_type, title, description, scheduled_date, scheduled_time, estimated_hours } = req.body;
    const [result] = await pool.query(
      'INSERT INTO field_tasks (project_id, phase_id, crew_id, task_type, title, description, scheduled_date, scheduled_time, estimated_hours) VALUES (?,?,?,?,?,?,?,?,?)',
      [project_id, phase_id, crew_id, task_type, title, description, scheduled_date, scheduled_time, estimated_hours]
    );
    res.json({ id: result.insertId, message: 'Task created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.status === 'completed') {
      fields.completed_at = new Date();
    }
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE field_tasks SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Task updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sign-off endpoint
router.post('/tasks/:id/sign-off', async (req, res) => {
  try {
    const { sign_off_name, customer_signature, notes } = req.body;
    await pool.query(
      'UPDATE field_tasks SET sign_off_name = ?, customer_signature = ?, sign_off_date = NOW(), status = ?, notes = CONCAT(COALESCE(notes,""), ?) WHERE id = ?',
      [sign_off_name, customer_signature, 'completed', notes ? `\nSign-off: ${notes}` : '', req.params.id]
    );
    res.json({ message: 'Task signed off by customer' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ CREWS ============
router.get('/crews', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM field_crews ORDER BY crew_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/crews', async (req, res) => {
  try {
    const { crew_name, lead_installer, phone, members, vehicle, skills, certifications } = req.body;
    const [result] = await pool.query(
      'INSERT INTO field_crews (crew_name, lead_installer, phone, members, vehicle, skills, certifications) VALUES (?,?,?,?,?,?,?)',
      [crew_name, lead_installer, phone, JSON.stringify(members), vehicle, JSON.stringify(skills), JSON.stringify(certifications)]
    );
    res.json({ id: result.insertId, message: 'Crew created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/crews/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.members) fields.members = JSON.stringify(fields.members);
    if (fields.skills) fields.skills = JSON.stringify(fields.skills);
    if (fields.certifications) fields.certifications = JSON.stringify(fields.certifications);
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE field_crews SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Crew updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SITE MEASUREMENTS ============
router.post('/measurements', async (req, res) => {
  try {
    const { project_id, measured_by, measured_date, location_description, measurements, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO site_measurements (project_id, measured_by, measured_date, location_description, measurements, notes) VALUES (?,?,?,?,?,?)',
      [project_id, measured_by, measured_date, location_description, JSON.stringify(measurements), notes]
    );
    res.json({ id: result.insertId, message: 'Measurements recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
