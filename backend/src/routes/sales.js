const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');

// ============ CUSTOMERS ============
router.get('/customers', authenticate, async (req, res) => {
  try {
    const { search, search_by, customer_type, status, page = 1, limit = 50 } = req.query;
    let query = `SELECT c.*, ct.name as customer_type_name, sp.name as salesperson_name 
                 FROM customers c LEFT JOIN customer_types ct ON c.customer_type_id = ct.id 
                 LEFT JOIN salespeople sp ON c.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (search) {
      const field = search_by || 'company_name';
      query += ` AND c.${field} LIKE ?`; params.push(`%${search}%`);
    }
    if (customer_type) { query += ' AND c.customer_type_id = ?'; params.push(customer_type); }
    if (status === 'active') query += ' AND c.is_active = TRUE';
    if (status === 'inactive') query += ' AND c.is_active = FALSE';
    query += ' ORDER BY c.company_name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [customers] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM customers');
    res.json({ customers, total: countResult[0].total });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/customers/:id', authenticate, async (req, res) => {
  try {
    const [customers] = await pool.query(`SELECT c.*, ct.name as customer_type_name FROM customers c LEFT JOIN customer_types ct ON c.customer_type_id = ct.id WHERE c.id = ?`, [req.params.id]);
    if (customers.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const [contacts] = await pool.query('SELECT * FROM customer_contacts WHERE customer_id = ?', [req.params.id]);
    const [recentOrders] = await pool.query('SELECT * FROM sales_orders WHERE customer_id = ? ORDER BY order_date DESC LIMIT 10', [req.params.id]);
    const [openInvoices] = await pool.query("SELECT * FROM ar_invoices WHERE customer_id = ? AND status IN ('posted','partial') ORDER BY due_date", [req.params.id]);
    const [deposits] = await pool.query("SELECT * FROM customer_deposits WHERE customer_id = ? AND status = 'unapplied' ORDER BY deposit_date DESC", [req.params.id]);
    res.json({ ...customers[0], contacts, recent_orders: recentOrders, open_invoices: openInvoices, deposits });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/customers', authenticate, async (req, res) => {
  try {
    const customerNumber = await getNextNumber('customer');
    const b = req.body;
    const company_name = b.name || b.company_name;
    const [result] = await pool.query(
      `INSERT INTO customers (customer_number, company_name, contact_name, bill_address1, bill_address2, bill_city, bill_state, bill_zip, bill_country,
       ship_address1, ship_address2, ship_city, ship_state, ship_zip, ship_country, phone, fax, email, website,
       customer_type_id, tax_group_id, payment_terms, credit_limit, price_list_id, salesperson_id, carrier_id, tax_exempt, tax_exempt_number, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [customerNumber, company_name, b.contact_name, b.bill_address1 || b.address1, b.bill_address2 || b.address2, b.bill_city || b.city, b.bill_state || b.state, b.bill_zip || b.zip, b.bill_country || 'USA',
       b.ship_address1, b.ship_address2, b.ship_city, b.ship_state, b.ship_zip, b.ship_country || 'USA', b.phone, b.fax, b.email, b.website,
       b.customer_type_id, b.tax_group_id, b.payment_terms || 'Net 30', b.credit_limit || 0, b.price_list_id, b.salesperson_id, b.carrier_id, b.tax_exempt || false, b.tax_exempt_number, b.notes]
    );
    await req.audit('customers', result.insertId, 'INSERT', null, { customer_number: customerNumber, company_name });
    res.status(201).json({ id: result.insertId, customer_number: customerNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/customers/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    const fields = req.body;
    delete fields.id; delete fields.customer_number; delete fields.created_at;
    if (fields.name) { fields.company_name = fields.name; delete fields.name; }
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE customers SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
    await req.audit('customers', req.params.id, 'UPDATE', old[0], fields);
    res.json({ message: 'Customer updated successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ QUOTES ============
router.get('/quotes', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT q.*, c.company_name as customer_name, sp.name as salesperson_name, (SELECT COUNT(*) FROM quote_lines ql WHERE ql.quote_id = q.id) as line_count 
                 FROM quotes q JOIN customers c ON q.customer_id = c.id 
                 LEFT JOIN salespeople sp ON q.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND q.status IN ('draft','sent','accepted')"; }
    else if (status && status !== 'all' && status !== '') { query += ' AND q.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND q.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (q.quote_number LIKE ? OR c.company_name LIKE ? OR q.project_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY q.quote_date DESC LIMIT 200';
    const [quotes] = await pool.query(query, params);
    res.json(quotes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/quotes/:id', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query(`SELECT q.*, c.company_name, c.email as customer_email, c.phone as customer_phone,
      c.bill_address1, c.bill_city, c.bill_state, c.bill_zip
      FROM quotes q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`, [req.params.id]);
    if (!quotes.length) return res.status(404).json({ error: 'Quote not found' });
    const [lines] = await pool.query(`SELECT ql.*, i.item_number FROM quote_lines ql 
      LEFT JOIN items i ON ql.item_id = i.id WHERE ql.quote_id = ? ORDER BY ql.line_number`, [req.params.id]);
    const [drawings] = await pool.query('SELECT * FROM quote_drawings WHERE quote_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...quotes[0], lines, drawings });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/quotes', authenticate, async (req, res) => {
  try {
    const quoteNumber = await getNextNumber('quote');
    const { customer_id, project_name, expiry_date, payment_terms, lead_time_days, notes, internal_notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)); });
    const [result] = await pool.query(
      `INSERT INTO quotes (quote_number, customer_id, project_name, quote_date, expiry_date, status, payment_terms, lead_time_days, subtotal, total, notes, internal_notes, created_by)
       VALUES (?,?,?,CURDATE(),?,'draft',?,?,?,?,?,?,?)`,
      [quoteNumber, customer_id, project_name, expiry_date, payment_terms || 'Net 30', lead_time_days, subtotal, subtotal, notes, internal_notes, req.user.id]
    );
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = parseFloat(l.quantity) || 0;
        const price = parseFloat(l.unit_price) || 0;
        const lineTotal = qty * price;
        const sqft = l.width_inches && l.height_inches ? (parseFloat(l.width_inches) * parseFloat(l.height_inches)) / 144 : null;
        await pool.query(
          `INSERT INTO quote_lines (quote_id, line_number, item_id, description, quantity, uom, unit_price, discount_percent, line_total, 
           width_inches, height_inches, sqft, notes, product_type, glass_type, thickness, edge_type, shape, interlayer, has_holes, holes_count, 
           cutouts, coating, spacer_type, gas_fill, manufacturing_notes, drawing_ref)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id || null, l.description, qty, l.uom || 'Each', price, l.discount_percent || 0, lineTotal,
           l.width_inches || null, l.height_inches || null, sqft, l.notes || null,
           l.product_type || null, l.glass_type || null, l.thickness || null, l.edge_type || null, l.shape || 'rectangular',
           l.interlayer || null, l.has_holes ? 1 : 0, l.holes_count || 0,
           l.cutouts || null, l.coating || null, l.spacer_type || null, l.gas_fill || null, l.manufacturing_notes || null, l.drawing_ref || null]
        );
      }
    }
    await req.audit('quotes', result.insertId, 'INSERT', null, { quote_number: quoteNumber, customer_id, project_name });
    res.status(201).json({ id: result.insertId, quote_number: quoteNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/quotes/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Quote not found' });
    const { customer_id, project_name, expiry_date, payment_terms, lead_time_days, notes, internal_notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)); });
    await pool.query(
      `UPDATE quotes SET customer_id=?, project_name=?, expiry_date=?, payment_terms=?, lead_time_days=?, subtotal=?, total=?, notes=?, internal_notes=?, updated_at=NOW() WHERE id=?`,
      [customer_id || old[0].customer_id, project_name, expiry_date, payment_terms, lead_time_days, subtotal, subtotal, notes, internal_notes, req.params.id]
    );
    if (lines) {
      await pool.query('DELETE FROM quote_lines WHERE quote_id = ?', [req.params.id]);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = parseFloat(l.quantity) || 0;
        const price = parseFloat(l.unit_price) || 0;
        const lineTotal = qty * price;
        const sqft = l.width_inches && l.height_inches ? (parseFloat(l.width_inches) * parseFloat(l.height_inches)) / 144 : null;
        await pool.query(
          `INSERT INTO quote_lines (quote_id, line_number, item_id, description, quantity, uom, unit_price, discount_percent, line_total, 
           width_inches, height_inches, sqft, notes, product_type, glass_type, thickness, edge_type, shape, interlayer, has_holes, holes_count, 
           cutouts, coating, spacer_type, gas_fill, manufacturing_notes, drawing_ref)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [req.params.id, i + 1, l.item_id || null, l.description, qty, l.uom || 'Each', price, l.discount_percent || 0, lineTotal,
           l.width_inches || null, l.height_inches || null, sqft, l.notes || null,
           l.product_type || null, l.glass_type || null, l.thickness || null, l.edge_type || null, l.shape || 'rectangular',
           l.interlayer || null, l.has_holes ? 1 : 0, l.holes_count || 0,
           l.cutouts || null, l.coating || null, l.spacer_type || null, l.gas_fill || null, l.manufacturing_notes || null, l.drawing_ref || null]
        );
      }
    }
    await req.audit('quotes', req.params.id, 'UPDATE', old[0], req.body);
    res.json({ message: 'Quote updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Send quote to customer (status: draft → sent)
router.post('/quotes/:id/send', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quotes.length) return res.status(404).json({ error: 'Quote not found' });
    if (!['draft','sent'].includes(quotes[0].status)) return res.status(400).json({ error: 'Only draft/sent quotes can be sent' });
    await pool.query("UPDATE quotes SET status = 'sent', updated_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('quotes', req.params.id, 'SEND', { status: quotes[0].status }, { status: 'sent' });
    res.json({ message: 'Quote marked as sent' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Accept quote (status → accepted)
router.post('/quotes/:id/accept', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quotes.length) return res.status(404).json({ error: 'Quote not found' });
    if (!['draft','sent'].includes(quotes[0].status)) return res.status(400).json({ error: 'Only draft/sent quotes can be accepted' });
    await pool.query("UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = ?", [req.params.id]);
    await req.audit('quotes', req.params.id, 'ACCEPT', { status: quotes[0].status }, { status: 'accepted' });
    res.json({ message: 'Quote accepted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Convert quote to sales order (the big one!)
router.post('/quotes/:id/convert', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quotes.length) return res.status(404).json({ error: 'Quote not found' });
    if (quotes[0].status === 'converted') return res.status(400).json({ error: 'Quote already converted' });
    if (quotes[0].status === 'rejected') return res.status(400).json({ error: 'Cannot convert a rejected quote' });
    const quote = quotes[0];
    const [lines] = await pool.query('SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY line_number', [req.params.id]);
    
    // Create Sales Order
    const orderNumber = await getNextNumber('sales_order');
    const [orderResult] = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, project_name, customer_po, order_date, required_date, status, quote_id, 
       salesperson_id, subtotal, total, deposit_amount, notes, internal_notes, created_by)
       VALUES (?,?,?,?,CURDATE(),DATE_ADD(CURDATE(), INTERVAL ? DAY),'open',?,?,?,?,0,?,?,?)`,
      [orderNumber, quote.customer_id, quote.project_name, req.body.customer_po || null, quote.lead_time_days || 21, 
       req.params.id, quote.salesperson_id, quote.subtotal, quote.total, quote.notes, quote.internal_notes, req.user.id]
    );
    
    // Copy all line items with glass specs
    for (const l of lines) {
      await pool.query(
        `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, 
         discount_percent, line_total, width_inches, height_inches, sqft, notes, product_type, glass_type, thickness, edge_type, 
         shape, interlayer, has_holes, holes_count, cutouts, coating, spacer_type, gas_fill, manufacturing_notes, drawing_ref, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [orderResult.insertId, l.line_number, l.item_id, l.description, l.quantity, l.uom, l.unit_price,
         l.discount_percent, l.line_total, l.width_inches, l.height_inches, l.sqft, l.notes,
         l.product_type, l.glass_type, l.thickness, l.edge_type, l.shape, l.interlayer,
         l.has_holes, l.holes_count, l.cutouts, l.coating, l.spacer_type, l.gas_fill, l.manufacturing_notes, l.drawing_ref, 'open']
      );
    }
    
    // Update quote status
    await pool.query("UPDATE quotes SET status = 'converted', converted_to_order_id = ?, updated_at = NOW() WHERE id = ?", [orderResult.insertId, req.params.id]);
    await req.audit('quotes', req.params.id, 'CONVERT', { status: quote.status }, { status: 'converted', order_id: orderResult.insertId });
    await req.audit('sales_orders', orderResult.insertId, 'INSERT', null, { order_number: orderNumber, from_quote: quote.quote_number });
    res.status(201).json({ id: orderResult.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Quote drawings
router.get('/quotes/:id/drawings', authenticate, async (req, res) => {
  try {
    const [drawings] = await pool.query('SELECT * FROM quote_drawings WHERE quote_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(drawings);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/quotes/:id/drawings', authenticate, async (req, res) => {
  try {
    const { file_name, file_path, quote_line_id, revision, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO quote_drawings (quote_id, quote_line_id, file_name, file_path, revision, status, notes, uploaded_by) VALUES (?,?,?,?,?,\'pending\',?,?)',
      [req.params.id, quote_line_id || null, file_name, file_path || null, revision || 'A', notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/quotes/drawings/:id/approve', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body; // status: approved, rejected, revise
    await pool.query('UPDATE quote_drawings SET status = ?, approved_by = ?, approved_at = NOW(), notes = COALESCE(?, notes) WHERE id = ?',
      [status, req.user.full_name || 'Admin', notes, req.params.id]);
    res.json({ message: `Drawing ${status}` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SALES ORDERS ============
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT so.*, c.company_name as customer_name, sp.name as salesperson_name,
                 COALESCE(so.deposit_amount, 0) as deposit_amount,
                 (SELECT COUNT(*) FROM work_orders WHERE sales_order_id = so.id) as wo_count,
                 (SELECT COUNT(*) FROM shipments WHERE sales_order_id = so.id) as shipment_count
                 FROM sales_orders so JOIN customers c ON so.customer_id = c.id 
                 LEFT JOIN salespeople sp ON so.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND so.status IN ('draft','open','partial','confirmed','in_progress','partial_ship')"; }
    else if (status && status !== 'all' && status !== '') { query += ' AND so.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND so.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (so.order_number LIKE ? OR c.company_name LIKE ? OR so.customer_po LIKE ? OR so.project_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY so.order_date DESC LIMIT 200';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`SELECT so.*, c.company_name, c.phone as customer_phone, c.email as customer_email,
      c.ship_address1, c.ship_city, c.ship_state, c.ship_zip,
      q.quote_number
      FROM sales_orders so JOIN customers c ON so.customer_id = c.id 
      LEFT JOIN quotes q ON so.quote_id = q.id
      WHERE so.id = ?`, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const [lines] = await pool.query(`SELECT sol.*, i.item_number, i.description as item_description,
      wo.order_number as wo_number, wo.status as wo_status
      FROM sales_order_lines sol LEFT JOIN items i ON sol.item_id = i.id 
      LEFT JOIN work_orders wo ON wo.sales_order_line_id = sol.id
      WHERE sol.sales_order_id = ? ORDER BY sol.line_number`, [req.params.id]);
    const [shipments] = await pool.query('SELECT * FROM shipments WHERE sales_order_id = ? ORDER BY shipment_date DESC', [req.params.id]);
    const [invoices] = await pool.query('SELECT * FROM ar_invoices WHERE sales_order_id = ? ORDER BY invoice_date DESC', [req.params.id]);
    const [deposits] = await pool.query("SELECT * FROM customer_deposits WHERE sales_order_id = ? ORDER BY deposit_date DESC", [req.params.id]);
    const [workOrders] = await pool.query('SELECT id, order_number, status, product_type, quantity FROM work_orders WHERE sales_order_id = ? ORDER BY id', [req.params.id]);
    res.json({ ...orders[0], lines, shipments, invoices, deposits, work_orders: workOrders });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/orders', authenticate, async (req, res) => {
  try {
    const orderNumber = await getNextNumber('sales_order');
    const { customer_id, customer_po, project_name, order_date, required_date, promised_date, salesperson_id, carrier_id,
            ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, internal_notes, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((parseFloat(l.quantity_ordered || l.quantity) || 0) * (parseFloat(l.unit_price) || 0) * (1 - (parseFloat(l.discount_percent) || 0) / 100)); });
    const [result] = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, customer_po, project_name, order_date, required_date, promised_date, status, salesperson_id, carrier_id,
       ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, subtotal, total, notes, internal_notes, created_by)
       VALUES (?,?,?,?,?,?,?,'open',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNumber, customer_id, customer_po, project_name, order_date || new Date(), required_date, promised_date, salesperson_id, carrier_id,
       ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, subtotal, subtotal, notes, internal_notes, req.user.id]
    );
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = parseFloat(l.quantity_ordered || l.quantity) || 0;
        const lineTotal = qty * (parseFloat(l.unit_price) || 0) * (1 - (parseFloat(l.discount_percent) || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (parseFloat(l.width_inches) * parseFloat(l.height_inches)) / 144 : null;
        await pool.query(
          `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, 
           width_inches, height_inches, sqft, required_date, notes, product_type, glass_type, thickness, edge_type, shape, interlayer, has_holes, holes_count, 
           cutouts, coating, spacer_type, gas_fill, manufacturing_notes, drawing_ref, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id || null, l.description, qty, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal,
           l.width_inches || null, l.height_inches || null, sqft, required_date, l.notes || null,
           l.product_type || null, l.glass_type || null, l.thickness || null, l.edge_type || null, l.shape || 'rectangular',
           l.interlayer || null, l.has_holes ? 1 : 0, l.holes_count || 0,
           l.cutouts || null, l.coating || null, l.spacer_type || null, l.gas_fill || null, l.manufacturing_notes || null, l.drawing_ref || null, 'open']
        );
      }
    }
    await req.audit('sales_orders', result.insertId, 'INSERT', null, { order_number: orderNumber, customer_id });
    res.status(201).json({ id: result.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ RELEASE TO PRODUCTION ============
// This is the KEY action: creates Work Orders from Sales Order lines
router.post('/orders/:id/release-to-production', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    if (['cancelled', 'closed'].includes(orders[0].status)) return res.status(400).json({ error: 'Cannot release cancelled/closed order' });
    
    const { line_ids } = req.body; // Optional: specific lines to release. If empty, release all pending lines.
    let lineQuery = 'SELECT * FROM sales_order_lines WHERE sales_order_id = ? AND production_status = "pending"';
    const lineParams = [req.params.id];
    if (line_ids && line_ids.length > 0) {
      lineQuery += ` AND id IN (${line_ids.map(() => '?').join(',')})`;
      lineParams.push(...line_ids);
    }
    const [lines] = await pool.query(lineQuery, lineParams);
    
    if (lines.length === 0) return res.status(400).json({ error: 'No lines available to release (all already in production or no pending lines)' });
    
    const createdWOs = [];
    for (const line of lines) {
      // Create Work Order for each line
      const woNumber = await getNextNumber('work_order');
      const productType = line.product_type || 'tempered_panel';
      
      const [woResult] = await pool.query(
        `INSERT INTO work_orders (order_number, sales_order_id, sales_order_line_id, item_id, product_type, quantity, 
         glass_type, thickness, width, height, edge_type, interlayer_type, has_holes,
         status, priority, start_date, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?)`,
        [woNumber, req.params.id, line.id, line.item_id, productType, line.quantity_ordered,
         line.glass_type, line.thickness, line.width_inches, line.height_inches, line.edge_type, line.interlayer, line.has_holes || 0,
         'planned', 'normal', line.manufacturing_notes || line.notes]
      );
      
      // Auto-assign routing based on product type
      const [templates] = await pool.query(
        'SELECT id FROM routing_templates WHERE product_type = ? LIMIT 1', [productType]);
      if (templates.length > 0) {
        const [operations] = await pool.query(
          'SELECT * FROM routing_template_operations WHERE template_id = ? ORDER BY sequence', [templates[0].id]);
        for (const op of operations) {
          await pool.query(
            `INSERT INTO shop_floor_tracking (work_order_id, work_center_id, wo_routing_id, status, notes)
             VALUES (?,?,?,?,?)`,
            [woResult.insertId, op.work_center_id, null, 'queued', op.operation_name || op.description || null]
          );
        }
      }
      
      // Update SO line status
      await pool.query("UPDATE sales_order_lines SET production_status = 'released', work_order_id = ? WHERE id = ?", [woResult.insertId, line.id]);
      
      createdWOs.push({ id: woResult.insertId, order_number: woNumber, line_number: line.line_number, description: line.description });
    }
    
    // Update SO status
    const [allLines] = await pool.query('SELECT production_status FROM sales_order_lines WHERE sales_order_id = ?', [req.params.id]);
    const allReleased = allLines.every(l => l.production_status !== 'pending');
    if (allReleased) {
      await pool.query("UPDATE sales_orders SET status = 'open' WHERE id = ? AND status = 'draft'", [req.params.id]);
    }
    
    await req.audit('sales_orders', req.params.id, 'RELEASE_TO_PRODUCTION', null, { work_orders: createdWOs.map(w => w.order_number) });
    res.status(201).json({ message: `${createdWOs.length} Work Order(s) created`, work_orders: createdWOs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Record deposit on Sales Order
router.post('/orders/:id/deposit', authenticate, async (req, res) => {
  try {
    const { amount, payment_method, reference_number } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Deposit amount must be greater than 0' });
    const depositNumber = await getNextNumber('deposit');
    const [result] = await pool.query(
      `INSERT INTO customer_deposits (deposit_number, customer_id, sales_order_id, deposit_date, amount, payment_method, reference_number, status, received_by)
       SELECT ?, customer_id, ?, CURDATE(), ?, ?, ?, 'unapplied', ? FROM sales_orders WHERE id = ?`,
      [depositNumber, req.params.id, amount, payment_method || 'check', reference_number, req.user.id, req.params.id]
    );
    await pool.query('UPDATE sales_orders SET deposit_amount = COALESCE(deposit_amount,0) + ? WHERE id = ?', [amount, req.params.id]);
    await req.audit('sales_orders', req.params.id, 'DEPOSIT', null, { amount, payment_method, reference_number });
    res.status(201).json({ id: result.insertId, deposit_number: depositNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHIPMENTS ============
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT s.*, c.company_name as customer_name, so.order_number as so_number
                 FROM shipments s JOIN customers c ON s.customer_id = c.id 
                 LEFT JOIN sales_orders so ON s.sales_order_id = so.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND s.status IN ('draft','shipped')"; }
    else if (status && status !== 'all' && status !== '') { query += ' AND s.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND s.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (s.shipment_number LIKE ? OR c.company_name LIKE ? OR so.order_number LIKE ? OR s.tracking_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY s.shipment_date DESC LIMIT 200';
    const [shipments] = await pool.query(query, params);
    res.json(shipments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/shipments/:id', authenticate, async (req, res) => {
  try {
    const [shipments] = await pool.query(`SELECT s.*, c.company_name, so.order_number as so_number
      FROM shipments s JOIN customers c ON s.customer_id = c.id 
      LEFT JOIN sales_orders so ON s.sales_order_id = so.id WHERE s.id = ?`, [req.params.id]);
    if (!shipments.length) return res.status(404).json({ error: 'Shipment not found' });
    const [lines] = await pool.query(`SELECT sl.*, sol.description, sol.product_type, sol.glass_type, sol.thickness, 
      sol.width_inches, sol.height_inches, sol.edge_type
      FROM shipment_lines sl 
      LEFT JOIN sales_order_lines sol ON sl.sales_order_line_id = sol.id 
      WHERE sl.shipment_id = ?`, [req.params.id]);
    res.json({ ...shipments[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get shippable lines for a sales order (lines that have remaining quantity to ship)
router.get('/orders/:id/shippable-lines', authenticate, async (req, res) => {
  try {
    const [lines] = await pool.query(`
      SELECT sol.*, i.item_number,
        (sol.quantity_ordered - COALESCE(sol.quantity_shipped, 0)) as remaining_qty
      FROM sales_order_lines sol 
      LEFT JOIN items i ON sol.item_id = i.id
      WHERE sol.sales_order_id = ? 
        AND (sol.quantity_ordered - COALESCE(sol.quantity_shipped, 0)) > 0
        AND sol.status != 'cancelled'
      ORDER BY sol.line_number`, [req.params.id]);
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create shipment from sales order
router.post('/shipments', authenticate, async (req, res) => {
  try {
    const shipmentNumber = await getNextNumber('shipment');
    const { sales_order_id, shipment_date, carrier_id, tracking_number, weight, freight_charge,
            ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, 
            rack_number, delivery_instructions, notes, lines } = req.body;
    
    if (!sales_order_id) return res.status(400).json({ error: 'Sales order is required' });
    const [orders] = await pool.query('SELECT customer_id, status FROM sales_orders WHERE id = ?', [sales_order_id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Sales order not found' });
    if (['cancelled', 'closed'].includes(orders[0].status)) return res.status(400).json({ error: 'Cannot ship a cancelled/closed order' });
    
    let totalPanels = 0;
    if (lines) lines.forEach(l => { totalPanels += (parseFloat(l.quantity_shipped) || 0); });
    
    const [result] = await pool.query(
      `INSERT INTO shipments (shipment_number, sales_order_id, customer_id, shipment_date, carrier_id, tracking_number, weight, freight_charge, 
       status, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, rack_number, total_panels, delivery_instructions, notes, shipped_by)
       VALUES (?,?,?,?,?,?,?,?,'shipped',?,?,?,?,?,?,?,?,?,?,?)`,
      [shipmentNumber, sales_order_id, orders[0].customer_id, shipment_date || new Date(), carrier_id, tracking_number, weight, freight_charge || 0,
       ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, rack_number, totalPanels, delivery_instructions, notes, req.user.id]
    );
    
    if (lines && lines.length > 0) {
      for (const l of lines) {
        const desc = l.description || null;
        await pool.query(
          'INSERT INTO shipment_lines (shipment_id, sales_order_line_id, item_id, quantity_shipped, lot_number, serial_number, rack_position, description) VALUES (?,?,?,?,?,?,?,?)',
          [result.insertId, l.sales_order_line_id, l.item_id, l.quantity_shipped, l.lot_number, l.serial_number, l.rack_position, desc]
        );
        // Update SO line shipped qty
        await pool.query('UPDATE sales_order_lines SET quantity_shipped = COALESCE(quantity_shipped,0) + ?, production_status = "shipped" WHERE id = ?', [l.quantity_shipped, l.sales_order_line_id]);
        // Reduce inventory
        if (l.item_id) {
          await pool.query('UPDATE items SET qty_on_hand = COALESCE(qty_on_hand,0) - ? WHERE id = ?', [l.quantity_shipped, l.item_id]);
        }
      }
    }
    
    // Update SO status based on shipment completion
    const [soLines] = await pool.query('SELECT quantity_ordered, COALESCE(quantity_shipped,0) as quantity_shipped FROM sales_order_lines WHERE sales_order_id = ?', [sales_order_id]);
    const allShipped = soLines.every(l => parseFloat(l.quantity_shipped) >= parseFloat(l.quantity_ordered));
    const someShipped = soLines.some(l => parseFloat(l.quantity_shipped) > 0);
    if (allShipped) {
      await pool.query("UPDATE sales_orders SET status = 'shipped' WHERE id = ?", [sales_order_id]);
    } else if (someShipped) {
      await pool.query("UPDATE sales_orders SET status = 'partial' WHERE id = ?", [sales_order_id]);
    }
    
    await req.audit('shipments', result.insertId, 'INSERT', null, { shipment_number: shipmentNumber, sales_order_id, total_panels: totalPanels });
    res.status(201).json({ id: result.insertId, shipment_number: shipmentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Mark shipment as delivered
router.post('/shipments/:id/deliver', authenticate, async (req, res) => {
  try {
    await pool.query("UPDATE shipments SET status = 'delivered', delivered_at = NOW(), delivery_confirmed_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('shipments', req.params.id, 'DELIVER', { status: 'shipped' }, { status: 'delivered' });
    res.json({ message: 'Shipment marked as delivered' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AR INVOICES ============
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT i.*, c.company_name as customer_name,
                 (i.total - COALESCE(i.amount_paid,0)) as balance
                 FROM ar_invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status === 'open') { query += " AND i.status IN ('draft','open','posted','partial')"; }
    else if (status && status !== 'all' && status !== '') { query += ' AND i.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND i.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY i.invoice_date DESC LIMIT 200';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query(`SELECT i.*, c.company_name, c.email as customer_email, 
      so.order_number as so_number, s.shipment_number,
      (i.total - COALESCE(i.amount_paid,0)) as balance 
      FROM ar_invoices i JOIN customers c ON i.customer_id = c.id 
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.id = ?`, [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'Invoice not found' });
    const [lines] = await pool.query('SELECT * FROM ar_invoice_lines WHERE invoice_id = ? ORDER BY line_number', [req.params.id]);
    const [payments] = await pool.query('SELECT pa.*, cp.payment_number FROM payment_applications pa LEFT JOIN customer_payments cp ON pa.payment_id = cp.id WHERE pa.invoice_id = ?', [req.params.id]);
    res.json({ ...invoices[0], lines, payments });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create invoice from shipment (the normal flow)
router.post('/invoices', authenticate, async (req, res) => {
  try {
    const invoiceNumber = await getNextNumber('ar_invoice');
    const { customer_id, sales_order_id, shipment_id, invoice_date, due_date, payment_terms, notes, lines } = req.body;
    let subtotal = 0, taxAmount = 0;
    if (lines) lines.forEach(l => { subtotal += ((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)); });
    const totalAmount = subtotal + taxAmount;
    
    // Calculate due date from payment terms
    let calcDueDate = due_date;
    if (!calcDueDate && payment_terms) {
      const days = parseInt(payment_terms.replace(/\D/g, '')) || 30;
      const d = new Date(invoice_date || new Date());
      d.setDate(d.getDate() + days);
      calcDueDate = d.toISOString().split('T')[0];
    }
    
    const [result] = await pool.query(
      `INSERT INTO ar_invoices (invoice_number, customer_id, sales_order_id, shipment_id, invoice_date, due_date, 
       subtotal, tax_amount, total, balance, amount_paid, status, payment_terms, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,'draft',?,?,?)`,
      [invoiceNumber, customer_id, sales_order_id || null, shipment_id || null, invoice_date || new Date(), calcDueDate,
       subtotal, taxAmount, totalAmount, totalAmount, payment_terms || 'Net 30', notes, req.user.id]
    );
    
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
        await pool.query(
          'INSERT INTO ar_invoice_lines (invoice_id, line_number, item_id, description, quantity, unit_price, line_total, gl_account_id) VALUES (?,?,?,?,?,?,?,?)',
          [result.insertId, i + 1, l.item_id || null, l.description, l.quantity, l.unit_price, lineTotal, l.gl_account_id || null]
        );
      }
    }
    
    // Link invoice to shipment
    if (shipment_id) {
      await pool.query('UPDATE shipments SET invoice_id = ? WHERE id = ?', [result.insertId, shipment_id]);
    }
    
    // Update SO status
    if (sales_order_id) {
      await pool.query("UPDATE sales_orders SET status = 'invoiced' WHERE id = ? AND status IN ('shipped','partial')", [sales_order_id]);
    }
    
    await req.audit('ar_invoices', result.insertId, 'INSERT', null, { invoice_number: invoiceNumber, customer_id, total: totalAmount });
    res.status(201).json({ id: result.insertId, invoice_number: invoiceNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create invoice directly from shipment (auto-populate lines)
router.post('/shipments/:id/create-invoice', authenticate, async (req, res) => {
  try {
    const [shipments] = await pool.query('SELECT s.*, so.payment_terms FROM shipments s LEFT JOIN sales_orders so ON s.sales_order_id = so.id WHERE s.id = ?', [req.params.id]);
    if (!shipments.length) return res.status(404).json({ error: 'Shipment not found' });
    if (shipments[0].invoice_id) return res.status(400).json({ error: 'Shipment already has an invoice' });
    
    const shipment = shipments[0];
    const [shipLines] = await pool.query(`
      SELECT sl.*, sol.unit_price, sol.description as sol_description, sol.item_id as sol_item_id
      FROM shipment_lines sl 
      LEFT JOIN sales_order_lines sol ON sl.sales_order_line_id = sol.id
      WHERE sl.shipment_id = ?`, [req.params.id]);
    
    const invoiceNumber = await getNextNumber('ar_invoice');
    let subtotal = 0;
    const invoiceLines = shipLines.map((sl, idx) => {
      const lineTotal = (parseFloat(sl.quantity_shipped) || 0) * (parseFloat(sl.unit_price) || 0);
      subtotal += lineTotal;
      return { line_number: idx + 1, item_id: sl.sol_item_id || sl.item_id, description: sl.sol_description || sl.description, quantity: sl.quantity_shipped, unit_price: sl.unit_price || 0, line_total: lineTotal };
    });
    
    const paymentTerms = shipment.payment_terms || 'Net 30';
    const days = parseInt(paymentTerms.replace(/\D/g, '')) || 30;
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + days);
    
    const [result] = await pool.query(
      `INSERT INTO ar_invoices (invoice_number, customer_id, sales_order_id, shipment_id, invoice_date, due_date, 
       subtotal, tax_amount, total, balance, amount_paid, status, payment_terms, created_by)
       VALUES (?,?,?,?,CURDATE(),?,?,0,?,?,0,'draft',?,?)`,
      [invoiceNumber, shipment.customer_id, shipment.sales_order_id, req.params.id, dueDate.toISOString().split('T')[0],
       subtotal, subtotal, subtotal, paymentTerms, req.user.id]
    );
    
    for (const l of invoiceLines) {
      await pool.query(
        'INSERT INTO ar_invoice_lines (invoice_id, line_number, item_id, description, quantity, unit_price, line_total) VALUES (?,?,?,?,?,?,?)',
        [result.insertId, l.line_number, l.item_id, l.description, l.quantity, l.unit_price, l.line_total]
      );
    }
    
    await pool.query('UPDATE shipments SET invoice_id = ? WHERE id = ?', [result.insertId, req.params.id]);
    await req.audit('ar_invoices', result.insertId, 'INSERT', null, { invoice_number: invoiceNumber, from_shipment: shipment.shipment_number });
    res.status(201).json({ id: result.insertId, invoice_number: invoiceNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post invoice
router.post('/invoices/:id/post', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ar_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'Invoice not found' });
    if (invoices[0].status !== 'draft') return res.status(400).json({ error: 'Only draft invoices can be posted' });
    await pool.query("UPDATE ar_invoices SET status = 'posted', posted = 1, posted_by = ?, posted_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    // GL Auto-Post: Debit Accounts Receivable (1100), Credit Sales Revenue (4000)
    const invTotal = Number(invoices[0].total || 0);
    if (invTotal > 0) {
      const period = `${new Date().getMonth()+1}-${new Date().getFullYear()}`;
      await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit_amount, credit_amount, description, source_type, source_id, entered_by)
        VALUES ((SELECT id FROM gl_accounts WHERE account_number = '1100'), NOW(), ?, ?, 0, ?, 'ar_invoice', ?, ?)`,
        [period, invTotal, `AR Invoice ${invoices[0].invoice_number} posted`, req.params.id, req.user.id]);
      await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit_amount, credit_amount, description, source_type, source_id, entered_by)
        VALUES ((SELECT id FROM gl_accounts WHERE account_number = '4000'), NOW(), ?, 0, ?, ?, 'ar_invoice', ?, ?)`,
        [period, invTotal, `AR Invoice ${invoices[0].invoice_number} posted`, req.params.id, req.user.id]);
      // Update GL account balances
      await pool.query('UPDATE gl_accounts SET balance = balance + ? WHERE account_number = ?', [invTotal, '1100']);
      await pool.query('UPDATE gl_accounts SET balance = balance + ? WHERE account_number = ?', [invTotal, '4000']);
    }
    await req.audit('ar_invoices', req.params.id, 'POST', { status: 'draft' }, { status: 'posted' });
    res.json({ message: 'Invoice posted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Void invoice
router.post('/invoices/:id/void', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query("UPDATE ar_invoices SET status = 'void', void_reason = ?, voided_by = ?, voided_at = NOW() WHERE id = ?", [reason, req.user.id, req.params.id]);
    await req.audit('ar_invoices', req.params.id, 'VOID', null, { reason });
    res.json({ message: 'Invoice voided' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Record payment against a specific invoice
router.post('/invoices/:id/payment', authenticate, async (req, res) => {
  try {
    const { amount, payment_method, reference_number, payment_date } = req.body;
    const invoiceId = req.params.id;
    // Get invoice details
    const [inv] = await pool.query('SELECT * FROM ar_invoices WHERE id = ?', [invoiceId]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = inv[0];
    // Create payment
    const paymentNumber = await getNextNumber('payment');
    const [result] = await pool.query(
      `INSERT INTO customer_payments (payment_number, customer_id, payment_date, amount, payment_method, reference_number, status, received_by)
       VALUES (?,?,?,?,?,?,'posted',?)`,
      [paymentNumber, invoice.customer_id, payment_date || new Date(), amount, payment_method || 'check', reference_number, req.user.id]
    );
    // Apply to invoice
    await pool.query('UPDATE ar_invoices SET amount_paid = COALESCE(amount_paid,0) + ? WHERE id = ?', [amount, invoiceId]);
    const [updated] = await pool.query('SELECT total, amount_paid FROM ar_invoices WHERE id = ?', [invoiceId]);
    if (updated.length && parseFloat(updated[0].amount_paid) >= parseFloat(updated[0].total)) {
      await pool.query("UPDATE ar_invoices SET status = 'paid', balance = 0 WHERE id = ?", [invoiceId]);
    } else {
      await pool.query("UPDATE ar_invoices SET status = 'partial', balance = total - COALESCE(amount_paid,0) WHERE id = ?", [invoiceId]);
    }
    // GL Auto-Post: Debit Cash (1000), Credit Accounts Receivable (1100)
    const period = `${new Date().getMonth()+1}-${new Date().getFullYear()}`;
    await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit_amount, credit_amount, description, source_type, source_id, entered_by)
      VALUES ((SELECT id FROM gl_accounts WHERE account_number = '1000'), NOW(), ?, ?, 0, ?, 'customer_payment', ?, ?)`,
      [period, amount, `Customer payment ${paymentNumber} for ${invoice.invoice_number}`, invoiceId, req.user.id]);
    await pool.query(`INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit_amount, credit_amount, description, source_type, source_id, entered_by)
      VALUES ((SELECT id FROM gl_accounts WHERE account_number = '1100'), NOW(), ?, 0, ?, ?, 'customer_payment', ?, ?)`,
      [period, amount, `Customer payment ${paymentNumber} for ${invoice.invoice_number}`, invoiceId, req.user.id]);
    await pool.query('UPDATE gl_accounts SET balance = balance + ? WHERE account_number = ?', [amount, '1000']);
    await pool.query('UPDATE gl_accounts SET balance = balance - ? WHERE account_number = ?', [amount, '1100']);
    await req.audit('ar_invoices', invoiceId, 'PAYMENT', null, { payment_number: paymentNumber, amount });
    res.json({ message: 'Payment recorded', payment_number: paymentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ CUSTOMER PAYMENTS ============
router.get('/payments', authenticate, async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let query = `SELECT cp.*, c.company_name as customer_name FROM customer_payments cp JOIN customers c ON cp.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND cp.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND cp.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY cp.payment_date DESC LIMIT 200';
    const [payments] = await pool.query(query, params);
    res.json(payments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/payments', authenticate, async (req, res) => {
  try {
    const paymentNumber = await getNextNumber('payment');
    const { customer_id, payment_date, amount, payment_method, reference_number, notes, applications } = req.body;
    const [result] = await pool.query(
      `INSERT INTO customer_payments (payment_number, customer_id, payment_date, amount, payment_method, reference_number, status, notes, received_by)
       VALUES (?,?,?,?,?,?,'posted',?,?)`,
      [paymentNumber, customer_id, payment_date || new Date(), amount, payment_method || 'check', reference_number, notes, req.user.id]
    );
    
    // Apply payment to invoices
    if (applications && applications.length > 0) {
      let remaining = parseFloat(amount);
      for (const app of applications) {
        if (remaining <= 0) break;
        const applyAmount = Math.min(remaining, parseFloat(app.amount));
        await pool.query(
          'INSERT INTO payment_applications (payment_id, invoice_id, amount) VALUES (?,?,?)',
          [result.insertId, app.invoice_id, applyAmount]
        );
        await pool.query('UPDATE ar_invoices SET amount_paid = COALESCE(amount_paid,0) + ? WHERE id = ?', [applyAmount, app.invoice_id]);
        // Check if fully paid
        const [inv] = await pool.query('SELECT total, amount_paid FROM ar_invoices WHERE id = ?', [app.invoice_id]);
        if (inv.length && parseFloat(inv[0].amount_paid) >= parseFloat(inv[0].total)) {
          await pool.query("UPDATE ar_invoices SET status = 'paid', balance = 0 WHERE id = ?", [app.invoice_id]);
        } else {
          await pool.query("UPDATE ar_invoices SET status = 'partial', balance = total - COALESCE(amount_paid,0) WHERE id = ?", [app.invoice_id]);
        }
        remaining -= applyAmount;
      }
    }
    
    await req.audit('customer_payments', result.insertId, 'INSERT', null, { payment_number: paymentNumber, amount });
    res.status(201).json({ id: result.insertId, payment_number: paymentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ CREDIT MEMOS ============
router.get('/credit-memos', authenticate, async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let query = `SELECT cm.*, c.company_name as customer_name FROM credit_memos cm JOIN customers c ON cm.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND cm.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND cm.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY cm.created_at DESC LIMIT 200';
    const [memos] = await pool.query(query, params);
    res.json(memos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/credit-memos', authenticate, async (req, res) => {
  try {
    const memoNumber = await getNextNumber('credit_memo');
    const { customer_id, invoice_id, amount, reason, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Credit amount must be greater than 0' });
    const [result] = await pool.query(
      `INSERT INTO credit_memos (memo_number, customer_id, invoice_id, memo_date, amount, reason, notes, status, created_by)
       VALUES (?,?,?,NOW(),?,?,?,'draft',?)`,
      [memoNumber, customer_id, invoice_id, amount, reason, notes, req.user.id]
    );
    await req.audit('credit_memos', result.insertId, 'INSERT', null, { memo_number: memoNumber, customer_id, amount, reason });
    res.status(201).json({ id: result.insertId, memo_number: memoNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/credit-memos/:id/post', authenticate, async (req, res) => {
  try {
    const [memos] = await pool.query('SELECT * FROM credit_memos WHERE id = ?', [req.params.id]);
    if (!memos.length) return res.status(404).json({ error: 'Credit memo not found' });
    if (memos[0].status !== 'draft') return res.status(400).json({ error: 'Only draft credit memos can be posted' });
    if (memos[0].invoice_id) {
      await pool.query('UPDATE ar_invoices SET amount_paid = COALESCE(amount_paid,0) + ? WHERE id = ?', [memos[0].amount, memos[0].invoice_id]);
      const [inv] = await pool.query('SELECT total, amount_paid FROM ar_invoices WHERE id = ?', [memos[0].invoice_id]);
      if (inv.length && parseFloat(inv[0].amount_paid) >= parseFloat(inv[0].total)) {
        await pool.query("UPDATE ar_invoices SET status = 'paid' WHERE id = ?", [memos[0].invoice_id]);
      } else {
        await pool.query("UPDATE ar_invoices SET status = 'partial' WHERE id = ?", [memos[0].invoice_id]);
      }
    }
    await pool.query("UPDATE credit_memos SET status = 'posted', posted_by = ?, posted_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('credit_memos', req.params.id, 'POST', { status: 'draft' }, { status: 'posted' });
    res.json({ message: 'Credit memo posted and applied' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SETUP ============
router.get('/customer-types', authenticate, async (req, res) => {
  try { const [types] = await pool.query('SELECT * FROM customer_types WHERE is_active = TRUE'); res.json(types); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/tax-groups', authenticate, async (req, res) => {
  try { const [groups] = await pool.query('SELECT * FROM tax_groups WHERE is_active = TRUE'); res.json(groups); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/carriers', authenticate, async (req, res) => {
  try { const [carriers] = await pool.query('SELECT * FROM carriers WHERE is_active = TRUE'); res.json(carriers); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/salespeople', authenticate, async (req, res) => {
  try { const [sp] = await pool.query('SELECT * FROM salespeople WHERE is_active = TRUE'); res.json(sp); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/price-lists', authenticate, async (req, res) => {
  try { const [pl] = await pool.query('SELECT * FROM price_lists WHERE is_active = TRUE'); res.json(pl); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// Dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [openOrders] = await pool.query("SELECT COUNT(*) as count FROM sales_orders WHERE status IN ('open','partial')");
    const [mtdSales] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM sales_orders WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW())");
    const [ytdSales] = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM sales_orders WHERE YEAR(order_date) = YEAR(NOW())");
    const [overdueInvoices] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(total - COALESCE(amount_paid,0)),0) as total FROM ar_invoices WHERE due_date < CURDATE() AND status IN ('posted','partial')");
    const [topCustomers] = await pool.query(`
      SELECT c.company_name, SUM(so.total) as total_sales FROM sales_orders so 
      JOIN customers c ON so.customer_id = c.id WHERE YEAR(so.order_date) = YEAR(NOW()) 
      GROUP BY c.id ORDER BY total_sales DESC LIMIT 10`);
    const [recentQuotes] = await pool.query("SELECT q.*, c.company_name as customer_name FROM quotes q JOIN customers c ON q.customer_id = c.id ORDER BY q.created_at DESC LIMIT 5");
    const [pendingShipments] = await pool.query("SELECT COUNT(*) as count FROM shipments WHERE status = 'draft'");
    res.json({ 
      open_orders: openOrders[0].count, 
      mtd_sales: mtdSales[0].total, 
      ytd_sales: ytdSales[0].total, 
      overdue_invoices: overdueInvoices[0],
      top_customers: topCustomers,
      recent_quotes: recentQuotes,
      pending_shipments: pendingShipments[0].count
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
