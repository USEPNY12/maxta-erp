const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const { checkDocumentLock, preventDelete } = require('../middleware/documentLock');

// ============ VENDORS ============
router.get('/vendors', authenticate, async (req, res) => {
  try {
    const { search, vendor_type, status, page = 1, limit = 50 } = req.query;
    let query = 'SELECT v.*, vt.name as vendor_type_name FROM vendors v LEFT JOIN vendor_types vt ON v.vendor_type_id = vt.id WHERE 1=1';
    const params = [];
    if (search) { query += ' AND (v.company_name LIKE ? OR v.vendor_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (vendor_type) { query += ' AND v.vendor_type_id = ?'; params.push(vendor_type); }
    if (status === 'active') query += ' AND v.is_active = TRUE';
    if (status === 'inactive') query += ' AND v.is_active = FALSE';
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
    const [openAP] = await pool.query("SELECT * FROM ap_invoices WHERE vendor_id = ? AND status IN ('open','partial') ORDER BY due_date", [req.params.id]);
    res.json({ ...vendors[0], items, recent_pos: recentPOs, open_ap: openAP });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/vendors', authenticate, async (req, res) => {
  try {
    const vendorNumber = await getNextNumber('vendor');
    const b = req.body;
    const company_name = b.name || b.company_name;
    const [result] = await pool.query(
      `INSERT INTO vendors (vendor_number, company_name, contact_name, address1, address2, city, state, zip, country, phone, fax, email, website,
       vendor_type_id, payment_terms, tax_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [vendorNumber, company_name, b.contact_name, b.address1, b.address2, b.city, b.state, b.zip, b.country || 'USA', b.phone, b.fax, b.email, b.website,
       b.vendor_type_id, b.payment_terms || 'Net 30', b.tax_id, b.notes]
    );
    await req.audit('vendors', result.insertId, 'INSERT', null, { vendor_number: vendorNumber, company_name });
    res.status(201).json({ id: result.insertId, vendor_number: vendorNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/vendors/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    const fields = req.body;
    delete fields.id; delete fields.vendor_number; delete fields.created_at;
    if (fields.name) { fields.company_name = fields.name; delete fields.name; }
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE vendors SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    await req.audit('vendors', req.params.id, 'UPDATE', old[0], fields);
    res.json({ message: 'Vendor updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PURCHASE ORDERS ============
router.get('/purchase-orders', authenticate, async (req, res) => {
  try {
    const { status, vendor_id, search, po_type } = req.query;
    let query = `SELECT po.*, v.company_name as vendor_name FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND po.status IN ('draft','approved','sent','partial_receipt','open','partial')"; } else if (status && status !== 'all' && status !== '') { query += ' AND po.status = ?'; params.push(status); }
    if (vendor_id) { query += ' AND po.vendor_id = ?'; params.push(vendor_id); }
    if (po_type) { query += ' AND po.po_type = ?'; params.push(po_type); }
    if (search) { query += ' AND (po.po_number LIKE ? OR v.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY po.order_date DESC LIMIT 200';
    const [pos] = await pool.query(query, params);
    res.json(pos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/purchase-orders/:id', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT po.*, v.company_name as vendor_name, v.email as vendor_email FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ?', [req.params.id]);
    if (pos.length === 0) return res.status(404).json({ error: 'PO not found' });
    const [lines] = await pool.query(`SELECT pol.*, i.item_number, i.description as item_description FROM po_lines pol LEFT JOIN items i ON pol.item_id = i.id WHERE pol.purchase_order_id = ? ORDER BY pol.line_number`, [req.params.id]);
    const [receipts] = await pool.query('SELECT * FROM po_receipts WHERE purchase_order_id = ? ORDER BY receipt_date DESC', [req.params.id]);
    res.json({ ...pos[0], lines, receipts });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/purchase-orders', authenticate, async (req, res) => {
  try {
    const poNumber = await getNextNumber('purchase_order');
    const { vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, notes, lines } = req.body;

    let subtotal = 0;
    if (lines) lines.forEach(l => { 
      const cost = l.unit_cost || l.unit_price || 0;
      subtotal += ((l.quantity_ordered || l.quantity || 0) * cost); 
    });

    const [result] = await pool.query(
      `INSERT INTO purchase_orders (po_number, vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, subtotal, total, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'draft',?)`,
      [poNumber, vendor_id, po_type || 'standard', order_date || new Date(), required_date, work_order_id, ship_to_location_id, subtotal, subtotal, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const cost = l.unit_cost || l.unit_price || 0;
        const qty = l.quantity_ordered || l.quantity || 0;
        await pool.query(
          'INSERT INTO po_lines (purchase_order_id, line_number, item_id, description, quantity_ordered, uom, unit_cost, line_total, required_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [result.insertId, i + 1, l.item_id, l.description, qty, l.uom || 'Each', cost, qty * cost, l.required_date, l.notes]
        );
      }
    }
    await req.audit('purchase_orders', result.insertId, 'INSERT', null, { po_number: poNumber, vendor_id, total: subtotal });
    res.status(201).json({ id: result.insertId, po_number: poNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Approve/Issue PO (changes status from draft to open - ready to send to vendor)
router.post('/purchase-orders/:id/approve', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    if (pos[0].status !== 'draft') return res.status(400).json({ error: 'Only draft POs can be approved' });

    await pool.query("UPDATE purchase_orders SET status = 'open', approved_by = ?, approved_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'APPROVE', { status: 'draft' }, { status: 'open' });
    res.json({ message: 'PO approved and ready to send to vendor' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Cancel PO
router.post('/purchase-orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    if (['closed', 'cancelled'].includes(pos[0].status)) return res.status(400).json({ error: 'PO already closed/cancelled' });

    await pool.query("UPDATE purchase_orders SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'CANCEL', { status: pos[0].status }, { status: 'cancelled' });
    res.json({ message: 'PO cancelled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/purchase-orders/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'PO not found' });
    if (['closed', 'cancelled'].includes(old[0].status)) return res.status(403).json({ error: 'Cannot edit a closed/cancelled PO' });

    const { vendor_id, required_date, notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0)); });

    await pool.query('UPDATE purchase_orders SET vendor_id=?, required_date=?, subtotal=?, total=?, notes=? WHERE id=?',
      [vendor_id || old[0].vendor_id, required_date, subtotal, subtotal, notes, req.params.id]);

    if (lines) {
      await pool.query('DELETE FROM po_lines WHERE purchase_order_id = ?', [req.params.id]);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const cost = l.unit_cost || l.unit_price || 0;
        const qty = l.quantity_ordered || l.quantity || 0;
        await pool.query(
          'INSERT INTO po_lines (purchase_order_id, line_number, item_id, description, quantity_ordered, uom, unit_cost, line_total, required_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [req.params.id, i + 1, l.item_id, l.description, qty, l.uom || 'Each', cost, qty * cost, l.required_date, l.notes]
        );
      }
    }
    await req.audit('purchase_orders', req.params.id, 'UPDATE', old[0], req.body);
    res.json({ message: 'PO updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PO RECEIPTS ============
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const { purchase_order_id } = req.query;
    let query = `SELECT pr.*, po.po_number, v.company_name as vendor_name 
      FROM po_receipts pr JOIN purchase_orders po ON pr.purchase_order_id = po.id JOIN vendors v ON po.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (purchase_order_id) { query += ' AND pr.purchase_order_id = ?'; params.push(purchase_order_id); }
    query += ' ORDER BY pr.receipt_date DESC LIMIT 200';
    const [receipts] = await pool.query(query, params);
    res.json(receipts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/receipts', authenticate, async (req, res) => {
  try {
    const receiptNumber = await getNextNumber('po_receipt');
    const { purchase_order_id, receipt_date, location_id, notes, lines } = req.body;

    // Get vendor_id from PO
    const [po] = await pool.query('SELECT vendor_id, status FROM purchase_orders WHERE id = ?', [purchase_order_id]);
    if (!po.length) return res.status(404).json({ error: 'Purchase order not found' });
    if (['cancelled', 'closed'].includes(po[0].status)) return res.status(400).json({ error: 'Cannot receive against a cancelled/closed PO' });

    const [result] = await pool.query(
      'INSERT INTO po_receipts (receipt_number, purchase_order_id, vendor_id, receipt_date, location_id, notes, received_by) VALUES (?,?,?,?,?,?,?)',
      [receiptNumber, purchase_order_id, po[0].vendor_id, receipt_date || new Date(), location_id, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (const l of lines) {
        await pool.query(
          'INSERT INTO po_receipt_lines (receipt_id, po_line_id, item_id, quantity_received, lot_number, serial_number, location_id) VALUES (?,?,?,?,?,?,?)',
          [result.insertId, l.po_line_id, l.item_id, l.quantity_received, l.lot_number, l.serial_number, location_id]
        );
        // Update PO line received qty
        await pool.query('UPDATE po_lines SET quantity_received = COALESCE(quantity_received,0) + ? WHERE id = ?', [l.quantity_received, l.po_line_id]);
        // Update inventory
        await pool.query('UPDATE items SET qty_on_hand = COALESCE(qty_on_hand,0) + ? WHERE id = ?', [l.quantity_received, l.item_id]);
        // Create lot record
        if (l.lot_number) {
          await pool.query(
            'INSERT INTO lots (item_id, lot_number, quantity, received_date, location_id, vendor_id, po_number) VALUES (?,?,?,NOW(),?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
            [l.item_id, l.lot_number, l.quantity_received, location_id, po[0].vendor_id, null]
          );
        }
      }
    }

    // Update PO status based on receipt completion
    const [poLines] = await pool.query('SELECT quantity_ordered, COALESCE(quantity_received,0) as quantity_received FROM po_lines WHERE purchase_order_id = ?', [purchase_order_id]);
    const allReceived = poLines.every(l => l.quantity_received >= l.quantity_ordered);
    const someReceived = poLines.some(l => l.quantity_received > 0);
    if (allReceived) {
      await pool.query("UPDATE purchase_orders SET status = 'received' WHERE id = ?", [purchase_order_id]);
    } else if (someReceived) {
      await pool.query("UPDATE purchase_orders SET status = 'partial' WHERE id = ?", [purchase_order_id]);
    }

    await req.audit('po_receipts', result.insertId, 'INSERT', null, { receipt_number: receiptNumber, purchase_order_id });
    res.status(201).json({ id: result.insertId, receipt_number: receiptNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AP INVOICES ============
router.get('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { status, vendor_id, search } = req.query;
    let query = `SELECT api.*, v.company_name as vendor_name, (api.total - COALESCE(api.amount_paid,0)) as balance_due
                 FROM ap_invoices api JOIN vendors v ON api.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND api.status = ?'; params.push(status); }
    if (vendor_id) { query += ' AND api.vendor_id = ?'; params.push(vendor_id); }
    if (search) { query += ' AND (api.invoice_number LIKE ? OR v.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY api.invoice_date DESC LIMIT 200';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/ap-invoices/:id', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query(`SELECT api.*, v.company_name as vendor_name, (api.total - COALESCE(api.amount_paid,0)) as balance_due FROM ap_invoices api JOIN vendors v ON api.vendor_id = v.id WHERE api.id = ?`, [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    const [payments] = await pool.query('SELECT * FROM vendor_payments WHERE ap_invoice_id = ?', [req.params.id]);
    res.json({ ...invoices[0], payments });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount, freight, notes } = req.body;
    const total = (amount || 0) + (tax_amount || 0) + (freight || 0);
    const [result] = await pool.query(
      `INSERT INTO ap_invoices (vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount, freight, total, balance, amount_paid, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,?,'open',?)`,
      [vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount || 0, freight || 0, total, total, notes, req.user.id]
    );
    await req.audit('ap_invoices', result.insertId, 'INSERT', null, { vendor_id, invoice_number, total });
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post AP Invoice (locks it)
router.post('/ap-invoices/:id/post', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    if (invoices[0].status !== 'open') return res.status(400).json({ error: 'Only open AP invoices can be posted' });

    await pool.query("UPDATE ap_invoices SET status = 'posted', posted_by = ?, posted_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('ap_invoices', req.params.id, 'POST', { status: 'open' }, { status: 'posted' });
    res.json({ message: 'AP Invoice posted. It is now locked.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Void AP Invoice
router.post('/ap-invoices/:id/void', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    if (invoices[0].amount_paid > 0) return res.status(400).json({ error: 'Cannot void an invoice with payments. Reverse payments first.' });

    await pool.query("UPDATE ap_invoices SET status = 'void', voided_by = ?, voided_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('ap_invoices', req.params.id, 'VOID', { status: invoices[0].status }, { status: 'void' });
    res.json({ message: 'AP Invoice voided' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AP Invoices cannot be deleted
router.delete('/ap-invoices/:id', authenticate, preventDelete('ap_invoices'));

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
    const [openPOs] = await pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('open','partial','draft')");
    const [mtdPurchases] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM purchase_orders WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [openAP] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ap_invoices WHERE status IN ('open','posted','partial')");
    const [overdueAP] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ap_invoices WHERE due_date < CURDATE() AND status IN ('open','posted','partial')");
    res.json({ open_pos: openPOs[0].count, mtd_purchases: mtdPurchases[0].total, open_ap: openAP[0].total, overdue_ap: overdueAP[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
