const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireModuleAccess, requirePermission } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const GLService = require('../services/glService');

router.use(authenticate);
router.use(requireModuleAccess('manufacturing'));

// ============ WORK CENTERS ============
router.get('/work-centers', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query('SELECT * FROM work_centers WHERE is_active = TRUE ORDER BY sequence_order');
    res.json(centers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-centers', authenticate, async (req, res) => {
  try {
    const { code, name, department, capacity_type, available_hours_per_day, num_machines, efficiency_rate, labor_rate, overhead_rate, queue_time_hours, move_time_hours, scheduling_type, sequence_order, color, icon, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO work_centers (code, name, department, capacity_type, available_hours_per_day, num_machines, efficiency_rate, labor_rate, overhead_rate, queue_time_hours, move_time_hours, scheduling_type, sequence_order, color, icon, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [code, name, department, capacity_type || 'sqft', available_hours_per_day || 8, num_machines || 1, efficiency_rate || 100, labor_rate || 0, overhead_rate || 0, queue_time_hours || 0, move_time_hours || 0, scheduling_type || 'infinite', sequence_order || 0, color || '#2563eb', icon || '', description]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/work-centers/:id', authenticate, async (req, res) => {
  try {
    const { code, name, department, capacity_type, available_hours_per_day, num_machines, efficiency_rate, labor_rate, overhead_rate, queue_time_hours, move_time_hours, scheduling_type, sequence_order, color, icon, description, is_active } = req.body;
    await pool.query(
      'UPDATE work_centers SET code=?, name=?, department=?, capacity_type=?, available_hours_per_day=?, num_machines=?, efficiency_rate=?, labor_rate=?, overhead_rate=?, queue_time_hours=?, move_time_hours=?, scheduling_type=?, sequence_order=?, color=?, icon=?, description=?, is_active=? WHERE id=?',
      [code, name, department, capacity_type, available_hours_per_day, num_machines, efficiency_rate, labor_rate, overhead_rate, queue_time_hours, move_time_hours, scheduling_type, sequence_order, color, icon, description, is_active !== undefined ? is_active : 1, req.params.id]
    );
    res.json({ message: 'Work center updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ROUTING TEMPLATES ============
router.get('/routing-templates', authenticate, async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM routing_templates WHERE is_active = TRUE ORDER BY name');
    res.json(templates);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/routing-templates/:id', authenticate, async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM routing_templates WHERE id = ?', [req.params.id]);
    if (templates.length === 0) return res.status(404).json({ error: 'Template not found' });
    const [operations] = await pool.query(
      'SELECT rto.*, wc.name as work_center_name, wc.code as work_center_code, wc.icon, wc.color FROM routing_template_operations rto JOIN work_centers wc ON rto.work_center_id = wc.id WHERE rto.template_id = ? ORDER BY rto.sequence',
      [req.params.id]);
    res.json({ ...templates[0], operations });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/routing-templates/by-product/:product_type', authenticate, async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM routing_templates WHERE product_type = ? AND is_active = TRUE', [req.params.product_type]);
    if (templates.length === 0) return res.json(null);
    const template = templates[0];
    const [operations] = await pool.query(
      'SELECT rto.*, wc.name as work_center_name, wc.code as work_center_code, wc.icon, wc.color FROM routing_template_operations rto JOIN work_centers wc ON rto.work_center_id = wc.id WHERE rto.template_id = ? ORDER BY rto.sequence',
      [template.id]);
    res.json({ ...template, operations });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ BILL OF MATERIALS ============
router.get('/bom', authenticate, async (req, res) => {
  try {
    const { item_id } = req.query;
    let query = 'SELECT bh.*, i.item_number, i.description as item_description FROM bom_headers bh JOIN items i ON bh.item_id = i.id WHERE bh.is_active = TRUE';
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
    const [lines] = await pool.query('SELECT bl.*, i.item_number as component_number, i.description as component_description, i.uom, i.standard_cost FROM bom_lines bl JOIN items i ON bl.component_item_id = i.id WHERE bl.bom_id = ? ORDER BY bl.sequence', [req.params.id]);
    res.json({ ...boms[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bom', authenticate, async (req, res) => {
  try {
    const { item_id, revision, batch_size, notes, lines } = req.body;
    const [result] = await pool.query('INSERT INTO bom_headers (item_id, revision, batch_size, notes) VALUES (?,?,?,?)', [item_id, revision || '1', batch_size || 1, notes]);
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await pool.query('INSERT INTO bom_lines (bom_id, sequence, component_item_id, quantity_per, waste_percent, uom, notes) VALUES (?,?,?,?,?,?,?)',
          [result.insertId, (i + 1) * 10, l.component_item_id, l.quantity_per, l.waste_percent || 0, l.uom, l.notes]);
      }
    }
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ WORK ORDERS ============
router.get('/work-orders', authenticate, async (req, res) => {
  try {
    const { status, product_type, priority, search } = req.query;
    let query = `SELECT wo.*, i.item_number, i.description as item_description, 
                 wc.name as current_station_name, wc.icon as station_icon, wc.color as station_color,
                 c.company_name as customer_name, so.order_number as so_number
                 FROM work_orders wo LEFT JOIN items i ON wo.item_id = i.id
                 LEFT JOIN work_centers wc ON wo.current_station_id = wc.id
                 LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
                 LEFT JOIN customers c ON so.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status === 'open') {
      query += " AND wo.status IN ('planned','scheduled','released','in_progress','open','partial')";
    } else if (status && status !== 'all' && status !== '') {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query += ' AND wo.status IN (' + statuses.map(() => '?').join(',') + ')';
        params.push(...statuses);
      } else { query += ' AND wo.status = ?'; params.push(status); }
    }
    if (product_type) { query += ' AND wo.product_type = ?'; params.push(product_type); }
    if (priority) { query += ' AND wo.priority = ?'; params.push(priority); }
    if (search) { query += ' AND (wo.order_number LIKE ? OR i.item_number LIKE ? OR i.description LIKE ? OR c.company_name LIKE ?)'; params.push('%'+search+'%', '%'+search+'%', '%'+search+'%', '%'+search+'%'); }
    query += ' ORDER BY FIELD(wo.priority,"urgent","high","normal","low"), wo.start_date ASC LIMIT 500';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/work-orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT wo.*, i.item_number, i.description as item_description, 
             wc.name as current_station_name, wc.icon as station_icon, wc.color as station_color,
             c.company_name as customer_name, so.order_number as so_number
      FROM work_orders wo LEFT JOIN items i ON wo.item_id = i.id
      LEFT JOIN work_centers wc ON wo.current_station_id = wc.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id WHERE wo.id = ?`, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Work order not found' });
    const [materials] = await pool.query('SELECT wm.*, i.item_number, i.description as item_description, i.uom FROM wo_materials wm JOIN items i ON wm.item_id = i.id WHERE wm.work_order_id = ? ORDER BY wm.line_number', [req.params.id]);
    const [routing] = await pool.query('SELECT wor.*, wc.name as work_center_name, wc.code as work_center_code, wc.icon, wc.color FROM wo_routing wor LEFT JOIN work_centers wc ON wor.work_center_id = wc.id WHERE wor.work_order_id = ? ORDER BY wor.sequence', [req.params.id]);
    const [labor] = await pool.query('SELECT wl.*, wc.name as work_center_name FROM wo_labor wl LEFT JOIN work_centers wc ON wl.work_center_id = wc.id WHERE wl.work_order_id = ? ORDER BY wl.work_date DESC', [req.params.id]);
    const [tracking] = await pool.query('SELECT sft.*, wc.name as station_name, wc.icon as station_icon FROM shop_floor_tracking sft LEFT JOIN work_centers wc ON sft.work_center_id = wc.id WHERE sft.work_order_id = ? ORDER BY sft.started_at DESC', [req.params.id]);
    const [receipts] = await pool.query('SELECT * FROM wo_receipts WHERE work_order_id = ? ORDER BY receipt_date DESC', [req.params.id]);
    const [recuts] = await pool.query('SELECT r.*, wc.name as work_center_name FROM recuts r LEFT JOIN work_centers wc ON r.work_center_id = wc.id WHERE r.work_order_id = ? ORDER BY r.reported_at DESC', [req.params.id]);
    const [qcInspections] = await pool.query('SELECT qi.*, wc.name as work_center_name FROM qc_inspections qi LEFT JOIN work_centers wc ON qi.work_center_id = wc.id WHERE qi.work_order_id = ? ORDER BY qi.inspection_date DESC', [req.params.id]);
    res.json({ ...orders[0], materials, routing, labor, tracking, receipts, recuts, qc_inspections: qcInspections });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders', authenticate, async (req, res) => {
  try {
    const woNumber = await getNextNumber('work_order');
    const { item_id, quantity, sales_order_id, so_line, priority, scheduling_type, location_id,
            start_date, finish_date, release_date, notes, product_type, glass_type, thickness,
            width, height, edge_type, interlayer_type, has_holes, has_notches, hole_specs, use_template } = req.body;
    const [result] = await pool.query(
      `INSERT INTO work_orders (wo_number, item_id, quantity, sales_order_id, priority, scheduling_type, location_id,
       start_date, finish_date, release_date, notes, status, product_type, glass_type, thickness, width, height,
       edge_type, interlayer_type, has_holes, has_notches, hole_specs, entered_by) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'planned',?,?,?,?,?,?,?,?,?,?,?)`,
      [woNumber, item_id, quantity, sales_order_id, priority || 'normal', scheduling_type || 'floating',
       location_id, start_date, finish_date, release_date, notes, product_type || 'custom', glass_type, thickness,
       width, height, edge_type, interlayer_type, has_holes || 0, has_notches || 0, hole_specs, req.user.id]
    );
    // Auto-populate routing from template
    if (use_template && product_type && product_type !== 'custom') {
      const [templates] = await pool.query('SELECT id FROM routing_templates WHERE product_type = ? AND is_active = TRUE LIMIT 1', [product_type]);
      if (templates.length > 0) {
        const [ops] = await pool.query('SELECT * FROM routing_template_operations WHERE template_id = ? ORDER BY sequence', [templates[0].id]);
        const [cncCenter] = await pool.query("SELECT id FROM work_centers WHERE code='CNC'");
        const cncId = cncCenter.length > 0 ? cncCenter[0].id : null;
        for (const op of ops) {
          if (op.work_center_id === cncId && !has_holes && !has_notches) continue;
          await pool.query(
            'INSERT INTO wo_routing (work_order_id, sequence, operation_number, work_center_id, operation_description, setup_hours_estimated, run_hours_estimated, qc_required, status) VALUES (?,?,?,?,?,?,?,?,?)',
            [result.insertId, op.sequence, op.sequence, op.work_center_id, op.operation_description, op.setup_time_hours, op.run_time_per_unit * quantity, op.qc_required, 'pending']
          );
        }
        const [firstOp] = await pool.query('SELECT work_center_id FROM wo_routing WHERE work_order_id = ? ORDER BY sequence LIMIT 1', [result.insertId]);
        if (firstOp.length > 0) {
          await pool.query('UPDATE work_orders SET current_station_id = ? WHERE id = ?', [firstOp[0].work_center_id, result.insertId]);
        }
      }
    }
    res.status(201).json({ id: result.insertId, wo_number: woNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders/:id/release', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE work_orders SET status = 'scheduled', release_date = CURDATE() WHERE id = ? AND status = 'planned'", [req.params.id]);
    const [firstOp] = await pool.query('SELECT work_center_id FROM wo_routing WHERE work_order_id = ? ORDER BY sequence LIMIT 1', [req.params.id]);
    if (firstOp.length > 0) await pool.query('UPDATE work_orders SET current_station_id = ? WHERE id = ?', [firstOp[0].work_center_id, req.params.id]);
    res.json({ message: 'Work order released to production' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders/:id/start', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE work_orders SET status = 'in_progress', start_date = COALESCE(start_date, CURDATE()) WHERE id = ? AND status IN ('scheduled','released')", [req.params.id]);
    res.json({ message: 'Work order started' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders/:id/complete', authenticate, async (req, res) => {
  try {
    const [wos] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];
    await pool.query("UPDATE work_orders SET status = 'completed', actual_finish_date = NOW() WHERE id = ?", [req.params.id]);
    // === FIX GAP 1: Update SO line production_status ===
    if (wo.sales_order_line_id) {
      await pool.query("UPDATE sales_order_lines SET production_status = 'complete' WHERE id = ?", [wo.sales_order_line_id]);
    } else if (wo.sales_order_id) {
      await pool.query("UPDATE sales_order_lines SET production_status = 'complete' WHERE work_order_id = ?", [req.params.id]);
    }
    // === FIX GAP 2: Auto-trigger WO Receipt if item_id exists ===
    if (wo.item_id && wo.quantity > 0) {
      try {
        const receiptNumber = await getNextNumber('wo_receipt');
        const qtyToReceipt = Math.max(0, Number(wo.quantity) - Number(wo.qty_completed || 0));
        if (qtyToReceipt > 0) {
          const conn = await pool.getConnection();
          await conn.beginTransaction();
          try {
            // Backflush materials
            const [materials] = await conn.query('SELECT * FROM wo_materials WHERE work_order_id = ?', [req.params.id]);
            const completionRatio = qtyToReceipt / Number(wo.quantity || 1);
            let matCostTotal = 0;
            for (const mat of materials) {
              const issueQty = Number(mat.total_qty > 0 ? mat.total_qty : mat.quantity_required) * completionRatio;
              if (issueQty <= 0 || !mat.item_id) continue;
              await conn.query('UPDATE wo_materials SET quantity_issued = quantity_issued + ?, total_cost = (quantity_issued + ?) * unit_cost WHERE id = ?', [issueQty, issueQty, mat.id]);
              await conn.query('UPDATE items SET qty_on_hand = GREATEST(0, qty_on_hand - ?) WHERE id = ?', [issueQty, mat.item_id]);
              await conn.query(`INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, reference_number, notes, created_by) VALUES (?, 'wo_issue', ?, 'work_order', ?, ?, ?, ?)`,
                [mat.item_id, -issueQty, req.params.id, wo.order_number, 'Auto-backflush on WO complete', req.user.id]);
              matCostTotal += issueQty * Number(mat.unit_cost || 0);
              // === FIX GAP 3: Check low stock alert ===
              const [itemCheck] = await conn.query('SELECT qty_on_hand, reorder_point, item_number, description FROM items WHERE id = ?', [mat.item_id]);
              if (itemCheck.length && Number(itemCheck[0].qty_on_hand) <= Number(itemCheck[0].reorder_point || 0) && Number(itemCheck[0].reorder_point) > 0) {
                await conn.query(`INSERT INTO notification_log (notification_type, subject, details) VALUES ('low_stock', CONCAT('Low Stock Alert: ', ?), JSON_OBJECT('reference_id', ?))`,
                  [`${itemCheck[0].item_number} - ${itemCheck[0].description} is below reorder point (${itemCheck[0].qty_on_hand} on hand, reorder at ${itemCheck[0].reorder_point})`, mat.item_id]);
              }
            }
            // Add finished goods to inventory
            await conn.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [qtyToReceipt, wo.item_id]);
            const locId = wo.location_id || 1;
            const [existBal] = await conn.query('SELECT id FROM inventory_balances WHERE item_id = ? AND location_id = ?', [wo.item_id, locId]);
            if (existBal.length > 0) {
              await conn.query('UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand + ?, last_count_date = NOW() WHERE id = ?', [qtyToReceipt, existBal[0].id]);
            } else {
              await conn.query('INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand, last_count_date) VALUES (?, ?, ?, NOW())', [wo.item_id, locId, qtyToReceipt]);
            }
            await conn.query(`INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, reference_type, reference_id, reference_number, notes, created_by) VALUES (?, 'wo_receipt', ?, ?, 'work_order', ?, ?, ?, ?)`,
              [wo.item_id, qtyToReceipt, locId, req.params.id, wo.order_number, 'Auto-receipt on WO complete ' + receiptNumber, req.user.id]);
            // Create WO receipt record
            await conn.query(`INSERT INTO wo_receipts (receipt_number, work_order_id, receipt_date, quantity_completed, quantity_scrapped, material_cost, labor_cost, total_cost, location_id, notes, received_by) VALUES (?,?,CURDATE(),?,?,?,0,?,?,?,?)`,
              [receiptNumber, req.params.id, qtyToReceipt, wo.qty_scrapped || 0, matCostTotal, matCostTotal, locId, 'Auto-generated on WO complete', req.user.id]);
            // Update WO qty_completed
            await conn.query('UPDATE work_orders SET qty_completed = qty_completed + ? WHERE id = ?', [qtyToReceipt, req.params.id]);
            // GL posting
            if (matCostTotal > 0) {
              try { await GLService.postMaterialIssue({ workOrderId: req.params.id, lines: materials.filter(m => m.item_id).map(m => ({ itemId: m.item_id, quantity: Number(m.total_qty || m.quantity_required) * completionRatio })), transactionDate: new Date(), memo: 'Auto-backflush WO ' + wo.order_number, postedBy: req.user.id, connection: conn }); } catch(e) {}
              try { await GLService.postWOReceipt({ workOrderId: req.params.id, itemId: wo.item_id, quantity: qtyToReceipt, transactionDate: new Date(), memo: 'Auto-receipt WO ' + wo.order_number + ' ' + receiptNumber, postedBy: req.user.id, connection: conn }); } catch(e) {}
            }
            await conn.commit();
          } catch (innerErr) { await conn.rollback(); console.error('Auto-receipt error:', innerErr.message); }
          finally { conn.release(); }
        }
      } catch (receiptErr) { console.error('Auto-receipt generation error:', receiptErr.message); }
    }
    // WebSocket broadcast
    if (global.wsBroadcast) global.wsBroadcast({ type: 'wo_completed', work_order_id: req.params.id, order_number: wo.order_number });
    // Notification
    try { await pool.query(`INSERT INTO notification_log (notification_type, subject, details) VALUES ('wo_complete', CONCAT('Work Order Completed: ', ?), JSON_OBJECT('reference_id', ?))`, [`${wo.order_number} completed - finished goods received to inventory`, req.params.id]); } catch(e) {}
    res.json({ message: 'Work order completed with auto-receipt', receipt_generated: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/work-orders/:id/close', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE work_orders SET status = 'closed', actual_finish_date = COALESCE(actual_finish_date, NOW()) WHERE id = ?", [req.params.id]);
    res.json({ message: 'Work order closed' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHOP FLOOR TRACKING ============
router.get('/shop-floor/queue/:work_center_id', authenticate, async (req, res) => {
  try {
    const [queue] = await pool.query(`
      SELECT wor.id as routing_id, wor.sequence, wor.operation_description, wor.status as op_status, wor.qc_required,
             wo.id as work_order_id, wo.order_number as wo_number, wo.quantity, wo.priority, wo.product_type,
             wo.glass_type, wo.thickness, wo.width, wo.height, wo.edge_type, wo.interlayer_type,
             wo.has_holes, wo.has_notches, wo.hole_specs, wo.notes as wo_notes, wo.start_date, wo.finish_date,
             i.item_number, i.description as item_description,
             c.company_name as customer_name, so.order_number as so_number
      FROM wo_routing wor JOIN work_orders wo ON wor.work_order_id = wo.id
      JOIN items i ON wo.item_id = i.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE wor.work_center_id = ? AND wor.status IN ('pending','in_progress') AND wo.status IN ('scheduled','in_progress','released')
      ORDER BY FIELD(wo.priority,'urgent','high','normal','low'), wo.finish_date ASC`, [req.params.work_center_id]);
    res.json(queue);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/shop-floor/overview', authenticate, async (req, res) => {
  try {
    const [stations] = await pool.query(`
      SELECT wc.id, wc.code, wc.name, wc.department, wc.icon, wc.color,
             COUNT(CASE WHEN wor.status IN ('pending','in_progress') AND wo.status IN ('scheduled','in_progress','released') THEN 1 END) as queue_count,
             COUNT(CASE WHEN wor.status = 'in_progress' AND wo.status IN ('scheduled','in_progress','released') THEN 1 END) as active_count
      FROM work_centers wc
      LEFT JOIN wo_routing wor ON wor.work_center_id = wc.id
      LEFT JOIN work_orders wo ON wor.work_order_id = wo.id
      WHERE wc.is_active = TRUE GROUP BY wc.id ORDER BY wc.sequence_order`);
    res.json(stations);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/shop-floor/start', authenticate, async (req, res) => {
  try {
    const { wo_routing_id, operator_id, operator_name } = req.body;
    await pool.query("UPDATE wo_routing SET status = 'in_progress', start_date = NOW(), actual_start = NOW() WHERE id = ?", [wo_routing_id]);
    const [routing] = await pool.query('SELECT work_order_id, work_center_id FROM wo_routing WHERE id = ?', [wo_routing_id]);
    if (routing.length > 0) {
      await pool.query("UPDATE work_orders SET status = 'in_progress', current_station_id = ? WHERE id = ? AND status != 'completed'", [routing[0].work_center_id, routing[0].work_order_id]);
      const [wo] = await pool.query('SELECT quantity FROM work_orders WHERE id = ?', [routing[0].work_order_id]);
      await pool.query('INSERT INTO shop_floor_tracking (work_order_id, wo_routing_id, work_center_id, status, operator_id, operator_name, quantity_in, started_at) VALUES (?,?,?,?,?,?,?,NOW())',
        [routing[0].work_order_id, wo_routing_id, routing[0].work_center_id, 'in_progress', operator_id || req.user.id, operator_name || '', wo[0]?.quantity || 0]);
    }
    res.json({ message: 'Operation started' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/shop-floor/complete', authenticate, async (req, res) => {
  try {
    const { wo_routing_id, quantity_good, quantity_scrap, scrap_reason, notes } = req.body;
    await pool.query("UPDATE wo_routing SET status = 'complete', end_date = NOW(), actual_finish = NOW(), quantity_completed = ?, quantity_scrapped = ? WHERE id = ?", [quantity_good || 0, quantity_scrap || 0, wo_routing_id]);
    await pool.query("UPDATE shop_floor_tracking SET status = 'complete', completed_at = NOW(), quantity_good = ?, quantity_scrap = ?, scrap_reason = ?, notes = ? WHERE wo_routing_id = ? AND status = 'in_progress'", [quantity_good || 0, quantity_scrap || 0, scrap_reason, notes, wo_routing_id]);
    const [routing] = await pool.query('SELECT work_order_id, work_center_id FROM wo_routing WHERE id = ?', [wo_routing_id]);
    if (routing.length > 0) {
      const work_order_id = routing[0].work_order_id;
      if (quantity_scrap > 0) {
        await pool.query('INSERT INTO recuts (work_order_id, work_center_id, quantity, reason_code, notes, reported_by) VALUES (?,?,?,?,?,?)', [work_order_id, routing[0].work_center_id, quantity_scrap, scrap_reason, notes, req.user.id]);
        await pool.query('UPDATE work_orders SET qty_scrapped = qty_scrapped + ? WHERE id = ?', [quantity_scrap, work_order_id]);
      }
      const [next] = await pool.query("SELECT id, work_center_id, operation_description FROM wo_routing WHERE work_order_id = ? AND status = 'pending' ORDER BY sequence LIMIT 1", [work_order_id]);
      if (next.length > 0) {
        await pool.query('UPDATE work_orders SET current_station_id = ? WHERE id = ?', [next[0].work_center_id, work_order_id]);
        res.json({ message: 'Operation completed', next_station: next[0], all_complete: false });
      } else {
        await pool.query("UPDATE work_orders SET status = 'completed', actual_finish_date = NOW(), current_station_id = NULL WHERE id = ?", [work_order_id]);
        // === FIX GAP: Update SO line production_status on shop-floor complete ===
        const [completedWO] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [work_order_id]);
        if (completedWO.length) {
          const cwo = completedWO[0];
          if (cwo.sales_order_line_id) {
            await pool.query("UPDATE sales_order_lines SET production_status = 'complete' WHERE id = ?", [cwo.sales_order_line_id]);
          } else if (cwo.sales_order_id) {
            await pool.query("UPDATE sales_order_lines SET production_status = 'complete' WHERE work_order_id = ?", [work_order_id]);
          }
          // === FIX GAP: Auto-receipt finished goods ===
          if (cwo.item_id && cwo.quantity > 0) {
            try {
              const qtyToReceipt = Math.max(0, Number(cwo.quantity) - Number(cwo.qty_completed || 0));
              if (qtyToReceipt > 0) {
                const receiptNumber = await getNextNumber('wo_receipt');
                const conn2 = await pool.getConnection();
                await conn2.beginTransaction();
                try {
                  const [materials] = await conn2.query('SELECT * FROM wo_materials WHERE work_order_id = ?', [work_order_id]);
                  const completionRatio = qtyToReceipt / Number(cwo.quantity || 1);
                  let matCostTotal = 0;
                  for (const mat of materials) {
                    const issueQty = Number(mat.total_qty > 0 ? mat.total_qty : mat.quantity_required) * completionRatio;
                    if (issueQty <= 0 || !mat.item_id) continue;
                    await conn2.query('UPDATE wo_materials SET quantity_issued = quantity_issued + ?, total_cost = (quantity_issued + ?) * unit_cost WHERE id = ?', [issueQty, issueQty, mat.id]);
                    await conn2.query('UPDATE items SET qty_on_hand = GREATEST(0, qty_on_hand - ?) WHERE id = ?', [issueQty, mat.item_id]);
                    await conn2.query("INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, reference_number, notes, created_by) VALUES (?, 'wo_issue', ?, 'work_order', ?, ?, ?, ?)",
                      [mat.item_id, -issueQty, work_order_id, cwo.order_number, 'Auto-backflush on shop-floor complete', req.user.id]);
                    matCostTotal += issueQty * Number(mat.unit_cost || 0);
                    // Low stock alert
                    const [itemChk] = await conn2.query('SELECT qty_on_hand, reorder_point, item_number, description FROM items WHERE id = ?', [mat.item_id]);
                    if (itemChk.length && Number(itemChk[0].qty_on_hand) <= Number(itemChk[0].reorder_point || 0) && Number(itemChk[0].reorder_point) > 0) {
                      await conn2.query("INSERT INTO notification_log (notification_type, subject, details) VALUES ('low_stock', CONCAT('Low Stock Alert: ', ?), JSON_OBJECT('reference_id', ?))",
                        [itemChk[0].item_number + ' - ' + itemChk[0].description + ' below reorder point (' + itemChk[0].qty_on_hand + ' on hand, reorder at ' + itemChk[0].reorder_point + ')', mat.item_id]);
                    }
                  }
                  // Add finished goods
                  await conn2.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [qtyToReceipt, cwo.item_id]);
                  const locId = cwo.location_id || 1;
                  await conn2.query("INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand, last_count_date) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + ?, last_count_date = NOW()", [cwo.item_id, locId, qtyToReceipt, qtyToReceipt]);
                  await conn2.query("INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, reference_type, reference_id, reference_number, notes, created_by) VALUES (?, 'wo_receipt', ?, ?, 'work_order', ?, ?, ?, ?)",
                    [cwo.item_id, qtyToReceipt, locId, work_order_id, cwo.order_number, 'Auto-receipt on shop-floor complete ' + receiptNumber, req.user.id]);
                  await conn2.query("INSERT INTO wo_receipts (receipt_number, work_order_id, receipt_date, quantity_completed, quantity_scrapped, material_cost, labor_cost, total_cost, location_id, notes, received_by) VALUES (?,?,CURDATE(),?,?,?,0,?,?,?,?)",
                    [receiptNumber, work_order_id, qtyToReceipt, cwo.qty_scrapped || 0, matCostTotal, matCostTotal, locId, 'Auto-generated on shop-floor complete', req.user.id]);
                  await conn2.query('UPDATE work_orders SET qty_completed = qty_completed + ? WHERE id = ?', [qtyToReceipt, work_order_id]);
                  if (matCostTotal > 0) {
                    try { await GLService.postMaterialIssue({ workOrderId: work_order_id, lines: materials.filter(m => m.item_id).map(m => ({ itemId: m.item_id, quantity: Number(m.total_qty || m.quantity_required) * completionRatio })), transactionDate: new Date(), memo: 'Auto-backflush WO ' + cwo.order_number, postedBy: req.user.id, connection: conn2 }); } catch(e) {}
                    try { await GLService.postWOReceipt({ workOrderId: work_order_id, itemId: cwo.item_id, quantity: qtyToReceipt, transactionDate: new Date(), memo: 'Auto-receipt WO ' + cwo.order_number, postedBy: req.user.id, connection: conn2 }); } catch(e) {}
                  }
                  await conn2.commit();
                } catch (innerErr) { await conn2.rollback(); console.error('Shop-floor auto-receipt error:', innerErr.message); }
                finally { conn2.release(); }
              }
            } catch (receiptErr) { console.error('Shop-floor receipt error:', receiptErr.message); }
          }
          // WebSocket broadcast
          if (global.wsBroadcast) global.wsBroadcast({ type: 'wo_completed', work_order_id: work_order_id, order_number: cwo.order_number });
          // Notification
          try { await pool.query("INSERT INTO notification_log (notification_type, subject, details) VALUES ('wo_complete', CONCAT('Work Order Completed: ', ?), JSON_OBJECT('reference_id', ?))", [cwo.order_number + ' completed via shop floor - finished goods received', work_order_id]); } catch(e) {}
        }
        res.json({ message: 'All operations complete - auto-receipt generated', all_complete: true, receipt_generated: true });
      }
    } else { res.json({ message: 'Operation completed' }); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/shop-floor/recut', authenticate, async (req, res) => {
  try {
    const { wo_routing_id, quantity, reason_code, notes } = req.body;
    const [routing] = await pool.query('SELECT work_order_id, work_center_id FROM wo_routing WHERE id = ?', [wo_routing_id]);
    if (routing.length === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query('INSERT INTO recuts (work_order_id, work_center_id, quantity, reason_code, notes, reported_by) VALUES (?,?,?,?,?,?)', [routing[0].work_order_id, routing[0].work_center_id, quantity || 1, reason_code, notes, req.user.id]);
    await pool.query('UPDATE work_orders SET qty_scrapped = qty_scrapped + ? WHERE id = ?', [quantity || 1, routing[0].work_order_id]);
    res.json({ message: 'Recut flagged' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ QUALITY CONTROL ============
router.get('/qc/inspections', authenticate, async (req, res) => {
  try {
    const { work_order_id, result: qcResult, inspection_type } = req.query;
    let query = 'SELECT qi.*, wo.order_number as wo_number, wc.name as work_center_name, i.item_number FROM qc_inspections qi JOIN work_orders wo ON qi.work_order_id = wo.id JOIN items i ON wo.item_id = i.id LEFT JOIN work_centers wc ON qi.work_center_id = wc.id WHERE 1=1';
    const params = [];
    if (work_order_id) { query += ' AND qi.work_order_id = ?'; params.push(work_order_id); }
    if (qcResult) { query += ' AND qi.result = ?'; params.push(qcResult); }
    if (inspection_type) { query += ' AND qi.inspection_type = ?'; params.push(inspection_type); }
    query += ' ORDER BY qi.inspection_date DESC LIMIT 200';
    const [inspections] = await pool.query(query, params);
    res.json(inspections);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/qc/inspections', authenticate, async (req, res) => {
  try {
    const { work_order_id, wo_routing_id, work_center_id, inspection_type, result, quantity_inspected, quantity_passed, quantity_failed, defect_type, defect_description, disposition, corrective_action, notes } = req.body;
    const [insertResult] = await pool.query(
      'INSERT INTO qc_inspections (work_order_id, wo_routing_id, work_center_id, inspector_id, inspection_type, result, quantity_inspected, quantity_passed, quantity_failed, defect_type, defect_description, disposition, corrective_action, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [work_order_id, wo_routing_id, work_center_id, req.user.id, inspection_type || 'in_process', result, quantity_inspected, quantity_passed, quantity_failed, defect_type, defect_description, disposition || 'accept', corrective_action, notes]);
    if (wo_routing_id) {
      await pool.query('UPDATE wo_routing SET qc_passed = ?, qc_notes = ?, qc_inspector_id = ?, qc_date = NOW() WHERE id = ?', [result === 'pass' ? 1 : 0, notes, req.user.id, wo_routing_id]);
    }
    res.status(201).json({ id: insertResult.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/qc/ncr', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT ncr.*, wo.order_number as wo_number, i.item_number FROM quality_ncr ncr LEFT JOIN work_orders wo ON ncr.work_order_id = wo.id LEFT JOIN items i ON ncr.item_id = i.id WHERE 1=1';
    const params = [];
    if (status && status !== 'all') { query += ' AND ncr.status = ?'; params.push(status); }
    query += ' ORDER BY ncr.created_at DESC LIMIT 200';
    const [ncrs] = await pool.query(query, params);
    res.json(ncrs);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/qc/ncr', authenticate, async (req, res) => {
  try {
    const ncrNumber = await getNextNumber('ncr');
    const { work_order_id, item_id, operation_id, defect_type, severity, quantity_affected, description, disposition } = req.body;
    const [result] = await pool.query(
      "INSERT INTO quality_ncr (ncr_number, work_order_id, item_id, operation_id, ncr_date, defect_type, severity, quantity_affected, description, disposition, reported_by, status) VALUES (?,?,?,?,CURDATE(),?,?,?,?,?,?,'open')",
      [ncrNumber, work_order_id, item_id, operation_id, defect_type, severity || 'major', quantity_affected || 1, description, disposition || 'pending', req.user.id]);
    res.status(201).json({ id: result.insertId, ncr_number: ncrNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ WO RECEIPTS ============
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const [receipts] = await pool.query('SELECT wr.*, wo.order_number as wo_number, i.item_number, i.description as item_description FROM wo_receipts wr JOIN work_orders wo ON wr.work_order_id = wo.id JOIN items i ON wo.item_id = i.id ORDER BY wr.receipt_date DESC LIMIT 100');
    res.json(receipts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/receipts', authenticate, async (req, res) => {
  try {
    const receiptNumber = await getNextNumber('wo_receipt');
    const { work_order_id, quantity_completed, quantity_scrapped, scrap_code, location_id, lot_number, notes } = req.body;
    if (!work_order_id || !quantity_completed) return res.status(400).json({ error: 'Work order and quantity required' });
    
    const [wos] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [work_order_id]);
    if (wos.length === 0) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // ===== MATERIAL BACKFLUSH ENGINE =====
      // Get BOM for the WO item (or use wo_materials if already populated)
      let materialsToIssue = [];
      const [existingMaterials] = await conn.query('SELECT * FROM wo_materials WHERE work_order_id = ?', [work_order_id]);
      
      if (existingMaterials.length > 0) {
        // Use pre-loaded WO materials
        materialsToIssue = existingMaterials;
      } else if (wo.item_id) {
        // Auto-load from BOM if available
        const [bomHeaders] = await conn.query(
          'SELECT id, batch_size FROM bom_headers WHERE item_id = ? AND is_active = 1 ORDER BY effective_date DESC LIMIT 1', [wo.item_id]);
        if (bomHeaders.length > 0) {
          const bom = bomHeaders[0];
          const [bomLines] = await conn.query(
            `SELECT bl.*, i.item_number, i.description, i.standard_cost, i.uom 
             FROM bom_lines bl JOIN items i ON bl.component_item_id = i.id 
             WHERE bl.bom_id = ? ORDER BY bl.sequence`, [bom.id]);
          
          // Create wo_materials from BOM and calculate quantities
          let lineNum = 1;
          for (const bl of bomLines) {
            const qtyPer = Number(bl.quantity_per) / Number(bom.batch_size || 1);
            const wastePct = Number(bl.waste_percent || 0);
            const qtyRequired = qtyPer * Number(wo.quantity);
            const totalQty = qtyRequired * (1 + wastePct / 100);
            
            await conn.query(
              `INSERT INTO wo_materials (work_order_id, line_number, item_id, description, quantity_required, waste_percent, total_qty, quantity_issued, unit_cost, total_cost, location_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)`,
              [work_order_id, lineNum, bl.component_item_id, bl.description || bl.item_number, qtyRequired, wastePct, totalQty, Number(bl.standard_cost || 0), location_id]);
            
            materialsToIssue.push({
              id: null, item_id: bl.component_item_id, item_number: bl.item_number,
              quantity_required: qtyRequired, total_qty: totalQty, waste_percent: wastePct,
              unit_cost: Number(bl.standard_cost || 0), quantity_issued: 0
            });
            lineNum++;
          }
        }
      }

      // Issue materials proportional to quantity completed vs total WO quantity
      const completionRatio = Number(quantity_completed) / Number(wo.quantity || 1);
      const glMaterialLines = [];
      
      for (const mat of materialsToIssue) {
        const issueQty = Number(mat.total_qty > 0 ? mat.total_qty : mat.quantity_required) * completionRatio;
        if (issueQty <= 0 || !mat.item_id) continue;
        
        // Update wo_materials issued quantity
        if (mat.id) {
          await conn.query('UPDATE wo_materials SET quantity_issued = quantity_issued + ?, total_cost = (quantity_issued + ?) * unit_cost WHERE id = ?',
            [issueQty, issueQty, mat.id]);
        } else {
          await conn.query('UPDATE wo_materials SET quantity_issued = quantity_issued + ?, total_cost = (quantity_issued + ?) * unit_cost WHERE work_order_id = ? AND item_id = ?',
            [issueQty, issueQty, work_order_id, mat.item_id]);
        }
        
        // Deduct from raw material inventory
        await conn.query('UPDATE items SET qty_on_hand = GREATEST(0, qty_on_hand - ?) WHERE id = ?', [issueQty, mat.item_id]);
        
        // Log inventory transaction for material issue
        await conn.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, reference_type, reference_id, reference_number, notes, created_by)
           VALUES (?, 'wo_issue', ?, ?, 'work_order', ?, ?, ?, ?)`,
          [mat.item_id, -issueQty, location_id, work_order_id, wo.order_number, 
           'Material backflush for WO receipt ' + receiptNumber, req.user.id]);
        
        // Accumulate GL material cost
        glMaterialLines.push({ itemId: mat.item_id, quantity: issueQty });
        // === FIX GAP 3: Low stock alert on material issue ===
        const [stockCheck] = await conn.query('SELECT qty_on_hand, reorder_point, item_number, description FROM items WHERE id = ?', [mat.item_id]);
        if (stockCheck.length && Number(stockCheck[0].reorder_point) > 0 && Number(stockCheck[0].qty_on_hand) <= Number(stockCheck[0].reorder_point)) {
          try { await conn.query("INSERT INTO notification_log (notification_type, subject, details) VALUES ('low_stock', CONCAT('Low Stock Alert: ', ?), JSON_OBJECT('reference_id', ?))", [stockCheck[0].item_number + ' - ' + stockCheck[0].description + ' below reorder point (' + stockCheck[0].qty_on_hand + ' on hand, reorder at ' + stockCheck[0].reorder_point + ')', mat.item_id]); } catch(e) {}
          if (global.wsBroadcast) global.wsBroadcast({ type: 'low_stock_alert', item_id: mat.item_id, item_number: stockCheck[0].item_number, qty_on_hand: stockCheck[0].qty_on_hand, reorder_point: stockCheck[0].reorder_point });
        }
      }

      // Calculate costs for the receipt
      const [materialCost] = await conn.query('SELECT COALESCE(SUM(quantity_issued * unit_cost),0) as total FROM wo_materials WHERE work_order_id = ?', [work_order_id]);
      const [laborCost] = await conn.query('SELECT COALESCE(SUM(hours * rate),0) as total FROM wo_labor WHERE work_order_id = ?', [work_order_id]);
      const matCostTotal = Number(materialCost[0].total);
      const labCostTotal = Number(laborCost[0].total);
      const totalCost = matCostTotal + labCostTotal;

      // Create the receipt record
      const [result] = await conn.query(
        'INSERT INTO wo_receipts (receipt_number, work_order_id, receipt_date, quantity_completed, quantity_scrapped, scrap_code, location_id, lot_number, material_cost, labor_cost, total_cost, notes, received_by) VALUES (?,?,CURDATE(),?,?,?,?,?,?,?,?,?,?)',
        [receiptNumber, work_order_id, quantity_completed, quantity_scrapped || 0, scrap_code, location_id, lot_number, matCostTotal, labCostTotal, totalCost, notes, req.user.id]);

      // Update WO quantities
      await conn.query('UPDATE work_orders SET qty_completed = qty_completed + ?, qty_scrapped = qty_scrapped + ? WHERE id = ?', 
        [quantity_completed, quantity_scrapped || 0, work_order_id]);

      // Add finished goods to inventory
      if (wo.item_id) {
        await conn.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [quantity_completed, wo.item_id]);
        await conn.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, lot_number, reference_type, reference_id, reference_number, notes, created_by)
           VALUES (?, 'wo_receipt', ?, ?, ?, 'work_order', ?, ?, ?, ?)`,
          [wo.item_id, quantity_completed, location_id, lot_number, work_order_id, wo.order_number, 'WO Receipt ' + receiptNumber, req.user.id]);
        // Sync inventory_balances (location-level tracking)
        const locId = location_id || 1;
        const [existBal] = await conn.query('SELECT id FROM inventory_balances WHERE item_id = ? AND location_id = ?', [wo.item_id, locId]);
        if (existBal.length > 0) {
          await conn.query('UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand + ?, last_count_date = NOW() WHERE id = ?', [quantity_completed, existBal[0].id]);
        } else {
          await conn.query('INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand, last_count_date) VALUES (?, ?, ?, NOW())', [wo.item_id, locId, quantity_completed]);
        }
      }

      // ===== GL AUTO-POSTING =====
      // 1. Material Issue: Debit WIP, Credit Raw Materials
      if (glMaterialLines.length > 0) {
        try {
          await GLService.postMaterialIssue({
            workOrderId: work_order_id,
            lines: glMaterialLines,
            transactionDate: new Date(),
            memo: 'Material backflush - WO ' + wo.order_number + ' Receipt ' + receiptNumber,
            postedBy: req.user.id,
            connection: conn
          });
        } catch (glErr) { console.error('GL material issue error:', glErr.message); }
      }

      // 2. WO Receipt: Debit Finished Goods, Credit WIP
      if (wo.item_id && totalCost > 0) {
        try {
          await GLService.postWOReceipt({
            workOrderId: work_order_id,
            itemId: wo.item_id,
            quantity: quantity_completed,
            transactionDate: new Date(),
            memo: 'WO Receipt ' + receiptNumber + ' - ' + wo.order_number,
            postedBy: req.user.id,
            connection: conn
          });
        } catch (glErr) { console.error('GL WO receipt error:', glErr.message); }
      }

      // Auto-close WO if fully received
      const [updatedWO] = await conn.query('SELECT quantity, qty_completed FROM work_orders WHERE id = ?', [work_order_id]);
      if (updatedWO[0].qty_completed >= updatedWO[0].quantity) {
        await conn.query("UPDATE work_orders SET status = 'completed', actual_finish_date = NOW() WHERE id = ?", [work_order_id]);
      }

      await conn.commit();
      res.status(201).json({ id: result.insertId, receipt_number: receiptNumber, materials_issued: glMaterialLines.length });
    } catch (innerError) {
      await conn.rollback();
      throw innerError;
    } finally {
      conn.release();
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LABOR ============
router.get('/labor', authenticate, async (req, res) => {
  try {
    const { work_order_id, work_center_id, employee_id, date_from, date_to } = req.query;
    let query = 'SELECT wl.*, wo.order_number as wo_number, wc.name as work_center_name FROM wo_labor wl JOIN work_orders wo ON wl.work_order_id = wo.id LEFT JOIN work_centers wc ON wl.work_center_id = wc.id WHERE 1=1';
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
    const [result] = await pool.query('INSERT INTO wo_labor (work_order_id, work_center_id, employee_id, work_date, hours, rate, labor_type, notes) VALUES (?,?,?,?,?,?,?,?)',
      [work_order_id, work_center_id, employee_id, work_date || new Date(), hours, rate || 0, labor_type || 'run', notes]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PRODUCTION SCHEDULE ============
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const { date_from, date_to, status, range } = req.query;
    let query = `SELECT wo.*, i.item_number, i.description as item_description, 
                 wc.name as current_station_name, wc.icon as station_icon, wc.color as station_color,
                 c.company_name as customer_name, so.order_number as so_number
                 FROM work_orders wo LEFT JOIN items i ON wo.item_id = i.id
                 LEFT JOIN work_centers wc ON wo.current_station_id = wc.id
                 LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
                 LEFT JOIN customers c ON so.customer_id = c.id
                 WHERE wo.status IN ('planned','scheduled','in_progress','released')`;
    const params = [];
    // Handle range parameter from frontend (today/week/month/all)
    if (range && range !== 'all') {
      if (range === 'today') {
        query += ' AND (wo.finish_date >= CURDATE() OR wo.finish_date IS NULL)';
      } else if (range === 'week') {
        query += ' AND (wo.finish_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) OR wo.finish_date IS NULL)';
      } else if (range === 'month') {
        query += ' AND (wo.finish_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR wo.finish_date IS NULL)';
      }
    }
    if (date_from) { query += ' AND wo.start_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND wo.finish_date <= ?'; params.push(date_to); }
    query += ' ORDER BY FIELD(wo.priority,"urgent","high","normal","low"), wo.start_date ASC LIMIT 500';
    const [schedule] = await pool.query(query, params);
    res.json(schedule);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ RECUTS ============
router.get('/recuts', authenticate, async (req, res) => {
  try {
    const { work_center_id, date_from, date_to } = req.query;
    let query = 'SELECT r.*, wo.order_number as wo_number, wc.name as work_center_name, i.item_number, i.description as item_description FROM recuts r JOIN work_orders wo ON r.work_order_id = wo.id JOIN items i ON wo.item_id = i.id LEFT JOIN work_centers wc ON r.work_center_id = wc.id WHERE 1=1';
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
    const [openWOs] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('planned','scheduled','in_progress','released')");
    const [inProgress] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status = 'in_progress'");
    const [overdueWOs] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE finish_date < CURDATE() AND status NOT IN ('completed','closed','cancelled')");
    const [completedToday] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE DATE(actual_finish_date) = CURDATE()");
    const [recuts] = await pool.query("SELECT COUNT(*) as count FROM recuts WHERE MONTH(reported_at) = MONTH(NOW()) AND YEAR(reported_at) = YEAR(NOW())");
    const [byStation] = await pool.query(`
      SELECT wc.id, wc.code, wc.name, wc.icon, wc.color, COUNT(wor.id) as queue_count
      FROM work_centers wc LEFT JOIN wo_routing wor ON wor.work_center_id = wc.id AND wor.status IN ('pending','in_progress')
      LEFT JOIN work_orders wo ON wor.work_order_id = wo.id AND wo.status IN ('scheduled','in_progress','released')
      WHERE wc.is_active = TRUE GROUP BY wc.id ORDER BY wc.sequence_order`);
    const [byProductType] = await pool.query("SELECT product_type, COUNT(*) as count FROM work_orders WHERE status IN ('planned','scheduled','in_progress','released') GROUP BY product_type");
    res.json({ open_wos: openWOs[0].count, in_progress: inProgress[0].count, overdue: overdueWOs[0].count, completed_today: completedToday[0].count, monthly_recuts: recuts[0].count, by_station: byStation, by_product_type: byProductType });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// ============ WORK ORDER FABRICATION CHARGES ============
router.get('/work-orders/:id/fabrication', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT wf.*, fc.name, fc.category, fc.pricing_method,
             wf.quantity * wf.rate as total
      FROM wo_fabrication wf
      JOIN fabrication_charges fc ON wf.fabrication_charge_id = fc.id
      WHERE wf.work_order_id = ?
      ORDER BY wf.id
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/work-orders/:woId/fabrication/:fabId/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE wo_fabrication SET status = ? WHERE id = ? AND work_order_id = ?', [status, req.params.fabId, req.params.woId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
