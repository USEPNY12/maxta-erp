const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');

// ============ VENDORS ============
router.get('/vendors', authenticate, async (req, res) => {
  try {
    const { search, vendor_type, page = 1, limit = 50 } = req.query;
    let query = 'SELECT v.*, vt.name as vendor_type_name FROM vendors v LEFT JOIN vendor_types vt ON v.vendor_type_id = vt.id WHERE 1=1';
    const params = [];
    if (search) { query += ' AND (v.company_name LIKE ? OR v.vendor_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (vendor_type) { query += ' AND v.vendor_type_id = ?'; params.push(vendor_type); }
    query += ' ORDER BY v.company_name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [vendors] = await pool.query(query, params);
    res.json(vendors);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/vendors/:id', authenticate, async (req, res) => {
  try {
    const [vendors] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (vendors.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const [items] = await pool.query(`SELECT vi.*, i.item_number, i.description FROM vendor_items vi JOIN items i ON vi.item_id = i.id WHERE vi.vendor_id = ?`, [req.params.id]);
    const [recentPOs] = await pool.query('SELECT * FROM purchase_orders WHERE vendor_id = ? ORDER BY order_date DESC LIMIT 10', [req.params.id]);
    res.json({ ...vendors[0], items, recent_pos: recentPOs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/vendors', authenticate, async (req, res) => {
  try {
    const vendorNumber = await getNextNumber('vendor');
    const { company_name, contact_name, address1, address2, city, state, zip, country, phone, fax, email, website,
            vendor_type_id, payment_terms, tax_id, currency, notes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO vendors (vendor_number, company_name, contact_name, address1, address2, city, state, zip, country, phone, fax, email, website,
       vendor_type_id, payment_terms, tax_id, currency, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [vendorNumber, company_name, contact_name, address1, address2, city, state, zip, country || 'USA', phone, fax, email, website,
       vendor_type_id, payment_terms || 'Net 30', tax_id, currency || 'USD', notes]
    );
    res.status(201).json({ id: result.insertId, vendor_number: vendorNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/vendors/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    delete fields.id; delete fields.vendor_number; delete fields.created_at;
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE vendors SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    res.json({ message: 'Vendor updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PURCHASE ORDERS ============
router.get('/purchase-orders', authenticate, async (req, res) => {
  try {
    const { status, vendor_id, search, po_type } = req.query;
    let query = `SELECT po.*, v.company_name as vendor_name FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND po.status = ?'; params.push(status); }
    if (vendor_id) { query += ' AND po.vendor_id = ?'; params.push(vendor_id); }
    if (po_type) { query += ' AND po.po_type = ?'; params.push(po_type); }
    if (search) { query += ' AND (po.po_number LIKE ? OR v.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY po.order_date DESC LIMIT 100';
    const [pos] = await pool.query(query, params);
    res.json(pos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/purchase-orders/:id', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT po.*, v.company_name as vendor_name, v.email as vendor_email FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ?', [req.params.id]);
    if (pos.length === 0) return res.status(404).json({ error: 'PO not found' });
    const [lines] = await pool.query(`SELECT pol.*, i.item_number, i.description as item_description FROM po_lines pol JOIN items i ON pol.item_id = i.id WHERE pol.purchase_order_id = ? ORDER BY pol.line_number`, [req.params.id]);
    res.json({ ...pos[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/purchase-orders', authenticate, async (req, res) => {
  try {
    const poNumber = await getNextNumber('purchase_order');
    const { vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, notes, lines } = req.body;

    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += (l.quantity_ordered * l.unit_cost); });

    const [result] = await pool.query(
      `INSERT INTO purchase_orders (po_number, vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, subtotal, total, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'open',?)`,
      [poNumber, vendor_id, po_type || 'restock', order_date || new Date(), required_date, work_order_id, ship_to_location_id, subtotal, subtotal, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await pool.query(
          'INSERT INTO po_lines (purchase_order_id, line_number, item_id, description, quantity_ordered, uom, unit_cost, line_total, required_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [result.insertId, i + 1, l.item_id, l.description, l.quantity_ordered, l.uom || 'Each', l.unit_cost, l.quantity_ordered * l.unit_cost, l.required_date, l.notes]
        );
      }
    }
    res.status(201).json({ id: result.insertId, po_number: poNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PO RECEIPTS ============
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const [receipts] = await pool.query(`
      SELECT pr.*, po.po_number, v.company_name as vendor_name 
      FROM po_receipts pr JOIN purchase_orders po ON pr.purchase_order_id = po.id JOIN vendors v ON po.vendor_id = v.id
      ORDER BY pr.receipt_date DESC LIMIT 100`);
    res.json(receipts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/receipts', authenticate, async (req, res) => {
  try {
    const receiptNumber = await getNextNumber('po_receipt');
    const { purchase_order_id, receipt_date, location_id, notes, lines } = req.body;

    const [result] = await pool.query(
      'INSERT INTO po_receipts (receipt_number, purchase_order_id, receipt_date, location_id, notes, received_by) VALUES (?,?,?,?,?,?)',
      [receiptNumber, purchase_order_id, receipt_date || new Date(), location_id, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (const l of lines) {
        await pool.query(
          'INSERT INTO po_receipt_lines (po_receipt_id, po_line_id, item_id, quantity_received, lot_number, serial_number, location_id) VALUES (?,?,?,?,?,?,?)',
          [result.insertId, l.po_line_id, l.item_id, l.quantity_received, l.lot_number, l.serial_number, location_id]
        );
        // Update PO line
        await pool.query('UPDATE po_lines SET quantity_received = quantity_received + ? WHERE id = ?', [l.quantity_received, l.po_line_id]);
        // Update inventory
        await pool.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [l.quantity_received, l.item_id]);
        // Create lot if lot controlled
        if (l.lot_number) {
          await pool.query(
            'INSERT INTO lots (item_id, lot_number, quantity, received_date, location_id, vendor_id, po_number) VALUES (?,?,?,NOW(),?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [l.item_id, l.lot_number, l.quantity_received, location_id, null, null, l.quantity_received]
          );
        }
      }
    }
    res.status(201).json({ id: result.insertId, receipt_number: receiptNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AP INVOICES ============
router.get('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { status, vendor_id } = req.query;
    let query = 'SELECT api.*, v.company_name as vendor_name FROM ap_invoices api JOIN vendors v ON api.vendor_id = v.id WHERE 1=1';
    const params = [];
    if (status) { query += ' AND api.status = ?'; params.push(status); }
    if (vendor_id) { query += ' AND api.vendor_id = ?'; params.push(vendor_id); }
    query += ' ORDER BY api.invoice_date DESC LIMIT 100';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount, freight, notes } = req.body;
    const total = (amount || 0) + (tax_amount || 0) + (freight || 0);
    const [result] = await pool.query(
      `INSERT INTO ap_invoices (vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount, freight, total, balance, notes, status, entered_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'open',?)`,
      [vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount || 0, freight || 0, total, total, notes, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ VENDOR ITEMS ============
router.get('/vendor-items', authenticate, async (req, res) => {
  try {
    const { vendor_id, item_id } = req.query;
    let query = 'SELECT vi.*, i.item_number, i.description, v.company_name FROM vendor_items vi JOIN items i ON vi.item_id = i.id JOIN vendors v ON vi.vendor_id = v.id WHERE 1=1';
    const params = [];
    if (vendor_id) { query += ' AND vi.vendor_id = ?'; params.push(vendor_id); }
    if (item_id) { query += ' AND vi.item_id = ?'; params.push(item_id); }
    const [items] = await pool.query(query, params);
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SETUP ============
router.get('/vendor-types', authenticate, async (req, res) => {
  try { const [types] = await pool.query('SELECT * FROM vendor_types WHERE is_active = TRUE'); res.json(types); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// Dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openPOs] = await pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('open','partial')");
    const [mtdPurchases] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM purchase_orders WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [openAP] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ap_invoices WHERE status = 'open'");
    const [overdueAP] = await pool.query("SELECT COALESCE(SUM(balance),0) as total FROM ap_invoices WHERE due_date < CURDATE() AND status = 'open'");
    res.json({ open_pos: openPOs[0].count, mtd_purchases: mtdPurchases[0].total, open_ap: openAP[0].total, overdue_ap: overdueAP[0].total });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
