const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════
// FINITE CAPACITY SCHEDULING - Gantt Data API
// ═══════════════════════════════════════════════════════════════════

// GET /api/manufacturing-advanced/schedule/gantt - Get Gantt chart data
router.get('/schedule/gantt', async (req, res) => {
  try {
    const { start_date, end_date, work_center_id } = req.query;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    let blockQuery = `SELECT sb.*, wc.name as work_center_name, wc.code as work_center_code, wc.color,
      wo.order_number as wo_number, wo.product_type, wo.description as wo_description
      FROM scheduling_blocks sb
      LEFT JOIN work_centers wc ON sb.work_center_id = wc.id
      LEFT JOIN work_orders wo ON sb.work_order_id = wo.id
      WHERE sb.block_start >= ? AND sb.block_end <= ?`;
    const params = [startDate, endDate + ' 23:59:59'];
    
    if (work_center_id) {
      blockQuery += ' AND sb.work_center_id = ?';
      params.push(work_center_id);
    }
    blockQuery += ' ORDER BY sb.work_center_id, sb.block_start';

    const [blocks] = await pool.query(blockQuery, params);

    // Get work centers for lanes
    const [workCenters] = await pool.query(
      'SELECT id, code, name, color, available_hours_per_day, num_machines, scheduling_type FROM work_centers WHERE is_active = 1 ORDER BY sequence_order'
    );

    // Get capacity for the date range
    const [capacity] = await pool.query(
      'SELECT * FROM work_center_capacity WHERE is_available = 1 ORDER BY work_center_id, day_of_week'
    );

    // Get constraints
    const [constraints] = await pool.query(
      'SELECT * FROM scheduling_constraints WHERE is_active = 1'
    );

    res.json({ blocks, workCenters, capacity, constraints, dateRange: { start: startDate, end: endDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/schedule/auto-schedule - Auto-schedule unscheduled WOs
router.post('/schedule/auto-schedule', async (req, res) => {
  try {
    const { work_order_ids, start_date } = req.body;
    const scheduleStart = start_date ? new Date(start_date) : new Date();
    
    // Get unscheduled work orders with routing
    let woQuery = `SELECT wo.id, wo.order_number as wo_number, wo.quantity, wo.requested_date, wo.priority,
      wr.id as routing_id, wr.sequence, wr.work_center_id, wr.setup_hours_estimated, wr.run_hours_estimated,
      wc.available_hours_per_day, wc.num_machines, wc.scheduling_type
      FROM work_orders wo
      JOIN wo_routing wr ON wo.id = wr.work_order_id
      JOIN work_centers wc ON wr.work_center_id = wc.id
      WHERE wo.status IN ('planned','released') AND wr.status = 'pending'`;
    
    if (work_order_ids && work_order_ids.length > 0) {
      woQuery += ` AND wo.id IN (${work_order_ids.map(() => '?').join(',')})`;
    }
    woQuery += ' ORDER BY wo.priority DESC, wo.requested_date ASC, wr.sequence ASC';

    const [operations] = await pool.query(woQuery, work_order_ids || []);

    // Get existing blocks to avoid conflicts
    const [existingBlocks] = await pool.query(
      'SELECT * FROM scheduling_blocks WHERE status IN (\'planned\',\'confirmed\',\'in_progress\') AND block_end > ? ORDER BY work_center_id, block_start',
      [scheduleStart]
    );

    // Get constraints
    const [constraints] = await pool.query('SELECT * FROM scheduling_constraints WHERE is_active = 1');

    // Simple forward scheduling algorithm
    const wcNextAvailable = {}; // track next available time per work center
    const scheduledBlocks = [];

    for (const op of operations) {
      const wcId = op.work_center_id;
      let totalHours = parseFloat(op.setup_hours_estimated || 0) + parseFloat(op.run_hours_estimated || 0);
      if (totalHours === 0) totalHours = 1; // Default 1 hour for unestimated operations

      // Find next available slot for this work center
      if (!wcNextAvailable[wcId]) {
        // Check existing blocks for this WC
        const wcBlocks = existingBlocks.filter(b => b.work_center_id === wcId);
        if (wcBlocks.length > 0) {
          wcNextAvailable[wcId] = new Date(wcBlocks[wcBlocks.length - 1].block_end);
        } else {
          wcNextAvailable[wcId] = new Date(scheduleStart);
        }
      }

      // Ensure we start during working hours (7am-3:30pm)
      let blockStart = new Date(wcNextAvailable[wcId]);
      const startHour = blockStart.getHours();
      if (startHour < 7) { blockStart.setHours(7, 0, 0, 0); }
      else if (startHour >= 15 || (startHour === 15 && blockStart.getMinutes() > 30)) {
        blockStart.setDate(blockStart.getDate() + 1);
        blockStart.setHours(7, 0, 0, 0);
      }
      // Skip weekends
      while (blockStart.getDay() === 0 || blockStart.getDay() === 6) {
        blockStart.setDate(blockStart.getDate() + 1);
      }

      const blockEnd = new Date(blockStart.getTime() + totalHours * 3600000);

      // Insert scheduling block
      const [result] = await pool.query(
        `INSERT INTO scheduling_blocks (work_center_id, work_order_id, wo_routing_id, block_start, block_end, block_type, status)
         VALUES (?, ?, ?, ?, ?, 'production', 'planned')`,
        [wcId, op.id, op.routing_id, blockStart, blockEnd]
      );

      scheduledBlocks.push({
        id: result.insertId,
        work_center_id: wcId,
        work_order_id: op.id,
        wo_routing_id: op.routing_id,
        block_start: blockStart,
        block_end: blockEnd,
        wo_number: op.wo_number
      });

      // Update next available for this WC
      wcNextAvailable[wcId] = blockEnd;
    }

    res.json({ scheduled: scheduledBlocks.length, blocks: scheduledBlocks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manufacturing-advanced/schedule/blocks/:id - Move/resize a scheduling block (drag & drop)
router.put('/schedule/blocks/:id', async (req, res) => {
  try {
    const { block_start, block_end, work_center_id, status } = req.body;
    const updates = [];
    const params = [];
    if (block_start) { updates.push('block_start = ?'); params.push(block_start); }
    if (block_end) { updates.push('block_end = ?'); params.push(block_end); }
    if (work_center_id) { updates.push('work_center_id = ?'); params.push(work_center_id); }
    if (status) { updates.push('status = ?'); params.push(status); }
    params.push(req.params.id);

    await pool.query(`UPDATE scheduling_blocks SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/manufacturing-advanced/schedule/blocks/:id
router.delete('/schedule/blocks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM scheduling_blocks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/schedule/capacity - Get capacity utilization by date range
router.get('/schedule/capacity', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const [utilization] = await pool.query(`
      SELECT wc.id, wc.code, wc.name, wc.available_hours_per_day, wc.num_machines,
        COALESCE(SUM(TIMESTAMPDIFF(MINUTE, sb.block_start, sb.block_end)) / 60, 0) as scheduled_hours,
        (wc.available_hours_per_day * wc.num_machines * DATEDIFF(?, ?) ) as total_capacity_hours
      FROM work_centers wc
      LEFT JOIN scheduling_blocks sb ON wc.id = sb.work_center_id 
        AND sb.block_start >= ? AND sb.block_end <= ?
        AND sb.status IN ('planned','confirmed','in_progress')
      WHERE wc.is_active = 1
      GROUP BY wc.id
      ORDER BY wc.sequence_order`,
      [endDate, startDate, startDate, endDate + ' 23:59:59']
    );

    res.json(utilization.map(u => ({
      ...u,
      utilization_percent: u.total_capacity_hours > 0 
        ? Math.round((u.scheduled_hours / u.total_capacity_hours) * 100) 
        : 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// MACHINE UTILIZATION & DOWNTIME
// ═══════════════════════════════════════════════════════════════════

// GET /api/manufacturing-advanced/utilization - Get utilization logs
router.get('/utilization', async (req, res) => {
  try {
    const { work_center_id, start_date, end_date } = req.query;
    let query = `SELECT mul.*, wc.name as work_center_name, wc.code as work_center_code
      FROM machine_utilization_log mul
      JOIN work_centers wc ON mul.work_center_id = wc.id
      WHERE 1=1`;
    const params = [];

    if (work_center_id) { query += ' AND mul.work_center_id = ?'; params.push(work_center_id); }
    if (start_date) { query += ' AND mul.log_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND mul.log_date <= ?'; params.push(end_date); }
    query += ' ORDER BY mul.log_date DESC, mul.work_center_id LIMIT 200';

    const [logs] = await pool.query(query, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/utilization - Log utilization entry
router.post('/utilization', async (req, res) => {
  try {
    const { work_center_id, log_date, shift, available_hours, productive_hours, setup_hours, idle_hours, downtime_hours, total_pieces_produced, total_sqft_produced, scrap_pieces, operator_id, notes } = req.body;
    
    const efficiency = available_hours > 0 ? ((productive_hours / available_hours) * 100).toFixed(2) : 0;
    const quality_rate = total_pieces_produced > 0 ? (((total_pieces_produced - (scrap_pieces || 0)) / total_pieces_produced) * 100) : 100;
    const availability = available_hours > 0 ? (((available_hours - (downtime_hours || 0)) / available_hours) * 100) : 100;
    const performance = available_hours > 0 ? ((productive_hours / (available_hours - (downtime_hours || 0))) * 100) : 0;
    const oee = ((availability / 100) * (performance / 100) * (quality_rate / 100) * 100).toFixed(2);

    const [result] = await pool.query(
      `INSERT INTO machine_utilization_log (work_center_id, log_date, shift, available_hours, productive_hours, setup_hours, idle_hours, downtime_hours, total_pieces_produced, total_sqft_produced, scrap_pieces, efficiency_percent, oee_percent, operator_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [work_center_id, log_date, shift || 'day', available_hours || 8, productive_hours || 0, setup_hours || 0, idle_hours || 0, downtime_hours || 0, total_pieces_produced || 0, total_sqft_produced || 0, scrap_pieces || 0, efficiency, oee, operator_id, notes]
    );
    res.json({ id: result.insertId, efficiency_percent: efficiency, oee_percent: oee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/utilization/summary - OEE summary by work center
router.get('/utilization/summary', async (req, res) => {
  try {
    const { days } = req.query;
    const lookback = days || 30;
    const [summary] = await pool.query(`
      SELECT wc.id, wc.code, wc.name, wc.color,
        COUNT(mul.id) as total_shifts,
        ROUND(AVG(mul.efficiency_percent), 1) as avg_efficiency,
        ROUND(AVG(mul.oee_percent), 1) as avg_oee,
        SUM(mul.productive_hours) as total_productive_hours,
        SUM(mul.downtime_hours) as total_downtime_hours,
        SUM(mul.total_pieces_produced) as total_pieces,
        SUM(mul.scrap_pieces) as total_scrap,
        ROUND(SUM(mul.scrap_pieces) / NULLIF(SUM(mul.total_pieces_produced), 0) * 100, 2) as scrap_rate
      FROM work_centers wc
      LEFT JOIN machine_utilization_log mul ON wc.id = mul.work_center_id 
        AND mul.log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      WHERE wc.is_active = 1
      GROUP BY wc.id
      ORDER BY wc.sequence_order`, [lookback]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/downtime - Get downtime events
router.get('/downtime', async (req, res) => {
  try {
    const { work_center_id, start_date, end_date, reason_code } = req.query;
    let query = `SELECT md.*, wc.name as work_center_name, wc.code as work_center_code,
      wo.order_number as wo_number
      FROM machine_downtime md
      JOIN work_centers wc ON md.work_center_id = wc.id
      LEFT JOIN work_orders wo ON md.work_order_id = wo.id
      WHERE 1=1`;
    const params = [];

    if (work_center_id) { query += ' AND md.work_center_id = ?'; params.push(work_center_id); }
    if (start_date) { query += ' AND md.downtime_start >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND md.downtime_start <= ?'; params.push(end_date + ' 23:59:59'); }
    if (reason_code) { query += ' AND md.reason_code = ?'; params.push(reason_code); }
    query += ' ORDER BY md.downtime_start DESC LIMIT 100';

    const [events] = await pool.query(query, params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/downtime - Log downtime event
router.post('/downtime', async (req, res) => {
  try {
    const { work_center_id, work_order_id, downtime_start, downtime_end, reason_code, reason_detail, is_planned, severity } = req.body;
    
    let duration = null;
    if (downtime_start && downtime_end) {
      duration = (new Date(downtime_end) - new Date(downtime_start)) / 60000;
    }

    const [result] = await pool.query(
      `INSERT INTO machine_downtime (work_center_id, work_order_id, downtime_start, downtime_end, duration_minutes, reason_code, reason_detail, reported_by, is_planned, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [work_center_id, work_order_id, downtime_start, downtime_end, duration, reason_code, reason_detail, req.user.id, is_planned || false, severity || 'medium']
    );
    res.json({ id: result.insertId, duration_minutes: duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manufacturing-advanced/downtime/:id/resolve - Resolve downtime
router.put('/downtime/:id/resolve', async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    const endTime = new Date();
    
    const [dt] = await pool.query('SELECT downtime_start FROM machine_downtime WHERE id = ?', [req.params.id]);
    const duration = dt.length > 0 ? (endTime - new Date(dt[0].downtime_start)) / 60000 : null;

    await pool.query(
      'UPDATE machine_downtime SET downtime_end = ?, duration_minutes = ?, resolved_by = ?, resolution_notes = ? WHERE id = ?',
      [endTime, duration, req.user.id, resolution_notes, req.params.id]
    );
    res.json({ success: true, duration_minutes: duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/downtime/analysis - Pareto analysis of downtime
router.get('/downtime/analysis', async (req, res) => {
  try {
    const { days } = req.query;
    const lookback = days || 30;
    const [analysis] = await pool.query(`
      SELECT reason_code, COUNT(*) as event_count, 
        SUM(duration_minutes) as total_minutes,
        ROUND(AVG(duration_minutes), 1) as avg_minutes,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM machine_downtime
      WHERE downtime_start >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY reason_code
      ORDER BY total_minutes DESC`, [lookback]);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME PRODUCTION DASHBOARD
// ═══════════════════════════════════════════════════════════════════

// GET /api/manufacturing-advanced/dashboard - Live production dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Today's KPIs
    const today = new Date().toISOString().split('T')[0];
    
    const [todayWOs] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_wos,
        COUNT(CASE WHEN status = 'completed' AND DATE(updated_at) = CURDATE() THEN 1 END) as completed_today,
        COUNT(CASE WHEN status IN ('planned','released') THEN 1 END) as queued_wos,
        COUNT(CASE WHEN requested_date < CURDATE() AND status NOT IN ('completed','closed','cancelled') THEN 1 END) as overdue_wos,
        SUM(CASE WHEN status = 'completed' AND DATE(updated_at) = CURDATE() THEN quantity ELSE 0 END) as pieces_today
      FROM work_orders`);

    // Active operations by station
    const [stationActivity] = await pool.query(`
      SELECT wc.id, wc.code, wc.name, wc.color,
        COUNT(CASE WHEN wr.status = 'in_progress' THEN 1 END) as active_ops,
        COUNT(CASE WHEN wr.status = 'pending' THEN 1 END) as queued_ops,
        COUNT(CASE WHEN wr.status IN ('complete','completed') THEN 1 END) as completed_ops
      FROM work_centers wc
      LEFT JOIN wo_routing wr ON wc.id = wr.work_center_id
      WHERE wc.is_active = 1
      GROUP BY wc.id
      ORDER BY wc.sequence_order`);

    // Active downtime events
    const [activeDowntime] = await pool.query(`
      SELECT md.*, wc.name as work_center_name, wc.code as work_center_code
      FROM machine_downtime md
      JOIN work_centers wc ON md.work_center_id = wc.id
      WHERE md.downtime_end IS NULL
      ORDER BY md.downtime_start DESC`);

    // Today's utilization
    const [todayUtil] = await pool.query(`
      SELECT work_center_id, SUM(productive_hours) as productive, SUM(downtime_hours) as downtime,
        ROUND(AVG(oee_percent), 1) as oee
      FROM machine_utilization_log
      WHERE log_date = CURDATE()
      GROUP BY work_center_id`);

    // Recent completions (last 2 hours)
    const [recentCompletions] = await pool.query(`
      SELECT wr.id, wr.work_order_id, wo.order_number as wo_number, wc.name as station,
        wr.actual_finish, wr.quantity_completed
      FROM wo_routing wr
      JOIN work_orders wo ON wr.work_order_id = wo.id
      JOIN work_centers wc ON wr.work_center_id = wc.id
      WHERE wr.status IN ('complete','completed') AND wr.actual_finish >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      ORDER BY wr.actual_finish DESC LIMIT 20`);

    // Throughput trend (last 7 days)
    const [throughputTrend] = await pool.query(`
      SELECT DATE(wr.actual_finish) as day, COUNT(*) as operations_completed,
        SUM(wr.quantity_completed) as pieces
      FROM wo_routing wr
      WHERE wr.status IN ('complete','completed') AND wr.actual_finish >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(wr.actual_finish)
      ORDER BY day`);

    res.json({
      kpis: todayWOs[0],
      stationActivity,
      activeDowntime,
      todayUtilization: todayUtil,
      recentCompletions,
      throughputTrend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/dashboard/kpi-history - Historical KPIs
router.get('/dashboard/kpi-history', async (req, res) => {
  try {
    const { days } = req.query;
    const lookback = days || 30;
    const [kpis] = await pool.query(
      'SELECT * FROM production_kpis WHERE kpi_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY kpi_date DESC',
      [lookback]
    );
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/dashboard/snapshot - Generate daily KPI snapshot
router.post('/dashboard/snapshot', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [woData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'in_progress' AND DATE(updated_at) = CURDATE() THEN 1 END) as started,
        COUNT(CASE WHEN status = 'completed' AND DATE(updated_at) = CURDATE() THEN 1 END) as completed,
        SUM(CASE WHEN status = 'completed' AND DATE(updated_at) = CURDATE() THEN quantity ELSE 0 END) as pieces
      FROM work_orders`);

    const [scrapData] = await pool.query(`
      SELECT COALESCE(SUM(quantity_scrapped), 0) as scrap
      FROM wo_routing WHERE DATE(actual_finish) = CURDATE()`);

    const [onTimeData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN DATE(updated_at) <= requested_date THEN 1 END) as on_time,
        COUNT(*) as total
      FROM work_orders
      WHERE status = 'completed' AND DATE(updated_at) = CURDATE() AND requested_date IS NOT NULL`);

    const totalPieces = woData[0].pieces || 0;
    const scrap = scrapData[0].scrap || 0;
    const scrapRate = totalPieces > 0 ? (scrap / (totalPieces + scrap) * 100).toFixed(2) : 0;
    const onTimePercent = onTimeData[0].total > 0 ? (onTimeData[0].on_time / onTimeData[0].total * 100).toFixed(2) : 100;

    await pool.query(
      `INSERT INTO production_kpis (kpi_date, total_wo_started, total_wo_completed, total_pieces_produced, total_scrap_pieces, scrap_rate_percent, on_time_delivery_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_wo_started=VALUES(total_wo_started), total_wo_completed=VALUES(total_wo_completed), total_pieces_produced=VALUES(total_pieces_produced), total_scrap_pieces=VALUES(total_scrap_pieces), scrap_rate_percent=VALUES(scrap_rate_percent), on_time_delivery_percent=VALUES(on_time_delivery_percent)`,
      [today, woData[0].started || 0, woData[0].completed || 0, totalPieces, scrap, scrapRate, onTimePercent]
    );

    res.json({ date: today, wo_started: woData[0].started, wo_completed: woData[0].completed, pieces: totalPieces, scrap, scrap_rate: scrapRate, on_time: onTimePercent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// BARCODE SCANNING FOR WO OPERATIONS
// ═══════════════════════════════════════════════════════════════════

// POST /api/manufacturing-advanced/scan - Process a barcode scan
router.post('/scan', async (req, res) => {
  try {
    const { barcode, scan_type, work_center_id, quantity, metadata } = req.body;

    // Parse barcode - format: WO-XXXXX or WO-XXXXX-OP-XX
    let work_order_id = null;
    let wo_routing_id = null;
    let woNumber = null;

    if (barcode.startsWith('WO-')) {
      const parts = barcode.split('-');
      woNumber = `WO-${parts[1]}`;
      const [wo] = await pool.query('SELECT id, status FROM work_orders WHERE order_number = ?', [woNumber]);
      if (wo.length > 0) {
        work_order_id = wo[0].id;
        // If operation specified
        if (parts.length >= 4 && parts[2] === 'OP') {
          const opSeq = parseInt(parts[3]);
          const [routing] = await pool.query(
            'SELECT id FROM wo_routing WHERE work_order_id = ? AND sequence = ?',
            [work_order_id, opSeq]
          );
          if (routing.length > 0) wo_routing_id = routing[0].id;
        } else if (work_center_id) {
          // Find the current/next pending operation at this work center
          const [routing] = await pool.query(
            'SELECT id FROM wo_routing WHERE work_order_id = ? AND work_center_id = ? AND status IN (\'pending\',\'in_progress\') ORDER BY sequence LIMIT 1',
            [work_order_id, work_center_id]
          );
          if (routing.length > 0) wo_routing_id = routing[0].id;
        }
      }
    }

    // Log the scan
    const [scanResult] = await pool.query(
      `INSERT INTO barcode_scan_log (barcode, scan_type, work_order_id, wo_routing_id, work_center_id, operator_id, quantity, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [barcode, scan_type, work_order_id, wo_routing_id, work_center_id, req.user.id, quantity || 1, metadata ? JSON.stringify(metadata) : null]
    );

    // Perform action based on scan_type
    let actionResult = {};
    if (work_order_id && wo_routing_id) {
      switch (scan_type) {
        case 'wo_start':
        case 'station_in':
          await pool.query('UPDATE wo_routing SET status = \'in_progress\', actual_start = NOW() WHERE id = ? AND status = \'pending\'', [wo_routing_id]);
          await pool.query('UPDATE work_orders SET status = \'in_progress\' WHERE id = ? AND status IN (\'planned\',\'released\')', [work_order_id]);
          actionResult = { action: 'started', wo_number: woNumber };
          break;
        case 'wo_complete':
        case 'station_out':
          await pool.query('UPDATE wo_routing SET status = \'complete\', actual_finish = NOW(), quantity_completed = ? WHERE id = ?', [quantity || 1, wo_routing_id]);
          // --- AUTO-LOG LABOR: Calculate hours between station_in and station_out ---
          try {
            const [routingInfo] = await pool.query('SELECT actual_start, actual_finish, work_center_id FROM wo_routing WHERE id = ?', [wo_routing_id]);
            if (routingInfo.length > 0 && routingInfo[0].actual_start) {
              const startTime = new Date(routingInfo[0].actual_start);
              const endTime = routingInfo[0].actual_finish ? new Date(routingInfo[0].actual_finish) : new Date();
              const hoursWorked = Math.round(((endTime - startTime) / 3600000) * 100) / 100; // Round to 2 decimals
              if (hoursWorked > 0 && hoursWorked < 24) { // Sanity check: less than 24 hours
                await pool.query(
                  `INSERT INTO wo_labor (work_order_id, work_center_id, employee_id, wo_routing_id, work_date, hours_worked, hours, labor_type, notes, entered_by, created_at)
                   VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'run', 'Auto-logged from barcode scan station_in/station_out', ?, NOW())`,
                  [work_order_id, routingInfo[0].work_center_id || work_center_id, req.user.id, wo_routing_id, hoursWorked, hoursWorked, req.user.id]
                );
              }
            }
          } catch (laborErr) { console.error('[ScanIntegration] Labor auto-log error:', laborErr.message); }
          // Check if all operations complete
          const [remaining] = await pool.query(
            'SELECT COUNT(*) as cnt FROM wo_routing WHERE work_order_id = ? AND status NOT IN (\'complete\',\'completed\')',
            [work_order_id]
          );
          if (remaining[0].cnt === 0) {
            await pool.query('UPDATE work_orders SET status = \'completed\', completion_date = NOW() WHERE id = ?', [work_order_id]);
            actionResult = { action: 'wo_completed', wo_number: woNumber };
            // === BROADCAST: WO Completed from Barcode Station ===
            if (global.wsBroadcast) {
              global.wsBroadcast('wo_completed', { wo: woNumber, wo_id: work_order_id, station: 'barcode_station', user_id: req.user.id });
            }
            // --- NOTIFICATION ---
            try { await pool.query(`INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at) VALUES ('wo_completed', ?, 1, ?, NOW())`, [`WO ${woNumber} completed via barcode station scan`, JSON.stringify({ wo_id: work_order_id, wo_number: woNumber, user_id: req.user.id })]); } catch (e) {}
          } else {
            actionResult = { action: 'operation_completed', wo_number: woNumber, remaining_ops: remaining[0].cnt };
            // === BROADCAST: Operation completed ===
            if (global.wsBroadcast) {
              global.wsBroadcast('operation_completed', { wo: woNumber, wo_id: work_order_id, remaining: remaining[0].cnt, user_id: req.user.id });
            }
          }
          break;
        case 'wo_pause':
          await pool.query('UPDATE wo_routing SET status = \'pending\' WHERE id = ? AND status = \'in_progress\'', [wo_routing_id]);
          actionResult = { action: 'paused', wo_number: woNumber };
          break;
        case 'qc_pass':
          await pool.query('UPDATE wo_routing SET qc_passed = 1, qc_date = NOW(), qc_inspector_id = ? WHERE id = ?', [req.user.id, wo_routing_id]);
          actionResult = { action: 'qc_passed', wo_number: woNumber };
          break;
        case 'qc_fail':
          await pool.query('UPDATE wo_routing SET qc_passed = 0, qc_date = NOW(), qc_inspector_id = ? WHERE id = ?', [req.user.id, wo_routing_id]);
          actionResult = { action: 'qc_failed', wo_number: woNumber };
          break;
      }
    }

    res.json({ scan_id: scanResult.insertId, barcode, scan_type, work_order_id, wo_routing_id, ...actionResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/scan/history - Get scan history
router.get('/scan/history', async (req, res) => {
  try {
    const { work_order_id, work_center_id, limit } = req.query;
    let query = `SELECT bsl.*, wo.order_number as wo_number, wc.name as work_center_name
      FROM barcode_scan_log bsl
      LEFT JOIN work_orders wo ON bsl.work_order_id = wo.id
      LEFT JOIN work_centers wc ON bsl.work_center_id = wc.id
      WHERE 1=1`;
    const params = [];
    if (work_order_id) { query += ' AND bsl.work_order_id = ?'; params.push(work_order_id); }
    if (work_center_id) { query += ' AND bsl.work_center_id = ?'; params.push(work_center_id); }
    query += ` ORDER BY bsl.scanned_at DESC LIMIT ?`;
    params.push(parseInt(limit) || 50);

    const [scans] = await pool.query(query, params);
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/scan/wo-status/:barcode - Quick WO status lookup via barcode
router.get('/scan/wo-status/:barcode', async (req, res) => {
  try {
    const woNumber = req.params.barcode.startsWith('WO-') ? req.params.barcode : `WO-${req.params.barcode}`;
    const [wo] = await pool.query(
      `SELECT wo.*, c.company_name as customer_name
       FROM work_orders wo
       LEFT JOIN customers c ON wo.customer_id = c.id
       WHERE wo.order_number = ?`, [woNumber]
    );
    if (wo.length === 0) return res.status(404).json({ error: 'Work order not found' });

    const [routing] = await pool.query(
      `SELECT wr.*, wc.name as work_center_name, wc.code as work_center_code
       FROM wo_routing wr
       JOIN work_centers wc ON wr.work_center_id = wc.id
       WHERE wr.work_order_id = ? ORDER BY wr.sequence`, [wo[0].id]
    );

    const [recentScans] = await pool.query(
      'SELECT * FROM barcode_scan_log WHERE work_order_id = ? ORDER BY scanned_at DESC LIMIT 10',
      [wo[0].id]
    );

    res.json({ work_order: wo[0], routing, recent_scans: recentScans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// QUALITY CONTROL CHECKPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/manufacturing-advanced/qc/checkpoints - Get QC checkpoints
router.get('/qc/checkpoints', async (req, res) => {
  try {
    const { work_center_id } = req.query;
    let query = `SELECT qc.*, wc.name as work_center_name, wc.code as work_center_code
      FROM qc_checkpoints qc
      JOIN work_centers wc ON qc.work_center_id = wc.id
      WHERE qc.is_active = 1`;
    const params = [];
    if (work_center_id) { query += ' AND qc.work_center_id = ?'; params.push(work_center_id); }
    query += ' ORDER BY qc.work_center_id, qc.sequence';

    const [checkpoints] = await pool.query(query, params);
    res.json(checkpoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/qc/checkpoints - Create checkpoint
router.post('/qc/checkpoints', async (req, res) => {
  try {
    const { work_center_id, checkpoint_name, checkpoint_code, inspection_type, measurement_type, target_value, min_value, max_value, unit_of_measure, is_critical, sequence, instructions } = req.body;
    const [result] = await pool.query(
      `INSERT INTO qc_checkpoints (work_center_id, checkpoint_name, checkpoint_code, inspection_type, measurement_type, target_value, min_value, max_value, unit_of_measure, is_critical, sequence, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [work_center_id, checkpoint_name, checkpoint_code, inspection_type || 'visual', measurement_type || 'pass_fail', target_value, min_value, max_value, unit_of_measure, is_critical || false, sequence || 10, instructions]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/qc/inspect/:wo_routing_id - Get checkpoints for an operation
router.get('/qc/inspect/:wo_routing_id', async (req, res) => {
  try {
    // Get the work center for this routing step
    const [routing] = await pool.query(
      'SELECT wr.*, wo.order_number as wo_number FROM wo_routing wr JOIN work_orders wo ON wr.work_order_id = wo.id WHERE wr.id = ?',
      [req.params.wo_routing_id]
    );
    if (routing.length === 0) return res.status(404).json({ error: 'Routing step not found' });

    // Get checkpoints for this work center
    const [checkpoints] = await pool.query(
      'SELECT * FROM qc_checkpoints WHERE work_center_id = ? AND is_active = 1 ORDER BY sequence',
      [routing[0].work_center_id]
    );

    // Get any existing results
    const [results] = await pool.query(
      'SELECT * FROM qc_checkpoint_results WHERE wo_routing_id = ?',
      [req.params.wo_routing_id]
    );

    res.json({ routing: routing[0], checkpoints, existing_results: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manufacturing-advanced/qc/inspect/:wo_routing_id - Submit inspection results
router.post('/qc/inspect/:wo_routing_id', async (req, res) => {
  try {
    const { results } = req.body; // Array of { checkpoint_id, result, measured_value, notes }
    const [routing] = await pool.query('SELECT work_order_id FROM wo_routing WHERE id = ?', [req.params.wo_routing_id]);
    if (routing.length === 0) return res.status(404).json({ error: 'Routing step not found' });

    const work_order_id = routing[0].work_order_id;
    let allPassed = true;
    let hasCriticalFail = false;

    for (const r of results) {
      await pool.query(
        `INSERT INTO qc_checkpoint_results (work_order_id, wo_routing_id, checkpoint_id, inspector_id, result, measured_value, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE result = VALUES(result), measured_value = VALUES(measured_value), notes = VALUES(notes), inspected_at = NOW()`,
        [work_order_id, req.params.wo_routing_id, r.checkpoint_id, req.user.id, r.result, r.measured_value, r.notes]
      );
      if (r.result === 'fail') {
        allPassed = false;
        // Check if this checkpoint is critical
        const [cp] = await pool.query('SELECT is_critical FROM qc_checkpoints WHERE id = ?', [r.checkpoint_id]);
        if (cp.length > 0 && cp[0].is_critical) hasCriticalFail = true;
      }
    }

    // Update routing QC status
    await pool.query(
      'UPDATE wo_routing SET qc_passed = ?, qc_date = NOW(), qc_inspector_id = ? WHERE id = ?',
      [allPassed ? 1 : 0, req.user.id, req.params.wo_routing_id]
    );

    // If critical fail, create NCR
    if (hasCriticalFail) {
      await pool.query(
        `INSERT INTO qc_inspections (work_order_id, wo_routing_id, work_center_id, inspector_id, inspection_type, result, defect_description, disposition)
         VALUES (?, ?, (SELECT work_center_id FROM wo_routing WHERE id = ?), ?, 'in_process', 'fail', 'Critical checkpoint failure - auto-generated NCR', 'hold')`,
        [work_order_id, req.params.wo_routing_id, req.params.wo_routing_id, req.user.id]
      );
    }

    // Log barcode scan
    await pool.query(
      `INSERT INTO barcode_scan_log (barcode, scan_type, work_order_id, wo_routing_id, work_center_id, operator_id)
       VALUES (?, ?, ?, ?, (SELECT work_center_id FROM wo_routing WHERE id = ?), ?)`,
      [`QC-${req.params.wo_routing_id}`, allPassed ? 'qc_pass' : 'qc_fail', work_order_id, req.params.wo_routing_id, req.params.wo_routing_id, req.user.id]
    );

    res.json({ passed: allPassed, critical_fail: hasCriticalFail, results_count: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/qc/results - Get QC results with filters
router.get('/qc/results', async (req, res) => {
  try {
    const { work_order_id, work_center_id, result, start_date, end_date } = req.query;
    let query = `SELECT qcr.*, qc.checkpoint_name, qc.checkpoint_code, qc.is_critical, qc.measurement_type,
      wo.order_number as wo_number, wc.name as work_center_name
      FROM qc_checkpoint_results qcr
      JOIN qc_checkpoints qc ON qcr.checkpoint_id = qc.id
      JOIN work_orders wo ON qcr.work_order_id = wo.id
      JOIN wo_routing wr ON qcr.wo_routing_id = wr.id
      JOIN work_centers wc ON wr.work_center_id = wc.id
      WHERE 1=1`;
    const params = [];
    if (work_order_id) { query += ' AND qcr.work_order_id = ?'; params.push(work_order_id); }
    if (work_center_id) { query += ' AND wr.work_center_id = ?'; params.push(work_center_id); }
    if (result) { query += ' AND qcr.result = ?'; params.push(result); }
    if (start_date) { query += ' AND qcr.inspected_at >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND qcr.inspected_at <= ?'; params.push(end_date + ' 23:59:59'); }
    query += ' ORDER BY qcr.inspected_at DESC LIMIT 200';

    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manufacturing-advanced/qc/summary - QC pass/fail summary
router.get('/qc/summary', async (req, res) => {
  try {
    const { days } = req.query;
    const lookback = days || 30;
    const [summary] = await pool.query(`
      SELECT wc.code, wc.name as work_center,
        COUNT(*) as total_inspections,
        COUNT(CASE WHEN qcr.result = 'pass' THEN 1 END) as passed,
        COUNT(CASE WHEN qcr.result = 'fail' THEN 1 END) as failed,
        ROUND(COUNT(CASE WHEN qcr.result = 'pass' THEN 1 END) / COUNT(*) * 100, 1) as pass_rate
      FROM qc_checkpoint_results qcr
      JOIN wo_routing wr ON qcr.wo_routing_id = wr.id
      JOIN work_centers wc ON wr.work_center_id = wc.id
      WHERE qcr.inspected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY wc.id
      ORDER BY pass_rate ASC`, [lookback]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
