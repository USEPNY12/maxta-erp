const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============================================================
// LAMINATION MODULE - Complete API
// ============================================================

// --- FIX SCHEMA (one-time migration helper) ---
router.post('/fix-schema', authenticate, async (req, res) => {
  try {
    const alterStatements = [
      "ALTER TABLE work_orders ADD COLUMN parent_wo_id INT DEFAULT NULL",
      "ALTER TABLE work_orders ADD COLUMN wo_category ENUM('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard'"
    ];
    const results = [];
    for (const sql of alterStatements) {
      try { await pool.query(sql); results.push({ sql: sql.substring(0, 60), status: 'added' }); }
      catch(e) { results.push({ sql: sql.substring(0, 60), status: 'exists', error: e.message.substring(0, 50) }); }
    }
    res.json({ success: true, results });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// --- DASHBOARD ---
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [rolls] = await pool.query(`SELECT 
      COUNT(*) as total_rolls,
      SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
      SUM(CASE WHEN status = 'sealed' THEN 1 ELSE 0 END) as sealed,
      SUM(CASE WHEN status = 'exhausted' THEN 1 ELSE 0 END) as exhausted,
      SUM(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status NOT IN ('exhausted','expired') THEN 1 ELSE 0 END) as expiring_soon
      FROM lami_interlayer_rolls`);
    
    const [batches] = await pool.query(`SELECT 
      COUNT(*) as total_batches,
      SUM(CASE WHEN status = 'loading' THEN 1 ELSE 0 END) as loading,
      SUM(CASE WHEN status = 'in_cycle' THEN 1 ELSE 0 END) as in_cycle,
      SUM(CASE WHEN status = 'completed' AND DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as completed_today
      FROM lami_autoclave_batches`);
    
    const [pendingWOs] = await pool.query(`SELECT COUNT(*) as count FROM work_orders 
      WHERE wo_category = 'assembly' AND status IN ('planned','scheduled','released','in_progress')
      AND (product_type LIKE '%lami%' OR interlayer_type IS NOT NULL)`);
    
    const [layups] = await pool.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'layup_complete' THEN 1 ELSE 0 END) as awaiting_prepress,
      SUM(CASE WHEN status = 'ready_for_autoclave' THEN 1 ELSE 0 END) as ready_for_autoclave
      FROM lami_layup_records WHERE status NOT IN ('completed','rejected')`);
    
    const [cleanroom] = await pool.query(`SELECT * FROM lami_cleanroom_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1`);
    
    const [childWOs] = await pool.query(`SELECT COUNT(*) as count FROM work_orders 
      WHERE wo_category IN ('glass_component','interlayer_component') AND status NOT IN ('complete','completed','closed','cancelled')`);

    res.json({
      rolls: rolls[0],
      batches: batches[0],
      pending_assembly_wos: pendingWOs[0].count,
      pending_component_wos: childWOs[0].count,
      layups: layups[0],
      active_cleanroom: cleanroom[0] || null
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- INTERLAYER ROLL INVENTORY ---
router.get('/rolls', authenticate, async (req, res) => {
  try {
    const { status, material_type } = req.query;
    let query = 'SELECT * FROM lami_interlayer_rolls WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (material_type) { query += ' AND material_type = ?'; params.push(material_type); }
    query += ' ORDER BY status ASC, expiry_date ASC';
    const [rolls] = await pool.query(query, params);
    res.json(rolls);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/rolls/:id', authenticate, async (req, res) => {
  try {
    const [rolls] = await pool.query('SELECT * FROM lami_interlayer_rolls WHERE id = ?', [req.params.id]);
    if (!rolls.length) return res.status(404).json({ error: 'Roll not found' });
    const [usage] = await pool.query(`SELECT lr.*, wo.order_number FROM lami_layup_records lr 
      LEFT JOIN work_orders wo ON lr.work_order_id = wo.id WHERE lr.roll_id = ? ORDER BY lr.created_at DESC LIMIT 20`, [req.params.id]);
    res.json({ ...rolls[0], usage_history: usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/rolls', authenticate, async (req, res) => {
  try {
    const { roll_number, material_type, thickness_mm, width_mm, original_length_m, lot_number, manufacturer, color, received_date, expiry_date, cost_per_sqm, supplier_id, po_number, notes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO lami_interlayer_rolls (roll_number, material_type, thickness_mm, width_mm, original_length_m, current_length_m, lot_number, manufacturer, color, received_date, expiry_date, cost_per_sqm, supplier_id, po_number, notes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'sealed')`,
      [roll_number, material_type, thickness_mm, width_mm, original_length_m, original_length_m, lot_number, manufacturer, color || 'Clear', received_date, expiry_date, cost_per_sqm, supplier_id, po_number, notes]
    );
    res.status(201).json({ id: result.insertId, message: 'Roll added' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/rolls/:id', authenticate, async (req, res) => {
  try {
    const { status, current_length_m, notes, opened_date } = req.body;
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (current_length_m !== undefined) { updates.push('current_length_m = ?'); params.push(current_length_m); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (opened_date) { updates.push('opened_date = ?'); params.push(opened_date); }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    params.push(req.params.id);
    await pool.query(`UPDATE lami_interlayer_rolls SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Roll updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- BOM BUILDER (Enhanced with dimensions) ---
router.get('/bom/:work_order_id', authenticate, async (req, res) => {
  try {
    const [wo] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [req.params.work_order_id]);
    if (!wo.length) return res.status(404).json({ error: 'Work Order not found' });
    
    // Get BOM lines for this WO (from bom_lines via bom_headers linked to item)
    let bomLines = [];
    if (wo[0].item_id) {
      const [headers] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = 1 ORDER BY effective_date DESC LIMIT 1', [wo[0].item_id]);
      if (headers.length) {
        const [lines] = await pool.query(`SELECT bl.*, i.item_number, i.description as item_description, i.glass_type, i.uom as item_uom
          FROM bom_lines bl LEFT JOIN items i ON bl.component_item_id = i.id WHERE bl.bom_id = ? ORDER BY bl.sequence`, [headers[0].id]);
        bomLines = lines;
      }
    }
    
    // Get child WOs if this is an assembly
    const [childWOs] = await pool.query(`SELECT id, order_number, wo_category, status, quantity, width, height, 
      glass_type, thickness, interlayer_type, description FROM work_orders WHERE parent_wo_id = ? ORDER BY wo_category, id`, [req.params.work_order_id]);
    
    res.json({ work_order: wo[0], bom_lines: bomLines, child_work_orders: childWOs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/bom/:work_order_id/lines', authenticate, async (req, res) => {
  try {
    const { component_item_id, quantity_per, width_mm, height_mm, thickness_mm, component_type, consumed_at_operation, overhang_mm, waste_percent, uom, notes } = req.body;
    const woId = req.params.work_order_id;
    
    // Get or create BOM header for this WO's item
    const [wo] = await pool.query('SELECT item_id FROM work_orders WHERE id = ?', [woId]);
    if (!wo.length) return res.status(404).json({ error: 'Work Order not found' });
    
    let bomId;
    const [existing] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1', [wo[0].item_id]);
    if (existing.length) {
      bomId = existing[0].id;
    } else {
      const [result] = await pool.query('INSERT INTO bom_headers (item_id, revision, batch_size, is_active) VALUES (?, "1", 1, 1)', [wo[0].item_id]);
      bomId = result.insertId;
    }
    
    // Get next sequence
    const [maxSeq] = await pool.query('SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq FROM bom_lines WHERE bom_id = ?', [bomId]);
    
    const [result] = await pool.query(
      `INSERT INTO bom_lines (bom_id, sequence, component_item_id, quantity_per, width_mm, height_mm, thickness_mm, component_type, consumed_at_operation, overhang_mm, waste_percent, uom, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [bomId, maxSeq[0].next_seq, component_item_id, quantity_per || 1, width_mm, height_mm, thickness_mm, component_type || 'other', consumed_at_operation, overhang_mm || 0, waste_percent || 0, uom, notes]
    );
    res.status(201).json({ id: result.insertId, bom_id: bomId, message: 'BOM line added' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/bom/lines/:id', authenticate, async (req, res) => {
  try {
    const { component_item_id, quantity_per, width_mm, height_mm, thickness_mm, component_type, consumed_at_operation, overhang_mm, waste_percent, uom, notes } = req.body;
    await pool.query(
      `UPDATE bom_lines SET component_item_id=?, quantity_per=?, width_mm=?, height_mm=?, thickness_mm=?, component_type=?, consumed_at_operation=?, overhang_mm=?, waste_percent=?, uom=?, notes=? WHERE id=?`,
      [component_item_id, quantity_per, width_mm, height_mm, thickness_mm, component_type, consumed_at_operation, overhang_mm || 0, waste_percent || 0, uom, notes, req.params.id]
    );
    res.json({ message: 'BOM line updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/bom/lines/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM bom_lines WHERE id = ?', [req.params.id]);
    res.json({ message: 'BOM line deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- BOM EXPLOSION (Generate Child WOs from BOM) ---
router.post('/bom/:work_order_id/explode', authenticate, async (req, res) => {
  try {
    const woId = req.params.work_order_id;
    const [wo] = await pool.query('SELECT * FROM work_orders WHERE id = ?', [woId]);
    if (!wo.length) return res.status(404).json({ error: 'Work Order not found' });
    
    const parentWO = wo[0];
    
    // Mark parent as assembly
    await pool.query("UPDATE work_orders SET wo_category = 'assembly' WHERE id = ?", [woId]);
    
    // Get BOM lines
    let bomLines = [];
    if (parentWO.item_id) {
      const [headers] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = 1 ORDER BY effective_date DESC LIMIT 1', [parentWO.item_id]);
      if (headers.length) {
        const [lines] = await pool.query(`SELECT bl.*, i.item_number, i.description as item_description, i.glass_type
          FROM bom_lines bl LEFT JOIN items i ON bl.component_item_id = i.id WHERE bl.bom_id = ? ORDER BY bl.sequence`, [headers[0].id]);
        bomLines = lines;
      }
    }
    
    if (bomLines.length === 0) return res.status(400).json({ error: 'No BOM lines defined. Add components to the BOM first.' });
    
    // Delete existing child WOs if re-exploding
    await pool.query("DELETE FROM work_orders WHERE parent_wo_id = ?", [woId]);
    
    const createdChildWOs = [];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      for (const line of bomLines) {
        // Generate child WO number
        const [seqResult] = await conn.query("SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)), 20000) + 1 as next_num FROM work_orders");
        const childWONumber = `WO-${seqResult[0].next_num}`;
        
        let category = 'standard';
        if (line.component_type === 'glass_lite') category = 'glass_component';
        else if (line.component_type === 'interlayer') category = 'interlayer_component';
        
        // Calculate dimensions with overhang for interlayer
        let width = line.width_mm || parentWO.width;
        let height = line.height_mm || parentWO.height;
        if (category === 'interlayer_component' && line.overhang_mm > 0) {
          width = (parseFloat(width) || 0) + (parseFloat(line.overhang_mm) * 2);
          height = (parseFloat(height) || 0) + (parseFloat(line.overhang_mm) * 2);
        }
        
        const [childResult] = await conn.query(
          `INSERT INTO work_orders (order_number, parent_wo_id, wo_category, item_id, product_type, quantity, 
           glass_type, thickness, width, height, interlayer_type, status, priority, description, sales_order_id, customer_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [childWONumber, woId, category, line.component_item_id, 
           category === 'glass_component' ? 'tempered_panel' : (category === 'interlayer_component' ? 'interlayer_cut' : parentWO.product_type),
           line.quantity_per * parentWO.quantity,
           line.glass_type || parentWO.glass_type, line.thickness_mm || parentWO.thickness,
           width, height,
           category === 'interlayer_component' ? (line.item_description || parentWO.interlayer_type) : null,
           'planned', parentWO.priority || 'normal',
           `${line.item_description || 'Component'} for ${parentWO.order_number}`,
           parentWO.sales_order_id, parentWO.customer_id]
        );
        
        createdChildWOs.push({ id: childResult.insertId, order_number: childWONumber, category, description: line.item_description });
      }
      
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    
    res.status(201).json({ message: `${createdChildWOs.length} child Work Orders created`, child_work_orders: createdChildWOs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- INTERLAYER CUTTING OPTIMIZER ---
router.get('/interlayer-optimizer/queue', authenticate, async (req, res) => {
  try {
    // Get all interlayer component WOs that need cutting
    const [queue] = await pool.query(`SELECT wo.*, pw.order_number as parent_wo_number, pw.description as parent_description
      FROM work_orders wo 
      LEFT JOIN work_orders pw ON wo.parent_wo_id = pw.id
      WHERE wo.wo_category = 'interlayer_component' AND wo.status IN ('planned','scheduled','released')
      ORDER BY wo.priority DESC, wo.start_date ASC`);
    res.json(queue);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/interlayer-optimizer/generate-plan', authenticate, async (req, res) => {
  try {
    const { roll_id, work_order_ids } = req.body;
    
    // Get roll info
    const [rolls] = await pool.query('SELECT * FROM lami_interlayer_rolls WHERE id = ?', [roll_id]);
    if (!rolls.length) return res.status(404).json({ error: 'Roll not found' });
    const roll = rolls[0];
    
    // Get WOs to cut
    const [wos] = await pool.query(`SELECT * FROM work_orders WHERE id IN (${work_order_ids.map(() => '?').join(',')})`, work_order_ids);
    
    // Strip nesting algorithm: sort by width descending, then pack along roll length
    const pieces = wos.map(wo => ({
      work_order_id: wo.id,
      width_mm: parseFloat(wo.width) || 0,
      length_mm: parseFloat(wo.height) || 0,
      quantity: parseInt(wo.quantity) || 1,
      material_type: roll.material_type,
      thickness_mm: roll.thickness_mm
    })).sort((a, b) => b.width_mm - a.width_mm);
    
    // Check if pieces fit in roll width
    const rollWidthMm = parseFloat(roll.width_mm);
    const invalidPieces = pieces.filter(p => p.width_mm > rollWidthMm);
    if (invalidPieces.length > 0) {
      return res.status(400).json({ error: `${invalidPieces.length} pieces exceed roll width (${rollWidthMm}mm). Use a wider roll.` });
    }
    
    // Calculate total length needed (simple linear nesting)
    let totalLengthMm = 0;
    const cutSequence = [];
    let seq = 1;
    for (const piece of pieces) {
      for (let i = 0; i < piece.quantity; i++) {
        // Can we nest 2 pieces side by side?
        const canNestSideBySide = pieces.some(p => p !== piece && p.width_mm + piece.width_mm <= rollWidthMm);
        totalLengthMm += piece.length_mm;
        cutSequence.push({ ...piece, sequence: seq++ });
      }
    }
    
    const totalLengthM = totalLengthMm / 1000;
    const availableLengthM = parseFloat(roll.current_length_m);
    if (totalLengthM > availableLengthM) {
      return res.status(400).json({ error: `Insufficient roll length. Need ${totalLengthM.toFixed(2)}m but only ${availableLengthM.toFixed(2)}m available.` });
    }
    
    const wastePercent = 0; // Simplified - real algo would calculate trim waste
    
    // Create cut plan
    const planNumber = `ICP-${Date.now().toString(36).toUpperCase()}`;
    const [planResult] = await pool.query(
      `INSERT INTO lami_interlayer_cut_plans (plan_number, roll_id, total_pieces, total_length_used_m, waste_percent, created_by, status)
       VALUES (?,?,?,?,?,?,'planned')`,
      [planNumber, roll_id, cutSequence.length, totalLengthM, wastePercent, req.user?.id]
    );
    
    // Insert cut lines
    for (const cut of cutSequence) {
      await pool.query(
        `INSERT INTO lami_interlayer_cut_lines (cut_plan_id, sequence, work_order_id, width_mm, length_mm, quantity, material_type, thickness_mm, overhang_mm)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [planResult.insertId, cut.sequence, cut.work_order_id, cut.width_mm, cut.length_mm, 1, cut.material_type, cut.thickness_mm, 5]
      );
    }
    
    res.status(201).json({ 
      plan_id: planResult.insertId, 
      plan_number: planNumber, 
      total_pieces: cutSequence.length, 
      total_length_m: totalLengthM,
      roll_remaining_m: availableLengthM - totalLengthM,
      cuts: cutSequence 
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/interlayer-optimizer/plans', authenticate, async (req, res) => {
  try {
    const [plans] = await pool.query(`SELECT p.*, r.roll_number, r.material_type, r.width_mm as roll_width
      FROM lami_interlayer_cut_plans p LEFT JOIN lami_interlayer_rolls r ON p.roll_id = r.id
      ORDER BY p.created_at DESC`);
    res.json(plans);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/interlayer-optimizer/plans/:id', authenticate, async (req, res) => {
  try {
    const [plans] = await pool.query(`SELECT p.*, r.roll_number, r.material_type, r.width_mm as roll_width, r.current_length_m
      FROM lami_interlayer_cut_plans p LEFT JOIN lami_interlayer_rolls r ON p.roll_id = r.id WHERE p.id = ?`, [req.params.id]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    const [lines] = await pool.query(`SELECT cl.*, wo.order_number as wo_number FROM lami_interlayer_cut_lines cl 
      LEFT JOIN work_orders wo ON cl.work_order_id = wo.id WHERE cl.cut_plan_id = ? ORDER BY cl.sequence`, [req.params.id]);
    res.json({ ...plans[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/interlayer-optimizer/plans/:id/execute', authenticate, async (req, res) => {
  try {
    const planId = req.params.id;
    const [plans] = await pool.query('SELECT * FROM lami_interlayer_cut_plans WHERE id = ?', [planId]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    
    // Update plan status
    await pool.query("UPDATE lami_interlayer_cut_plans SET status = 'completed', completed_at = NOW() WHERE id = ?", [planId]);
    
    // Deduct from roll
    const plan = plans[0];
    await pool.query("UPDATE lami_interlayer_rolls SET current_length_m = current_length_m - ?, status = IF(current_length_m - ? <= 0, 'exhausted', 'in_use'), opened_date = IFNULL(opened_date, CURDATE()) WHERE id = ?",
      [plan.total_length_used_m, plan.total_length_used_m, plan.roll_id]);
    
    // Mark cut lines as cut
    await pool.query("UPDATE lami_interlayer_cut_lines SET status = 'cut', cut_at = NOW() WHERE cut_plan_id = ?", [planId]);
    
    // Update child WOs status
    const [lines] = await pool.query('SELECT DISTINCT work_order_id FROM lami_interlayer_cut_lines WHERE cut_plan_id = ?', [planId]);
    for (const line of lines) {
      if (line.work_order_id) {
        await pool.query("UPDATE work_orders SET status = 'complete' WHERE id = ? AND wo_category = 'interlayer_component'", [line.work_order_id]);
      }
    }
    
    res.json({ message: 'Cut plan executed. Roll inventory updated.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- CLEAN ROOM ---
router.get('/cleanroom/sessions', authenticate, async (req, res) => {
  try {
    const [sessions] = await pool.query('SELECT * FROM lami_cleanroom_sessions ORDER BY start_time DESC LIMIT 50');
    res.json(sessions);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/cleanroom/sessions', authenticate, async (req, res) => {
  try {
    const { temperature_c, humidity_percent, notes } = req.body;
    const sessionNumber = `CR-${Date.now().toString(36).toUpperCase()}`;
    const [result] = await pool.query(
      `INSERT INTO lami_cleanroom_sessions (session_number, operator_id, start_time, temperature_c, humidity_percent, status, notes)
       VALUES (?,?,NOW(),?,?,'active',?)`,
      [sessionNumber, req.user?.id, temperature_c, humidity_percent, notes]
    );
    res.status(201).json({ id: result.insertId, session_number: sessionNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/cleanroom/sessions/:id/end', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE lami_cleanroom_sessions SET status = 'completed', end_time = NOW() WHERE id = ?", [req.params.id]);
    res.json({ message: 'Session ended' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- LAYUP RECORDS ---
router.get('/layups', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT lr.*, wo.order_number, r.roll_number, r.material_type
      FROM lami_layup_records lr 
      LEFT JOIN work_orders wo ON lr.work_order_id = wo.id
      LEFT JOIN lami_interlayer_rolls r ON lr.roll_id = r.id`;
    const params = [];
    if (status) { query += ' WHERE lr.status = ?'; params.push(status); }
    query += ' ORDER BY lr.created_at DESC';
    const [layups] = await pool.query(query, params);
    res.json(layups);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/layups', authenticate, async (req, res) => {
  try {
    const { work_order_id, roll_id, interlayer_width_mm, interlayer_length_mm, glass_lite_1_wo_id, glass_lite_2_wo_id, glass_lite_3_wo_id, layup_sequence, temperature_c, humidity_percent, cleanroom_session_id, pre_press_method, notes } = req.body;
    
    // Get roll lot number
    const [rolls] = await pool.query('SELECT lot_number FROM lami_interlayer_rolls WHERE id = ?', [roll_id]);
    if (!rolls.length) return res.status(404).json({ error: 'Roll not found' });
    
    const [result] = await pool.query(
      `INSERT INTO lami_layup_records (work_order_id, cleanroom_session_id, roll_id, roll_lot_number, interlayer_width_mm, interlayer_length_mm, 
       glass_lite_1_wo_id, glass_lite_2_wo_id, glass_lite_3_wo_id, layup_sequence, operator_id, temperature_c, humidity_percent, pre_press_method, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [work_order_id, cleanroom_session_id, roll_id, rolls[0].lot_number, interlayer_width_mm, interlayer_length_mm,
       glass_lite_1_wo_id, glass_lite_2_wo_id, glass_lite_3_wo_id, layup_sequence ? JSON.stringify(layup_sequence) : null,
       req.user?.id, temperature_c, humidity_percent, pre_press_method || 'nip_roller', notes]
    );
    
    // Update parent WO status
    await pool.query("UPDATE work_orders SET status = 'in_progress' WHERE id = ?", [work_order_id]);
    
    res.status(201).json({ id: result.insertId, message: 'Layup recorded' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/layups/:id/status', authenticate, async (req, res) => {
  try {
    const { status, pre_press_time_min, qc_passed, qc_notes } = req.body;
    const updates = ['status = ?'];
    const params = [status];
    if (pre_press_time_min) { updates.push('pre_press_time_min = ?'); params.push(pre_press_time_min); }
    if (qc_passed !== undefined) { updates.push('qc_passed = ?'); params.push(qc_passed); }
    if (qc_notes) { updates.push('qc_notes = ?'); params.push(qc_notes); }
    params.push(req.params.id);
    await pool.query(`UPDATE lami_layup_records SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Layup status updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- AUTOCLAVE RECIPES ---
router.get('/autoclave/recipes', authenticate, async (req, res) => {
  try {
    const [recipes] = await pool.query('SELECT * FROM lami_autoclave_recipes WHERE is_active = 1 ORDER BY interlayer_type, min_thickness_mm');
    res.json(recipes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/autoclave/recipes', authenticate, async (req, res) => {
  try {
    const { recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required, notes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO lami_autoclave_recipes (recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required || 0, notes]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- AUTOCLAVE BATCHES ---
router.get('/autoclave/batches', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT b.*, r.recipe_name, r.recipe_code, r.target_temperature_c, r.max_pressure_bar, r.total_cycle_hours
      FROM lami_autoclave_batches b LEFT JOIN lami_autoclave_recipes r ON b.recipe_id = r.id`;
    const params = [];
    if (status) { query += ' WHERE b.status = ?'; params.push(status); }
    query += ' ORDER BY b.created_at DESC';
    const [batches] = await pool.query(query, params);
    res.json(batches);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/autoclave/batches/:id', authenticate, async (req, res) => {
  try {
    const [batches] = await pool.query(`SELECT b.*, r.recipe_name, r.recipe_code, r.target_temperature_c, r.max_pressure_bar, r.total_cycle_hours, r.soak_time_min, r.ramp_rate_c_per_min, r.cooling_rate_c_per_min
      FROM lami_autoclave_batches b LEFT JOIN lami_autoclave_recipes r ON b.recipe_id = r.id WHERE b.id = ?`, [req.params.id]);
    if (!batches.length) return res.status(404).json({ error: 'Batch not found' });
    const [items] = await pool.query(`SELECT bi.*, wo.order_number, wo.description as wo_description
      FROM lami_autoclave_batch_items bi LEFT JOIN work_orders wo ON bi.work_order_id = wo.id WHERE bi.batch_id = ? ORDER BY bi.position_in_load`, [req.params.id]);
    res.json({ ...batches[0], items });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/autoclave/batches', authenticate, async (req, res) => {
  try {
    const { recipe_id, interlayer_type, notes } = req.body;
    const batchNumber = `ACB-${Date.now().toString(36).toUpperCase()}`;
    const [result] = await pool.query(
      `INSERT INTO lami_autoclave_batches (batch_number, recipe_id, interlayer_type, operator_id, notes, status)
       VALUES (?,?,?,?,?,'loading')`,
      [batchNumber, recipe_id, interlayer_type, req.user?.id, notes]
    );
    res.status(201).json({ id: result.insertId, batch_number: batchNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/autoclave/batches/:id/add-item', authenticate, async (req, res) => {
  try {
    const { work_order_id, layup_record_id, position_in_load, width_mm, height_mm, total_thickness_mm } = req.body;
    const sqm = (width_mm * height_mm) / 1000000;
    
    // Validate batch is in loading state
    const [batches] = await pool.query('SELECT * FROM lami_autoclave_batches WHERE id = ? AND status = "loading"', [req.params.id]);
    if (!batches.length) return res.status(400).json({ error: 'Batch is not in loading state' });
    
    const [result] = await pool.query(
      `INSERT INTO lami_autoclave_batch_items (batch_id, work_order_id, layup_record_id, position_in_load, width_mm, height_mm, total_thickness_mm, sqm)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.params.id, work_order_id, layup_record_id, position_in_load, width_mm, height_mm, total_thickness_mm, sqm]
    );
    
    // Update batch totals
    await pool.query(`UPDATE lami_autoclave_batches SET total_pieces = total_pieces + 1, total_sqm = total_sqm + ? WHERE id = ?`, [sqm, req.params.id]);
    
    // Update layup record status
    if (layup_record_id) {
      await pool.query("UPDATE lami_layup_records SET status = 'in_autoclave' WHERE id = ?", [layup_record_id]);
    }
    
    res.status(201).json({ id: result.insertId, message: 'Item added to batch' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/autoclave/batches/:id/start-cycle', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE lami_autoclave_batches SET status = 'in_cycle', cycle_start = NOW() WHERE id = ? AND status IN ('loading','loaded')", [req.params.id]);
    res.json({ message: 'Autoclave cycle started' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/autoclave/batches/:id/complete', authenticate, async (req, res) => {
  try {
    const { actual_temp_max, actual_pressure_max, qc_passed, qc_notes } = req.body;
    await pool.query(
      `UPDATE lami_autoclave_batches SET status = 'completed', cycle_end = NOW(), actual_temp_max = ?, actual_pressure_max = ?, qc_passed = ?, qc_notes = ?, qc_date = NOW() WHERE id = ?`,
      [actual_temp_max, actual_pressure_max, qc_passed, qc_notes, req.params.id]
    );
    
    // Update all batch items and their WOs
    if (qc_passed) {
      await pool.query("UPDATE lami_autoclave_batch_items SET status = 'completed' WHERE batch_id = ?", [req.params.id]);
      const [items] = await pool.query('SELECT work_order_id FROM lami_autoclave_batch_items WHERE batch_id = ?', [req.params.id]);
      for (const item of items) {
        await pool.query("UPDATE work_orders SET status = 'complete' WHERE id = ? AND wo_category = 'assembly'", [item.work_order_id]);
        await pool.query("UPDATE lami_layup_records SET status = 'completed' WHERE work_order_id = ?", [item.work_order_id]);
      }
    }
    
    res.json({ message: 'Autoclave batch completed' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ASSEMBLY QUEUE (WOs ready for lamination) ---
router.get('/assembly-queue', authenticate, async (req, res) => {
  try {
    const [queue] = await pool.query(`
      SELECT wo.*, 
        (SELECT COUNT(*) FROM work_orders cwo WHERE cwo.parent_wo_id = wo.id AND cwo.wo_category = 'glass_component' AND cwo.status IN ('complete','completed')) as glass_lites_ready,
        (SELECT COUNT(*) FROM work_orders cwo WHERE cwo.parent_wo_id = wo.id AND cwo.wo_category = 'glass_component') as glass_lites_total,
        (SELECT COUNT(*) FROM work_orders cwo WHERE cwo.parent_wo_id = wo.id AND cwo.wo_category = 'interlayer_component' AND cwo.status IN ('complete','completed')) as interlayers_ready,
        (SELECT COUNT(*) FROM work_orders cwo WHERE cwo.parent_wo_id = wo.id AND cwo.wo_category = 'interlayer_component') as interlayers_total
      FROM work_orders wo 
      WHERE wo.wo_category = 'assembly' AND wo.status IN ('planned','scheduled','released','in_progress')
      ORDER BY wo.priority DESC, wo.start_date ASC`);
    res.json(queue);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
