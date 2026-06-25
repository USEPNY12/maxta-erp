const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');

// ============ ITEMS ============
// List items with search and filters
router.get('/items', authenticate, async (req, res) => {
  try {
    const { search, search_by, item_type, show_suspended, page = 1, limit = 50 } = req.query;
    let query = `SELECT i.*, it.name as item_type_name, l.name as receipt_location_name 
                 FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id 
                 LEFT JOIN locations l ON i.receipt_location_id = l.id WHERE 1=1`;
    const params = [];

    if (search) {
      const field = search_by || 'item_number';
      if (field === 'item_number') { query += ' AND i.item_number LIKE ?'; params.push(`%${search}%`); }
      else if (field === 'description') { query += ' AND i.description LIKE ?'; params.push(`%${search}%`); }
    }
    if (item_type) { query += ' AND i.item_type_id = ?'; params.push(item_type); }
    if (show_suspended !== 'true') { query += ' AND i.is_suspended = FALSE'; }

    query += ' ORDER BY i.item_number';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [items] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM items WHERE is_suspended = FALSE');
    res.json({ items, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single item with all details
router.get('/items/:id', authenticate, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT i.*, it.name as item_type_name 
      FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id 
      WHERE i.id = ?`, [req.params.id]);
    if (items.length === 0) return res.status(404).json({ error: 'Item not found' });

    const item = items[0];
    const [pricing] = await pool.query('SELECT * FROM item_pricing WHERE item_id = ? ORDER BY min_qty', [item.id]);
    const [vendors] = await pool.query('SELECT iv.*, v.company_name FROM item_vendors iv LEFT JOIN vendors v ON iv.vendor_id = v.id WHERE iv.item_id = ?', [item.id]);
    const [bom] = await pool.query('SELECT bh.*, (SELECT COUNT(*) FROM bom_lines WHERE bom_id = bh.id) as line_count FROM bom_headers bh WHERE bh.item_id = ? AND bh.is_active = TRUE', [item.id]);
    const [lots] = await pool.query('SELECT * FROM lots WHERE item_id = ? ORDER BY received_date DESC LIMIT 20', [item.id]);
    const [serials] = await pool.query('SELECT * FROM serial_numbers WHERE item_id = ? ORDER BY id DESC LIMIT 50', [item.id]);

    res.json({ ...item, pricing, vendors, bom, lots, serials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create item
router.post('/items', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    fields.entered_by = req.user.id;
    const columns = Object.keys(fields).filter(k => k !== 'pricing' && k !== 'vendors');
    const values = columns.map(k => fields[k]);
    const placeholders = columns.map(() => '?').join(',');

    const [result] = await pool.query(
      `INSERT INTO items (${columns.join(',')}) VALUES (${placeholders})`, values
    );

    // Handle pricing tiers
    if (fields.pricing && Array.isArray(fields.pricing)) {
      for (const p of fields.pricing) {
        await pool.query(
          'INSERT INTO item_pricing (item_id, price_list, min_qty, max_qty, unit_price, tier_type, price_per_sqft, minimum_charge) VALUES (?,?,?,?,?,?,?,?)',
          [result.insertId, p.price_list || 'Standard', p.min_qty || 0, p.max_qty || 999999, p.unit_price, p.tier_type || 'standard', p.price_per_sqft || 0, p.minimum_charge || 0]
        );
      }
    }

    res.status(201).json({ id: result.insertId, message: 'Item created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Item number already exists' });
    res.status(500).json({ error: error.message });
  }
});

// Update item
router.put('/items/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    delete fields.id;
    delete fields.created_at;
    const pricing = fields.pricing; delete fields.pricing;
    const vendors = fields.vendors; delete fields.vendors;

    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    const setClause = columns.map(k => `${k}=?`).join(',');

    await pool.query(`UPDATE items SET ${setClause} WHERE id=?`, [...values, req.params.id]);

    if (pricing && Array.isArray(pricing)) {
      await pool.query('DELETE FROM item_pricing WHERE item_id = ?', [req.params.id]);
      for (const p of pricing) {
        await pool.query(
          'INSERT INTO item_pricing (item_id, price_list, min_qty, max_qty, unit_price, tier_type, price_per_sqft, minimum_charge) VALUES (?,?,?,?,?,?,?,?)',
          [req.params.id, p.price_list || 'Standard', p.min_qty || 0, p.max_qty || 999999, p.unit_price, p.tier_type || 'standard', p.price_per_sqft || 0, p.minimum_charge || 0]
        );
      }
    }

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item (soft delete - suspend)
router.delete('/items/:id', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE items SET is_suspended = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item suspended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ITEM TYPES ============
router.get('/item-types', authenticate, async (req, res) => {
  try {
    const [types] = await pool.query('SELECT * FROM item_types WHERE is_active = TRUE ORDER BY name');
    res.json(types);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/item-types', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query('INSERT INTO item_types (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LOCATIONS ============
router.get('/locations', authenticate, async (req, res) => {
  try {
    const [locations] = await pool.query('SELECT * FROM locations WHERE is_active = TRUE ORDER BY code');
    res.json(locations);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/locations', authenticate, async (req, res) => {
  try {
    const { code, name, location_group, address } = req.body;
    const [result] = await pool.query('INSERT INTO locations (code, name, location_group, address) VALUES (?,?,?,?)', [code, name, location_group, address]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LOTS ============
router.get('/lots', authenticate, async (req, res) => {
  try {
    const { item_id, status } = req.query;
    let query = 'SELECT l.*, i.item_number, i.description as item_description FROM lots l JOIN items i ON l.item_id = i.id WHERE 1=1';
    const params = [];
    if (item_id) { query += ' AND l.item_id = ?'; params.push(item_id); }
    if (status) { query += ' AND l.status = ?'; params.push(status); }
    query += ' ORDER BY l.received_date DESC';
    const [lots] = await pool.query(query, params);
    res.json(lots);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SERIAL NUMBERS ============
router.get('/serials', authenticate, async (req, res) => {
  try {
    const { item_id, status } = req.query;
    let query = 'SELECT s.*, i.item_number, i.description as item_description FROM serial_numbers s JOIN items i ON s.item_id = i.id WHERE 1=1';
    const params = [];
    if (item_id) { query += ' AND s.item_id = ?'; params.push(item_id); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    query += ' ORDER BY s.id DESC LIMIT 100';
    const [serials] = await pool.query(query, params);
    res.json(serials);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INVENTORY ADJUSTMENTS ============
router.get('/adjustments', authenticate, async (req, res) => {
  try {
    const [adjustments] = await pool.query(`
      SELECT ia.*, i.item_number, i.description as item_description, l.name as location_name
      FROM inventory_adjustments ia JOIN items i ON ia.item_id = i.id LEFT JOIN locations l ON ia.location_id = l.id
      ORDER BY ia.adjustment_date DESC LIMIT 100`);
    res.json(adjustments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/adjustments', authenticate, async (req, res) => {
  try {
    const { item_id, location_id, adjustment_type, quantity, reason_code, lot_number, serial_number, cost, notes } = req.body;
    const adjustmentNumber = await getNextNumber('adjustment');
    
    const [result] = await pool.query(
      `INSERT INTO inventory_adjustments (adjustment_number, item_id, location_id, adjustment_type, quantity, reason_code, lot_number, serial_number, cost, notes, adjusted_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [adjustmentNumber, item_id, location_id, adjustment_type, quantity, reason_code, lot_number, serial_number, cost, notes, req.user.id]
    );

    // Update item qty on hand
    const qtyChange = adjustment_type === 'increase' ? quantity : -quantity;
    await pool.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [qtyChange, item_id]);

    res.status(201).json({ id: result.insertId, adjustment_number: adjustmentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PHYSICAL COUNTS ============
router.get('/physical-counts', authenticate, async (req, res) => {
  try {
    const [counts] = await pool.query('SELECT * FROM physical_counts ORDER BY count_date DESC');
    res.json(counts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/physical-counts', authenticate, async (req, res) => {
  try {
    const { count_date, location_id, notes } = req.body;
    const countNumber = 'PC-' + Date.now();
    const [result] = await pool.query(
      'INSERT INTO physical_counts (count_number, count_date, location_id, notes, created_by) VALUES (?,?,?,?,?)',
      [countNumber, count_date, location_id, notes, req.user.id]
    );
    res.status(201).json({ id: result.insertId, count_number: countNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ DASHBOARD DATA ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [totalItems] = await pool.query('SELECT COUNT(*) as count FROM items WHERE is_suspended = FALSE');
    const [totalValue] = await pool.query('SELECT SUM(qty_on_hand * standard_cost) as value FROM items WHERE is_suspended = FALSE');
    const [lowStock] = await pool.query('SELECT COUNT(*) as count FROM items WHERE qty_on_hand <= minimum_qty AND qty_on_hand > 0 AND is_suspended = FALSE');
    const [outOfStock] = await pool.query('SELECT COUNT(*) as count FROM items WHERE qty_on_hand <= 0 AND is_manufactured = FALSE AND is_purchased = TRUE AND is_suspended = FALSE');
    
    res.json({
      total_items: totalItems[0].count,
      total_value: totalValue[0].value || 0,
      low_stock: lowStock[0].count,
      out_of_stock: outOfStock[0].count
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
