const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');

// ============================================================
// GLASS CUTTING OPTIMIZATION ENGINE
// Guillotine-based 2D bin packing for flat glass fabrication
// ============================================================

// EDGE ALLOWANCE between pieces (1/8" = 0.125")
const EDGE_ALLOWANCE = 0.125;
// Minimum remnant size to keep (below this = scrap)
const MIN_REMNANT_WIDTH = 12;
const MIN_REMNANT_HEIGHT = 12;

// ============================================================
// GUILLOTINE CUTTING ALGORITHM
// ============================================================
function optimizeCutPlan(sheetWidth, sheetHeight, pieces) {
  // pieces = [{id, width, height, label, wo_id, so_id, customer, order_number, qty}]
  // Expand pieces by quantity
  const expandedPieces = [];
  pieces.forEach(p => {
    const qty = p.qty || 1;
    for (let i = 0; i < qty; i++) {
      expandedPieces.push({
        ...p,
        width: parseFloat(p.width) + EDGE_ALLOWANCE,
        height: parseFloat(p.height) + EDGE_ALLOWANCE,
        originalWidth: parseFloat(p.width),
        originalHeight: parseFloat(p.height),
        instance: i + 1
      });
    }
  });

  // Sort pieces by area (largest first) - greedy heuristic
  expandedPieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  // Guillotine shelf algorithm
  const placed = [];
  const notPlaced = [];
  
  // Available rectangles (free spaces on the sheet)
  let freeRects = [{ x: 0, y: 0, w: sheetWidth, h: sheetHeight }];

  for (const piece of expandedPieces) {
    let bestRect = null;
    let bestFit = Infinity;
    let bestRotated = false;
    let bestIdx = -1;

    // Try to fit in each free rectangle (both orientations)
    for (let i = 0; i < freeRects.length; i++) {
      const rect = freeRects[i];
      
      // Normal orientation
      if (piece.width <= rect.w && piece.height <= rect.h) {
        const fit = Math.min(rect.w - piece.width, rect.h - piece.height);
        if (fit < bestFit) {
          bestFit = fit;
          bestRect = rect;
          bestRotated = false;
          bestIdx = i;
        }
      }
      
      // Rotated 90 degrees
      if (piece.height <= rect.w && piece.width <= rect.h) {
        const fit = Math.min(rect.w - piece.height, rect.h - piece.width);
        if (fit < bestFit) {
          bestFit = fit;
          bestRect = rect;
          bestRotated = true;
          bestIdx = i;
        }
      }
    }

    if (bestRect) {
      const pw = bestRotated ? piece.height : piece.width;
      const ph = bestRotated ? piece.width : piece.height;

      placed.push({
        ...piece,
        x: bestRect.x,
        y: bestRect.y,
        placedWidth: pw - EDGE_ALLOWANCE,
        placedHeight: ph - EDGE_ALLOWANCE,
        rotated: bestRotated
      });

      // Split the free rectangle using guillotine cut
      // Choose split direction that maximizes larger remnant
      freeRects.splice(bestIdx, 1);
      
      const rightW = bestRect.w - pw;
      const topH = bestRect.h - ph;

      // Horizontal split first (creates right piece and top piece)
      if (rightW > EDGE_ALLOWANCE) {
        freeRects.push({ x: bestRect.x + pw, y: bestRect.y, w: rightW, h: bestRect.h });
      }
      if (topH > EDGE_ALLOWANCE) {
        freeRects.push({ x: bestRect.x, y: bestRect.y + ph, w: pw, h: topH });
      }
    } else {
      notPlaced.push(piece);
    }
  }

  // Calculate remnants from remaining free rectangles
  const remnants = freeRects
    .filter(r => r.w >= MIN_REMNANT_WIDTH && r.h >= MIN_REMNANT_HEIGHT)
    .map(r => ({
      x: r.x,
      y: r.y,
      width: parseFloat(r.w.toFixed(4)),
      height: parseFloat(r.h.toFixed(4)),
      area_sqft: parseFloat(((r.w * r.h) / 144).toFixed(2)),
      disposition: 'keep'
    }));

  const scrap = freeRects
    .filter(r => r.w < MIN_REMNANT_WIDTH || r.h < MIN_REMNANT_HEIGHT)
    .map(r => ({
      x: r.x,
      y: r.y,
      width: parseFloat(r.w.toFixed(4)),
      height: parseFloat(r.h.toFixed(4)),
      area_sqft: parseFloat(((r.w * r.h) / 144).toFixed(2)),
      disposition: 'scrap'
    }));

  const sheetArea = sheetWidth * sheetHeight;
  const usedArea = placed.reduce((sum, p) => sum + (p.placedWidth * p.placedHeight), 0);
  const utilization = (usedArea / sheetArea) * 100;
  const wasteArea = sheetArea - usedArea;

  return {
    placed,
    notPlaced,
    remnants,
    scrap,
    stats: {
      sheetWidth,
      sheetHeight,
      sheetArea_sqft: parseFloat((sheetArea / 144).toFixed(2)),
      usedArea_sqft: parseFloat((usedArea / 144).toFixed(2)),
      wasteArea_sqft: parseFloat((wasteArea / 144).toFixed(2)),
      utilization_pct: parseFloat(utilization.toFixed(1)),
      waste_pct: parseFloat((100 - utilization).toFixed(1)),
      totalPieces: placed.length,
      piecesNotFit: notPlaced.length,
      remnantCount: remnants.length,
      scrapCount: scrap.length
    }
  };
}

// ============================================================
// SHEET STOCK ENDPOINTS
// ============================================================

// GET all sheet stock
router.get('/sheets', auth, async (req, res) => {
  try {
    const { glass_type, thickness } = req.query;
    let query = 'SELECT * FROM sheet_stock WHERE 1=1';
    const params = [];
    if (glass_type) { query += ' AND glass_type = ?'; params.push(glass_type); }
    if (thickness) { query += ' AND thickness = ?'; params.push(thickness); }
    query += ' ORDER BY glass_type, thickness, width DESC';
    const [sheets] = await pool.query(query, params);
    res.json(sheets);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST add sheet stock
router.post('/sheets', auth, async (req, res) => {
  try {
    const { glass_type, thickness, width, height, qty_on_hand, cost_per_sheet, location, supplier, min_qty, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO sheet_stock (glass_type, thickness, width, height, qty_on_hand, cost_per_sheet, location, supplier, min_qty, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [glass_type, thickness, width, height, qty_on_hand || 0, cost_per_sheet || 0, location || 'Main Warehouse', supplier, min_qty || 0, notes]
    );
    res.json({ id: result.insertId, message: 'Sheet stock added' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT update sheet stock
router.put('/sheets/:id', auth, async (req, res) => {
  try {
    const { glass_type, thickness, width, height, qty_on_hand, cost_per_sheet, location, supplier, min_qty, notes } = req.body;
    await pool.query(
      'UPDATE sheet_stock SET glass_type=?, thickness=?, width=?, height=?, qty_on_hand=?, cost_per_sheet=?, location=?, supplier=?, min_qty=?, notes=? WHERE id=?',
      [glass_type, thickness, width, height, qty_on_hand, cost_per_sheet, location, supplier, min_qty, notes, req.params.id]
    );
    res.json({ message: 'Sheet stock updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE sheet stock
router.delete('/sheets/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM sheet_stock WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sheet stock deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// REMNANT ENDPOINTS
// ============================================================

// GET all remnants
router.get('/remnants', auth, async (req, res) => {
  try {
    const { glass_type, thickness, status, min_width, min_height } = req.query;
    let query = 'SELECT * FROM remnants WHERE 1=1';
    const params = [];
    if (glass_type) { query += ' AND glass_type = ?'; params.push(glass_type); }
    if (thickness) { query += ' AND thickness = ?'; params.push(thickness); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    else { query += " AND status = 'available'"; }
    if (min_width) { query += ' AND width >= ?'; params.push(min_width); }
    if (min_height) { query += ' AND height >= ?'; params.push(min_height); }
    query += ' ORDER BY (width * height) DESC';
    const [remnants] = await pool.query(query, params);
    res.json(remnants);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST add remnant manually
router.post('/remnants', auth, async (req, res) => {
  try {
    const { glass_type, thickness, width, height, location, rack_position, quality, cost, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO remnants (glass_type, thickness, width, height, location, rack_position, quality, cost, notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [glass_type, thickness, width, height, location || 'Remnant Rack', rack_position, quality || 'good', cost || 0, notes]
    );
    res.json({ id: result.insertId, message: 'Remnant added' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT update remnant (change status, location, etc.)
router.put('/remnants/:id', auth, async (req, res) => {
  try {
    const allowedFields = ['status', 'location', 'notes', 'width_mm', 'height_mm', 'glass_type', 'thickness_mm', 'quality_grade'];
    const fields = req.body;
    const safeKeys = Object.keys(fields).filter(k => allowedFields.includes(k));
    if (safeKeys.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const sets = safeKeys.map(k => `${k} = ?`).join(', ');
    const values = safeKeys.map(k => fields[k]);
    await pool.query(`UPDATE remnants SET ${sets} WHERE id = ?`, [...values, req.params.id]);
    res.json({ message: 'Remnant updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST scrap a remnant
router.post('/remnants/:id/scrap', auth, async (req, res) => {
  try {
    await pool.query("UPDATE remnants SET status = 'scrapped' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Remnant scrapped' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET find remnants that can fit a specific piece
router.get('/remnants/find-fit', auth, async (req, res) => {
  try {
    const { width, height, glass_type, thickness } = req.query;
    const w = parseFloat(width);
    const h = parseFloat(height);
    // Find remnants where piece fits (either orientation)
    const [remnants] = await pool.query(
      `SELECT *, 
        CASE WHEN width >= ? AND height >= ? THEN 'normal'
             WHEN width >= ? AND height >= ? THEN 'rotated'
        END as fit_orientation,
        (width * height) - (? * ?) as waste_area
      FROM remnants 
      WHERE status = 'available' AND glass_type = ? AND thickness = ?
        AND ((width >= ? AND height >= ?) OR (width >= ? AND height >= ?))
      ORDER BY (width * height) ASC`,
      [w, h, h, w, w, h, glass_type, thickness, w, h, h, w]
    );
    res.json(remnants);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CUT PLAN ENDPOINTS
// ============================================================

// GET all cut plans
router.get('/plans', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM cut_plans WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const [plans] = await pool.query(query, params);
    res.json(plans);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET single cut plan with pieces and remnants
router.get('/plans/:id', auth, async (req, res) => {
  try {
    const [plans] = await pool.query('SELECT * FROM cut_plans WHERE id = ?', [req.params.id]);
    if (plans.length === 0) return res.status(404).json({ error: 'Cut plan not found' });
    const [pieces] = await pool.query('SELECT * FROM cut_plan_pieces WHERE cut_plan_id = ? ORDER BY id', [req.params.id]);
    const [remnants] = await pool.query('SELECT * FROM cut_plan_remnants WHERE cut_plan_id = ? ORDER BY id', [req.params.id]);
    res.json({ ...plans[0], pieces, remnants });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST optimize - run the cutting algorithm
router.post('/optimize', auth, async (req, res) => {
  try {
    const { sheetWidth, sheetHeight, glass_type, thickness, pieces, source_type, source_id } = req.body;
    // pieces = [{width, height, label, wo_id, so_id, customer, order_number, qty}]
    
    if (!sheetWidth || !sheetHeight || !pieces || pieces.length === 0) {
      return res.status(400).json({ error: 'Sheet dimensions and at least one piece required' });
    }

    const result = optimizeCutPlan(
      parseFloat(sheetWidth),
      parseFloat(sheetHeight),
      pieces
    );

    res.json({
      ...result,
      source: { type: source_type, id: source_id, glass_type, thickness }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST save a cut plan (after optimization)
router.post('/plans', auth, async (req, res) => {
  try {
    const { glass_type, thickness, source_type, source_sheet_id, source_remnant_id,
            sheet_width, sheet_height, pieces, remnants, stats, operator, notes } = req.body;

    // Generate plan number
    const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM cut_plans');
    const planNumber = `CP-${String(countResult[0].cnt + 1).padStart(4, '0')}`;

    const [planResult] = await pool.query(
      `INSERT INTO cut_plans (plan_number, plan_date, glass_type, thickness, source_type, source_sheet_id, source_remnant_id,
        sheet_width, sheet_height, total_pieces, utilization_pct, waste_pct, waste_sqft, operator, notes, created_by)
      VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planNumber, glass_type, thickness, source_type, source_sheet_id || null, source_remnant_id || null,
        sheet_width, sheet_height, stats.totalPieces, stats.utilization_pct, stats.waste_pct, stats.wasteArea_sqft,
        operator, notes, req.user.id]
    );
    const planId = planResult.insertId;

    // Save pieces
    if (pieces && pieces.length > 0) {
      for (const p of pieces) {
        await pool.query(
          `INSERT INTO cut_plan_pieces (cut_plan_id, work_order_id, sales_order_id, item_id, piece_width, piece_height, x_position, y_position, rotated, label, customer_name, order_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [planId, p.wo_id || null, p.so_id || null, p.item_id || null, p.placedWidth, p.placedHeight, p.x, p.y, p.rotated ? 1 : 0, p.label, p.customer, p.order_number]
        );
      }
    }

    // Save remnants
    if (remnants && remnants.length > 0) {
      for (const r of remnants) {
        await pool.query(
          'INSERT INTO cut_plan_remnants (cut_plan_id, width, height, x_position, y_position, disposition) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, r.width, r.height, r.x, r.y, r.disposition]
        );
      }
    }

    // Decrease sheet stock if source is a sheet
    if (source_type === 'sheet' && source_sheet_id) {
      await pool.query('UPDATE sheet_stock SET qty_on_hand = GREATEST(qty_on_hand - 1, 0) WHERE id = ?', [source_sheet_id]);
    }
    // Mark remnant as consumed if source is a remnant
    if (source_type === 'remnant' && source_remnant_id) {
      await pool.query("UPDATE remnants SET status = 'consumed' WHERE id = ?", [source_remnant_id]);
    }

    res.json({ id: planId, plan_number: planNumber, message: 'Cut plan saved' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST complete a cut plan (creates remnants in inventory)
router.post('/plans/:id/complete', auth, async (req, res) => {
  try {
    const planId = req.params.id;
    const [plans] = await pool.query('SELECT * FROM cut_plans WHERE id = ?', [planId]);
    if (plans.length === 0) return res.status(404).json({ error: 'Cut plan not found' });
    const plan = plans[0];

    // Get remnants from the plan that should be kept
    const [planRemnants] = await pool.query("SELECT * FROM cut_plan_remnants WHERE cut_plan_id = ? AND disposition = 'keep'", [planId]);

    // Create actual remnant inventory entries
    for (const r of planRemnants) {
      await pool.query(
        `INSERT INTO remnants (glass_type, thickness, width, height, location, quality, source_sheet_id, source_cut_plan_id, status, cost)
        VALUES (?, ?, ?, ?, 'Remnant Rack', 'good', ?, ?, 'available', ?)`,
        [plan.glass_type, plan.thickness, r.width, r.height, plan.source_sheet_id, planId,
          parseFloat(((r.width * r.height) / (plan.sheet_width * plan.sheet_height) * (plan.source_sheet_id ? 185 : 0)).toFixed(2))]
      );
    }

    // Mark plan as completed
    await pool.query("UPDATE cut_plans SET status = 'completed' WHERE id = ?", [planId]);

    res.json({ message: 'Cut plan completed, remnants added to inventory', remnants_created: planRemnants.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// SMART SUGGESTIONS - Find orders that can share a sheet
// ============================================================

// GET suggest pieces from open WOs/SOs for a given glass type/thickness
router.get('/suggest-pieces', auth, async (req, res) => {
  try {
    const { glass_type, thickness, exclude_wo_id } = req.query;
    
    // Find open work orders with matching glass type/thickness
    let query = `SELECT wo.id as wo_id, wo.order_number, wo.width, wo.height, wo.qty_ordered,
                  wo.product_type, wo.glass_type, wo.thickness,
                  c.company_name as customer_name, so.order_number as so_number
                FROM work_orders wo
                LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
                LEFT JOIN customers c ON so.customer_id = c.id
                WHERE wo.status IN ('planned','scheduled','released')
                  AND wo.glass_type = ? AND wo.thickness = ?`;
    const params = [glass_type, thickness];
    
    if (exclude_wo_id) {
      query += ' AND wo.id != ?';
      params.push(exclude_wo_id);
    }
    query += ' ORDER BY wo.priority DESC, wo.start_date ASC LIMIT 50';
    
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [sheetStats] = await pool.query('SELECT COUNT(*) as types, SUM(qty_on_hand) as total_sheets FROM sheet_stock');
    const [remnantStats] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(width*height/144),0) as total_sqft FROM remnants WHERE status = 'available'");
    const [planStats] = await pool.query("SELECT COUNT(*) as total, AVG(utilization_pct) as avg_utilization FROM cut_plans WHERE status = 'completed'");
    const [recentPlans] = await pool.query("SELECT * FROM cut_plans ORDER BY created_at DESC LIMIT 5");
    
    res.json({
      sheets: { types: sheetStats[0].types, total: sheetStats[0].total_sheets },
      remnants: { count: remnantStats[0].count, total_sqft: parseFloat(remnantStats[0].total_sqft || 0).toFixed(1) },
      plans: { total: planStats[0].total, avg_utilization: parseFloat(planStats[0].avg_utilization || 0).toFixed(1) },
      recent_plans: recentPlans
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
