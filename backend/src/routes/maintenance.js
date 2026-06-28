/**
 * Preventive Maintenance (CMMS) Module
 * =====================================
 * Equipment asset management, PM scheduling, work orders, spare parts tracking
 * Designed for glass fabrication equipment (tempering furnaces, CNC tables, edge polishers)
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
      CREATE TABLE IF NOT EXISTS equipment_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category ENUM('tempering_furnace','cnc_cutting','edge_polisher','lamination','waterjet','drilling','washing','other') DEFAULT 'other',
        manufacturer VARCHAR(200),
        model_number VARCHAR(100),
        serial_number VARCHAR(100),
        location VARCHAR(100),
        purchase_date DATE,
        purchase_cost DECIMAL(12,2),
        warranty_expiry DATE,
        status ENUM('operational','maintenance','breakdown','decommissioned') DEFAULT 'operational',
        criticality ENUM('critical','high','medium','low') DEFAULT 'medium',
        notes TEXT,
        last_pm_date DATE,
        next_pm_date DATE,
        total_runtime_hours DECIMAL(10,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pm_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        schedule_name VARCHAR(200) NOT NULL,
        schedule_type ENUM('calendar','runtime_hours','both') DEFAULT 'calendar',
        frequency_days INT,
        frequency_hours DECIMAL(10,1),
        task_description TEXT,
        checklist JSON,
        priority ENUM('critical','high','medium','low') DEFAULT 'medium',
        estimated_duration_mins INT DEFAULT 60,
        requires_shutdown BOOLEAN DEFAULT FALSE,
        last_completed DATE,
        next_due DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_work_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wo_number VARCHAR(50) UNIQUE NOT NULL,
        asset_id INT NOT NULL,
        pm_schedule_id INT,
        type ENUM('preventive','corrective','emergency','inspection') DEFAULT 'preventive',
        priority ENUM('critical','high','medium','low') DEFAULT 'medium',
        status ENUM('open','in_progress','on_hold','completed','cancelled') DEFAULT 'open',
        title VARCHAR(300) NOT NULL,
        description TEXT,
        assigned_to VARCHAR(100),
        reported_by VARCHAR(100),
        started_at DATETIME,
        completed_at DATETIME,
        downtime_minutes INT DEFAULT 0,
        labor_hours DECIMAL(6,2) DEFAULT 0,
        parts_cost DECIMAL(10,2) DEFAULT 0,
        labor_cost DECIMAL(10,2) DEFAULT 0,
        total_cost DECIMAL(10,2) DEFAULT 0,
        root_cause TEXT,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spare_parts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        part_number VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        compatible_assets JSON,
        qty_on_hand INT DEFAULT 0,
        reorder_point INT DEFAULT 1,
        reorder_qty INT DEFAULT 1,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        supplier VARCHAR(200),
        lead_time_days INT DEFAULT 7,
        location VARCHAR(100),
        last_used_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_parts_used (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maintenance_wo_id INT NOT NULL,
        spare_part_id INT NOT NULL,
        quantity INT DEFAULT 1,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_downtime_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        maintenance_wo_id INT,
        reason ENUM('scheduled_pm','breakdown','setup','waiting_parts','other') DEFAULT 'breakdown',
        started_at DATETIME NOT NULL,
        ended_at DATETIME,
        duration_minutes INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed some default equipment for glass fabrication
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM equipment_assets');
    if (existing[0].cnt === 0) {
      await pool.query(`INSERT INTO equipment_assets (asset_code, name, category, manufacturer, location, criticality, status) VALUES
        ('TF-001', 'Tempering Furnace #1', 'tempering_furnace', 'Glaston', 'Bay 1', 'critical', 'operational'),
        ('TF-002', 'Tempering Furnace #2', 'tempering_furnace', 'Glaston', 'Bay 1', 'critical', 'operational'),
        ('CNC-001', 'CNC Cutting Table', 'cnc_cutting', 'Bottero', 'Bay 2', 'critical', 'operational'),
        ('EP-001', 'Edge Polisher - Straight', 'edge_polisher', 'Bavelloni', 'Bay 3', 'high', 'operational'),
        ('EP-002', 'Edge Polisher - Shape', 'edge_polisher', 'Bavelloni', 'Bay 3', 'high', 'operational'),
        ('WJ-001', 'Waterjet Cutter', 'waterjet', 'OMAX', 'Bay 2', 'high', 'operational'),
        ('WM-001', 'Glass Washer', 'washing', 'Lisec', 'Bay 4', 'medium', 'operational'),
        ('DR-001', 'Drilling Machine', 'drilling', 'Intermac', 'Bay 3', 'medium', 'operational'),
        ('LAM-001', 'Lamination Line', 'lamination', 'Lisec', 'Bay 5', 'critical', 'operational'),
        ('LAM-002', 'Autoclave', 'lamination', 'Scholz', 'Bay 5', 'critical', 'operational')
      `);
      // Seed PM schedules
      await pool.query(`INSERT INTO pm_schedules (asset_id, schedule_name, schedule_type, frequency_days, task_description, priority, requires_shutdown, next_due) VALUES
        (1, 'Heating Element Inspection', 'calendar', 30, 'Inspect all heating elements for wear, measure resistance, check connections', 'critical', TRUE, DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
        (1, 'Ceramic Roller Maintenance', 'calendar', 90, 'Check roller alignment, inspect for cracks, clean residue buildup', 'high', TRUE, DATE_ADD(CURDATE(), INTERVAL 14 DAY)),
        (1, 'Quench System Check', 'calendar', 14, 'Verify air pressure, check nozzle alignment, inspect blower motors', 'critical', FALSE, DATE_ADD(CURDATE(), INTERVAL 3 DAY)),
        (3, 'Cutting Head Calibration', 'calendar', 7, 'Calibrate cutting wheel, check oil levels, verify scoring pressure', 'high', FALSE, DATE_ADD(CURDATE(), INTERVAL 2 DAY)),
        (3, 'Bridge & Rail Lubrication', 'calendar', 30, 'Lubricate linear rails, check belt tension, inspect servo motors', 'medium', FALSE, DATE_ADD(CURDATE(), INTERVAL 10 DAY)),
        (4, 'Polishing Wheel Replacement', 'runtime_hours', NULL, 'Replace diamond polishing wheels when worn. Check spindle bearings.', 'high', TRUE, DATE_ADD(CURDATE(), INTERVAL 5 DAY)),
        (6, 'Waterjet Nozzle Inspection', 'calendar', 14, 'Check orifice wear, inspect mixing tube, verify abrasive flow rate', 'high', FALSE, DATE_ADD(CURDATE(), INTERVAL 4 DAY)),
        (9, 'Autoclave Pressure Test', 'calendar', 30, 'Verify pressure seals, test safety valves, inspect door gasket', 'critical', TRUE, DATE_ADD(CURDATE(), INTERVAL 12 DAY))
      `);
      // Seed spare parts
      await pool.query(`INSERT INTO spare_parts (part_number, name, category, qty_on_hand, reorder_point, unit_cost, supplier) VALUES
        ('HE-6000W', 'Heating Element 6000W', 'Tempering', 4, 2, 850.00, 'Glaston Parts'),
        ('CR-3200', 'Ceramic Roller 3200mm', 'Tempering', 6, 3, 420.00, 'Glaston Parts'),
        ('CW-130', 'Cutting Wheel 130deg', 'CNC Cutting', 10, 5, 45.00, 'Bottero Supply'),
        ('PW-DIA-150', 'Diamond Polish Wheel 150mm', 'Edge Polish', 8, 4, 280.00, 'Bavelloni Parts'),
        ('NZ-WJ-030', 'Waterjet Nozzle 0.030"', 'Waterjet', 6, 3, 125.00, 'OMAX Direct'),
        ('MT-WJ-4', 'Mixing Tube 4" Standard', 'Waterjet', 3, 2, 340.00, 'OMAX Direct'),
        ('BLT-SRV-10', 'Servo Belt 10mm', 'CNC Cutting', 4, 2, 95.00, 'Motion Supply'),
        ('GSK-AC-800', 'Autoclave Door Gasket 800mm', 'Lamination', 2, 1, 560.00, 'Scholz Service'),
        ('FLT-AIR-24', 'Air Filter 24x24', 'General', 12, 6, 35.00, 'Grainger'),
        ('OIL-HYD-5', 'Hydraulic Oil 5 Gal', 'General', 3, 2, 85.00, 'Grainger')
      `);
    }
    res.json({ message: 'Maintenance schema created and seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DASHBOARD ============
router.get('/dashboard', async (req, res) => {
  try {
    const [assets] = await pool.query('SELECT * FROM equipment_assets ORDER BY criticality, name');
    const [overduePM] = await pool.query(`SELECT ps.*, ea.name as asset_name, ea.asset_code 
      FROM pm_schedules ps JOIN equipment_assets ea ON ps.asset_id = ea.id 
      WHERE ps.is_active = 1 AND ps.next_due <= CURDATE() ORDER BY ps.next_due`);
    const [upcomingPM] = await pool.query(`SELECT ps.*, ea.name as asset_name, ea.asset_code 
      FROM pm_schedules ps JOIN equipment_assets ea ON ps.asset_id = ea.id 
      WHERE ps.is_active = 1 AND ps.next_due > CURDATE() AND ps.next_due <= DATE_ADD(CURDATE(), INTERVAL 14 DAY) ORDER BY ps.next_due`);
    const [openWOs] = await pool.query(`SELECT mwo.*, ea.name as asset_name, ea.asset_code 
      FROM maintenance_work_orders mwo JOIN equipment_assets ea ON mwo.asset_id = ea.id 
      WHERE mwo.status IN ('open','in_progress','on_hold') ORDER BY FIELD(mwo.priority,'critical','high','medium','low'), mwo.created_at DESC`);
    const [recentDowntime] = await pool.query(`SELECT edl.*, ea.name as asset_name, ea.asset_code 
      FROM equipment_downtime_log edl JOIN equipment_assets ea ON edl.asset_id = ea.id 
      ORDER BY edl.started_at DESC LIMIT 10`);
    const [lowParts] = await pool.query('SELECT * FROM spare_parts WHERE qty_on_hand <= reorder_point ORDER BY qty_on_hand');
    const [stats] = await pool.query(`SELECT 
      (SELECT COUNT(*) FROM equipment_assets WHERE status = 'operational') as operational_count,
      (SELECT COUNT(*) FROM equipment_assets WHERE status = 'maintenance') as in_maintenance_count,
      (SELECT COUNT(*) FROM equipment_assets WHERE status = 'breakdown') as breakdown_count,
      (SELECT COUNT(*) FROM maintenance_work_orders WHERE status IN ('open','in_progress')) as open_wo_count,
      (SELECT COUNT(*) FROM pm_schedules WHERE is_active = 1 AND next_due <= CURDATE()) as overdue_pm_count,
      (SELECT COALESCE(SUM(duration_minutes),0) FROM equipment_downtime_log WHERE started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_downtime_mins
    `);
    res.json({ assets, overduePM, upcomingPM, openWOs, recentDowntime, lowParts, stats: stats[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ EQUIPMENT ASSETS ============
router.get('/assets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM equipment_assets ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/assets/:id', async (req, res) => {
  try {
    const [assets] = await pool.query('SELECT * FROM equipment_assets WHERE id = ?', [req.params.id]);
    if (!assets.length) return res.status(404).json({ error: 'Asset not found' });
    const [schedules] = await pool.query('SELECT * FROM pm_schedules WHERE asset_id = ? ORDER BY next_due', [req.params.id]);
    const [workOrders] = await pool.query('SELECT * FROM maintenance_work_orders WHERE asset_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
    const [downtime] = await pool.query('SELECT * FROM equipment_downtime_log WHERE asset_id = ? ORDER BY started_at DESC LIMIT 20', [req.params.id]);
    res.json({ asset: assets[0], schedules, workOrders, downtime });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/assets', async (req, res) => {
  try {
    const { asset_code, name, category, manufacturer, model_number, serial_number, location, purchase_date, purchase_cost, warranty_expiry, criticality, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO equipment_assets (asset_code, name, category, manufacturer, model_number, serial_number, location, purchase_date, purchase_cost, warranty_expiry, criticality, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [asset_code, name, category, manufacturer, model_number, serial_number, location, purchase_date, purchase_cost, warranty_expiry, criticality, notes]
    );
    res.json({ id: result.insertId, message: 'Asset created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/assets/:id', async (req, res) => {
  try {
    const fields = req.body;
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE equipment_assets SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Asset updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ PM SCHEDULES ============
router.get('/schedules', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ps.*, ea.name as asset_name, ea.asset_code 
      FROM pm_schedules ps JOIN equipment_assets ea ON ps.asset_id = ea.id ORDER BY ps.next_due`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/schedules', async (req, res) => {
  try {
    const { asset_id, schedule_name, schedule_type, frequency_days, frequency_hours, task_description, checklist, priority, estimated_duration_mins, requires_shutdown, next_due } = req.body;
    const [result] = await pool.query(
      'INSERT INTO pm_schedules (asset_id, schedule_name, schedule_type, frequency_days, frequency_hours, task_description, checklist, priority, estimated_duration_mins, requires_shutdown, next_due) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [asset_id, schedule_name, schedule_type, frequency_days, frequency_hours, task_description, JSON.stringify(checklist), priority, estimated_duration_mins, requires_shutdown, next_due]
    );
    res.json({ id: result.insertId, message: 'PM schedule created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.checklist) fields.checklist = JSON.stringify(fields.checklist);
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE pm_schedules SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Schedule updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ MAINTENANCE WORK ORDERS ============
router.get('/work-orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT mwo.*, ea.name as asset_name, ea.asset_code 
      FROM maintenance_work_orders mwo JOIN equipment_assets ea ON mwo.asset_id = ea.id`;
    const params = [];
    if (status) { query += ' WHERE mwo.status = ?'; params.push(status); }
    query += ' ORDER BY FIELD(mwo.priority,\'critical\',\'high\',\'medium\',\'low\'), mwo.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/work-orders', async (req, res) => {
  try {
    const { asset_id, pm_schedule_id, type, priority, title, description, assigned_to } = req.body;
    // Generate WO number
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM maintenance_work_orders');
    const woNumber = `MWO-${String(count[0].cnt + 1).padStart(5, '0')}`;
    const [result] = await pool.query(
      'INSERT INTO maintenance_work_orders (wo_number, asset_id, pm_schedule_id, type, priority, title, description, assigned_to, reported_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [woNumber, asset_id, pm_schedule_id, type, priority, title, description, assigned_to, req.user?.username || 'system']
    );
    // Update asset status if emergency/corrective
    if (type === 'emergency' || type === 'corrective') {
      await pool.query('UPDATE equipment_assets SET status = ? WHERE id = ?', ['maintenance', asset_id]);
    }
    res.json({ id: result.insertId, wo_number: woNumber, message: 'Maintenance WO created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/work-orders/:id', async (req, res) => {
  try {
    const fields = req.body;
    // If completing, calculate costs and update PM schedule
    if (fields.status === 'completed') {
      fields.completed_at = new Date();
      // Calculate total cost
      const [parts] = await pool.query('SELECT COALESCE(SUM(quantity * unit_cost), 0) as total FROM maintenance_parts_used WHERE maintenance_wo_id = ?', [req.params.id]);
      fields.parts_cost = parts[0].total;
      fields.total_cost = parseFloat(fields.parts_cost) + parseFloat(fields.labor_cost || 0);
      // Update PM schedule next_due if linked
      const [wo] = await pool.query('SELECT pm_schedule_id, asset_id FROM maintenance_work_orders WHERE id = ?', [req.params.id]);
      if (wo[0]?.pm_schedule_id) {
        const [sched] = await pool.query('SELECT frequency_days FROM pm_schedules WHERE id = ?', [wo[0].pm_schedule_id]);
        if (sched.length && sched[0].frequency_days) {
          await pool.query('UPDATE pm_schedules SET last_completed = CURDATE(), next_due = DATE_ADD(CURDATE(), INTERVAL ? DAY) WHERE id = ?',
            [sched[0].frequency_days, wo[0].pm_schedule_id]);
        }
      }
      // Set asset back to operational
      if (wo[0]?.asset_id) {
        await pool.query('UPDATE equipment_assets SET status = ?, last_pm_date = CURDATE() WHERE id = ?', ['operational', wo[0].asset_id]);
      }
    }
    if (fields.status === 'in_progress' && !fields.started_at) {
      fields.started_at = new Date();
    }
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE maintenance_work_orders SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Work order updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate WO from PM schedule
router.post('/schedules/:id/generate-wo', async (req, res) => {
  try {
    const [schedules] = await pool.query(`SELECT ps.*, ea.name as asset_name FROM pm_schedules ps JOIN equipment_assets ea ON ps.asset_id = ea.id WHERE ps.id = ?`, [req.params.id]);
    if (!schedules.length) return res.status(404).json({ error: 'Schedule not found' });
    const sched = schedules[0];
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM maintenance_work_orders');
    const woNumber = `MWO-${String(count[0].cnt + 1).padStart(5, '0')}`;
    const [result] = await pool.query(
      'INSERT INTO maintenance_work_orders (wo_number, asset_id, pm_schedule_id, type, priority, title, description, reported_by) VALUES (?,?,?,?,?,?,?,?)',
      [woNumber, sched.asset_id, sched.id, 'preventive', sched.priority, `PM: ${sched.schedule_name} - ${sched.asset_name}`, sched.task_description, 'system']
    );
    res.json({ id: result.insertId, wo_number: woNumber, message: 'PM Work Order generated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SPARE PARTS ============
router.get('/parts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spare_parts ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/parts', async (req, res) => {
  try {
    const { part_number, name, category, qty_on_hand, reorder_point, reorder_qty, unit_cost, supplier, lead_time_days, location } = req.body;
    const [result] = await pool.query(
      'INSERT INTO spare_parts (part_number, name, category, qty_on_hand, reorder_point, reorder_qty, unit_cost, supplier, lead_time_days, location) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [part_number, name, category, qty_on_hand, reorder_point, reorder_qty, unit_cost, supplier, lead_time_days, location]
    );
    res.json({ id: result.insertId, message: 'Part added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/parts/:id', async (req, res) => {
  try {
    const fields = req.body;
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE spare_parts SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Part updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Use part on a maintenance WO
router.post('/work-orders/:id/use-part', async (req, res) => {
  try {
    const { spare_part_id, quantity } = req.body;
    const [part] = await pool.query('SELECT * FROM spare_parts WHERE id = ?', [spare_part_id]);
    if (!part.length) return res.status(404).json({ error: 'Part not found' });
    await pool.query('INSERT INTO maintenance_parts_used (maintenance_wo_id, spare_part_id, quantity, unit_cost) VALUES (?,?,?,?)',
      [req.params.id, spare_part_id, quantity, part[0].unit_cost]);
    await pool.query('UPDATE spare_parts SET qty_on_hand = qty_on_hand - ?, last_used_date = CURDATE() WHERE id = ?', [quantity, spare_part_id]);
    res.json({ message: 'Part used and inventory updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ DOWNTIME LOG ============
router.post('/downtime', async (req, res) => {
  try {
    const { asset_id, maintenance_wo_id, reason, started_at, ended_at, notes } = req.body;
    let duration = null;
    if (started_at && ended_at) {
      duration = Math.round((new Date(ended_at) - new Date(started_at)) / 60000);
    }
    const [result] = await pool.query(
      'INSERT INTO equipment_downtime_log (asset_id, maintenance_wo_id, reason, started_at, ended_at, duration_minutes, notes) VALUES (?,?,?,?,?,?,?)',
      [asset_id, maintenance_wo_id, reason, started_at, ended_at, duration, notes]
    );
    res.json({ id: result.insertId, message: 'Downtime logged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/downtime', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT edl.*, ea.name as asset_name, ea.asset_code 
      FROM equipment_downtime_log edl JOIN equipment_assets ea ON edl.asset_id = ea.id 
      ORDER BY edl.started_at DESC LIMIT 50`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
