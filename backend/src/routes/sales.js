const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getNextNumber } = require('../utils/sequence');
const { checkDocumentLock, preventDelete } = require('../middleware/documentLock');

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
    const { status, customer_id } = req.query;
    let query = `SELECT q.*, c.company_name as customer_name, sp.name as salesperson_name 
                 FROM quotes q JOIN customers c ON q.customer_id = c.id LEFT JOIN salespeople sp ON q.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND q.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND q.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY q.quote_date DESC LIMIT 200';
    const [quotes] = await pool.query(query, params);
    res.json(quotes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/quotes/:id', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query(`SELECT q.*, c.company_name, c.email as customer_email FROM quotes q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`, [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const [lines] = await pool.query(`SELECT ql.*, i.item_number, i.description as item_description FROM quote_lines ql LEFT JOIN items i ON ql.item_id = i.id WHERE ql.quote_id = ? ORDER BY ql.line_number`, [req.params.id]);
    res.json({ ...quotes[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/quotes', authenticate, async (req, res) => {
  try {
    const quoteNumber = await getNextNumber('quote');
    const { customer_id, quote_date, expiry_date, salesperson_id, notes, internal_notes, terms_conditions, lines } = req.body;
    
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += (l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100)); });

    const [result] = await pool.query(
      `INSERT INTO quotes (quote_number, customer_id, quote_date, expiry_date, salesperson_id, subtotal, total, status, notes, internal_notes, terms_conditions, created_by)
       VALUES (?,?,?,?,?,?,?,'draft',?,?,?,?)`,
      [quoteNumber, customer_id, quote_date || new Date(), expiry_date, salesperson_id, subtotal, subtotal, notes, internal_notes, terms_conditions, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const lineTotal = l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (l.width_inches * l.height_inches) / 144 : null;
        await pool.query(
          `INSERT INTO quote_lines (quote_id, line_number, item_id, description, quantity, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id, l.description, l.quantity, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal, l.width_inches, l.height_inches, sqft, l.notes]
        );
      }
    }
    await req.audit('quotes', result.insertId, 'INSERT', null, { quote_number: quoteNumber, customer_id, total: subtotal });
    res.status(201).json({ id: result.insertId, quote_number: quoteNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/quotes/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Quote not found' });
    if (old[0].status === 'converted') return res.status(403).json({ error: 'Cannot edit a converted quote' });
    
    const { customer_id, quote_date, expiry_date, salesperson_id, notes, internal_notes, terms_conditions, lines } = req.body;
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += (l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100)); });

    await pool.query(
      `UPDATE quotes SET customer_id=?, quote_date=?, expiry_date=?, salesperson_id=?, subtotal=?, total=?, notes=?, internal_notes=?, terms_conditions=? WHERE id=?`,
      [customer_id, quote_date, expiry_date, salesperson_id, subtotal, subtotal, notes, internal_notes, terms_conditions, req.params.id]
    );

    // Replace lines
    await pool.query('DELETE FROM quote_lines WHERE quote_id = ?', [req.params.id]);
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const lineTotal = l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (l.width_inches * l.height_inches) / 144 : null;
        await pool.query(
          `INSERT INTO quote_lines (quote_id, line_number, item_id, description, quantity, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [req.params.id, i + 1, l.item_id, l.description, l.quantity, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal, l.width_inches, l.height_inches, sqft, l.notes]
        );
      }
    }
    await req.audit('quotes', req.params.id, 'UPDATE', old[0], req.body);
    res.json({ message: 'Quote updated successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Convert quote to sales order
router.post('/quotes/:id/convert', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const quote = quotes[0];
    if (quote.status === 'converted') return res.status(400).json({ error: 'Quote already converted to an order' });

    const orderNumber = await getNextNumber('sales_order');
    const [orderResult] = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, order_date, status, quote_id, salesperson_id, subtotal, tax_amount, total, notes, created_by)
       VALUES (?,?,NOW(),'open',?,?,?,?,?,?,?)`,
      [orderNumber, quote.customer_id, quote.id, quote.salesperson_id, quote.subtotal, quote.tax_amount || 0, quote.total || quote.subtotal, quote.notes, req.user.id]
    );

    const [quoteLines] = await pool.query('SELECT * FROM quote_lines WHERE quote_id = ?', [req.params.id]);
    for (const l of quoteLines) {
      await pool.query(
        `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [orderResult.insertId, l.line_number, l.item_id, l.description, l.quantity, l.uom, l.unit_price, l.discount_percent, l.line_total, l.width_inches, l.height_inches, l.sqft, l.notes]
      );
    }

    await pool.query('UPDATE quotes SET status = "converted", converted_to_order_id = ? WHERE id = ?', [orderResult.insertId, req.params.id]);
    await req.audit('quotes', req.params.id, 'CONVERT', { status: 'draft' }, { status: 'converted', order_id: orderResult.insertId });
    await req.audit('sales_orders', orderResult.insertId, 'INSERT', null, { order_number: orderNumber, from_quote: quote.quote_number });
    res.status(201).json({ id: orderResult.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SALES ORDERS ============
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT so.*, c.company_name as customer_name, sp.name as salesperson_name,
                 COALESCE(so.deposit_amount, 0) as deposit_amount
                 FROM sales_orders so JOIN customers c ON so.customer_id = c.id LEFT JOIN salespeople sp ON so.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND so.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND so.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (so.order_number LIKE ? OR c.company_name LIKE ? OR so.customer_po LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY so.order_date DESC LIMIT 200';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`SELECT so.*, c.company_name, c.phone as customer_phone, c.email as customer_email FROM sales_orders so JOIN customers c ON so.customer_id = c.id WHERE so.id = ?`, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const [lines] = await pool.query(`SELECT sol.*, i.item_number, i.description as item_description FROM sales_order_lines sol LEFT JOIN items i ON sol.item_id = i.id WHERE sol.sales_order_id = ? ORDER BY sol.line_number`, [req.params.id]);
    const [shipments] = await pool.query('SELECT * FROM shipments WHERE sales_order_id = ? ORDER BY shipment_date DESC', [req.params.id]);
    const [deposits] = await pool.query("SELECT * FROM customer_deposits WHERE sales_order_id = ? ORDER BY deposit_date DESC", [req.params.id]);
    const [workOrders] = await pool.query('SELECT id, order_number, status FROM work_orders WHERE sales_order_id = ?', [req.params.id]);
    res.json({ ...orders[0], lines, shipments, deposits, work_orders: workOrders });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/orders', authenticate, async (req, res) => {
  try {
    const orderNumber = await getNextNumber('sales_order');
    const { customer_id, customer_po, order_date, required_date, promised_date, salesperson_id, carrier_id,
            ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, internal_notes, lines } = req.body;
    
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((l.quantity_ordered || l.quantity) * l.unit_price * (1 - (l.discount_percent || 0) / 100)); });

    const [result] = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, customer_po, order_date, required_date, promised_date, status, salesperson_id, carrier_id,
       ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, subtotal, total, notes, internal_notes, created_by)
       VALUES (?,?,?,?,?,?,'open',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNumber, customer_id, customer_po, order_date || new Date(), required_date, promised_date, salesperson_id, carrier_id,
       ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, subtotal, subtotal, notes, internal_notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = l.quantity_ordered || l.quantity;
        const lineTotal = qty * l.unit_price * (1 - (l.discount_percent || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (l.width_inches * l.height_inches) / 144 : null;
        await pool.query(
          `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, required_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id, l.description, qty, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal, l.width_inches, l.height_inches, sqft, l.required_date, l.notes]
        );
      }
    }
    await req.audit('sales_orders', result.insertId, 'INSERT', null, { order_number: orderNumber, customer_id, total: subtotal });
    res.status(201).json({ id: result.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/orders/:id', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Order not found' });
    if (['closed', 'cancelled', 'invoiced'].includes(old[0].status)) {
      return res.status(403).json({ error: `Cannot edit a ${old[0].status} order. Create a new order or credit memo instead.` });
    }

    const { customer_po, required_date, promised_date, salesperson_id, carrier_id, ship_via, fob,
            ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, internal_notes, lines } = req.body;
    
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += ((l.quantity_ordered || l.quantity) * l.unit_price * (1 - (l.discount_percent || 0) / 100)); });

    await pool.query(
      `UPDATE sales_orders SET customer_po=?, required_date=?, promised_date=?, salesperson_id=?, carrier_id=?, ship_via=?, fob=?,
       ship_to_name=?, ship_address1=?, ship_address2=?, ship_city=?, ship_state=?, ship_zip=?, subtotal=?, total=?, notes=?, internal_notes=? WHERE id=?`,
      [customer_po, required_date, promised_date, salesperson_id, carrier_id, ship_via, fob,
       ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, subtotal, subtotal, notes, internal_notes, req.params.id]
    );

    // Replace lines
    if (lines) {
      await pool.query('DELETE FROM sales_order_lines WHERE sales_order_id = ?', [req.params.id]);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = l.quantity_ordered || l.quantity;
        const lineTotal = qty * l.unit_price * (1 - (l.discount_percent || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (l.width_inches * l.height_inches) / 144 : null;
        await pool.query(
          `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, required_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [req.params.id, i + 1, l.item_id, l.description, qty, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal, l.width_inches, l.height_inches, sqft, l.required_date, l.notes]
        );
      }
    }
    await req.audit('sales_orders', req.params.id, 'UPDATE', old[0], req.body);
    res.json({ message: 'Order updated successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Cancel a sales order (not delete)
router.post('/orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const [old] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Order not found' });
    if (['closed', 'invoiced'].includes(old[0].status)) return res.status(403).json({ error: 'Cannot cancel a closed/invoiced order' });
    
    await pool.query("UPDATE sales_orders SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    await req.audit('sales_orders', req.params.id, 'CANCEL', { status: old[0].status }, { status: 'cancelled' });
    res.json({ message: 'Order cancelled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ DEPOSITS (on Sales Orders) ============
router.post('/orders/:id/deposit', authenticate, async (req, res) => {
  try {
    const { amount, payment_method, reference_number, deposit_date, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Deposit amount must be greater than 0' });

    const [orders] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });

    const [result] = await pool.query(
      `INSERT INTO customer_deposits (customer_id, sales_order_id, deposit_date, amount, payment_method, reference_number, status, notes, received_by)
       VALUES (?,?,?,?,?,?,'unapplied',?,?)`,
      [orders[0].customer_id, req.params.id, deposit_date || new Date(), amount, payment_method || 'check', reference_number, notes, req.user.id]
    );

    // Update order deposit total
    await pool.query('UPDATE sales_orders SET deposit_amount = COALESCE(deposit_amount,0) + ? WHERE id = ?', [amount, req.params.id]);
    await req.audit('customer_deposits', result.insertId, 'INSERT', null, { order_id: req.params.id, amount, payment_method });
    res.status(201).json({ id: result.insertId, message: 'Deposit recorded successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/orders/:id/deposits', authenticate, async (req, res) => {
  try {
    const [deposits] = await pool.query(
      `SELECT cd.*, u.username as received_by_name FROM customer_deposits cd 
       LEFT JOIN users u ON cd.received_by = u.id WHERE cd.sales_order_id = ? ORDER BY cd.deposit_date DESC`,
      [req.params.id]
    );
    res.json(deposits);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHIPMENTS ============
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const { status, sales_order_id } = req.query;
    let query = `SELECT s.*, c.company_name, so.order_number FROM shipments s 
      JOIN customers c ON s.customer_id = c.id JOIN sales_orders so ON s.sales_order_id = so.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND s.status = ?'; params.push(status); }
    if (sales_order_id) { query += ' AND s.sales_order_id = ?'; params.push(sales_order_id); }
    query += ' ORDER BY s.shipment_date DESC LIMIT 200';
    const [shipments] = await pool.query(query, params);
    res.json(shipments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/shipments/:id', authenticate, async (req, res) => {
  try {
    const [shipments] = await pool.query(`SELECT s.*, c.company_name, so.order_number FROM shipments s JOIN customers c ON s.customer_id = c.id JOIN sales_orders so ON s.sales_order_id = so.id WHERE s.id = ?`, [req.params.id]);
    if (!shipments.length) return res.status(404).json({ error: 'Shipment not found' });
    const [lines] = await pool.query(`SELECT sl.*, i.item_number, i.description FROM shipment_lines sl LEFT JOIN items i ON sl.item_id = i.id WHERE sl.shipment_id = ?`, [req.params.id]);
    res.json({ ...shipments[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/shipments', authenticate, async (req, res) => {
  try {
    const shipmentNumber = await getNextNumber('shipment');
    const { sales_order_id, shipment_date, carrier_id, tracking_number, weight, freight_charge, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, lines } = req.body;
    
    const [orders] = await pool.query('SELECT customer_id, status FROM sales_orders WHERE id = ?', [sales_order_id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Sales order not found' });
    if (['cancelled', 'closed'].includes(orders[0].status)) return res.status(400).json({ error: 'Cannot ship a cancelled/closed order' });

    const [result] = await pool.query(
      `INSERT INTO shipments (shipment_number, sales_order_id, customer_id, shipment_date, carrier_id, tracking_number, weight, freight_charge, status, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, shipped_by)
       VALUES (?,?,?,?,?,?,?,?,'shipped',?,?,?,?,?,?,?,?)`,
      [shipmentNumber, sales_order_id, orders[0].customer_id, shipment_date || new Date(), carrier_id, tracking_number, weight, freight_charge || 0, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (const l of lines) {
        await pool.query(
          'INSERT INTO shipment_lines (shipment_id, sales_order_line_id, item_id, quantity_shipped, lot_number, serial_number) VALUES (?,?,?,?,?,?)',
          [result.insertId, l.sales_order_line_id, l.item_id, l.quantity_shipped, l.lot_number, l.serial_number]
        );
        // Update SO line shipped qty
        await pool.query('UPDATE sales_order_lines SET quantity_shipped = COALESCE(quantity_shipped,0) + ? WHERE id = ?', [l.quantity_shipped, l.sales_order_line_id]);
        // Reduce inventory
        await pool.query('UPDATE items SET qty_on_hand = COALESCE(qty_on_hand,0) - ? WHERE id = ?', [l.quantity_shipped, l.item_id]);
      }
    }

    // Update SO status based on shipment completion
    const [soLines] = await pool.query('SELECT quantity_ordered, COALESCE(quantity_shipped,0) as quantity_shipped FROM sales_order_lines WHERE sales_order_id = ?', [sales_order_id]);
    const allShipped = soLines.every(l => l.quantity_shipped >= l.quantity_ordered);
    const someShipped = soLines.some(l => l.quantity_shipped > 0);
    if (allShipped) {
      await pool.query("UPDATE sales_orders SET status = 'shipped' WHERE id = ?", [sales_order_id]);
    } else if (someShipped) {
      await pool.query("UPDATE sales_orders SET status = 'partial' WHERE id = ?", [sales_order_id]);
    }

    await req.audit('shipments', result.insertId, 'INSERT', null, { shipment_number: shipmentNumber, sales_order_id });
    res.status(201).json({ id: result.insertId, shipment_number: shipmentNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ AR INVOICES ============
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT i.*, c.company_name as customer_name,
                 (i.total - COALESCE(i.amount_paid,0)) as balance_due
                 FROM ar_invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { query += ' AND i.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND i.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY i.invoice_date DESC LIMIT 200';
    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query(`SELECT i.*, c.company_name, c.email as customer_email, (i.total - COALESCE(i.amount_paid,0)) as balance_due FROM ar_invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`, [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'Invoice not found' });
    const [lines] = await pool.query('SELECT * FROM ar_invoice_lines WHERE invoice_id = ? ORDER BY line_number', [req.params.id]);
    const [payments] = await pool.query('SELECT pa.*, cp.payment_number FROM payment_applications pa LEFT JOIN customer_payments cp ON pa.payment_id = cp.id WHERE pa.invoice_id = ?', [req.params.id]);
    res.json({ ...invoices[0], lines, payments });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create invoice from shipment (normal flow: ship then invoice)
router.post('/invoices', authenticate, async (req, res) => {
  try {
    const invoiceNumber = await getNextNumber('ar_invoice');
    const { customer_id, sales_order_id, shipment_id, invoice_date, due_date, payment_terms, notes, lines } = req.body;

    let subtotal = 0, taxAmount = 0;
    if (lines) lines.forEach(l => { subtotal += (l.quantity * l.unit_price); });

    const totalAmount = subtotal + taxAmount;

    const [result] = await pool.query(
      `INSERT INTO ar_invoices (invoice_number, customer_id, sales_order_id, shipment_id, invoice_date, due_date, payment_terms, subtotal, tax_amount, total, amount_paid, status, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,'draft',?,?)`,
      [invoiceNumber, customer_id, sales_order_id, shipment_id, invoice_date || new Date(), due_date, payment_terms || 'Net 30', subtotal, taxAmount, totalAmount, notes, req.user.id]
    );

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await pool.query(
          `INSERT INTO ar_invoice_lines (invoice_id, line_number, item_id, description, quantity, uom, unit_price, line_total, sales_order_line_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id, l.description, l.quantity, l.uom || 'Each', l.unit_price, l.quantity * l.unit_price, l.sales_order_line_id]
        );
      }
    }

    await req.audit('ar_invoices', result.insertId, 'INSERT', null, { invoice_number: invoiceNumber, customer_id, total: totalAmount });
    res.status(201).json({ id: result.insertId, invoice_number: invoiceNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Post invoice (locks it - cannot be edited after posting)
router.post('/invoices/:id/post', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ar_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'Invoice not found' });
    if (invoices[0].status !== 'draft') return res.status(400).json({ error: 'Only draft invoices can be posted' });

    await pool.query("UPDATE ar_invoices SET status = 'posted', posted_by = ?, posted_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);
    
    // Update SO status
    if (invoices[0].sales_order_id) {
      await pool.query("UPDATE sales_orders SET status = 'invoiced' WHERE id = ?", [invoices[0].sales_order_id]);
    }

    await req.audit('ar_invoices', req.params.id, 'POST', { status: 'draft' }, { status: 'posted' });
    res.json({ message: 'Invoice posted successfully. It is now locked and cannot be modified.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Void invoice (creates reversal - invoice cannot be deleted)
router.post('/invoices/:id/void', authenticate, async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM ar_invoices WHERE id = ?', [req.params.id]);
    if (!invoices.length) return res.status(404).json({ error: 'Invoice not found' });
    if (invoices[0].status === 'void') return res.status(400).json({ error: 'Invoice is already voided' });
    if (invoices[0].amount_paid > 0) return res.status(400).json({ error: 'Cannot void an invoice with payments applied. Reverse the payments first.' });

    const { reason } = req.body;
    await pool.query("UPDATE ar_invoices SET status = 'void', void_reason = ?, voided_by = ?, voided_at = NOW() WHERE id = ?", [reason, req.user.id, req.params.id]);
    await req.audit('ar_invoices', req.params.id, 'VOID', { status: invoices[0].status }, { status: 'void', reason });
    res.json({ message: 'Invoice voided successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Invoices cannot be deleted - only voided
router.delete('/invoices/:id', authenticate, preventDelete('ar_invoices'));

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

// Post credit memo (applies credit to invoice and/or customer balance)
router.post('/credit-memos/:id/post', authenticate, async (req, res) => {
  try {
    const [memos] = await pool.query('SELECT * FROM credit_memos WHERE id = ?', [req.params.id]);
    if (!memos.length) return res.status(404).json({ error: 'Credit memo not found' });
    if (memos[0].status !== 'draft') return res.status(400).json({ error: 'Only draft credit memos can be posted' });

    // If linked to an invoice, reduce the invoice balance
    if (memos[0].invoice_id) {
      await pool.query('UPDATE ar_invoices SET amount_paid = COALESCE(amount_paid,0) + ? WHERE id = ?', [memos[0].amount, memos[0].invoice_id]);
      // Check if invoice is now fully paid
      const [inv] = await pool.query('SELECT total, amount_paid FROM ar_invoices WHERE id = ?', [memos[0].invoice_id]);
      if (inv.length && inv[0].amount_paid >= inv[0].total) {
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
    res.json({ 
      open_orders: openOrders[0].count, 
      mtd_sales: mtdSales[0].total, 
      ytd_sales: ytdSales[0].total, 
      overdue_invoices: overdueInvoices[0],
      top_customers: topCustomers 
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
