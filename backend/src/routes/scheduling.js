const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/scheduling/entries - Get schedule entries for Gantt
router.get('/entries', async (req, res) => {
  try {
    const { start_date, end_date, work_center_id, status } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND pse.scheduled_end >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pse.scheduled_start <= ?'; params.push(end_date); }
    if (work_center_id) { where += ' AND pse.work_center_id = ?'; params.push(work_center_id); }
    if (status) { where += ' AND pse.status = ?'; params.push(status); }
    const [rows] = await pool.query(`
      SELECT pse.*, wo.order_number as wo_number, wo.description as product_description, wo.quantity as wo_quantity, 
             wc.name as work_center_name, wc.code as work_center_code
      FROM production_schedule_entries pse
      LEFT JOIN work_orders wo ON pse.work_order_id = wo.id
      LEFT JOIN work_centers wc ON pse.work_center_id = wc.id
      WHERE ${where}
      ORDER BY pse.scheduled_start
    `, params);
    res.json({ entries: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scheduling/entries - Create schedule entry
router.post('/entries', async (req, res) => {
  try {
    const { work_order_id, work_center_id, routing_step_id, title, scheduled_start, scheduled_end, duration_hours, priority, assigned_to, color, notes, dependencies } = req.body;
    // Check capacity
    if (work_center_id && scheduled_start) {
      const startDate = new Date(scheduled_start);
      const dayOfWeek = startDate.getDay() || 7; // 1=Mon...7=Sun
      const [capacity] = await pool.query('SELECT * FROM work_center_capacity WHERE work_center_id = ? AND day_of_week = ? AND is_available = 1', [work_center_id, dayOfWeek]);
      if (!capacity.length) {
        return res.status(400).json({ error: 'Work center not available on this day' });
      }
      // Check for overrides
      const dateStr = startDate.toISOString().split('T')[0];
      const [overrides] = await pool.query('SELECT * FROM capacity_overrides WHERE work_center_id = ? AND override_date = ? AND is_closed = 1', [work_center_id, dateStr]);
      if (overrides.length) {
        return res.status(400).json({ error: `Work center closed on ${dateStr}: ${overrides[0].reason || 'No reason given'}` });
      }
    }
    const [result] = await pool.query('INSERT INTO production_schedule_entries (work_order_id, work_center_id, routing_step_id, title, scheduled_start, scheduled_end, duration_hours, priority, assigned_to, color, notes, dependencies, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [work_order_id, work_center_id, routing_step_id, title, scheduled_start, scheduled_end, duration_hours, priority || 5, assigned_to, color, notes, JSON.stringify(dependencies || []), 'scheduled']);
    res.json({ id: result.insertId, message: 'Schedule entry created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scheduling/entries/:id - Update entry (drag & drop)
router.put('/entries/:id', async (req, res) => {
  try {
    const { scheduled_start, scheduled_end, work_center_id, status, priority, assigned_to, color, notes } = req.body;
    const updates = [];
    const values = [];
    if (scheduled_start !== undefined) { updates.push('scheduled_start = ?'); values.push(scheduled_start); }
    if (scheduled_end !== undefined) { updates.push('scheduled_end = ?'); values.push(scheduled_end); }
    if (work_center_id !== undefined) { updates.push('work_center_id = ?'); values.push(work_center_id); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (status === 'in-progress' && !req.body.actual_start) { updates.push('actual_start = NOW()'); }
    if (status === 'completed') { updates.push('actual_end = NOW()'); }
    if (updates.length) {
      values.push(req.params.id);
      await pool.query(`UPDATE production_schedule_entries SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    res.json({ message: 'Entry updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scheduling/entries/:id
router.delete('/entries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM production_schedule_entries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scheduling/auto-schedule/:woId - Auto-schedule a work order
router.post('/auto-schedule/:woId', async (req, res) => {
  try {
    const [wos] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [req.params.woId]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];
    // Get routing steps
    const [routing] = await pool.query('SELECT wr.*, wc.name as work_center_name FROM wo_routing wr LEFT JOIN work_centers wc ON wr.work_center_id = wc.id WHERE wr.work_order_id = ? ORDER BY wr.sequence', [req.params.woId]);
    if (!routing.length) return res.status(400).json({ error: 'No routing steps defined for this work order' });
    // Delete existing schedule entries for this WO
    await pool.query('DELETE FROM production_schedule_entries WHERE work_order_id = ?', [req.params.woId]);
    let currentStart = new Date();
    currentStart.setHours(7, 0, 0, 0);
    if (currentStart < new Date()) {
      currentStart.setDate(currentStart.getDate() + 1);
    }
    const entries = [];
    for (const step of routing) {
      const hours = parseFloat(step.run_hours_estimated) || parseFloat(step.setup_hours_estimated) || 2;
      const end = new Date(currentStart.getTime() + hours * 3600000);
      const [result] = await pool.query('INSERT INTO production_schedule_entries (work_order_id, work_center_id, routing_step_id, title, scheduled_start, scheduled_end, duration_hours, status, color) VALUES (?,?,?,?,?,?,?,?,?)',
        [req.params.woId, step.work_center_id, step.id, `${wo.order_number} - ${step.operation_description || step.sequence}`, currentStart, end, hours, 'scheduled', step.work_center_id ? null : '#6366f1']);
      entries.push({ id: result.insertId, step: step.step_number, start: currentStart, end });
      currentStart = new Date(end.getTime() + 1800000); // 30 min gap
    }
    res.json({ message: `Auto-scheduled ${entries.length} steps`, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scheduling/capacity - Get work center capacity overview
router.get('/capacity', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(targetDate).getDay() || 7;
    const [capacity] = await pool.query(`
      SELECT wc.id, wc.name, wc.code, wcc.capacity_hours, wcc.max_concurrent_jobs, wcc.shift_start, wcc.shift_end,
        COALESCE(co.capacity_hours, wcc.capacity_hours) as effective_capacity,
        co.is_closed, co.reason as override_reason,
        (SELECT COALESCE(SUM(pse.duration_hours), 0) FROM production_schedule_entries pse WHERE pse.work_center_id = wc.id AND DATE(pse.scheduled_start) = ?) as scheduled_hours
      FROM work_centers wc
      LEFT JOIN work_center_capacity wcc ON wc.id = wcc.work_center_id AND wcc.day_of_week = ?
      LEFT JOIN capacity_overrides co ON wc.id = co.work_center_id AND co.override_date = ?
      WHERE wc.is_active = 1
      ORDER BY wc.name
    `, [targetDate, dayOfWeek, targetDate]);
    res.json({ capacity, date: targetDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scheduling/capacity/:workCenterId - Update capacity settings
router.put('/capacity/:workCenterId', async (req, res) => {
  try {
    const { schedules } = req.body; // Array of { day_of_week, shift_start, shift_end, capacity_hours, max_concurrent_jobs, is_available }
    if (schedules && schedules.length) {
      for (const s of schedules) {
        const [existing] = await pool.query('SELECT id FROM work_center_capacity WHERE work_center_id = ? AND day_of_week = ?', [req.params.workCenterId, s.day_of_week]);
        if (existing.length) {
          await pool.query('UPDATE work_center_capacity SET shift_start=?, shift_end=?, capacity_hours=?, max_concurrent_jobs=?, is_available=? WHERE id=?',
            [s.shift_start, s.shift_end, s.capacity_hours, s.max_concurrent_jobs, s.is_available ? 1 : 0, existing[0].id]);
        } else {
          await pool.query('INSERT INTO work_center_capacity (work_center_id, day_of_week, shift_start, shift_end, capacity_hours, max_concurrent_jobs, is_available) VALUES (?,?,?,?,?,?,?)',
            [req.params.workCenterId, s.day_of_week, s.shift_start, s.shift_end, s.capacity_hours, s.max_concurrent_jobs, s.is_available ? 1 : 0]);
        }
      }
    }
    res.json({ message: 'Capacity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scheduling/capacity/override - Add capacity override (holiday, maintenance)
router.post('/capacity/override', async (req, res) => {
  try {
    const { work_center_id, override_date, capacity_hours, is_closed, reason } = req.body;
    await pool.query('INSERT INTO capacity_overrides (work_center_id, override_date, capacity_hours, is_closed, reason) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE capacity_hours=?, is_closed=?, reason=?',
      [work_center_id, override_date, capacity_hours, is_closed ? 1 : 0, reason, capacity_hours, is_closed ? 1 : 0, reason]);
    res.json({ message: 'Override saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
