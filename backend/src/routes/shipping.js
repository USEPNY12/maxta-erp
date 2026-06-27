const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════
// DELIVERY ROUTES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// GET /routes - List all delivery routes
router.get('/routes', async (req, res) => {
  try {
    const { status, date_from, date_to, driver_id } = req.query;
    let query = `SELECT dr.*, d.employee_name as driver_name, v.vehicle_number,
      (SELECT COUNT(*) FROM delivery_stops ds WHERE ds.route_id = dr.id) as stop_count,
      (SELECT COUNT(*) FROM delivery_stops ds WHERE ds.route_id = dr.id AND ds.status = 'delivered') as delivered_count
      FROM delivery_routes dr
      LEFT JOIN drivers d ON dr.driver_id = d.id
      LEFT JOIN vehicles v ON dr.vehicle_id = v.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND dr.status = ?'; params.push(status); }
    if (date_from) { query += ' AND dr.route_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND dr.route_date <= ?'; params.push(date_to); }
    if (driver_id) { query += ' AND dr.driver_id = ?'; params.push(driver_id); }
    query += ' ORDER BY dr.route_date DESC, dr.created_at DESC';
    const [routes] = await pool.query(query, params);
    res.json(routes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /routes - Create a new delivery route
router.post('/routes', async (req, res) => {
  try {
    const { route_name, route_date, driver_id, vehicle_id, notes } = req.body;
    // Auto-generate route number
    const [last] = await pool.query("SELECT route_number FROM delivery_routes ORDER BY id DESC LIMIT 1");
    let nextNum = 'RT-0001';
    if (last.length > 0 && last[0].route_number) {
      const num = parseInt(last[0].route_number.replace('RT-', '')) + 1;
      nextNum = `RT-${String(num).padStart(4, '0')}`;
    }
    const [result] = await pool.query(
      `INSERT INTO delivery_routes (route_number, route_name, route_date, driver_id, vehicle_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nextNum, route_name, route_date, driver_id || null, vehicle_id || null, notes || null, req.user.id]
    );
    res.json({ id: result.insertId, route_number: nextNum });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /routes/:id - Get route details with stops
router.get('/routes/:id', async (req, res) => {
  try {
    const [route] = await pool.query(
      `SELECT dr.*, d.employee_name as driver_name, d.phone as driver_phone,
        v.vehicle_number, v.vehicle_type, v.max_weight_lbs as vehicle_max_weight
       FROM delivery_routes dr
       LEFT JOIN drivers d ON dr.driver_id = d.id
       LEFT JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.id = ?`, [req.params.id]
    );
    if (route.length === 0) return res.status(404).json({ error: 'Route not found' });
    const [stops] = await pool.query(
      `SELECT ds.*, c.company_name as customer_name,
        (SELECT COUNT(*) FROM delivery_proof dp WHERE dp.delivery_stop_id = ds.id) as has_pod
       FROM delivery_stops ds
       LEFT JOIN customers c ON ds.customer_id = c.id
       WHERE ds.route_id = ? ORDER BY ds.stop_sequence`, [req.params.id]
    );
    res.json({ ...route[0], stops });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /routes/:id - Update route
router.put('/routes/:id', async (req, res) => {
  try {
    const { route_name, route_date, driver_id, vehicle_id, status, notes } = req.body;
    await pool.query(
      `UPDATE delivery_routes SET route_name=?, route_date=?, driver_id=?, vehicle_id=?, status=?, notes=? WHERE id=?`,
      [route_name, route_date, driver_id, vehicle_id, status, notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /routes/:id/start - Start a route (driver departs)
router.post('/routes/:id/start', async (req, res) => {
  try {
    await pool.query(
      `UPDATE delivery_routes SET status='in_progress', actual_start_time=NOW() WHERE id=?`,
      [req.params.id]
    );
    // Mark first stop as en_route
    await pool.query(
      `UPDATE delivery_stops SET status='en_route' WHERE route_id=? AND stop_sequence=1`,
      [req.params.id]
    );
    res.json({ success: true, started_at: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /routes/:id/complete - Complete a route
router.post('/routes/:id/complete', async (req, res) => {
  try {
    const { actual_distance_miles } = req.body;
    await pool.query(
      `UPDATE delivery_routes SET status='completed', actual_end_time=NOW(), actual_distance_miles=? WHERE id=?`,
      [actual_distance_miles || null, req.params.id]
    );
    res.json({ success: true, completed_at: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /routes/:id/optimize - Optimize stop order (nearest neighbor algorithm)
router.post('/routes/:id/optimize', async (req, res) => {
  try {
    const [stops] = await pool.query(
      'SELECT * FROM delivery_stops WHERE route_id = ? ORDER BY stop_sequence', [req.params.id]
    );
    if (stops.length < 3) return res.json({ message: 'Not enough stops to optimize', stops });

    // Simple nearest-neighbor optimization using zip codes as proxy for distance
    // In production, this would use a real distance matrix API
    const optimized = [];
    const remaining = [...stops];
    let current = remaining.shift(); // Start with first stop
    optimized.push(current);

    while (remaining.length > 0) {
      // Find nearest by zip code proximity (simplified)
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.abs(parseInt(remaining[i].zip || '0') - parseInt(current.zip || '0'));
        if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
      }
      current = remaining.splice(nearestIdx, 1)[0];
      optimized.push(current);
    }

    // Update sequences
    for (let i = 0; i < optimized.length; i++) {
      await pool.query('UPDATE delivery_stops SET stop_sequence = ? WHERE id = ?', [i + 1, optimized[i].id]);
    }

    // Recalculate total stops
    await pool.query('UPDATE delivery_routes SET total_stops = ? WHERE id = ?', [optimized.length, req.params.id]);

    res.json({ optimized: true, stops: optimized.map((s, i) => ({ ...s, stop_sequence: i + 1 })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// DELIVERY STOPS
// ═══════════════════════════════════════════════════════════════════

// POST /stops - Add a stop to a route
router.post('/stops', async (req, res) => {
  try {
    const { route_id, shipment_id, customer_id, delivery_address, city, state, zip,
            latitude, longitude, scheduled_arrival, special_instructions, pieces_count, weight_lbs } = req.body;
    // Get next sequence
    const [maxSeq] = await pool.query('SELECT MAX(stop_sequence) as max_seq FROM delivery_stops WHERE route_id = ?', [route_id]);
    const nextSeq = (maxSeq[0].max_seq || 0) + 1;
    const [result] = await pool.query(
      `INSERT INTO delivery_stops (route_id, stop_sequence, shipment_id, customer_id, delivery_address, city, state, zip,
        latitude, longitude, scheduled_arrival, special_instructions, pieces_count, weight_lbs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [route_id, nextSeq, shipment_id || null, customer_id, delivery_address, city || null, state || null, zip || null,
       latitude || null, longitude || null, scheduled_arrival || null, special_instructions || null, pieces_count || 0, weight_lbs || 0]
    );
    // Update route total
    await pool.query('UPDATE delivery_routes SET total_stops = total_stops + 1 WHERE id = ?', [route_id]);
    res.json({ id: result.insertId, stop_sequence: nextSeq });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /stops/:id/arrive - Mark stop as arrived
router.put('/stops/:id/arrive', async (req, res) => {
  try {
    await pool.query('UPDATE delivery_stops SET status = ?, actual_arrival = NOW() WHERE id = ?', ['arrived', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /stops/:id/deliver - Mark stop as delivered
router.put('/stops/:id/deliver', async (req, res) => {
  try {
    await pool.query('UPDATE delivery_stops SET status = ?, actual_departure = NOW() WHERE id = ?', ['delivered', req.params.id]);
    // Advance next stop to en_route
    const [stop] = await pool.query('SELECT route_id, stop_sequence FROM delivery_stops WHERE id = ?', [req.params.id]);
    if (stop.length > 0) {
      await pool.query(
        'UPDATE delivery_stops SET status = ? WHERE route_id = ? AND stop_sequence = ?',
        ['en_route', stop[0].route_id, stop[0].stop_sequence + 1]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /stops/:id/fail - Mark stop as failed delivery
router.put('/stops/:id/fail', async (req, res) => {
  try {
    const { delivery_notes } = req.body;
    await pool.query('UPDATE delivery_stops SET status = ?, delivery_notes = ? WHERE id = ?', ['failed', delivery_notes, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// PROOF OF DELIVERY
// ═══════════════════════════════════════════════════════════════════

// POST /pod - Record proof of delivery
router.post('/pod', async (req, res) => {
  try {
    const { delivery_stop_id, shipment_id, signed_by, signature_data, photo_urls,
            delivery_condition, damage_notes, received_pieces, refused_pieces, customer_comments,
            gps_latitude, gps_longitude } = req.body;
    const [result] = await pool.query(
      `INSERT INTO delivery_proof (delivery_stop_id, shipment_id, signed_by, signature_data, photo_urls,
        delivery_condition, damage_notes, received_pieces, refused_pieces, customer_comments, gps_latitude, gps_longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [delivery_stop_id, shipment_id || null, signed_by, signature_data || null,
       JSON.stringify(photo_urls || []), delivery_condition || 'perfect', damage_notes || null,
       received_pieces || 0, refused_pieces || 0, customer_comments || null,
       gps_latitude || null, gps_longitude || null]
    );
    // Mark stop as delivered
    await pool.query('UPDATE delivery_stops SET status = ?, actual_departure = NOW() WHERE id = ?', ['delivered', delivery_stop_id]);
    res.json({ id: result.insertId, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /pod/:stopId - Get POD for a delivery stop
router.get('/pod/:stopId', async (req, res) => {
  try {
    const [pod] = await pool.query('SELECT * FROM delivery_proof WHERE delivery_stop_id = ?', [req.params.stopId]);
    res.json(pod.length > 0 ? pod[0] : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// RACK LOADING
// ═══════════════════════════════════════════════════════════════════

// GET /racks - List rack configurations
router.get('/racks', async (req, res) => {
  try {
    const [racks] = await pool.query(
      `SELECT rc.*, 
        (SELECT COUNT(*) FROM rack_loads rl WHERE rl.rack_id = rc.id AND rl.status IN ('loading','loaded','in_transit')) as current_loads
       FROM rack_configurations rc WHERE rc.is_active = 1 ORDER BY rc.rack_type, rc.rack_code`
    );
    res.json(racks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /racks/loads - Create a new rack load
router.post('/racks/loads', async (req, res) => {
  try {
    const { rack_id, route_id, load_date, notes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO rack_loads (rack_id, route_id, load_date, notes, loaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [rack_id, route_id || null, load_date || new Date().toISOString().split('T')[0], notes || null, req.user.id]
    );
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /racks/loads/:id - Get rack load details with items
router.get('/racks/loads/:id', async (req, res) => {
  try {
    const [load] = await pool.query(
      `SELECT rl.*, rc.rack_code, rc.rack_type, rc.max_weight_lbs, rc.max_pieces, rc.slot_count
       FROM rack_loads rl JOIN rack_configurations rc ON rl.rack_id = rc.id WHERE rl.id = ?`, [req.params.id]
    );
    if (load.length === 0) return res.status(404).json({ error: 'Rack load not found' });
    const [items] = await pool.query(
      `SELECT rli.*, wo.wo_number FROM rack_load_items rli
       LEFT JOIN work_orders wo ON rli.work_order_id = wo.id
       WHERE rli.rack_load_id = ? ORDER BY rli.slot_number`, [req.params.id]
    );
    res.json({ ...load[0], items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /racks/loads/:id/items - Add item to rack load
router.post('/racks/loads/:id/items', async (req, res) => {
  try {
    const { slot_number, work_order_id, shipment_id, item_description, width_inches, height_inches,
            thickness_mm, weight_lbs, glass_type, delivery_stop_id, load_sequence, unload_sequence } = req.body;
    const [result] = await pool.query(
      `INSERT INTO rack_load_items (rack_load_id, slot_number, work_order_id, shipment_id, item_description,
        width_inches, height_inches, thickness_mm, weight_lbs, glass_type, delivery_stop_id, load_sequence, unload_sequence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, slot_number, work_order_id || null, shipment_id || null, item_description || null,
       width_inches || null, height_inches || null, thickness_mm || null, weight_lbs || null,
       glass_type || null, delivery_stop_id || null, load_sequence || null, unload_sequence || null]
    );
    // Update totals
    await pool.query(
      `UPDATE rack_loads SET total_pieces = total_pieces + 1, total_weight_lbs = total_weight_lbs + ? WHERE id = ?`,
      [weight_lbs || 0, req.params.id]
    );
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /racks/loads/:id/optimize - Optimize rack loading order (reverse delivery order)
router.post('/racks/loads/:id/optimize', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT rli.*, ds.stop_sequence FROM rack_load_items rli
       LEFT JOIN delivery_stops ds ON rli.delivery_stop_id = ds.id
       WHERE rli.rack_load_id = ? ORDER BY ds.stop_sequence DESC, rli.height_inches DESC`, [req.params.id]
    );
    // Assign load sequence (last delivery = first loaded = back of rack)
    // Assign unload sequence (first delivery = first unloaded = front of rack)
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        'UPDATE rack_load_items SET load_sequence = ?, unload_sequence = ?, slot_number = ? WHERE id = ?',
        [i + 1, items.length - i, i + 1, items[i].id]
      );
    }
    res.json({ optimized: true, item_count: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /racks/loads/:id/status - Update rack load status
router.put('/racks/loads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updates = { status };
    if (status === 'loaded') updates.loaded_at = new Date();
    await pool.query('UPDATE rack_loads SET status = ?, loaded_at = ? WHERE id = ?',
      [status, updates.loaded_at || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// DRIVERS & VEHICLES
// ═══════════════════════════════════════════════════════════════════

// GET /drivers - List all drivers
router.get('/drivers', async (req, res) => {
  try {
    const [drivers] = await pool.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM delivery_routes dr WHERE dr.driver_id = d.id AND dr.status = 'in_progress') as active_routes,
        (SELECT COUNT(*) FROM delivery_routes dr WHERE dr.driver_id = d.id AND dr.route_date = CURDATE()) as today_routes
       FROM drivers d WHERE d.is_active = 1 ORDER BY d.employee_name`
    );
    res.json(drivers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /drivers - Create driver
router.post('/drivers', async (req, res) => {
  try {
    const { employee_name, employee_id, phone, email, license_number, license_expiry, license_class, home_zip } = req.body;
    const [result] = await pool.query(
      `INSERT INTO drivers (employee_name, employee_id, phone, email, license_number, license_expiry, license_class, home_zip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_name, employee_id || null, phone || null, email || null, license_number || null, license_expiry || null, license_class || null, home_zip || null]
    );
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /vehicles - List all vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const [vehicles] = await pool.query(
      `SELECT v.*,
        (SELECT COUNT(*) FROM delivery_routes dr WHERE dr.vehicle_id = v.id AND dr.status = 'in_progress') as in_use
       FROM vehicles v WHERE v.is_active = 1 ORDER BY v.vehicle_number`
    );
    res.json(vehicles);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /vehicles - Create vehicle
router.post('/vehicles', async (req, res) => {
  try {
    const { vehicle_number, vehicle_type, make, model, year, license_plate, vin,
            max_weight_lbs, max_rack_count, fuel_type, mpg_estimate } = req.body;
    const [result] = await pool.query(
      `INSERT INTO vehicles (vehicle_number, vehicle_type, make, model, year, license_plate, vin,
        max_weight_lbs, max_rack_count, fuel_type, mpg_estimate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicle_number, vehicle_type, make || null, model || null, year || null, license_plate || null, vin || null,
       max_weight_lbs || null, max_rack_count || 2, fuel_type || 'diesel', mpg_estimate || null]
    );
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// FREIGHT COSTS
// ═══════════════════════════════════════════════════════════════════

// GET /freight - List freight costs
router.get('/freight', async (req, res) => {
  try {
    const { route_id, date_from, date_to, cost_type } = req.query;
    let query = `SELECT fc.*, dr.route_number, v.vehicle_number, d.employee_name as driver_name
      FROM freight_costs fc
      LEFT JOIN delivery_routes dr ON fc.route_id = dr.id
      LEFT JOIN vehicles v ON fc.vehicle_id = v.id
      LEFT JOIN drivers d ON fc.driver_id = d.id WHERE 1=1`;
    const params = [];
    if (route_id) { query += ' AND fc.route_id = ?'; params.push(route_id); }
    if (date_from) { query += ' AND fc.cost_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND fc.cost_date <= ?'; params.push(date_to); }
    if (cost_type) { query += ' AND fc.cost_type = ?'; params.push(cost_type); }
    query += ' ORDER BY fc.cost_date DESC';
    const [costs] = await pool.query(query, params);

    // Summary
    const [summary] = await pool.query(
      `SELECT cost_type, SUM(amount) as total, COUNT(*) as count FROM freight_costs
       WHERE cost_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY cost_type`
    );
    res.json({ costs, summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /freight - Add freight cost
router.post('/freight', async (req, res) => {
  try {
    const { route_id, shipment_id, cost_type, amount, description, cost_date,
            vehicle_id, driver_id, miles_driven, fuel_gallons, fuel_price_per_gallon, is_billable } = req.body;
    const [result] = await pool.query(
      `INSERT INTO freight_costs (route_id, shipment_id, cost_type, amount, description, cost_date,
        vehicle_id, driver_id, miles_driven, fuel_gallons, fuel_price_per_gallon, is_billable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [route_id || null, shipment_id || null, cost_type, amount, description || null, cost_date,
       vehicle_id || null, driver_id || null, miles_driven || null, fuel_gallons || null,
       fuel_price_per_gallon || null, is_billable !== false ? 1 : 0]
    );
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /freight/summary - Freight cost summary/analytics
router.get('/freight/summary', async (req, res) => {
  try {
    const { period } = req.query; // 'week', 'month', 'quarter', 'year'
    const days = period === 'week' ? 7 : period === 'quarter' ? 90 : period === 'year' ? 365 : 30;
    const [byType] = await pool.query(
      `SELECT cost_type, SUM(amount) as total, COUNT(*) as count
       FROM freight_costs WHERE cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY cost_type ORDER BY total DESC`, [days]
    );
    const [byVehicle] = await pool.query(
      `SELECT v.vehicle_number, SUM(fc.amount) as total_cost, SUM(fc.miles_driven) as total_miles,
        CASE WHEN SUM(fc.miles_driven) > 0 THEN SUM(fc.amount) / SUM(fc.miles_driven) ELSE 0 END as cost_per_mile
       FROM freight_costs fc JOIN vehicles v ON fc.vehicle_id = v.id
       WHERE fc.cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY v.id ORDER BY total_cost DESC`, [days]
    );
    const [totals] = await pool.query(
      `SELECT SUM(amount) as total_cost, SUM(miles_driven) as total_miles,
        COUNT(DISTINCT route_id) as total_routes, SUM(fuel_gallons) as total_fuel
       FROM freight_costs WHERE cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`, [days]
    );
    res.json({ period: period || 'month', days, byType, byVehicle, totals: totals[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// DELIVERY ZONES
// ═══════════════════════════════════════════════════════════════════

// GET /zones - List delivery zones
router.get('/zones', async (req, res) => {
  try {
    const [zones] = await pool.query('SELECT * FROM delivery_zones WHERE is_active = 1 ORDER BY zone_code');
    res.json(zones);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /zones/calculate - Calculate delivery fee for a zip code
router.post('/zones/calculate', async (req, res) => {
  try {
    const { zip_code, order_total, pieces_count } = req.body;
    // Find matching zone by zip prefix
    const [zones] = await pool.query('SELECT * FROM delivery_zones WHERE is_active = 1');
    let matchedZone = zones[zones.length - 1]; // Default to last (Out of State)
    for (const zone of zones) {
      if (zone.zip_codes && zone.zip_codes.includes(zip_code.substring(0, 3))) {
        matchedZone = zone;
        break;
      }
    }
    // Check if order qualifies for free delivery
    const fee = (matchedZone.min_order_free_delivery && order_total >= parseFloat(matchedZone.min_order_free_delivery))
      ? 0 : parseFloat(matchedZone.base_delivery_fee);
    res.json({
      zone: matchedZone,
      delivery_fee: fee,
      free_delivery: fee === 0,
      estimated_days: matchedZone.estimated_transit_days
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// DRIVER MOBILE / TRACKING
// ═══════════════════════════════════════════════════════════════════

// POST /tracking/location - Log driver location
router.post('/tracking/location', async (req, res) => {
  try {
    const { driver_id, route_id, latitude, longitude, speed_mph, heading } = req.body;
    await pool.query(
      `INSERT INTO driver_location_log (driver_id, route_id, latitude, longitude, speed_mph, heading)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [driver_id, route_id || null, latitude, longitude, speed_mph || null, heading || null]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /tracking/driver/:id - Get latest driver location
router.get('/tracking/driver/:id', async (req, res) => {
  try {
    const [location] = await pool.query(
      `SELECT dll.*, d.employee_name, dr.route_number, dr.route_name
       FROM driver_location_log dll
       JOIN drivers d ON dll.driver_id = d.id
       LEFT JOIN delivery_routes dr ON dll.route_id = dr.id
       WHERE dll.driver_id = ? ORDER BY dll.logged_at DESC LIMIT 1`, [req.params.id]
    );
    res.json(location.length > 0 ? location[0] : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /tracking/route/:id - Get all driver locations for a route (breadcrumb trail)
router.get('/tracking/route/:id', async (req, res) => {
  try {
    const [trail] = await pool.query(
      `SELECT latitude, longitude, speed_mph, logged_at FROM driver_location_log
       WHERE route_id = ? ORDER BY logged_at`, [req.params.id]
    );
    res.json(trail);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// SHIPPING DASHBOARD
// ═══════════════════════════════════════════════════════════════════

// GET /dashboard - Shipping overview
router.get('/dashboard', async (req, res) => {
  try {
    const [todayRoutes] = await pool.query(
      `SELECT COUNT(*) as total, SUM(status='in_progress') as active, SUM(status='completed') as completed,
        SUM(status='planning') as planning FROM delivery_routes WHERE route_date = CURDATE()`
    );
    const [todayStops] = await pool.query(
      `SELECT COUNT(*) as total, SUM(ds.status='delivered') as delivered, SUM(ds.status='failed') as failed,
        SUM(ds.status='pending') as pending FROM delivery_stops ds
        JOIN delivery_routes dr ON ds.route_id = dr.id WHERE dr.route_date = CURDATE()`
    );
    const [activeDrivers] = await pool.query(
      `SELECT d.id, d.employee_name, dr.route_number, dr.route_name,
        (SELECT COUNT(*) FROM delivery_stops ds WHERE ds.route_id = dr.id AND ds.status = 'delivered') as stops_done,
        (SELECT COUNT(*) FROM delivery_stops ds WHERE ds.route_id = dr.id) as total_stops
       FROM drivers d JOIN delivery_routes dr ON dr.driver_id = d.id
       WHERE dr.status = 'in_progress' AND dr.route_date = CURDATE()`
    );
    const [weekCosts] = await pool.query(
      `SELECT SUM(amount) as total FROM freight_costs WHERE cost_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );
    let rackStatus = [];
    try {
      const [racks] = await pool.query(
        `SELECT rc.rack_code, rc.rack_type, IFNULL(rl.status, "empty") as load_status, IFNULL(rl.total_pieces, 0) as total_pieces
         FROM rack_configurations rc
         LEFT JOIN rack_loads rl ON rl.rack_id = rc.id AND rl.status IN ("loading","loaded","in_transit")
         WHERE rc.is_active = 1`
      );
      rackStatus = racks;
    } catch(e) { /* rack_loads table may not exist yet */ }






    res.json({
      today: { routes: todayRoutes[0], stops: todayStops[0] },
      activeDrivers,
      weekFreightCost: weekCosts[0].total || 0,
      racks: rackStatus
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


module.exports = router;
