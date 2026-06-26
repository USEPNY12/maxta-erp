const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const { checkDocumentLock, preventDelete } = require('../middleware/documentLock');

// ============ WORK CENTERS ============
router.get('/work-centers', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query('SELECT * FROM work_centers WHERE is_active = TRUE ORDER BY sequence_order');
    res.json(centers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-centers', authenticate, async (req, res) => {
  try {
    const { code, name, department, capacity_type, daily_capacity, hourly_rate, overhead_rate, setup_rate, sequence_order, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO work_centers (code, name, department, capacity_type, daily_capacity, hourly_rate, overhead_rate, setup_rate, sequence_order, description) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [code, name, department, capacity_type || 'sqft', daily_capacity || 0, hourly_rate || 0, overhead_rate || 0, setup_rate || 0, sequence_order || 0, description]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BILL OF MATERIALS ============
router.get('/bom', authenticate, async (req, res) => {
  try {
    const { item_id } = req.query;
    let query = `SELECT bh.*, i.item_number, i.description as item_description FROM bom_headers bh JOIN items i ON bh.item_id = i.id WHERE bh.is_active = TRUE`;
    const params = [];
    if (item_id) { query += ' AND bh.item_id = ?'; params.push(item_id); }
    query += ' ORDER BY i.item_number';
    const [boms] = await pool.query(query, params);
    res.json(boms);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/bom/:id', authenticate, async (req, res) => {
  try {
    const [boms] = await pool.query('SELECT bh.*, i.item_number, i.description as item_description FROM bom_headers bh JOIN items i ON bh.item_id = i.id WHERE bh.id = ?', [req.params.id]);
    if (boms.length === 0) return res.status(404).json({ error: 'BOM not found' });
    const [lines] = await pool.query(`
      SELECT bl.*, i.item_number as component_number, i.description as component_description, i.uom, i.standard_cost
      FROM bom_lines bl JOIN items i ON bl.component_item_id = i.id WHERE bl.bom_id = ? ORDER BY bl.line_number`, [req.params.id]);
    const [routing] = await pool.query(`
      SELECT r.*, wc.name as work_center_name FROM routing_operations r 
      LEFT JOIN work_centers wc ON r.work_center_id = wc.id WHERE r.bom_id = ? ORDER BY r.operation_number`, [req.params.id]);
    res.json({ ...boms[0], lines, routing });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bom', authenticate, async (req, res) => {
  try {
    const { item_id, revision, batch_qty, notes, lines, routing } = req.body;
    const [result] = await pool.query(
      'INSERT INTO bom_headers (item_id, revision, batch_qty, notes, created_by) VALUES (?,?,?,?,?)',
      [item_id, revision || '1', batch_qty || 1, notes, req.user.id]
    );
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await pool.query(
          'INSERT INTO bom_lines (bom_id, line_number, component_item_id, quantity_per, waste_percent, fixed_qty, operation_number, notes) VALUES (?,?,?,?,?,?,?,?)',
          [result.insertId, i + 1, l.component_item_id, l.quantity_per, l.waste_percent || 0, l.fixed_qty || false, l.operation_number, l.notes]
        );
      }
    }
    if (routing && routing.length > 0) {
      for (let i = 0; i < routing.length; i++) {
        const r = routing[i];
        await pool.query(
          'INSERT INTO routing_operations (bom_id, operation_number, work_center_id, description, setup_time_hrs, run_time_hrs, run_time_per_unit, overlap_percent, notes) VALUES (?,?,?,?,?,?,?,?,?)',
          [result.insertId, (i + 1) * 10, r.work_center_id, r.description, r.setup_time_hrs || 0, r.run_time_hrs || 0, r.run_time_per_unit || 0, r.overlap_percent || 0, r.notes]
        );
      }
    }
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ WORK ORDERS ============
router.get('/work-orders', authenticate, async (req, res) => {
  try {
    const { status, search, priority } = req.query;
    let query = `SELECT wo.*, i.item_number, i.description as item_description, c.company_name as customer_name, so.order_number
                 FROM work_orders wo JOIN items i ON wo.item_id = i.id 
                 LEFT JOIN sales_orders so ON wo.sales_order_id = so.id 
                 LEFT JOIN customers c ON so.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND wo.status IN ('planned','scheduled','in_progress','released')"; } else if (status && status !== 'all' && status !== '') { if (status.includes(',')) { const statuses = status.split(',').map(s => "'" + s.trim() + "'").join(','); query += ` AND wo.status IN (${statuses})`; } else { query += ' AND wo.status = ?'; params.push(status); } }
    if (priority) { query += ' AND wo.priority = ?'; params.push(priority); }
    if (search) { query += ' AND (wo.wo_number LIKE ? OR i.item_number LIKE ? OR i.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY wo.order_date DESC LIMIT 200';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/work-orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT wo.*, i.item_number, i.description as item_description, so.order_number, c.company_name as customer_name
      FROM work_orders wo JOIN items i ON wo.item_id = i.id 
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id LEFT JOIN customers c ON so.customer_id = c.id
      WHERE wo.id = ?`, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Work order not found' });

    const [materials] = await pool.query(`
      SELECT wm.*, i.item_number, i.description as item_description 
      FROM wo_materials wm JOIN items i ON wm.item_id = i.id WHERE wm.work_order_id = ? ORDER BY wm.line_number`, [req.params.id]);
    const [routing] = await pool.query(`
      SELECT wor.*, wc.name as work_center_name 
      FROM wo_routing wor LEFT JOIN work_centers wc ON wor.work_center_id = wc.id WHERE wor.work_order_id = ? ORDER BY wor.operation_number`, [req.params.id]);
    const [labor] = await pool.query('SELECT * FROM wo_labor WHERE work_order_id = ? ORDER BY work_date DESC', [req.params.id]);
    const [tracking] = await pool.query(`
      SELECT sft.*, wc.name as station_name, u.first_name, u.last_name 
      FROM shop_floor_tracking sft LEFT JOIN work_centers wc ON sft.work_center_id = wc.id LEFT JOIN users u ON sft.operator_id = u.id
      WHERE sft.work_order_id = ? ORDER BY sft.started_at DESC`, [req.params.id]);

    res.json({ ...orders[0], materials, routing, labor, tracking });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders', authenticate, async (req, res) => {
  try {
    const woNumber = await getNextNumber('work_order');
    const { item_id, quantity, sales_order_id, so_line, priority, scheduling_type, location_id,
            start_date, finish_date, release_date, notes, use_bom } = req.body;

    const [result] = await pool.query(
      `INSERT INTO work_orders (wo_number, item_id, quantity, sales_order_id, so_line, priority, scheduling_type, location_id,
       start_date, finish_date, release_date, notes, status, entered_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'planned',?)`,
      [woNumber, item_id, quantity, sales_order_id, so_line, priority || 'normal', scheduling_type || 'floating',
       location_id, start_date, finish_date, release_date, notes, req.user.id]
    );

    // Auto-populate from BOM if requested
    if (use_bom) {
      const [boms] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = TRUE LIMIT 1', [item_id]);
      if (boms.length > 0) {
        const bomId = boms[0].id;
        const [bomLines] = await pool.query('SELECT * FROM bom_lines WHERE bom_id = ?', [bomId]);
        for (let i = 0; i < bomLines.length; i++) {
          const bl = bomLines[i];
          const totalQty = Math.ceil(bl.quantity_per * quantity * (1 + bl.waste_percent / 100));
          await pool.query(
            'INSERT INTO wo_materials (work_order_id, line_number, item_id, quantity_required, waste_percent, total_qty) VALUES (?,?,?,?,?,?)',
            [result.insertId, i + 1, bl.component_item_id, bl.quantity_per * quantity, bl.waste_percent, totalQty]
          );
        }
        const [routingOps] = await pool.query('SELECT * FROM routing_operations WHERE bom_id = ? ORDER BY operation_number', [bomId]);
        for (const r of routingOps) {
          await pool.query(
            'INSERT INTO wo_routing (work_order_id, operation_number, work_center_id, description, setup_time_hrs, run_time_hrs, status) VALUES (?,?,?,?,?,?,?)',
            [result.insertId, r.operation_number, r.work_center_id, r.description, r.setup_time_hrs, r.run_time_hrs * quantity, 'pending']
          );
        }
      }
    }
    res.status(201).json({ id: result.insertId, wo_number: woNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Release work order (change status from planned to scheduled)
router.post('/work-orders/:id/release', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE work_orders SET status = 'scheduled', release_date = NOW() WHERE id = ? AND status = 'planned'", [req.params.id]);
    await pool.query("UPDATE wo_routing SET status = 'pending' WHERE work_order_id = ?", [req.params.id]);
    res.json({ message: 'Work order released' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Close work order
router.post('/work-orders/:id/close', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE work_orders SET status = 'closed', actual_finish_date = NOW() WHERE id = ?", [req.params.id]);
    res.json({ message: 'Work order closed' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHOP FLOOR TRACKING ============
// Get station queue (what's waiting at a specific work center)
router.get('/shop-floor/queue/:work_center_id', authenticate, async (req, res) => {
  try {
    const [queue] = await pool.query(`
      SELECT wor.*, wo.wo_number, wo.quantity, wo.priority, i.item_number, i.description as item_description,
             c.company_name as customer_name, so.order_number, wo.notes as wo_notes
      FROM wo_routing wor 
      JOIN work_orders wo ON wor.work_order_id = wo.id
      JOIN items i ON wo.item_id = i.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE wor.work_center_id = ? AND wor.status IN ('pending','in_progress') AND wo.status IN ('scheduled','in_progress')
      ORDER BY wo.priority DESC, wo.start_date ASC`, [req.params.work_center_id]);
    res.json(queue);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Start processing at a station (scan barcode to begin)
router.post('/shop-floor/start', authenticate, async (req, res) => {
  try {
    const { work_order_id, work_center_id, operator_id, quantity } = req.body;
    
    // Update routing status
    await pool.query(
      "UPDATE wo_routing SET status = 'in_progress', actual_start = NOW() WHERE work_order_id = ? AND work_center_id = ?",
      [work_order_id, work_center_id]
    );
    
    // Update work order status
    await pool.query("UPDATE work_orders SET status = 'in_progress' WHERE id = ? AND status = 'scheduled'", [work_order_id]);

    // Create tracking record
    const [result] = await pool.query(
      'INSERT INTO shop_floor_tracking (work_order_id, work_center_id, operator_id, quantity_in, status, started_at) VALUES (?,?,?,?,?,NOW())',
      [work_order_id, work_center_id, operator_id || req.user.id, quantity, 'in_progress']
    );
    res.status(201).json({ id: result.insertId, message: 'Processing started' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Complete processing at a station (print label, move to next)
router.post('/shop-floor/complete', authenticate, async (req, res) => {
  try {
    const { work_order_id, work_center_id, operator_id, quantity_good, quantity_scrapped, scrap_reason, notes } = req.body;
    
    // Update tracking record
    await pool.query(
      `UPDATE shop_floor_tracking SET status = 'completed', quantity_out = ?, quantity_scrapped = ?, scrap_reason = ?, notes = ?, completed_at = NOW()
       WHERE work_order_id = ? AND work_center_id = ? AND status = 'in_progress'`,
      [quantity_good, quantity_scrapped || 0, scrap_reason, notes, work_order_id, work_center_id]
    );

    // Update routing status
    await pool.query(
      "UPDATE wo_routing SET status = 'completed', actual_finish = NOW(), actual_hours = TIMESTAMPDIFF(MINUTE, actual_start, NOW()) / 60 WHERE work_order_id = ? AND work_center_id = ?",
      [work_order_id, work_center_id]
    );

    // Record scrap/recut if any
    if (quantity_scrapped > 0) {
      await pool.query(
        'INSERT INTO recuts (work_order_id, work_center_id, quantity, reason_code, notes, reported_by, reported_at) VALUES (?,?,?,?,?,?,NOW())',
        [work_order_id, work_center_id, quantity_scrapped, scrap_reason, notes, operator_id || req.user.id]
      );
    }

    // Check if all routing steps are complete
    const [remaining] = await pool.query(
      "SELECT COUNT(*) as count FROM wo_routing WHERE work_order_id = ? AND status != 'completed'", [work_order_id]
    );
    
    let allComplete = remaining[0].count === 0;
    let nextStation = null;

    if (!allComplete) {
      // Get next station in routing
      const [next] = await pool.query(`
        SELECT wor.*, wc.name as work_center_name FROM wo_routing wor 
        JOIN work_centers wc ON wor.work_center_id = wc.id
        WHERE wor.work_order_id = ? AND wor.status = 'pending' ORDER BY wor.operation_number LIMIT 1`, [work_order_id]);
      if (next.length > 0) nextStation = next[0];
    }

    res.json({ 
      message: 'Station completed', 
      all_routing_complete: allComplete,
      next_station: nextStation,
      print_label: true
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ WO RECEIPTS ============
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const [receipts] = await pool.query(`
      SELECT wr.*, wo.wo_number, i.item_number, i.description as item_description
      FROM wo_receipts wr JOIN work_orders wo ON wr.work_order_id = wo.id JOIN items i ON wo.item_id = i.id
      ORDER BY wr.receipt_date DESC LIMIT 100`);
    res.json(receipts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/receipts', authenticate, async (req, res) => {
  try {
    const receiptNumber = await getNextNumber('wo_receipt');
    const { work_order_id, quantity_completed, quantity_scrapped, scrap_code, location_id, lot_number, serial_number_start, use_estimated_cost, notes } = req.body;

    const [wos] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [work_order_id]);
    if (wos.length === 0) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    // Calculate costs
    const [materialCost] = await pool.query('SELECT COALESCE(SUM(quantity_issued * unit_cost),0) as total FROM wo_materials WHERE work_order_id = ?', [work_order_id]);
    const [laborCost] = await pool.query('SELECT COALESCE(SUM(hours * rate),0) as total FROM wo_labor WHERE work_order_id = ?', [work_order_id]);

    const [result] = await pool.query(
      `INSERT INTO wo_receipts (receipt_number, work_order_id, receipt_date, quantity_completed, quantity_scrapped, scrap_code, location_id, lot_number, serial_number_start,
       material_cost, labor_cost, overhead_cost, total_cost, notes, received_by, is_posted) VALUES (?,?,NOW(),?,?,?,?,?,?,?,?,?,?,?,?,FALSE)`,
      [receiptNumber, work_order_id, quantity_completed, quantity_scrapped || 0, scrap_code, location_id, lot_number, serial_number_start,
       materialCost[0].total, laborCost[0].total, 0, materialCost[0].total + laborCost[0].total, notes, req.user.id]
    );

    // Update work order quantities
    await pool.query('UPDATE work_orders SET qty_completed = qty_completed + ?, qty_scrapped = qty_scrapped + ? WHERE id = ?',
      [quantity_completed, quantity_scrapped || 0, work_order_id]);

    // Add to finished goods inventory
    await pool.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [quantity_completed, wo.item_id]);

    // Check if WO is fully complete
    const [updatedWO] = await pool.query('SELECT quantity, qty_completed FROM work_orders WHERE id = ?', [work_order_id]);
    if (updatedWO[0].qty_completed >= updatedWO[0].quantity) {
      await pool.query("UPDATE work_orders SET status = 'completed', actual_finish_date = NOW() WHERE id = ?", [work_order_id]);
    }

    res.status(201).json({ id: result.insertId, receipt_number: receiptNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LABOR ============
router.get('/labor', authenticate, async (req, res) => {
  try {
    const { work_order_id, work_center_id, employee_id, date_from, date_to } = req.query;
    let query = `SELECT wl.*, wo.wo_number, wc.name as work_center_name, u.first_name, u.last_name
                 FROM wo_labor wl JOIN work_orders wo ON wl.work_order_id = wo.id
                 LEFT JOIN work_centers wc ON wl.work_center_id = wc.id
                 LEFT JOIN users u ON wl.employee_id = u.id WHERE 1=1`;
    const params = [];
    if (work_order_id) { query += ' AND wl.work_order_id = ?'; params.push(work_order_id); }
    if (work_center_id) { query += ' AND wl.work_center_id = ?'; params.push(work_center_id); }
    if (employee_id) { query += ' AND wl.employee_id = ?'; params.push(employee_id); }
    if (date_from) { query += ' AND wl.work_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND wl.work_date <= ?'; params.push(date_to); }
    query += ' ORDER BY wl.work_date DESC LIMIT 200';
    const [labor] = await pool.query(query, params);
    res.json(labor);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/labor', authenticate, async (req, res) => {
  try {
    const { work_order_id, work_center_id, employee_id, work_date, hours, rate, labor_type, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO wo_labor (work_order_id, work_center_id, employee_id, work_date, hours, rate, labor_type, notes) VALUES (?,?,?,?,?,?,?,?)',
      [work_order_id, work_center_id, employee_id, work_date || new Date(), hours, rate || 0, labor_type || 'run', notes]
    );
    await req.audit('wo_labor', result.insertId, 'INSERT', null, { work_order_id, hours, labor_type });
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PRODUCTION SCHEDULE ============
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const { date_from, date_to, work_center_id, status } = req.query;
    let query = `SELECT wo.*, i.item_number, i.description as item_description, c.company_name as customer_name, so.order_number
                 FROM work_orders wo JOIN items i ON wo.item_id = i.id
                 LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
                 LEFT JOIN customers c ON so.customer_id = c.id
                 WHERE wo.status IN ('planned','scheduled','in_progress')`;
    const params = [];
    if (date_from) { query += ' AND wo.start_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND wo.finish_date <= ?'; params.push(date_to); }
    if (status === 'open') { query += " AND wo.status IN ('planned','scheduled','in_progress','released')"; } else if (status && status !== 'all' && status !== '') { if (status.includes(',')) { const statuses = status.split(',').map(s => "'" + s.trim() + "'").join(','); query += ` AND wo.status IN (${statuses})`; } else { query += ' AND wo.status = ?'; params.push(status); } }
    query += ' ORDER BY wo.priority DESC, wo.start_date ASC LIMIT 500';
    const [schedule] = await pool.query(query, params);
    res.json(schedule);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ RECUTS ============
router.get('/recuts', authenticate, async (req, res) => {
  try {
    const { work_center_id, date_from, date_to } = req.query;
    let query = `SELECT r.*, wo.wo_number, wc.name as work_center_name, i.item_number
                 FROM recuts r JOIN work_orders wo ON r.work_order_id = wo.id 
                 JOIN items i ON wo.item_id = i.id LEFT JOIN work_centers wc ON r.work_center_id = wc.id WHERE 1=1`;
    const params = [];
    if (work_center_id) { query += ' AND r.work_center_id = ?'; params.push(work_center_id); }
    if (date_from) { query += ' AND r.reported_at >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND r.reported_at <= ?'; params.push(date_to); }
    query += ' ORDER BY r.reported_at DESC LIMIT 100';
    const [recuts] = await pool.query(query, params);
    res.json(recuts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ DASHBOARD ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openWOs] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('planned','scheduled','in_progress')");
    const [inProgress] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status = 'in_progress'");
    const [overdueWOs] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE finish_date < CURDATE() AND status NOT IN ('completed','closed')");
    const [recuts] = await pool.query("SELECT COUNT(*) as count FROM recuts WHERE MONTH(reported_at) = MONTH(NOW())");
    const [byStation] = await pool.query(`
      SELECT wc.name, COUNT(*) as count FROM wo_routing wor 
      JOIN work_centers wc ON wor.work_center_id = wc.id 
      JOIN work_orders wo ON wor.work_order_id = wo.id
      WHERE wor.status IN ('pending','in_progress') AND wo.status IN ('scheduled','in_progress')
      GROUP BY wc.id ORDER BY wc.sequence_order`);
    res.json({ open_wos: openWOs[0].count, in_progress: inProgress[0].count, overdue: overdueWOs[0].count, monthly_recuts: recuts[0].count, by_station: byStation });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
