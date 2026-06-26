const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const GLService = require('../services/glService');

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
    // Rename frontend field names to DB column names
    if (fields.thickness) { fields.glass_thickness = fields.thickness; delete fields.thickness; }
    if (fields.tempering) { fields.tempering_status = fields.tempering; delete fields.tempering; }
    const boolMap = {purchased:'is_purchased',manufactured:'is_manufactured',sold:'is_sold',material:'is_material',taxable:'is_taxable',backorderable:'is_backorderable',warranty:'has_warranty',hazardous:'is_hazardous'};
    Object.entries(boolMap).forEach(([k,v]) => { if (fields[k] !== undefined) { fields[v] = fields[k] ? 1 : 0; delete fields[k]; } });
    // Convert empty strings to null for integer/decimal columns
    const intFields = ['receipt_location_id','shipping_location_id','qty_on_hand','standard_cost','weighted_avg_cost','last_cost','min_order_qty','minimum_qty','lead_time_days','production_days','production_qty','batch_size','unit_weight','item_type_id'];
    intFields.forEach(f => { if (fields[f] === '' || fields[f] === undefined) fields[f] = null; });
    const columns = Object.keys(fields).filter(k => !['pricing','vendors','read_only','item_type_name','updated_at','created_at'].includes(k));
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
    delete fields.updated_at;
    delete fields.read_only;
    delete fields.item_type_name;
    const pricing = fields.pricing; delete fields.pricing;
    const vendors = fields.vendors; delete fields.vendors;
    // Rename frontend field names to DB column names
    if (fields.thickness !== undefined) { fields.glass_thickness = fields.thickness; delete fields.thickness; }
    if (fields.tempering !== undefined) { fields.tempering_status = fields.tempering; delete fields.tempering; }
    const boolMap = {purchased:'is_purchased',manufactured:'is_manufactured',sold:'is_sold',material:'is_material',taxable:'is_taxable',backorderable:'is_backorderable',warranty:'has_warranty',hazardous:'is_hazardous'};
    Object.entries(boolMap).forEach(([k,v]) => { if (fields[k] !== undefined) { fields[v] = fields[k] ? 1 : 0; delete fields[k]; } });
    // Convert empty strings to null for integer/decimal columns
    const intFields = ['receipt_location_id','shipping_location_id','qty_on_hand','standard_cost','weighted_avg_cost','last_cost','min_order_qty','minimum_qty','lead_time_days','production_days','production_qty','batch_size','unit_weight','item_type_id'];
    intFields.forEach(f => { if (fields[f] === '' || fields[f] === undefined) fields[f] = null; });

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

    // GL Auto-Post: Debit/Credit Inventory, Credit/Debit Adjustment Expense
    try {
      const [item] = await pool.query('SELECT standard_cost FROM items WHERE id = ?', [item_id]);
      const itemCost = item.length ? Number(item[0].standard_cost || 0) : (cost || 0);
      if (itemCost > 0) {
        await GLService.postInventoryAdjustment({
          adjustmentId: result.insertId,
          itemId: item_id,
          quantity: Math.abs(quantity),
          cost: itemCost,
          adjustmentType: adjustment_type,
          transactionDate: new Date(),
          memo: `Inventory Adjustment ${adjustmentNumber} - ${reason_code || 'Manual'}`,
          postedBy: req.user.id
        });
      }
    } catch (glError) {
      console.error('GL posting error (inventory adjustment):', glError.message);
    }

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

// ============ STOCK TRANSFERS ============
router.get('/transfers', authenticate, async (req, res) => {
  try {
    const [transfers] = await pool.query(`
      SELECT st.*, i.item_number, i.description as item_description,
        fl.name as from_location_name, tl.name as to_location_name
      FROM stock_transfers st
      JOIN items i ON st.item_id = i.id
      JOIN locations fl ON st.from_location_id = fl.id
      JOIN locations tl ON st.to_location_id = tl.id
      ORDER BY st.transfer_date DESC LIMIT 100`);
    res.json(transfers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/transfers', authenticate, async (req, res) => {
  try {
    const { item_id, from_location_id, to_location_id, quantity, lot_number, reason, notes } = req.body;
    const transferNumber = await getNextNumber('transfer');
    const [result] = await pool.query(
      `INSERT INTO stock_transfers (transfer_number, item_id, from_location_id, to_location_id, quantity, lot_number, reason, notes, transferred_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [transferNumber, item_id, from_location_id, to_location_id, quantity, lot_number, reason, notes, req.user.id]
    );
    // Log inventory transactions
    await pool.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, reference_number, location_id, lot_number, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?), (?,?,?,?,?,?,?,?,?,?)`,
      [item_id, 'transfer_out', -quantity, 'transfer', result.insertId, transferNumber, from_location_id, lot_number, `Transfer to location ${to_location_id}`, req.user.id,
       item_id, 'transfer_in', quantity, 'transfer', result.insertId, transferNumber, to_location_id, lot_number, `Transfer from location ${from_location_id}`, req.user.id]
    );
    res.status(201).json({ id: result.insertId, transfer_number: transferNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LOT DETAIL ============
router.get('/lots/:id', authenticate, async (req, res) => {
  try {
    const [lot] = await pool.query(`
      SELECT l.*, i.item_number, i.description as item_description, loc.name as location_name
      FROM lots l JOIN items i ON l.item_id = i.id LEFT JOIN locations loc ON l.location_id = loc.id
      WHERE l.id = ?`, [req.params.id]);
    if (!lot.length) return res.status(404).json({ error: 'Lot not found' });
    const [transactions] = await pool.query(`
      SELECT * FROM inventory_transactions WHERE lot_number = ? ORDER BY created_at DESC`, [lot[0].lot_number]);
    res.json({ ...lot[0], transactions });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ STOCK STATUS (by location) ============
router.get('/stock-status', authenticate, async (req, res) => {
  try {
    const [stock] = await pool.query(`
      SELECT i.id, i.item_number, i.description, it.name as item_type,
        COALESCE(i.qty_on_hand, 0) as qty_on_hand,
        COALESCE(i.standard_cost, 0) as standard_cost,
        COALESCE(i.minimum_qty, 0) as minimum_qty, i.lead_time_days,
        (COALESCE(i.qty_on_hand, 0) * COALESCE(i.standard_cost, 0)) as extended_value,
        CASE WHEN COALESCE(i.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
             WHEN COALESCE(i.qty_on_hand, 0) <= COALESCE(i.minimum_qty, 0) THEN 'low_stock'
             ELSE 'in_stock' END as stock_status
      FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id
      WHERE i.is_active = TRUE
      ORDER BY i.item_number`);
    res.json(stock);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM VENDORS ============
router.get('/items/:id/vendors', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT iv.*, v.company_name as vendor_name FROM item_vendors iv LEFT JOIN vendors v ON iv.vendor_id = v.id WHERE iv.item_id = ? ORDER BY iv.is_preferred DESC`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/vendors', authenticate, async (req, res) => {
  try {
    const { vendor_id, vendor_item_number, vendor_description, unit_cost, lead_time_days, min_order_qty, is_preferred } = req.body;
    const [result] = await pool.query('INSERT INTO item_vendors (item_id, vendor_id, vendor_item_number, vendor_description, unit_cost, lead_time_days, min_order_qty, is_preferred) VALUES (?,?,?,?,?,?,?,?)',
      [req.params.id, vendor_id, vendor_item_number, vendor_description, unit_cost, lead_time_days || 0, min_order_qty || 1, is_preferred || 0]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/items/:id/vendors/:vid', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_vendors WHERE id = ? AND item_id = ?', [req.params.vid, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM CUSTOMERS ============
router.get('/items/:id/customers', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ic.*, c.company_name as customer_name FROM item_customers ic LEFT JOIN customers c ON ic.customer_id = c.id WHERE ic.item_id = ? ORDER BY ic.is_preferred DESC`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/customers', authenticate, async (req, res) => {
  try {
    const { customer_id, customer_item_number, customer_description, unit_price, min_order_qty, is_preferred } = req.body;
    const [result] = await pool.query('INSERT INTO item_customers (item_id, customer_id, customer_item_number, customer_description, unit_price, min_order_qty, is_preferred) VALUES (?,?,?,?,?,?,?)',
      [req.params.id, customer_id, customer_item_number, customer_description, unit_price, min_order_qty || 1, is_preferred || 0]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/items/:id/customers/:cid', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_customers WHERE id = ? AND item_id = ?', [req.params.cid, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM GL ACCOUNTS ============
router.get('/items/:id/gl-accounts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT iga.*, ga.account_number, ga.account_name FROM item_gl_accounts iga LEFT JOIN gl_accounts ga ON iga.gl_account_id = ga.id WHERE iga.item_id = ?`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/gl-accounts', authenticate, async (req, res) => {
  try {
    const { account_type, gl_account_id } = req.body;
    await pool.query('INSERT INTO item_gl_accounts (item_id, account_type, gl_account_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE gl_account_id = VALUES(gl_account_id)',
      [req.params.id, account_type, gl_account_id]);
    res.status(201).json({ message: 'Saved' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM DIMENSIONS ============
router.get('/items/:id/dimensions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM item_dimensions WHERE item_id = ?', [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/dimensions', authenticate, async (req, res) => {
  try {
    const { dimension_type, dimension_value, uom } = req.body;
    const [result] = await pool.query('INSERT INTO item_dimensions (item_id, dimension_type, dimension_value, uom) VALUES (?,?,?,?)',
      [req.params.id, dimension_type, dimension_value, uom]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/items/:id/dimensions/:did', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_dimensions WHERE id = ? AND item_id = ?', [req.params.did, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM DOCUMENTS ============
router.get('/items/:id/documents', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM item_documents WHERE item_id = ? ORDER BY uploaded_at DESC', [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/documents', authenticate, async (req, res) => {
  try {
    const { document_type, file_name, file_path, description } = req.body;
    const [result] = await pool.query('INSERT INTO item_documents (item_id, document_type, file_name, file_path, description, uploaded_by) VALUES (?,?,?,?,?,?)',
      [req.params.id, document_type, file_name, file_path, description, req.user.id]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/items/:id/documents/:did', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_documents WHERE id = ? AND item_id = ?', [req.params.did, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM STOCK BY LOCATION ============
router.get('/items/:id/stock-by-location', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.name as location_name,
        COALESCE(SUM(CASE WHEN it.transaction_type IN ('receipt','transfer_in','adjustment') THEN it.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN it.transaction_type IN ('issue','transfer_out','shipment') THEN it.quantity ELSE 0 END), 0) as on_hand,
        0 as allocated, 0 as on_order
      FROM locations l
      LEFT JOIN inventory_transactions it ON it.location_id = l.id AND it.item_id = ?
      GROUP BY l.id, l.name
      HAVING on_hand != 0
      ORDER BY l.name`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM ROUTING ============
router.get('/items/:id/routing', authenticate, async (req, res) => {
  try {
    const [routings] = await pool.query('SELECT * FROM routings WHERE item_id = ? AND is_active = TRUE', [req.params.id]);
    if (routings.length === 0) return res.json({ routing: null, operations: [] });
    const [operations] = await pool.query(`SELECT ro.*, wc.name as work_center_name FROM routing_operations ro LEFT JOIN work_centers wc ON ro.work_center_id = wc.id WHERE ro.routing_id = ? ORDER BY ro.sequence`, [routings[0].id]);
    res.json({ routing: routings[0], operations });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/routing', authenticate, async (req, res) => {
  try {
    const { revision, description, operations } = req.body;
    // Deactivate existing routing
    await pool.query('UPDATE routings SET is_active = FALSE WHERE item_id = ?', [req.params.id]);
    // Create new routing
    const [result] = await pool.query('INSERT INTO routings (item_id, revision, description) VALUES (?,?,?)', [req.params.id, revision, description]);
    // Add operations
    if (operations && operations.length > 0) {
      for (const op of operations) {
        await pool.query('INSERT INTO routing_operations (routing_id, sequence, work_center_id, operation_description, setup_time_hours, run_time_hours) VALUES (?,?,?,?,?,?)',
          [result.insertId, op.sequence, op.work_center_id, op.operation_description, op.setup_time_hours || 0, op.run_time_hours || 0]);
      }
    }
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM BOM ============
router.get('/items/:id/bom', authenticate, async (req, res) => {
  try {
    const [headers] = await pool.query('SELECT * FROM bom_headers WHERE item_id = ? AND is_active = TRUE', [req.params.id]);
    if (headers.length === 0) return res.json({ bom: null, lines: [] });
    const [lines] = await pool.query(`SELECT bl.*, i.item_number as component_item_no, i.description FROM bom_lines bl LEFT JOIN items i ON bl.component_item_id = i.id WHERE bl.bom_id = ? ORDER BY bl.sequence`, [headers[0].id]);
    res.json({ bom: headers[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/bom', authenticate, async (req, res) => {
  try {
    const { revision, description, batch_size, lines } = req.body;
    await pool.query('UPDATE bom_headers SET is_active = FALSE WHERE item_id = ?', [req.params.id]);
    const [result] = await pool.query('INSERT INTO bom_headers (item_id, revision, description, batch_size) VALUES (?,?,?,?)', [req.params.id, revision, description, batch_size || 1]);
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query('INSERT INTO bom_lines (bom_id, sequence, component_item_id, quantity_per, waste_percent, uom, operation_sequence) VALUES (?,?,?,?,?,?,?)',
          [result.insertId, line.sequence, line.component_item_id, line.quantity_per, line.waste_percent || 0, line.uom || 'Each', line.operation_sequence]);
      }
    }
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM PRICING ============
router.get('/items/:id/pricing', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM item_pricing WHERE item_id = ? ORDER BY price_list, min_qty', [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/items/:id/pricing', authenticate, async (req, res) => {
  try {
    const { price_list, min_qty, max_qty, unit_price, tier_type, price_per_sqft, minimum_charge } = req.body;
    const [result] = await pool.query('INSERT INTO item_pricing (item_id, price_list, min_qty, max_qty, unit_price, tier_type, price_per_sqft, minimum_charge) VALUES (?,?,?,?,?,?,?,?)',
      [req.params.id, price_list || 'Standard', min_qty || 0, max_qty || 999999, unit_price, tier_type || 'standard', price_per_sqft || 0, minimum_charge || 0]);
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/items/:id/pricing/:pid', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_pricing WHERE id = ? AND item_id = ?', [req.params.pid, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LOOKUP ENDPOINTS ============
router.get('/lookup/vendors', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, company_name FROM vendors WHERE is_active = TRUE ORDER BY company_name');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/lookup/customers', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, company_name FROM customers WHERE is_active = TRUE ORDER BY company_name');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/lookup/gl-accounts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, account_number, account_name, account_type FROM gl_accounts ORDER BY account_number');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/lookup/work-centers', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM work_centers ORDER BY name');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/lookup/items', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, item_number, description FROM items WHERE is_active = TRUE ORDER BY item_number');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/lookup/locations', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, location_type FROM locations ORDER BY name');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ===== ITEM INQUIRY ENDPOINTS =====

// Where Used - find BOMs that use this item as a component
router.get('/items/:id/inquiry/where-used', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT bh.item_id, i.item_number, i.description, bl.quantity_per, bl.uom
      FROM bom_lines bl JOIN bom_headers bh ON bl.bom_id = bh.id JOIN items i ON bh.item_id = i.id
      WHERE bl.component_item_id = ?`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// SO Quotes containing this item
router.get('/items/:id/inquiry/so-quotes', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT q.id, q.quote_number, q.quote_date, c.company_name as customer, ql.quantity, ql.unit_price, q.status
      FROM quote_lines ql JOIN quotes q ON ql.quote_id = q.id LEFT JOIN customers c ON q.customer_id = c.id
      WHERE ql.item_id = ? ORDER BY q.quote_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Sales Orders containing this item
router.get('/items/:id/inquiry/sales-orders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT so.id, so.order_number, so.order_date, c.company_name as customer, sol.quantity_ordered as quantity, sol.unit_price, so.status
      FROM sales_order_lines sol JOIN sales_orders so ON sol.sales_order_id = so.id LEFT JOIN customers c ON so.customer_id = c.id
      WHERE sol.item_id = ? ORDER BY so.order_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AR Invoices containing this item
router.get('/items/:id/inquiry/ar-invoices', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT inv.id, inv.invoice_number, inv.invoice_date, c.company_name as customer, il.quantity, il.unit_price, inv.status
      FROM ar_invoice_lines il JOIN ar_invoices inv ON il.invoice_id = inv.id LEFT JOIN customers c ON inv.customer_id = c.id
      WHERE il.item_id = ? ORDER BY inv.invoice_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PO Quotes (draft POs) containing this item
router.get('/items/:id/inquiry/po-quotes', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT po.id, po.po_number, po.order_date, v.company_name as vendor, pol.quantity_ordered as quantity, pol.unit_cost, po.status
      FROM po_lines pol JOIN purchase_orders po ON pol.purchase_order_id = po.id LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE pol.item_id = ? AND po.status = 'draft' ORDER BY po.order_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Purchase Orders containing this item
router.get('/items/:id/inquiry/purchase-orders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT po.id, po.po_number, po.order_date, v.company_name as vendor, pol.quantity_ordered as quantity, pol.unit_cost, po.status
      FROM po_lines pol JOIN purchase_orders po ON pol.purchase_order_id = po.id LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE pol.item_id = ? ORDER BY po.order_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PO Receipts for this item
router.get('/items/:id/inquiry/po-receipts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT r.id, r.receipt_number, r.receipt_date, v.company_name as vendor, rl.quantity_received, l.name as location, rl.lot_number
      FROM po_receipt_lines rl JOIN po_receipts r ON rl.receipt_id = r.id LEFT JOIN vendors v ON r.vendor_id = v.id LEFT JOIN locations l ON rl.location_id = l.id
      WHERE rl.item_id = ? ORDER BY r.receipt_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// WO Receipts (finished goods received from work orders)
router.get('/items/:id/inquiry/wo-receipts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT wo.id, wo.wo_number, wo.start_date, wo.quantity, wo.quantity_completed, wo.status
      FROM work_orders wo WHERE wo.item_id = ? ORDER BY wo.start_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// WO Issues (material issued to work orders)
router.get('/items/:id/inquiry/wo-issues', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT wo.id, wo.wo_number, wo.start_date, bl.quantity_per, wo.quantity as wo_qty, wo.status
      FROM bom_lines bl JOIN bom_headers bh ON bl.bom_id = bh.id JOIN work_orders wo ON wo.item_id = bh.item_id
      WHERE bl.component_item_id = ? ORDER BY wo.start_date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// MRP by Location
router.get('/items/:id/inquiry/mrp-by-location', authenticate, async (req, res) => {
  try {
    const [stock] = await pool.query(`SELECT l.name as location, SUM(CASE WHEN it.transaction_type IN ('receipt','adjustment','transfer','return') THEN it.quantity ELSE -it.quantity END) as on_hand
      FROM inventory_transactions it LEFT JOIN locations l ON it.location_id = l.id WHERE it.item_id = ? GROUP BY l.name`, [req.params.id]);
    const [onOrder] = await pool.query(`SELECT l.name as location, SUM(pol.quantity_ordered - pol.quantity_received) as on_order
      FROM po_lines pol JOIN purchase_orders po ON pol.purchase_order_id = po.id LEFT JOIN locations l ON l.id = po.ship_to_location_id
      WHERE pol.item_id = ? AND po.status IN ('approved','sent') GROUP BY l.name`, [req.params.id]);
    res.json({ stock, on_order: onOrder });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// ============ MRP ENGINE - Material Requirements Planning ============
router.get('/mrp', authenticate, async (req, res) => {
  try {
    const { item_id, item_type, below_reorder } = req.query;
    
    // Get all inventory items with their demand/supply picture
    let itemFilter = 'WHERE i.is_active = 1';
    const params = [];
    if (item_id) { itemFilter += ' AND i.id = ?'; params.push(item_id); }
    if (item_type) { itemFilter += ' AND i.item_type = ?'; params.push(item_type); }
    
    const [items] = await pool.query(`
      SELECT i.id, i.item_number, i.description, i.item_type, i.uom,
             i.qty_on_hand, i.reorder_point, i.reorder_qty, i.standard_cost,
             i.lead_time_days
      FROM items i ${itemFilter}
      ORDER BY i.item_number`, params);
    
    // Get all open SO demand (unshipped quantities)
    const [soDemand] = await pool.query(`
      SELECT sol.item_id, SUM(sol.quantity_ordered - COALESCE(sol.quantity_shipped, 0)) as demand_qty
      FROM sales_order_lines sol
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE so.status IN ('open', 'released', 'in_progress')
        AND sol.quantity_ordered > COALESCE(sol.quantity_shipped, 0)
      GROUP BY sol.item_id`);
    
    // Get all open WO material demand (required but not yet issued)
    const [woMaterialDemand] = await pool.query(`
      SELECT wm.item_id, SUM(wm.total_qty - COALESCE(wm.quantity_issued, 0)) as demand_qty
      FROM wo_materials wm
      JOIN work_orders wo ON wm.work_order_id = wo.id
      WHERE wo.status IN ('planned', 'scheduled', 'released', 'in_progress')
        AND wm.total_qty > COALESCE(wm.quantity_issued, 0)
      GROUP BY wm.item_id`);
    
    // Get all open PO supply (ordered but not yet received)
    const [poSupply] = await pool.query(`
      SELECT pol.item_id, SUM(pol.quantity_ordered - COALESCE(pol.quantity_received, 0)) as supply_qty
      FROM po_lines pol
      JOIN purchase_orders po ON pol.purchase_order_id = po.id
      WHERE po.status IN ('open', 'approved', 'sent', 'partial')
        AND pol.quantity_ordered > COALESCE(pol.quantity_received, 0)
      GROUP BY pol.item_id`);
    
    // Get all open WO receipt supply (WOs that will produce finished goods)
    const [woReceiptSupply] = await pool.query(`
      SELECT wo.item_id, SUM(wo.quantity - COALESCE(wo.qty_completed, 0)) as supply_qty
      FROM work_orders wo
      WHERE wo.status IN ('planned', 'scheduled', 'released', 'in_progress')
        AND wo.item_id IS NOT NULL
        AND wo.quantity > COALESCE(wo.qty_completed, 0)
      GROUP BY wo.item_id`);
    
    // Build demand/supply maps
    const soDemandMap = {};
    soDemand.forEach(r => { soDemandMap[r.item_id] = Number(r.demand_qty); });
    const woMatDemandMap = {};
    woMaterialDemand.forEach(r => { woMatDemandMap[r.item_id] = Number(r.demand_qty); });
    const poSupplyMap = {};
    poSupply.forEach(r => { poSupplyMap[r.item_id] = Number(r.supply_qty); });
    const woSupplyMap = {};
    woReceiptSupply.forEach(r => { woSupplyMap[r.item_id] = Number(r.supply_qty); });
    
    // Calculate MRP for each item
    const mrpResults = items.map(item => {
      const onHand = Number(item.qty_on_hand || 0);
      const soDem = soDemandMap[item.id] || 0;
      const woMatDem = woMatDemandMap[item.id] || 0;
      const totalDemand = soDem + woMatDem;
      const poSup = poSupplyMap[item.id] || 0;
      const woSup = woSupplyMap[item.id] || 0;
      const totalSupply = poSup + woSup;
      const available = onHand - totalDemand + totalSupply;
      const netRequirement = Math.max(0, (Number(item.reorder_point || 0)) - available);
      const suggestedOrder = netRequirement > 0 ? Math.max(netRequirement, Number(item.reorder_qty || netRequirement)) : 0;
      
      return {
        ...item,
        on_hand: onHand,
        so_demand: soDem,
        wo_material_demand: woMatDem,
        total_demand: totalDemand,
        po_supply: poSup,
        wo_receipt_supply: woSup,
        total_supply: totalSupply,
        available: available,
        net_requirement: netRequirement,
        suggested_order_qty: suggestedOrder,
        below_reorder: available < Number(item.reorder_point || 0)
      };
    });
    
    // Filter if requested
    let filtered = mrpResults;
    if (below_reorder === 'true') {
      filtered = mrpResults.filter(r => r.below_reorder);
    }
    
    res.json({
      items: filtered,
      summary: {
        total_items: filtered.length,
        items_below_reorder: filtered.filter(r => r.below_reorder).length,
        total_demand_value: filtered.reduce((s, r) => s + r.total_demand * Number(r.standard_cost || 0), 0),
        total_supply_value: filtered.reduce((s, r) => s + r.total_supply * Number(r.standard_cost || 0), 0)
      }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ITEM TYPES UPGRADE ============
router.get('/item-types', authenticate, async (req, res) => {
  try {
    const [types] = await pool.query('SELECT * FROM item_types ORDER BY name');
    res.json(types);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/item-types/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    delete fields.id;
    const columns = Object.keys(fields);
    if (columns.length === 0) return res.status(400).json({ error: 'No fields to update' });
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE item_types SET ${columns.map(k => k + '=?').join(',')} WHERE id=?`, [...values, req.params.id]);
    res.json({ message: 'Item type updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PHYSICAL COUNT WORKFLOW ============
router.post('/physical-counts', authenticate, async (req, res) => {
  try {
    const countNumber = await getNextNumber('physical_count');
    const { count_date, location_id, description, items: countItems } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO physical_counts (count_number, count_date, location_id, description, status, created_by)
       VALUES (?, ?, ?, ?, 'open', ?)`,
      [countNumber, count_date || new Date(), location_id, description, req.user.id]);
    
    // If items provided, create count lines with system quantities
    if (countItems && countItems.length > 0) {
      for (const item of countItems) {
        const [inv] = await pool.query('SELECT qty_on_hand FROM items WHERE id = ?', [item.item_id]);
        const systemQty = inv.length ? Number(inv[0].qty_on_hand) : 0;
        await pool.query(
          `INSERT INTO physical_count_lines (physical_count_id, item_id, location_id, system_qty, counted_qty, variance_qty, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [result.insertId, item.item_id, item.location_id || location_id, systemQty, item.counted_qty || null, 
           item.counted_qty != null ? (item.counted_qty - systemQty) : null]);
      }
    }
    
    res.status(201).json({ id: result.insertId, count_number: countNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/physical-counts', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT pc.*, u.full_name as created_by_name, l.name as location_name
      FROM physical_counts pc 
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN locations l ON pc.location_id = l.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND pc.status = ?'; params.push(status); }
    query += ' ORDER BY pc.count_date DESC LIMIT 100';
    const [counts] = await pool.query(query, params);
    res.json(counts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/physical-counts/:id', authenticate, async (req, res) => {
  try {
    const [counts] = await pool.query('SELECT * FROM physical_counts WHERE id = ?', [req.params.id]);
    if (!counts.length) return res.status(404).json({ error: 'Physical count not found' });
    const [lines] = await pool.query(
      `SELECT pcl.*, i.item_number, i.description as item_description, i.uom
       FROM physical_count_lines pcl
       JOIN items i ON pcl.item_id = i.id
       WHERE pcl.physical_count_id = ? ORDER BY i.item_number`, [req.params.id]);
    res.json({ ...counts[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/physical-counts/:id/lines', authenticate, async (req, res) => {
  try {
    const { lines } = req.body;
    for (const line of lines) {
      if (line.id) {
        const variance = (line.counted_qty != null && line.system_qty != null) ? (line.counted_qty - line.system_qty) : null;
        await pool.query(
          'UPDATE physical_count_lines SET counted_qty = ?, variance_qty = ?, status = ? WHERE id = ?',
          [line.counted_qty, variance, line.counted_qty != null ? 'counted' : 'pending', line.id]);
      }
    }
    res.json({ message: 'Count lines updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/physical-counts/:id/post', authenticate, async (req, res) => {
  try {
    const [counts] = await pool.query('SELECT * FROM physical_counts WHERE id = ?', [req.params.id]);
    if (!counts.length) return res.status(404).json({ error: 'Physical count not found' });
    if (counts[0].status === 'posted') return res.status(400).json({ error: 'Already posted' });
    
    const [lines] = await pool.query(
      'SELECT pcl.*, i.standard_cost FROM physical_count_lines pcl JOIN items i ON pcl.item_id = i.id WHERE pcl.physical_count_id = ? AND pcl.counted_qty IS NOT NULL',
      [req.params.id]);
    
    let totalVarianceQty = 0;
    let totalVarianceCost = 0;
    
    for (const line of lines) {
      const variance = Number(line.counted_qty) - Number(line.system_qty);
      if (variance === 0) continue;
      
      totalVarianceQty += Math.abs(variance);
      totalVarianceCost += Math.abs(variance) * Number(line.standard_cost || 0);
      
      // Update inventory quantity to match count
      await pool.query('UPDATE items SET qty_on_hand = ? WHERE id = ?', [line.counted_qty, line.item_id]);
      
      // Log inventory transaction
      await pool.query(
        `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, location_id, reference_type, reference_id, reference_number, notes, created_by)
         VALUES (?, 'physical_count', ?, ?, 'physical_count', ?, ?, ?, ?)`,
        [line.item_id, variance, line.location_id, req.params.id, counts[0].count_number,
         `Physical count variance: system ${line.system_qty} -> counted ${line.counted_qty}`, req.user.id]);
      
      // GL posting for variance
      try {
        const adjustType = variance > 0 ? 'increase' : 'decrease';
        await GLService.postInventoryAdjustment({
          adjustmentId: req.params.id,
          itemId: line.item_id,
          quantity: Math.abs(variance),
          cost: Number(line.standard_cost || 0),
          adjustmentType: adjustType,
          transactionDate: new Date(),
          memo: `Physical Count ${counts[0].count_number} - ${line.item_id}`,
          postedBy: req.user.id
        });
      } catch (glErr) { console.error('GL physical count error:', glErr.message); }
      
      await pool.query("UPDATE physical_count_lines SET status = 'posted' WHERE id = ?", [line.id]);
    }
    
    await pool.query("UPDATE physical_counts SET status = 'posted', posted_by = ?, posted_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    
    res.json({ message: 'Physical count posted', total_variance_qty: totalVarianceQty, total_variance_cost: totalVarianceCost });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


module.exports = router;
