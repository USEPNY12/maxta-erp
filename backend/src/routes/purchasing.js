const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const GLService = require('../services/glService');
const { checkDocumentLock, preventDelete } = require('../middleware/documentLock');

// ============ VENDORS ============
router.get('/vendors', authenticate, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    if (search) { query += ' AND (company_name LIKE ? OR vendor_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status === 'active') query += ' AND is_active = TRUE';
    query += ' ORDER BY company_name';
    const [vendors] = await pool.query(query, params);
    res.json(vendors);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/vendors/:id', authenticate, async (req, res) => {
  try {
    const [vendors] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendors.length) return res.status(404).json({ error: 'Vendor not found' });
    const [items] = await pool.query(`SELECT iv.*, i.item_number, i.description FROM item_vendors iv JOIN items i ON iv.item_id = i.id WHERE iv.vendor_id = ?`, [req.params.id]);
    const [recentPOs] = await pool.query('SELECT id, po_number, order_date, status, total FROM purchase_orders WHERE vendor_id = ? ORDER BY order_date DESC LIMIT 20', [req.params.id]);
    const [receipts] = await pool.query(`SELECT pr.id, pr.receipt_number, pr.receipt_date, pr.status, po.po_number FROM po_receipts pr JOIN purchase_orders po ON pr.purchase_order_id = po.id WHERE po.vendor_id = ? ORDER BY pr.receipt_date DESC LIMIT 20`, [req.params.id]);
    const [openAP] = await pool.query('SELECT id, invoice_number, invoice_date, due_date, total, status, amount_paid FROM ap_invoices WHERE vendor_id = ? ORDER BY invoice_date DESC LIMIT 20', [req.params.id]);
    const [payments] = await pool.query('SELECT * FROM vendor_payments WHERE vendor_id = ? ORDER BY payment_date DESC LIMIT 20', [req.params.id]);
    res.json({ ...vendors[0], items, recent_pos: recentPOs, receipts, open_ap: openAP, payments });
  } catch (error) { console.error('Vendor detail error:', error); res.status(500).json({ error: error.message }); }
});
router.post('/vendors', authenticate, async (req, res) => {
  try {
    const vendorNumber = await getNextNumber('vendor');
    const { company_name, contact_name, email, phone, address1, city, state, zip, payment_terms, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO vendors (vendor_number, company_name, contact_name, email, phone, address1, city, state, zip, payment_terms, notes, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      [vendorNumber, company_name, contact_name, email, phone, address1, city, state, zip, payment_terms, notes]
    );
    res.status(201).json({ id: result.insertId, vendor_number: vendorNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.put('/vendors/:id', authenticate, async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, address1, city, state, zip, payment_terms, notes, is_active } = req.body;
    await pool.query(
      'UPDATE vendors SET company_name=?, contact_name=?, email=?, phone=?, address1=?, city=?, state=?, zip=?, payment_terms=?, notes=?, is_active=? WHERE id=?',
      [company_name, contact_name, email, phone, address1, city, state, zip, payment_terms, notes, is_active !== undefined ? is_active : 1, req.params.id]
    );
    res.json({ message: 'Vendor updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PURCHASE ORDERS ============
router.get('/purchase-orders', authenticate, async (req, res) => {
  try {
    const { status, search, vendor_id } = req.query;
    let query = `SELECT po.*, v.company_name as vendor_name, v.vendor_number,
      (SELECT COUNT(*) FROM po_lines WHERE purchase_order_id = po.id) as line_count,
      (SELECT COALESCE(SUM(quantity_received),0) FROM po_lines WHERE purchase_order_id = po.id) as total_received
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') {
      if (status === 'open') {
        query += " AND po.status IN ('draft','open','sent','partial')";
      } else {
        query += ' AND po.status = ?'; params.push(status);
      }
    }
    if (search) { query += ' AND (po.po_number LIKE ? OR v.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (vendor_id) { query += ' AND po.vendor_id = ?'; params.push(vendor_id); }
    query += ' ORDER BY po.order_date DESC, po.id DESC';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/purchase-orders/:id', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query(`SELECT po.*, v.company_name as vendor_name, v.vendor_number, v.email as vendor_email, v.phone as vendor_phone, v.address1 as vendor_address
      FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ?`, [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    const [lines] = await pool.query(`SELECT pl.*, i.item_number, i.description as item_description
      FROM po_lines pl LEFT JOIN items i ON pl.item_id = i.id WHERE pl.purchase_order_id = ? ORDER BY pl.line_number`, [req.params.id]);
    const [receipts] = await pool.query(`SELECT pr.*, (SELECT COUNT(*) FROM po_receipt_lines WHERE receipt_id = pr.id) as line_count
      FROM po_receipts pr WHERE pr.purchase_order_id = ? ORDER BY pr.receipt_date DESC`, [req.params.id]);
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE purchase_order_id = ? ORDER BY invoice_date DESC', [req.params.id]);
    res.json({ ...pos[0], lines, receipts, invoices });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/purchase-orders', authenticate, async (req, res) => {
  try {
    const poNumber = await getNextNumber('purchase_order');
    const { vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, payment_terms, freight_terms, notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0)); });
    const [result] = await pool.query(
      `INSERT INTO purchase_orders (po_number, vendor_id, po_type, order_date, required_date, work_order_id, ship_to_location_id, payment_terms, freight_terms, subtotal, total, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)`,
      [poNumber, vendor_id, po_type || 'standard', order_date || new Date(), required_date, work_order_id, ship_to_location_id, payment_terms, freight_terms, subtotal, subtotal, notes, req.user.id]
    );
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const cost = l.unit_cost || l.unit_price || 0;
        const qty = l.quantity_ordered || l.quantity || 0;
        await pool.query(
          `INSERT INTO po_lines (purchase_order_id, line_number, item_id, description, quantity_ordered, uom, unit_cost, line_total, required_date, notes, glass_type, thickness, width, height, edge_type)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id || null, l.description, qty, l.uom || 'Each', cost, qty * cost, l.required_date, l.notes, l.glass_type, l.thickness, l.width, l.height, l.edge_type]
        );
      }
    }
    await req.audit('purchase_orders', result.insertId, 'INSERT', null, { po_number: poNumber, vendor_id, total: subtotal });
    res.status(201).json({ id: result.insertId, po_number: poNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/purchase-orders/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'PO not found' });
    if (['closed', 'cancelled'].includes(old[0].status)) return res.status(403).json({ error: 'Cannot edit a closed/cancelled PO' });
    const { vendor_id, required_date, payment_terms, freight_terms, notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0)); });
    await pool.query('UPDATE purchase_orders SET vendor_id=?, required_date=?, payment_terms=?, freight_terms=?, subtotal=?, total=?, notes=? WHERE id=?',
      [vendor_id || old[0].vendor_id, required_date, payment_terms, freight_terms, subtotal, subtotal, notes, req.params.id]);
    if (lines) {
      await pool.query('DELETE FROM po_lines WHERE purchase_order_id = ?', [req.params.id]);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const cost = l.unit_cost || l.unit_price || 0;
        const qty = l.quantity_ordered || l.quantity || 0;
        await pool.query(
          `INSERT INTO po_lines (purchase_order_id, line_number, item_id, description, quantity_ordered, uom, unit_cost, line_total, required_date, notes, glass_type, thickness, width, height, edge_type)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [req.params.id, i + 1, l.item_id || null, l.description, qty, l.uom || 'Each', cost, qty * cost, l.required_date, l.notes, l.glass_type, l.thickness, l.width, l.height, l.edge_type]
        );
      }
    }
    await req.audit('purchase_orders', req.params.id, 'UPDATE', old[0], req.body);
    res.json({ message: 'PO updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Approve PO (draft -> open)
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

// Send to Vendor (open -> sent)
router.post('/purchase-orders/:id/send', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    if (!['open', 'draft'].includes(pos[0].status)) return res.status(400).json({ error: 'PO must be open or draft to send' });
    // If draft, auto-approve first
    if (pos[0].status === 'draft') {
      await pool.query("UPDATE purchase_orders SET approved_by = ?, approved_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    }
    await pool.query("UPDATE purchase_orders SET status = 'sent', sent_by = ?, sent_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'SEND', { status: pos[0].status }, { status: 'sent' });
    res.json({ message: 'PO sent to vendor' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Close PO (short close - cancels remaining quantities)
router.post('/purchase-orders/:id/close', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    if (['closed', 'cancelled'].includes(pos[0].status)) return res.status(400).json({ error: 'PO already closed/cancelled' });
    // Cancel remaining quantities on all open lines
    const [lines] = await pool.query('SELECT * FROM po_lines WHERE purchase_order_id = ?', [req.params.id]);
    for (const line of lines) {
      const remaining = (line.quantity_ordered || 0) - (line.quantity_received || 0) - (line.quantity_cancelled || 0);
      if (remaining > 0) {
        await pool.query("UPDATE po_lines SET quantity_cancelled = COALESCE(quantity_cancelled,0) + ?, status = 'cancelled' WHERE id = ?", [remaining, line.id]);
      }
    }
    await pool.query("UPDATE purchase_orders SET status = 'closed', closed_by = ?, closed_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'CLOSE', { status: pos[0].status }, { status: 'closed' });
    res.json({ message: 'PO closed. Remaining quantities cancelled.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Cancel PO
router.post('/purchase-orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });
    if (['closed', 'cancelled'].includes(pos[0].status)) return res.status(400).json({ error: 'PO already closed/cancelled' });
    // Check if any receipts exist
    const [receipts] = await pool.query('SELECT COUNT(*) as cnt FROM po_receipts WHERE purchase_order_id = ?', [req.params.id]);
    if (receipts[0].cnt > 0) return res.status(400).json({ error: 'Cannot cancel PO with existing receipts. Use Close instead.' });
    await pool.query("UPDATE purchase_orders SET status = 'cancelled', closed_by = ?, closed_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await pool.query("UPDATE po_lines SET status = 'cancelled' WHERE purchase_order_id = ?", [req.params.id]);
    await req.audit('purchase_orders', req.params.id, 'CANCEL', { status: pos[0].status }, { status: 'cancelled' });
    res.json({ message: 'PO cancelled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ PO RECEIPTS (RECEIVING) ============
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const { po_id, search } = req.query;
    let query = `SELECT pr.*, po.po_number, v.company_name as vendor_name,
      (SELECT COUNT(*) FROM po_receipt_lines WHERE receipt_id = pr.id) as line_count,
      (SELECT COALESCE(SUM(quantity_received),0) FROM po_receipt_lines WHERE receipt_id = pr.id) as total_qty_received
      FROM po_receipts pr
      LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (po_id) { query += ' AND pr.purchase_order_id = ?'; params.push(po_id); }
    if (search) { query += ' AND (pr.receipt_number LIKE ? OR po.po_number LIKE ? OR v.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY pr.receipt_date DESC, pr.id DESC';
    const [receipts] = await pool.query(query, params);
    res.json(receipts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/receipts/:id', authenticate, async (req, res) => {
  try {
    const [receipts] = await pool.query(`SELECT pr.*, po.po_number, v.company_name as vendor_name
      FROM po_receipts pr
      LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id WHERE pr.id = ?`, [req.params.id]);
    if (!receipts.length) return res.status(404).json({ error: 'Receipt not found' });
    const [lines] = await pool.query(`SELECT prl.*, i.item_number, i.description as item_description, pl.glass_type, pl.thickness, pl.width, pl.height, pl.edge_type, l.name as location_name
      FROM po_receipt_lines prl
      LEFT JOIN items i ON prl.item_id = i.id
      LEFT JOIN po_lines pl ON prl.po_line_id = pl.id
      LEFT JOIN locations l ON prl.location_id = l.id
      WHERE prl.receipt_id = ?`, [req.params.id]);
    res.json({ ...receipts[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get open PO lines for receiving (lines with remaining qty)
router.get('/purchase-orders/:id/receivable-lines', authenticate, async (req, res) => {
  try {
    const [lines] = await pool.query(`SELECT pl.*, i.item_number, i.description as item_description,
      (pl.quantity_ordered - COALESCE(pl.quantity_received,0) - COALESCE(pl.quantity_cancelled,0)) as qty_remaining
      FROM po_lines pl
      LEFT JOIN items i ON pl.item_id = i.id
      WHERE pl.purchase_order_id = ?
      HAVING qty_remaining > 0
      ORDER BY pl.line_number`, [req.params.id]);
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create Receipt - THE MAIN RECEIVING FLOW
router.post('/receipts', authenticate, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { purchase_order_id, receipt_date, packing_slip_number, vendor_invoice_number, location_id, notes, lines } = req.body;
    
    // Get PO info
    const [pos] = await conn.query('SELECT * FROM purchase_orders WHERE id = ?', [purchase_order_id]);
    if (!pos.length) { await conn.rollback(); return res.status(404).json({ error: 'PO not found' }); }
    if (['closed', 'cancelled'].includes(pos[0].status)) { await conn.rollback(); return res.status(400).json({ error: 'Cannot receive against a closed/cancelled PO' }); }
    
    // Generate receipt number
    const receiptNumber = await getNextNumber('po_receipt');
    
    // Create receipt header
    const [receiptResult] = await conn.query(
      `INSERT INTO po_receipts (receipt_number, purchase_order_id, vendor_id, receipt_date, packing_slip_number, vendor_invoice_number, location_id, notes, status, received_by)
       VALUES (?,?,?,?,?,?,?,?,'received',?)`,
      [receiptNumber, purchase_order_id, pos[0].vendor_id, receipt_date || new Date(), packing_slip_number, vendor_invoice_number, location_id, notes, req.user.id]
    );
    const receiptId = receiptResult.insertId;
    
    // Process each line
    let totalReceived = 0;
    for (const line of lines) {
      if (!line.quantity_received || line.quantity_received <= 0) continue;
      
      // Generate barcode for this receipt line
      const barcode = `${receiptNumber}-${line.po_line_id}-${Date.now().toString(36).toUpperCase()}`;
      
      // Insert receipt line
      await conn.query(
        `INSERT INTO po_receipt_lines (receipt_id, po_line_id, item_id, quantity_received, quantity_rejected, unit_cost, lot_number, location_id, storage_location, barcode, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [receiptId, line.po_line_id, line.item_id, line.quantity_received, line.quantity_rejected || 0, line.unit_cost, line.lot_number, line.location_id || location_id, line.storage_location, barcode, line.notes]
      );
      
      // Update PO line received qty
      await conn.query(
        'UPDATE po_lines SET quantity_received = COALESCE(quantity_received,0) + ? WHERE id = ?',
        [line.quantity_received, line.po_line_id]
      );
      
      // Update PO line status
      const [updatedLine] = await conn.query('SELECT quantity_ordered, quantity_received, quantity_cancelled FROM po_lines WHERE id = ?', [line.po_line_id]);
      if (updatedLine.length) {
        const remaining = updatedLine[0].quantity_ordered - updatedLine[0].quantity_received - (updatedLine[0].quantity_cancelled || 0);
        const newStatus = remaining <= 0 ? 'received' : 'partial';
        await conn.query('UPDATE po_lines SET status = ? WHERE id = ?', [newStatus, line.po_line_id]);
      }
      
      // UPDATE INVENTORY - increase qty_on_hand
      if (line.item_id) {
        await conn.query('UPDATE items SET qty_on_hand = COALESCE(qty_on_hand,0) + ? WHERE id = ?', [line.quantity_received, line.item_id]);
        
        // Create inventory transaction record
        await conn.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, reference_number, location_id, lot_number, unit_cost, total_cost, notes, created_by)
           VALUES (?,'receipt',?,?,?,?,?,?,?,?,?,?)`,
          [line.item_id, line.quantity_received, 'po_receipt', receiptId, receiptNumber, line.location_id || location_id, line.lot_number, line.unit_cost, (line.quantity_received * (line.unit_cost || 0)), `Received from PO ${pos[0].po_number}`, req.user.id]
        );
      }
      
      // Create lot record if lot_number provided
      if (line.lot_number && line.item_id) {
        const [existingLot] = await conn.query('SELECT id FROM lots WHERE lot_number = ? AND item_id = ?', [line.lot_number, line.item_id]);
        if (existingLot.length) {
          await conn.query('UPDATE lots SET quantity = quantity + ? WHERE id = ?', [line.quantity_received, existingLot[0].id]);
        } else {
          await conn.query(
            `INSERT INTO lots (lot_number, item_id, quantity, location_id, received_date, vendor_id, po_number, status)
             VALUES (?,?,?,?,?,?,?,'available')`,
            [line.lot_number, line.item_id, line.quantity_received, line.location_id || location_id, receipt_date || new Date(), pos[0].vendor_id, pos[0].po_number]
          );
        }
      }
      
      totalReceived += line.quantity_received;
    }
    
    // Update PO status based on overall receipt status
    const [allLines] = await conn.query('SELECT quantity_ordered, quantity_received, quantity_cancelled FROM po_lines WHERE purchase_order_id = ?', [purchase_order_id]);
    let allReceived = true;
    let anyReceived = false;
    for (const l of allLines) {
      const remaining = l.quantity_ordered - (l.quantity_received || 0) - (l.quantity_cancelled || 0);
      if (remaining > 0) allReceived = false;
      if ((l.quantity_received || 0) > 0) anyReceived = true;
    }
    const newPOStatus = allReceived ? 'received' : (anyReceived ? 'partial' : pos[0].status);
    await conn.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [newPOStatus, purchase_order_id]);
    
    // Update location current_items count
    if (location_id) {
      await conn.query('UPDATE locations SET current_items = COALESCE(current_items,0) + ? WHERE id = ?', [totalReceived, location_id]);
    }
    
    await conn.commit();
    await req.audit('po_receipts', receiptId, 'INSERT', null, { receipt_number: receiptNumber, po_number: pos[0].po_number, total_received: totalReceived });
    res.status(201).json({ id: receiptId, receipt_number: receiptNumber, total_received: totalReceived, po_status: newPOStatus });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// Get barcode labels for a receipt
router.get('/receipts/:id/labels', authenticate, async (req, res) => {
  try {
    const [receipt] = await pool.query(`SELECT pr.*, po.po_number, v.company_name as vendor_name
      FROM po_receipts pr
      LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id WHERE pr.id = ?`, [req.params.id]);
    if (!receipt.length) return res.status(404).json({ error: 'Receipt not found' });
    
    const [lines] = await pool.query(`SELECT prl.*, i.item_number, i.description as item_description, pl.glass_type, pl.thickness, pl.width, pl.height, pl.edge_type, l.name as location_name
      FROM po_receipt_lines prl
      LEFT JOIN items i ON prl.item_id = i.id
      LEFT JOIN po_lines pl ON prl.po_line_id = pl.id
      LEFT JOIN locations l ON prl.location_id = l.id
      WHERE prl.receipt_id = ?`, [req.params.id]);
    
    // Get label configuration
    const [labelConfig] = await pool.query("SELECT * FROM label_configurations WHERE label_type = 'product' AND is_default = 1 LIMIT 1");
    
    const labels = lines.map(line => ({
      barcode: line.barcode,
      item_number: line.item_number,
      description: line.item_description,
      glass_type: line.glass_type,
      thickness: line.thickness,
      width: line.width,
      height: line.height,
      edge_type: line.edge_type,
      lot_number: line.lot_number,
      location: line.location_name || line.storage_location,
      po_number: receipt[0].po_number,
      vendor: receipt[0].vendor_name,
      receipt_number: receipt[0].receipt_number,
      date_received: receipt[0].receipt_date,
      quantity: line.quantity_received
    }));
    
    res.json({ labels, config: labelConfig[0] || null });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create AP Invoice from Receipt (three-way match)
router.post('/receipts/:id/create-invoice', authenticate, async (req, res) => {
  try {
    const [receipt] = await pool.query('SELECT * FROM po_receipts WHERE id = ?', [req.params.id]);
    if (!receipt.length) return res.status(404).json({ error: 'Receipt not found' });
    if (receipt[0].ap_invoice_id) return res.status(400).json({ error: 'AP Invoice already created for this receipt' });
    
    // Get receipt lines with costs
    const [lines] = await pool.query(`SELECT prl.*, pl.description, i.item_number
      FROM po_receipt_lines prl
      LEFT JOIN po_lines pl ON prl.po_line_id = pl.id
      LEFT JOIN items i ON prl.item_id = i.id
      WHERE prl.receipt_id = ?`, [req.params.id]);
    
    // Calculate total
    let amount = 0;
    lines.forEach(l => { amount += (l.quantity_received * (l.unit_cost || 0)); });
    
    // Get PO for terms
    const [po] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [receipt[0].purchase_order_id]);
    const terms = po.length ? (po[0].payment_terms || 'Net 30') : 'Net 30';
    const dueDate = new Date();
    const netDays = parseInt(terms.replace(/\D/g, '')) || 30;
    dueDate.setDate(dueDate.getDate() + netDays);
    
    // Create AP Invoice
    const invoiceNumber = await getNextNumber('ap_invoice');
    const [result] = await pool.query(
      `INSERT INTO ap_invoices (invoice_number, vendor_id, purchase_order_id, invoice_date, due_date, amount, tax_amount, freight, total, balance, amount_paid, notes, status, terms, created_by)
       VALUES (?,?,?,NOW(),?,?,0,0,?,?,0,?,'open',?,?)`,
      [invoiceNumber, receipt[0].vendor_id, receipt[0].purchase_order_id, dueDate, amount, amount, amount, `Auto-created from Receipt ${receipt[0].receipt_number}`, terms, req.user.id]
    );
    
    // Link receipt to invoice
    await pool.query('UPDATE po_receipts SET ap_invoice_id = ? WHERE id = ?', [result.insertId, req.params.id]);
    
    await req.audit('ap_invoices', result.insertId, 'INSERT', null, { invoice_number: invoiceNumber, receipt_id: req.params.id, total: amount });
    res.status(201).json({ id: result.insertId, invoice_number: invoiceNumber, total: amount });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ LOCATIONS ============
router.get('/locations', authenticate, async (req, res) => {
  try {
    const { type, parent_id } = req.query;
    let query = 'SELECT l.*, p.name as parent_name FROM locations l LEFT JOIN locations p ON l.parent_id = p.id WHERE l.is_active = 1';
    const params = [];
    if (type) { query += ' AND l.location_type = ?'; params.push(type); }
    if (parent_id) { query += ' AND l.parent_id = ?'; params.push(parent_id); }
    query += ' ORDER BY l.parent_id, l.name';
    const [locations] = await pool.query(query, params);
    res.json(locations);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get location hierarchy (warehouse -> racks -> bins)
router.get('/locations/hierarchy', authenticate, async (req, res) => {
  try {
    const [all] = await pool.query('SELECT * FROM locations WHERE is_active = 1 ORDER BY parent_id, name');
    // Build tree
    const warehouses = all.filter(l => !l.parent_id);
    const tree = warehouses.map(wh => ({
      ...wh,
      children: all.filter(l => l.parent_id === wh.id).map(rack => ({
        ...rack,
        children: all.filter(l => l.parent_id === rack.id)
      }))
    }));
    res.json(tree);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AP INVOICES ============
router.get('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { status, search, vendor_id } = req.query;
    let query = `SELECT ai.*, v.company_name as vendor_name, po.po_number
      FROM ap_invoices ai
      LEFT JOIN vendors v ON ai.vendor_id = v.id
      LEFT JOIN purchase_orders po ON ai.purchase_order_id = po.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') {
      if (status === 'open') {
        query += " AND ai.status IN ('draft','open','posted','partial')";
      } else {
        query += ' AND ai.status = ?'; params.push(status);
      }
    }
    if (search) { query += ' AND (ai.invoice_number LIKE ? OR v.company_name LIKE ? OR po.po_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (vendor_id) { query += ' AND ai.vendor_id = ?'; params.push(vendor_id); }
    query += ' ORDER BY ai.invoice_date DESC';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/ap-invoices/:id', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query(`SELECT ai.*, v.company_name as vendor_name, po.po_number
      FROM ap_invoices ai LEFT JOIN vendors v ON ai.vendor_id = v.id LEFT JOIN purchase_orders po ON ai.purchase_order_id = po.id WHERE ai.id = ?`, [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    const [payments] = await pool.query('SELECT * FROM vendor_payments WHERE ap_invoice_id = ?', [req.params.id]);
    // Get matching receipt if exists
    const [receipts] = await pool.query('SELECT * FROM po_receipts WHERE ap_invoice_id = ?', [req.params.id]);
    // Get lines from receipt lines (since AP invoices don't have their own lines table)
    let lines = [];
    if (receipts.length > 0) {
      const [receiptLines] = await pool.query(
        `SELECT prl.*, i.description as item_description, i.item_number, pl.unit_cost, pl.description as line_description
         FROM po_receipt_lines prl
         LEFT JOIN items i ON prl.item_id = i.id
         LEFT JOIN po_lines pl ON prl.po_line_id = pl.id
         WHERE prl.receipt_id = ?`, [receipts[0].id]);
      lines = receiptLines.map(l => ({
        description: l.item_description || l.line_description || l.item_number || 'Item',
        quantity: parseFloat(l.quantity_received || 0),
        unit_price: parseFloat(l.unit_cost || 0),
        total: parseFloat(l.quantity_received || 0) * parseFloat(l.unit_cost || 0)
      }));
    }
    const invoice = invoices[0];
    const receiptNumber = receipts.length > 0 ? receipts[0].receipt_number : null;
    res.json({ ...invoice, payments, receipts, lines, receipt_number: receiptNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/ap-invoices', authenticate, async (req, res) => {
  try {
    const { vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, amount, tax_amount, freight, terms, notes } = req.body;
    const total = (amount || 0) + (tax_amount || 0) + (freight || 0);
    const [result] = await pool.query(
      `INSERT INTO ap_invoices (invoice_number, vendor_id, purchase_order_id, invoice_date, due_date, amount, tax_amount, freight, total, balance, amount_paid, terms, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,'open',?)`,
      [invoice_number, vendor_id, purchase_order_id, invoice_date, due_date, amount, tax_amount || 0, freight || 0, total, total, terms, notes, req.user.id]
    );
    await req.audit('ap_invoices', result.insertId, 'INSERT', null, { vendor_id, invoice_number, total });
    res.status(201).json({ id: result.insertId, invoice_number });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post AP Invoice
router.post('/ap-invoices/:id/post', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    if (invoices[0].status !== 'open') return res.status(400).json({ error: 'Only open AP invoices can be posted' });
    // Period Lock Enforcement
    try {
      await GLService.validatePeriod(invoices[0].invoice_date || new Date());
    } catch (periodError) {
      return res.status(400).json({ error: periodError.message });
    }
    await pool.query("UPDATE ap_invoices SET status = 'posted', posted = 1, posted_date = NOW() WHERE id = ?", [req.params.id]);
    // GL Auto-Post with Purchase Price Variance (PPV)
    const invTotal = Number(invoices[0].total || 0);
    if (invTotal > 0) {
      const period = `${new Date().getMonth()+1}-${new Date().getFullYear()}`;
      
      // Check for three-way match: compare invoice total vs receipt/PO cost
      let receiptCost = 0;
      let ppvAmount = 0;
      const [matchedReceipts] = await pool.query('SELECT id FROM po_receipts WHERE ap_invoice_id = ?', [req.params.id]);
      if (matchedReceipts.length > 0) {
        const [receiptLines] = await pool.query(
          `SELECT prl.quantity_received, pl.unit_cost 
           FROM po_receipt_lines prl 
           JOIN po_lines pl ON prl.po_line_id = pl.id 
           WHERE prl.receipt_id = ?`, [matchedReceipts[0].id]);
        receiptCost = receiptLines.reduce((sum, l) => sum + (Number(l.quantity_received) * Number(l.unit_cost)), 0);
        ppvAmount = invTotal - receiptCost;
      }
      
      // Debit: Inventory/Expense for the receipt cost, PPV for the difference
      if (Math.abs(ppvAmount) > 0.01 && receiptCost > 0) {
        // Three-way match with variance
        // Debit Inventory (receipt cost)
        await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
          VALUES ((SELECT id FROM gl_accounts WHERE account_number = '1200'), NOW(), ?, ?, 0, ?, 'ap_invoice', ?, ?)`,
          [period, receiptCost, `AP Invoice ${invoices[0].invoice_number} - receipt cost`, req.params.id, req.user.id]);
        // Debit or Credit PPV account (5100) for the variance
        if (ppvAmount > 0) {
          await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
            VALUES ((SELECT id FROM gl_accounts WHERE account_number = '5100'), NOW(), ?, ?, 0, ?, 'ap_invoice', ?, ?)`,
            [period, ppvAmount, `PPV - Invoice ${invoices[0].invoice_number} over PO cost`, req.params.id, req.user.id]);
        } else {
          await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
            VALUES ((SELECT id FROM gl_accounts WHERE account_number = '5100'), NOW(), ?, 0, ?, ?, 'ap_invoice', ?, ?)`,
            [period, Math.abs(ppvAmount), `PPV - Invoice ${invoices[0].invoice_number} under PO cost`, req.params.id, req.user.id]);
        }
      } else {
        // No variance or no receipt match - debit expense directly
        await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
          VALUES ((SELECT id FROM gl_accounts WHERE account_number = '5000'), NOW(), ?, ?, 0, ?, 'ap_invoice', ?, ?)`,
          [period, invTotal, `AP Invoice ${invoices[0].invoice_number} posted`, req.params.id, req.user.id]);
      }
      
      // Credit: Accounts Payable (always the full invoice amount)
      await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
        VALUES ((SELECT id FROM gl_accounts WHERE account_number = '2000'), NOW(), ?, 0, ?, ?, 'ap_invoice', ?, ?)`,
        [period, invTotal, `AP Invoice ${invoices[0].invoice_number} posted`, req.params.id, req.user.id]);
      await pool.query('UPDATE gl_accounts SET balance = balance + ? WHERE account_number = ?', [invTotal, '2000']);
    }
    await req.audit('ap_invoices', req.params.id, 'POST', { status: 'open' }, { status: 'posted' });
    res.json({ message: 'AP Invoice posted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Pay AP Invoice
router.post('/ap-invoices/:id/pay', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    if (['paid', 'void'].includes(invoices[0].status)) return res.status(400).json({ error: 'Invoice already paid or voided' });
    
    const { amount, payment_date, payment_method, reference_number } = req.body;
    const payAmount = amount || invoices[0].balance;
    const paymentNumber = await getNextNumber('vendor_payment');
    
    await pool.query(
      `INSERT INTO vendor_payments (payment_number, ap_invoice_id, vendor_id, amount, payment_date, payment_method, reference_number, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [paymentNumber, req.params.id, invoices[0].vendor_id, payAmount, payment_date || new Date(), payment_method || 'check', reference_number, req.user.id]
    );
    
    const newAmountPaid = parseFloat(invoices[0].amount_paid || 0) + parseFloat(payAmount);
    const newBalance = parseFloat(invoices[0].total) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    
    await pool.query('UPDATE ap_invoices SET amount_paid = ?, balance = ?, status = ? WHERE id = ?',
      [newAmountPaid, Math.max(0, newBalance), newStatus, req.params.id]);
    // GL Auto-Post: Debit Accounts Payable (2000), Credit Cash (1000)
    const period = `${new Date().getMonth()+1}-${new Date().getFullYear()}`;
    await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
      VALUES ((SELECT id FROM gl_accounts WHERE account_number = '2000'), NOW(), ?, ?, 0, ?, 'vendor_payment', ?, ?)`,
      [period, payAmount, `Vendor payment ${paymentNumber} for ${invoices[0].invoice_number}`, req.params.id, req.user.id]);
    await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, memo, source_type, source_id, posted_by)
      VALUES ((SELECT id FROM gl_accounts WHERE account_number = '1000'), NOW(), ?, 0, ?, ?, 'vendor_payment', ?, ?)`,
      [period, payAmount, `Vendor payment ${paymentNumber} for ${invoices[0].invoice_number}`, req.params.id, req.user.id]);
    await pool.query('UPDATE gl_accounts SET balance = balance - ? WHERE account_number = ?', [payAmount, '2000']);
    await pool.query('UPDATE gl_accounts SET balance = balance - ? WHERE account_number = ?', [payAmount, '1000']);
    
    await req.audit('ap_invoices', req.params.id, 'PAY', { balance: invoices[0].balance }, { balance: newBalance, payment: payAmount });
    res.json({ message: 'Payment recorded', payment_number: paymentNumber, new_balance: Math.max(0, newBalance), status: newStatus });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Void AP Invoice
router.post('/ap-invoices/:id/void', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    if (invoices[0].amount_paid > 0) return res.status(400).json({ error: 'Cannot void an invoice with payments' });
    await pool.query("UPDATE ap_invoices SET status = 'void' WHERE id = ?", [req.params.id]);
    await req.audit('ap_invoices', req.params.id, 'VOID', { status: invoices[0].status }, { status: 'void' });
    res.json({ message: 'AP Invoice voided' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INVENTORY TRANSACTIONS ============
router.get('/inventory-transactions', authenticate, async (req, res) => {
  try {
    const { item_id, type, limit: lim } = req.query;
    let query = `SELECT it.*, i.item_number, i.description as item_description, l.name as location_name
      FROM inventory_transactions it
      LEFT JOIN items i ON it.item_id = i.id
      LEFT JOIN locations l ON it.location_id = l.id WHERE 1=1`;
    const params = [];
    if (item_id) { query += ' AND it.item_id = ?'; params.push(item_id); }
    if (type) { query += ' AND it.transaction_type = ?'; params.push(type); }
    query += ' ORDER BY it.created_at DESC';
    if (lim) { query += ' LIMIT ?'; params.push(parseInt(lim)); }
    const [transactions] = await pool.query(query, params);
    res.json(transactions);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ VENDOR ITEMS ============
router.get('/vendor-items', authenticate, async (req, res) => {
  try {
    const { vendor_id, item_id } = req.query;
    let query = 'SELECT vi.*, i.item_number, i.description, v.company_name FROM item_vendors vi JOIN items i ON vi.item_id = i.id JOIN vendors v ON vi.vendor_id = v.id WHERE 1=1';
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

// ============ DASHBOARD ============
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openPOs] = await pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('open','sent','partial','draft')");
    const [mtdPurchases] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM purchase_orders WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [openAP] = await pool.query("SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ap_invoices WHERE status IN ('open','posted','partial')");
    const [overdueAP] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ap_invoices WHERE due_date < CURDATE() AND status IN ('open','posted','partial')");
    const [recentReceipts] = await pool.query("SELECT COUNT(*) as count FROM po_receipts WHERE receipt_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
    const [pendingReceipts] = await pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('open','sent','partial')");
    res.json({ open_pos: openPOs[0].count, mtd_purchases: mtdPurchases[0].total, open_ap: openAP[0].total, overdue_ap: overdueAP[0], recent_receipts: recentReceipts[0].count, pending_receipts: pendingReceipts[0].count });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ VENDOR ITEMS BY VENDOR (for PO line auto-fill) ============
router.get('/vendor-items-by-vendor/:vendorId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT iv.*, i.item_number, i.description as item_description, i.standard_cost, i.uom
      FROM item_vendors iv
      JOIN items i ON iv.item_id = i.id
      WHERE iv.vendor_id = ? AND i.is_active = TRUE
      ORDER BY iv.is_preferred DESC, i.item_number`, [req.params.vendorId]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get vendor-item info for a specific item+vendor combo (for PO line auto-fill)
router.get('/vendor-item-info/:vendorId/:itemId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT iv.vendor_item_number, iv.vendor_description, iv.unit_cost, iv.lead_time_days, iv.min_order_qty
      FROM item_vendors iv
      WHERE iv.vendor_id = ? AND iv.item_id = ?`, [req.params.vendorId, req.params.itemId]);
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// ============ THREE-WAY MATCH VALIDATION ============
router.get('/three-way-match/:invoice_id', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ap_invoices WHERE id = ?', [req.params.invoice_id]);
    if (!invoices.length) return res.status(404).json({ error: 'AP Invoice not found' });
    const invoice = invoices[0];
    
    // Get linked PO
    let poData = null;
    if (invoice.purchase_order_id) {
      const [pos] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [invoice.purchase_order_id]);
      if (pos.length) poData = pos[0];
    }
    
    // Get linked receipt
    const [receipts] = await pool.query('SELECT * FROM po_receipts WHERE ap_invoice_id = ?', [req.params.invoice_id]);
    let receiptData = null;
    let receiptTotal = 0;
    if (receipts.length) {
      receiptData = receipts[0];
      const [rLines] = await pool.query(
        `SELECT prl.quantity_received, pl.unit_cost 
         FROM po_receipt_lines prl JOIN po_lines pl ON prl.po_line_id = pl.id 
         WHERE prl.receipt_id = ?`, [receipts[0].id]);
      receiptTotal = rLines.reduce((s, l) => s + Number(l.quantity_received) * Number(l.unit_cost), 0);
    }
    
    const invoiceTotal = Number(invoice.total || 0);
    const poTotal = poData ? Number(poData.total || 0) : null;
    const variance = receiptTotal > 0 ? invoiceTotal - receiptTotal : null;
    
    const matchStatus = {
      invoice: { id: invoice.id, number: invoice.invoice_number, total: invoiceTotal },
      purchase_order: poData ? { id: poData.id, number: poData.po_number, total: poTotal } : null,
      receipt: receiptData ? { id: receiptData.id, number: receiptData.receipt_number, total: receiptTotal } : null,
      variance: variance,
      variance_percent: receiptTotal > 0 ? ((variance / receiptTotal) * 100).toFixed(2) : null,
      match_status: !receiptData ? 'no_receipt' : 
                    Math.abs(variance) < 0.01 ? 'matched' : 
                    Math.abs(variance) / receiptTotal < 0.05 ? 'within_tolerance' : 'variance'
    };
    
    res.json(matchStatus);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
