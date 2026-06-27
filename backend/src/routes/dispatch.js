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

module.exports = router;
