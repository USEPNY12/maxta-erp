/**
 * Time & Attendance Module
 * =========================
 * Punch clock, shift management, attendance reports, utilization tracking
 * Integrates with Kiosk Mode for shop floor time entry
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
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_number VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        department ENUM('production','shipping','office','sales','management','maintenance') DEFAULT 'production',
        position VARCHAR(100),
        hourly_rate DECIMAL(8,2),
        shift ENUM('day','evening','night','flex') DEFAULT 'day',
        hire_date DATE,
        status ENUM('active','inactive','terminated') DEFAULT 'active',
        pin_code VARCHAR(10),
        badge_id VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(200),
        emergency_contact VARCHAR(200),
        emergency_phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_punches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        punch_type ENUM('clock_in','clock_out','break_start','break_end') NOT NULL,
        punch_time DATETIME NOT NULL,
        source ENUM('kiosk','web','mobile','manual') DEFAULT 'web',
        station VARCHAR(100),
        notes TEXT,
        edited BOOLEAN DEFAULT FALSE,
        edited_by VARCHAR(100),
        original_time DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        work_date DATE NOT NULL,
        clock_in DATETIME,
        clock_out DATETIME,
        break_minutes INT DEFAULT 0,
        total_hours DECIMAL(5,2) DEFAULT 0,
        overtime_hours DECIMAL(5,2) DEFAULT 0,
        status ENUM('open','closed','approved','disputed') DEFAULT 'open',
        work_order_id INT,
        department VARCHAR(50),
        notes TEXT,
        approved_by VARCHAR(100),
        approved_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shift_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shift_name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_duration_mins INT DEFAULT 30,
        days_of_week JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_exceptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        exception_date DATE NOT NULL,
        exception_type ENUM('absent','late','early_leave','no_show','excused','vacation','sick','holiday') NOT NULL,
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed employees and shifts
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM employees');
    if (existing[0].cnt === 0) {
      await pool.query(`INSERT INTO employees (employee_number, first_name, last_name, department, position, hourly_rate, shift, pin_code) VALUES
        ('EMP-001', 'John', 'Smith', 'production', 'CNC Operator', 28.50, 'day', '1234'),
        ('EMP-002', 'Maria', 'Garcia', 'production', 'Tempering Operator', 30.00, 'day', '2345'),
        ('EMP-003', 'James', 'Wilson', 'production', 'Edge Polisher', 26.00, 'day', '3456'),
        ('EMP-004', 'Sarah', 'Johnson', 'production', 'Lamination Tech', 29.00, 'day', '4567'),
        ('EMP-005', 'Robert', 'Brown', 'shipping', 'Shipping Lead', 27.00, 'day', '5678'),
        ('EMP-006', 'Lisa', 'Davis', 'office', 'Sales Coordinator', 25.00, 'day', '6789'),
        ('EMP-007', 'Mike', 'Taylor', 'production', 'Waterjet Operator', 31.00, 'day', '7890'),
        ('EMP-008', 'Amy', 'Martinez', 'production', 'QC Inspector', 27.50, 'day', '8901'),
        ('EMP-009', 'Tom', 'Anderson', 'maintenance', 'Maintenance Tech', 32.00, 'day', '9012'),
        ('EMP-010', 'Chris', 'Thomas', 'shipping', 'Rack Builder', 24.00, 'day', '0123')
      `);
      await pool.query(`INSERT INTO shift_schedules (shift_name, start_time, end_time, break_duration_mins, days_of_week) VALUES
        ('Day Shift', '06:00:00', '14:30:00', 30, '["Mon","Tue","Wed","Thu","Fri"]'),
        ('Evening Shift', '14:00:00', '22:30:00', 30, '["Mon","Tue","Wed","Thu","Fri"]'),
        ('Weekend Shift', '07:00:00', '17:30:00', 60, '["Sat","Sun"]')
      `);
    }
    res.json({ message: 'Time & Attendance schema created and seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DASHBOARD ============
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [employees] = await pool.query('SELECT * FROM employees WHERE status = ? ORDER BY last_name', ['active']);
    const [todayPunches] = await pool.query(`SELECT tp.*, e.first_name, e.last_name, e.employee_number, e.department
      FROM time_punches tp JOIN employees e ON tp.employee_id = e.id 
      WHERE DATE(tp.punch_time) = ? ORDER BY tp.punch_time DESC`, [today]);
    
    // Who's currently clocked in
    const [clockedIn] = await pool.query(`
      SELECT e.*, tp.punch_time as clock_in_time, tp.station
      FROM employees e
      INNER JOIN time_punches tp ON e.id = tp.employee_id
      WHERE tp.id = (SELECT MAX(id) FROM time_punches WHERE employee_id = e.id)
      AND tp.punch_type = 'clock_in'
      AND DATE(tp.punch_time) = ?
      AND e.status = 'active'
    `, [today]);
    
    const [shifts] = await pool.query('SELECT * FROM shift_schedules WHERE is_active = 1');
    const [weekEntries] = await pool.query(`SELECT te.*, e.first_name, e.last_name, e.employee_number 
      FROM time_entries te JOIN employees e ON te.employee_id = e.id 
      WHERE te.work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ORDER BY te.work_date DESC, e.last_name`);
    const [exceptions] = await pool.query(`SELECT ae.*, e.first_name, e.last_name 
      FROM attendance_exceptions ae JOIN employees e ON ae.employee_id = e.id 
      WHERE ae.exception_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ORDER BY ae.exception_date DESC`);
    const [stats] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM employees WHERE status = 'active') as total_employees,
      (SELECT COUNT(DISTINCT employee_id) FROM time_punches WHERE DATE(punch_time) = CURDATE() AND punch_type = 'clock_in') as clocked_in_today,
      (SELECT COALESCE(SUM(total_hours), 0) FROM time_entries WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as weekly_hours,
      (SELECT COALESCE(SUM(overtime_hours), 0) FROM time_entries WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as weekly_overtime,
      (SELECT COUNT(*) FROM attendance_exceptions WHERE exception_date = CURDATE()) as today_exceptions
    `);
    res.json({ employees, todayPunches, clockedIn, shifts, weekEntries, exceptions, stats: stats[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ PUNCH CLOCK ============
router.post('/punch', async (req, res) => {
  try {
    const { employee_id, punch_type, station, pin_code, notes } = req.body;
    
    // Verify PIN if provided
    if (pin_code) {
      const [emp] = await pool.query('SELECT id, pin_code FROM employees WHERE id = ?', [employee_id]);
      if (!emp.length || emp[0].pin_code !== pin_code) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }
    
    const punchTime = new Date();
    const [result] = await pool.query(
      'INSERT INTO time_punches (employee_id, punch_type, punch_time, source, station, notes) VALUES (?,?,?,?,?,?)',
      [employee_id, punch_type, punchTime, req.body.source || 'web', station, notes]
    );
    
    // Auto-create/update time entry
    const workDate = punchTime.toISOString().split('T')[0];
    if (punch_type === 'clock_in') {
      // Check if entry exists for today
      const [existing] = await pool.query('SELECT id FROM time_entries WHERE employee_id = ? AND work_date = ?', [employee_id, workDate]);
      if (!existing.length) {
        await pool.query('INSERT INTO time_entries (employee_id, work_date, clock_in, status) VALUES (?,?,?,?)',
          [employee_id, workDate, punchTime, 'open']);
      }
    } else if (punch_type === 'clock_out') {
      // Update time entry with clock out and calculate hours
      const [entry] = await pool.query('SELECT * FROM time_entries WHERE employee_id = ? AND work_date = ? AND status = ?', [employee_id, workDate, 'open']);
      if (entry.length) {
        const clockIn = new Date(entry[0].clock_in);
        const totalMins = (punchTime - clockIn) / 60000;
        const breakMins = entry[0].break_minutes || 0;
        const totalHours = Math.round(((totalMins - breakMins) / 60) * 100) / 100;
        const overtime = Math.max(0, totalHours - 8);
        await pool.query('UPDATE time_entries SET clock_out = ?, total_hours = ?, overtime_hours = ?, status = ? WHERE id = ?',
          [punchTime, totalHours, overtime, 'closed', entry[0].id]);
      }
    }
    
    const [emp] = await pool.query('SELECT first_name, last_name FROM employees WHERE id = ?', [employee_id]);
    res.json({ 
      id: result.insertId, 
      message: `${emp[0]?.first_name} ${emp[0]?.last_name} - ${punch_type.replace('_', ' ')} recorded at ${punchTime.toLocaleTimeString()}` 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quick punch by PIN (for kiosk)
router.post('/punch-by-pin', async (req, res) => {
  try {
    const { pin_code, station } = req.body;
    const [emp] = await pool.query('SELECT * FROM employees WHERE pin_code = ? AND status = ?', [pin_code, 'active']);
    if (!emp.length) return res.status(401).json({ error: 'Invalid PIN code' });
    
    const employee = emp[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Determine punch type based on last punch
    const [lastPunch] = await pool.query(
      'SELECT punch_type FROM time_punches WHERE employee_id = ? AND DATE(punch_time) = ? ORDER BY punch_time DESC LIMIT 1',
      [employee.id, today]
    );
    
    let punchType = 'clock_in';
    if (lastPunch.length) {
      if (lastPunch[0].punch_type === 'clock_in') punchType = 'clock_out';
      else if (lastPunch[0].punch_type === 'clock_out') punchType = 'clock_in';
      else if (lastPunch[0].punch_type === 'break_start') punchType = 'break_end';
    }
    
    // Delegate to main punch endpoint
    req.body = { employee_id: employee.id, punch_type: punchType, station, source: 'kiosk' };
    const punchTime = new Date();
    const [result] = await pool.query(
      'INSERT INTO time_punches (employee_id, punch_type, punch_time, source, station) VALUES (?,?,?,?,?)',
      [employee.id, punchType, punchTime, 'kiosk', station]
    );
    
    // Handle time entry same as above
    const workDate = punchTime.toISOString().split('T')[0];
    if (punchType === 'clock_in') {
      const [existing] = await pool.query('SELECT id FROM time_entries WHERE employee_id = ? AND work_date = ?', [employee.id, workDate]);
      if (!existing.length) {
        await pool.query('INSERT INTO time_entries (employee_id, work_date, clock_in, status) VALUES (?,?,?,?)',
          [employee.id, workDate, punchTime, 'open']);
      }
    } else if (punchType === 'clock_out') {
      const [entry] = await pool.query('SELECT * FROM time_entries WHERE employee_id = ? AND work_date = ? AND status = ?', [employee.id, workDate, 'open']);
      if (entry.length) {
        const clockIn = new Date(entry[0].clock_in);
        const totalMins = (punchTime - clockIn) / 60000;
        const breakMins = entry[0].break_minutes || 0;
        const totalHours = Math.round(((totalMins - breakMins) / 60) * 100) / 100;
        const overtime = Math.max(0, totalHours - 8);
        await pool.query('UPDATE time_entries SET clock_out = ?, total_hours = ?, overtime_hours = ?, status = ? WHERE id = ?',
          [punchTime, totalHours, overtime, 'closed', entry[0].id]);
      }
    }
    
    res.json({ 
      employee_name: `${employee.first_name} ${employee.last_name}`,
      punch_type: punchType,
      time: punchTime.toLocaleTimeString(),
      message: `${employee.first_name} ${employee.last_name} - ${punchType.replace('_', ' ')}` 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ EMPLOYEES ============
router.get('/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY last_name, first_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/employees', async (req, res) => {
  try {
    const { employee_number, first_name, last_name, department, position, hourly_rate, shift, pin_code, phone, email } = req.body;
    const [result] = await pool.query(
      'INSERT INTO employees (employee_number, first_name, last_name, department, position, hourly_rate, shift, pin_code, phone, email) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [employee_number, first_name, last_name, department, position, hourly_rate, shift, pin_code, phone, email]
    );
    res.json({ id: result.insertId, message: 'Employee added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const fields = req.body;
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE employees SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Employee updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ TIME ENTRIES ============
router.get('/entries', async (req, res) => {
  try {
    const { employee_id, start_date, end_date, status } = req.query;
    let query = `SELECT te.*, e.first_name, e.last_name, e.employee_number, e.department, e.hourly_rate
      FROM time_entries te JOIN employees e ON te.employee_id = e.id WHERE 1=1`;
    const params = [];
    if (employee_id) { query += ' AND te.employee_id = ?'; params.push(employee_id); }
    if (start_date) { query += ' AND te.work_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND te.work_date <= ?'; params.push(end_date); }
    if (status) { query += ' AND te.status = ?'; params.push(status); }
    query += ' ORDER BY te.work_date DESC, e.last_name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/entries/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.status === 'approved') {
      fields.approved_by = req.user?.username || 'admin';
      fields.approved_at = new Date();
    }
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE time_entries SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Entry updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ REPORTS ============
router.get('/reports/weekly', async (req, res) => {
  try {
    const { week_start } = req.query;
    const startDate = week_start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [rows] = await pool.query(`
      SELECT e.employee_number, e.first_name, e.last_name, e.department, e.hourly_rate,
        SUM(te.total_hours) as total_hours,
        SUM(te.overtime_hours) as overtime_hours,
        COUNT(te.id) as days_worked,
        SUM(te.total_hours * e.hourly_rate) as regular_pay,
        SUM(te.overtime_hours * e.hourly_rate * 1.5) as overtime_pay
      FROM employees e
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.work_date BETWEEN ? AND ?
      WHERE e.status = 'active'
      GROUP BY e.id ORDER BY e.last_name
    `, [startDate, endDate]);
    res.json({ startDate, endDate, entries: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/utilization', async (req, res) => {
  try {
    // Compare paid hours vs hours logged on work orders
    const [rows] = await pool.query(`
      SELECT e.employee_number, e.first_name, e.last_name, e.department,
        COALESCE(SUM(te.total_hours), 0) as paid_hours,
        COALESCE((SELECT SUM(hours) FROM wo_labor WHERE employee_name = CONCAT(e.first_name, ' ', e.last_name) AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) as productive_hours
      FROM employees e
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE e.status = 'active' AND e.department = 'production'
      GROUP BY e.id ORDER BY e.last_name
    `);
    // Calculate utilization rate
    const enriched = rows.map(r => ({
      ...r,
      utilization_rate: r.paid_hours > 0 ? Math.round((r.productive_hours / r.paid_hours) * 100) : 0
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ EXCEPTIONS ============
router.post('/exceptions', async (req, res) => {
  try {
    const { employee_id, exception_date, exception_type, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO attendance_exceptions (employee_id, exception_date, exception_type, notes, created_by) VALUES (?,?,?,?,?)',
      [employee_id, exception_date, exception_type, notes, req.user?.username || 'admin']
    );
    res.json({ id: result.insertId, message: 'Exception recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
