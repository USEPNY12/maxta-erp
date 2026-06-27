const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ==================== RACKS ====================

// GET /api/dispatch/racks
router.get('/racks', async (req, res) => {
  try {
    const { status, type } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (type) { where += ' AND rack_type = ?'; params.push(type); }
    const [rows] = await pool.query(`SELECT r.*, (SELECT COUNT(*) FROM rack_loads rl WHERE rl.rack_id = r.id AND rl.status IN ('loading','loaded','in-transit')) as active_loads FROM racks r WHERE ${where} ORDER BY rack_number`, params);
    res.json({ racks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispatch/racks
router.post('/racks', async (req, res) => {
  try {
    const { rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, notes } = req.body;
    const [result] = await pool.query('INSERT INTO racks (rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, notes) VALUES (?,?,?,?,?,?,?,?)',
      [rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, notes]);
    res.json({ id: result.insertId, message: 'Rack created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id
router.put('/racks/:id', async (req, res) => {
  try {
    const { rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, status, current_location, notes } = req.body;
    await pool.query('UPDATE racks SET rack_type=?, capacity_sqft=?, capacity_pieces=?, max_weight_lbs=?, max_height_inches=?, max_width_inches=?, status=?, current_location=?, notes=? WHERE id=?',
      [rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, status, current_location, notes, req.params.id]);
    res.json({ message: 'Rack updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id/status
router.put('/racks/:id/status', async (req, res) => {
  try {
    const { status, current_location } = req.body;
    await pool.query('UPDATE racks SET status = ?, current_location = ? WHERE id = ?', [status, current_location || null, req.params.id]);
    res.json({ message: 'Rack status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== RACK LOADS ====================

// POST /api/dispatch/racks/:id/load
router.post('/racks/:id/load', async (req, res) => {
  try {
    const { shipment_id, work_order_id, sales_order_id, load_sequence, piece_count, total_weight_lbs, total_sqft, notes } = req.body;
    const [result] = await pool.query('INSERT INTO rack_loads (rack_id, shipment_id, work_order_id, sales_order_id, loaded_by, load_sequence, piece_count, total_weight_lbs, total_sqft, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [req.params.id, shipment_id, work_order_id, sales_order_id, req.user.id, load_sequence, piece_count, total_weight_lbs, total_sqft, notes, 'loaded']);
    await pool.query('UPDATE racks SET status = ? WHERE id = ?', ['loaded', req.params.id]);
    res.json({ id: result.insertId, message: 'Rack loaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id/unload
router.put('/racks/:id/unload', async (req, res) => {
  try {
    await pool.query("UPDATE rack_loads SET status = 'unloaded', unloaded_at = NOW(), unloaded_by = ? WHERE rack_id = ? AND status IN ('loaded','in-transit','delivered')", [req.user.id, req.params.id]);
    await pool.query("UPDATE racks SET status = 'available', current_location = 'Warehouse', current_shipment_id = NULL WHERE id = ?", [req.params.id]);
    res.json({ message: 'Rack unloaded and returned to available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DISPATCH ROUTES ====================

// GET /api/dispatch/routes
router.get('/routes', async (req, res) => {
  try {
    const { status, date } = req.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND dr.status = ?'; params.push(status); }
    if (date) { where += ' AND dr.route_date = ?'; params.push(date); }
    const [rows] = await pool.query(`SELECT dr.*, (SELECT COUNT(*) FROM dispatch_stops ds WHERE ds.route_id = dr.id) as stop_count, (SELECT COUNT(*) FROM dispatch_stops ds WHERE ds.route_id = dr.id AND ds.status = 'delivered') as delivered_count FROM dispatch_routes dr WHERE ${where} ORDER BY dr.route_date DESC, dr.route_number`, params);
    res.json({ routes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispatch/routes
router.post('/routes', async (req, res) => {
  try {
    const { route_date, driver_name, vehicle, estimated_start, estimated_end, notes } = req.body;
    // Generate route number
    const [count] = await pool.query("SELECT COUNT(*) as c FROM dispatch_routes WHERE route_date = ?", [route_date]);
    const routeNum = `RT-${route_date.replace(/-/g, '')}-${String((count[0].c || 0) + 1).padStart(2, '0')}`;
    const [result] = await pool.query('INSERT INTO dispatch_routes (route_number, route_date, driver_name, vehicle, estimated_start, estimated_end, notes, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [routeNum, route_date, driver_name, vehicle, estimated_start, estimated_end, notes, req.user.id]);
    res.json({ id: result.insertId, route_number: routeNum, message: 'Route created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dispatch/routes/:id
router.get('/routes/:id', async (req, res) => {
  try {
    const [routes] = await pool.query('SELECT * FROM dispatch_routes WHERE id = ?', [req.params.id]);
    if (!routes.length) return res.status(404).json({ error: 'Route not found' });
    const [stops] = await pool.query('SELECT ds.*, c.company_name as customer_name, s.shipment_number FROM dispatch_stops ds LEFT JOIN customers c ON ds.customer_id = c.id LEFT JOIN shipments s ON ds.shipment_id = s.id WHERE ds.route_id = ? ORDER BY ds.stop_sequence', [req.params.id]);
    res.json({ route: routes[0], stops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/routes/:id
router.put('/routes/:id', async (req, res) => {
  try {
    const { driver_name, vehicle, status, estimated_start, estimated_end, actual_start, actual_end, notes } = req.body;
    await pool.query('UPDATE dispatch_routes SET driver_name=?, vehicle=?, status=?, estimated_start=?, estimated_end=?, actual_start=?, actual_end=?, notes=? WHERE id=?',
      [driver_name, vehicle, status, estimated_start, estimated_end, actual_start, actual_end, notes, req.params.id]);
    res.json({ message: 'Route updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DISPATCH STOPS ====================

// POST /api/dispatch/routes/:id/stops
router.post('/routes/:id/stops', async (req, res) => {
  try {
    const { shipment_id, customer_id, address, city, state, zip, contact_name, contact_phone, estimated_arrival, rack_ids } = req.body;
    // Get next sequence
    const [maxSeq] = await pool.query('SELECT MAX(stop_sequence) as max_seq FROM dispatch_stops WHERE route_id = ?', [req.params.id]);
    const seq = (maxSeq[0].max_seq || 0) + 1;
    const [result] = await pool.query('INSERT INTO dispatch_stops (route_id, stop_sequence, shipment_id, customer_id, address, city, state, zip, contact_name, contact_phone, estimated_arrival, rack_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.params.id, seq, shipment_id, customer_id, address, city, state, zip, contact_name, contact_phone, estimated_arrival, JSON.stringify(rack_ids || [])]);
    // Update route stop count
    await pool.query('UPDATE dispatch_routes SET total_stops = (SELECT COUNT(*) FROM dispatch_stops WHERE route_id = ?) WHERE id = ?', [req.params.id, req.params.id]);
    res.json({ id: result.insertId, message: 'Stop added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/stops/:id/deliver
router.put('/stops/:id/deliver', async (req, res) => {
  try {
    const { delivery_notes, racks_returned } = req.body;
    await pool.query("UPDATE dispatch_stops SET status = 'delivered', actual_arrival = NOW(), delivery_notes = ?, racks_returned = ? WHERE id = ?",
      [delivery_notes, JSON.stringify(racks_returned || []), req.params.id]);
    // Mark returned racks as available
    if (racks_returned && racks_returned.length) {
      await pool.query(`UPDATE racks SET status = 'available', current_location = 'Warehouse' WHERE id IN (${racks_returned.map(() => '?').join(',')})`, racks_returned);
    }
    res.json({ message: 'Delivery confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== RACK SLOTS ====================

// GET /api/dispatch/racks/:id/slots - Get all slots for a rack
router.get('/racks/:id/slots', async (req, res) => {
  try {
    const [slots] = await pool.query(
      `SELECT rs.*, wo.order_number as wo_number, c.company_name as customer_name
       FROM rack_slots rs
       LEFT JOIN work_orders wo ON rs.work_order_id = wo.id
       LEFT JOIN sales_orders so ON rs.sales_order_id = so.id
       LEFT JOIN customers c ON so.customer_id = c.id
       WHERE rs.rack_id = ?
       ORDER BY rs.slot_number`, [req.params.id]);
    const [rack] = await pool.query('SELECT * FROM racks WHERE id = ?', [req.params.id]);
    res.json({ rack: rack[0] || null, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispatch/racks/:id/slots/load - Load a piece into a specific slot
router.post('/racks/:id/slots/load', async (req, res) => {
  try {
    const { slot_number, work_order_id, sales_order_id, item_description, width, height, thickness, piece_count, notes } = req.body;
    if (!slot_number) return res.status(400).json({ error: 'slot_number is required' });

    // Check slot is available
    const [existing] = await pool.query(
      "SELECT * FROM rack_slots WHERE rack_id = ? AND slot_number = ? AND status IN ('empty','reserved')",
      [req.params.id, slot_number]);
    if (existing.length === 0) {
      return res.status(400).json({ error: 'Slot is not available (occupied or damaged)' });
    }

    await pool.query(
      `UPDATE rack_slots SET status = 'occupied', work_order_id = ?, sales_order_id = ?,
       item_description = ?, width = ?, height = ?, thickness = ?, piece_count = ?,
       loaded_at = NOW(), loaded_by = ?, notes = ?
       WHERE rack_id = ? AND slot_number = ?`,
      [work_order_id || null, sales_order_id || null, item_description, width, height, thickness,
       piece_count || 1, req.user.id, notes, req.params.id, slot_number]);

    // Update rack active_loads count
    await pool.query(
      "UPDATE racks SET active_loads = (SELECT COUNT(*) FROM rack_slots WHERE rack_id = ? AND status = 'occupied') WHERE id = ?",
      [req.params.id, req.params.id]);

    res.json({ message: `Slot ${slot_number} loaded successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id/slots/:slotNum/unload - Unload a specific slot
router.put('/racks/:id/slots/:slotNum/unload', async (req, res) => {
  try {
    await pool.query(
      `UPDATE rack_slots SET status = 'empty', work_order_id = NULL, sales_order_id = NULL,
       item_description = NULL, width = NULL, height = NULL, thickness = NULL,
       piece_count = 0, loaded_at = NULL, loaded_by = NULL, reserved_for_shipment_id = NULL, notes = NULL
       WHERE rack_id = ? AND slot_number = ?`,
      [req.params.id, req.params.slotNum]);

    // Update rack active_loads count
    await pool.query(
      "UPDATE racks SET active_loads = (SELECT COUNT(*) FROM rack_slots WHERE rack_id = ? AND status = 'occupied') WHERE id = ?",
      [req.params.id, req.params.id]);

    res.json({ message: `Slot ${req.params.slotNum} unloaded` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id/slots/:slotNum/reserve - Reserve a slot for a shipment
router.put('/racks/:id/slots/:slotNum/reserve', async (req, res) => {
  try {
    const { shipment_id, work_order_id, notes } = req.body;
    await pool.query(
      `UPDATE rack_slots SET status = 'reserved', reserved_for_shipment_id = ?,
       work_order_id = ?, notes = ?
       WHERE rack_id = ? AND slot_number = ? AND status = 'empty'`,
      [shipment_id || null, work_order_id || null, notes, req.params.id, req.params.slotNum]);
    res.json({ message: `Slot ${req.params.slotNum} reserved` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispatch/racks/:id/slots/:slotNum/damage - Mark a slot as damaged
router.put('/racks/:id/slots/:slotNum/damage', async (req, res) => {
  try {
    const { notes } = req.body;
    await pool.query(
      "UPDATE rack_slots SET status = 'damaged', notes = ? WHERE rack_id = ? AND slot_number = ?",
      [notes || 'Damaged', req.params.id, req.params.slotNum]);
    res.json({ message: `Slot ${req.params.slotNum} marked as damaged` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dispatch/slots/available - Find available slots across all racks
router.get('/slots/available', async (req, res) => {
  try {
    const { min_width, min_height } = req.query;
    let query = `SELECT rs.*, r.rack_number, r.rack_type, r.current_location
      FROM rack_slots rs
      JOIN racks r ON rs.rack_id = r.id
      WHERE rs.status = 'empty' AND r.status != 'out-of-service'`;
    const params = [];
    query += ' ORDER BY r.rack_number, rs.slot_number';
    const [slots] = await pool.query(query, params);
    res.json({ available_slots: slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispatch/racks/:id/slots/generate - Generate slots for a rack
router.post('/racks/:id/slots/generate', async (req, res) => {
  try {
    const { total_slots } = req.body;
    const numSlots = total_slots || 10;
    const [rack] = await pool.query('SELECT rack_number FROM racks WHERE id = ?', [req.params.id]);
    if (!rack.length) return res.status(404).json({ error: 'Rack not found' });

    // Delete existing empty slots and recreate
    await pool.query("DELETE FROM rack_slots WHERE rack_id = ? AND status = 'empty'", [req.params.id]);

    for (let i = 1; i <= numSlots; i++) {
      await pool.query(
        'INSERT IGNORE INTO rack_slots (rack_id, slot_number, slot_label) VALUES (?, ?, ?)',
        [req.params.id, i, `${rack[0].rack_number}-${String(i).padStart(2, '0')}`]);
    }

    // Update rack total_slots
    await pool.query('UPDATE racks SET total_slots = ? WHERE id = ?', [numSlots, req.params.id]);

    res.json({ message: `${numSlots} slots generated for rack ${rack[0].rack_number}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
