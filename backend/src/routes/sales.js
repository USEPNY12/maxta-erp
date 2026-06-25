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
    res.json({ ...customers[0], contacts, recent_orders: recentOrders });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/customers', authenticate, async (req, res) => {
  try {
    const customerNumber = await getNextNumber('customer');
    const { company_name, contact_name, bill_address1, bill_address2, bill_city, bill_state, bill_zip, bill_country,
            ship_address1, ship_address2, ship_city, ship_state, ship_zip, ship_country,
            phone, fax, email, website, customer_type_id, tax_group_id, payment_terms, credit_limit,
            price_list_id, salesperson_id, carrier_id, tax_exempt, tax_exempt_number, notes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO customers (customer_number, company_name, contact_name, bill_address1, bill_address2, bill_city, bill_state, bill_zip, bill_country,
       ship_address1, ship_address2, ship_city, ship_state, ship_zip, ship_country, phone, fax, email, website,
       customer_type_id, tax_group_id, payment_terms, credit_limit, price_list_id, salesperson_id, carrier_id, tax_exempt, tax_exempt_number, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [customerNumber, company_name, contact_name, bill_address1, bill_address2, bill_city, bill_state, bill_zip, bill_country || 'USA',
       ship_address1, ship_address2, ship_city, ship_state, ship_zip, ship_country || 'USA', phone, fax, email, website,
       customer_type_id, tax_group_id, payment_terms || 'Net 30', credit_limit || 0, price_list_id, salesperson_id, carrier_id, tax_exempt || false, tax_exempt_number, notes]
    );
    res.status(201).json({ id: result.insertId, customer_number: customerNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/customers/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    delete fields.id; delete fields.customer_number; delete fields.created_at;
    const columns = Object.keys(fields);
    const values = columns.map(k => fields[k]);
    await pool.query(`UPDATE customers SET ${columns.map(k => `${k}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
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
    if (status) { query += ' AND q.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND q.customer_id = ?'; params.push(customer_id); }
    query += ' ORDER BY q.quote_date DESC LIMIT 100';
    const [quotes] = await pool.query(query, params);
    res.json(quotes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/quotes/:id', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query(`SELECT q.*, c.company_name, c.email as customer_email FROM quotes q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`, [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const [lines] = await pool.query(`SELECT ql.*, i.item_number FROM quote_lines ql JOIN items i ON ql.item_id = i.id WHERE ql.quote_id = ? ORDER BY ql.line_number`, [req.params.id]);
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
      `INSERT INTO quotes (quote_number, customer_id, quote_date, expiry_date, salesperson_id, subtotal, total, notes, internal_notes, terms_conditions, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
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
    res.status(201).json({ id: result.insertId, quote_number: quoteNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Convert quote to sales order
router.post('/quotes/:id/convert', authenticate, async (req, res) => {
  try {
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const quote = quotes[0];

    const orderNumber = await getNextNumber('sales_order');
    const [orderResult] = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, order_date, status, quote_id, salesperson_id, subtotal, tax_amount, total, notes, created_by)
       VALUES (?,?,NOW(),'open',?,?,?,?,?,?,?)`,
      [orderNumber, quote.customer_id, quote.id, quote.salesperson_id, quote.subtotal, quote.tax_amount, quote.total, quote.notes, req.user.id]
    );

    const [quoteLines] = await pool.query('SELECT * FROM quote_lines WHERE quote_id = ?', [req.params.id]);
    for (const l of quoteLines) {
      await pool.query(
        `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [orderResult.insertId, l.line_number, l.item_id, l.description, l.quantity, l.uom, l.unit_price, l.discount_percent, l.line_total, l.width_inches, l.height_inches, l.sqft, l.notes]
      );
    }

    await pool.query('UPDATE quotes SET status = "converted" WHERE id = ?', [req.params.id]);
    res.status(201).json({ id: orderResult.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SALES ORDERS ============
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `SELECT so.*, c.company_name as customer_name, sp.name as salesperson_name 
                 FROM sales_orders so JOIN customers c ON so.customer_id = c.id LEFT JOIN salespeople sp ON so.salesperson_id = sp.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND so.status = ?'; params.push(status); }
    if (customer_id) { query += ' AND so.customer_id = ?'; params.push(customer_id); }
    if (search) { query += ' AND (so.order_number LIKE ? OR c.company_name LIKE ? OR so.customer_po LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY so.order_date DESC LIMIT 100';
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`SELECT so.*, c.company_name, c.phone as customer_phone FROM sales_orders so JOIN customers c ON so.customer_id = c.id WHERE so.id = ?`, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const [lines] = await pool.query(`SELECT sol.*, i.item_number FROM sales_order_lines sol JOIN items i ON sol.item_id = i.id WHERE sol.sales_order_id = ? ORDER BY sol.line_number`, [req.params.id]);
    res.json({ ...orders[0], lines });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/orders', authenticate, async (req, res) => {
  try {
    const orderNumber = await getNextNumber('sales_order');
    const { customer_id, customer_po, order_date, required_date, promised_date, salesperson_id, carrier_id,
            ship_via, fob, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, internal_notes, lines } = req.body;
    
    let subtotal = 0;
    if (lines) lines.forEach(l => { subtotal += (l.quantity_ordered * l.unit_price * (1 - (l.discount_percent || 0) / 100)); });

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
        const lineTotal = l.quantity_ordered * l.unit_price * (1 - (l.discount_percent || 0) / 100);
        const sqft = l.width_inches && l.height_inches ? (l.width_inches * l.height_inches) / 144 : null;
        await pool.query(
          `INSERT INTO sales_order_lines (sales_order_id, line_number, item_id, description, quantity_ordered, uom, unit_price, discount_percent, line_total, width_inches, height_inches, sqft, required_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [result.insertId, i + 1, l.item_id, l.description, l.quantity_ordered, l.uom || 'Each', l.unit_price, l.discount_percent || 0, lineTotal, l.width_inches, l.height_inches, sqft, l.required_date, l.notes]
        );
      }
    }
    res.status(201).json({ id: result.insertId, order_number: orderNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHIPMENTS ============
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const [shipments] = await pool.query(`
      SELECT s.*, c.company_name, so.order_number FROM shipments s 
      JOIN customers c ON s.customer_id = c.id JOIN sales_orders so ON s.sales_order_id = so.id
      ORDER BY s.shipment_date DESC LIMIT 100`);
    res.json(shipments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/shipments', authenticate, async (req, res) => {
  try {
    const shipmentNumber = await getNextNumber('shipment');
    const { sales_order_id, shipment_date, carrier_id, tracking_number, weight, freight_charge, ship_to_name, ship_address1, ship_address2, ship_city, ship_state, ship_zip, notes, lines } = req.body;
    
    const [orders] = await pool.query('SELECT customer_id FROM sales_orders WHERE id = ?', [sales_order_id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Sales order not found' });

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
        await pool.query('UPDATE sales_order_lines SET quantity_shipped = quantity_shipped + ? WHERE id = ?', [l.quantity_shipped, l.sales_order_line_id]);
        await pool.query('UPDATE items SET qty_on_hand = qty_on_hand - ? WHERE id = ?', [l.quantity_shipped, l.item_id]);
      }
    }
    res.status(201).json({ id: result.insertId, shipment_number: shipmentNumber });
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
    const [overdueShipments] = await pool.query("SELECT COUNT(*) as count FROM sales_orders WHERE required_date < CURDATE() AND status IN ('open','partial')");
    const [topCustomers] = await pool.query(`
      SELECT c.company_name, SUM(so.total) as total_sales FROM sales_orders so 
      JOIN customers c ON so.customer_id = c.id WHERE YEAR(so.order_date) = YEAR(NOW()) 
      GROUP BY c.id ORDER BY total_sales DESC LIMIT 10`);
    res.json({ open_orders: openOrders[0].count, mtd_sales: mtdSales[0].total, ytd_sales: ytdSales[0].total, overdue_shipments: overdueShipments[0].count, top_customers: topCustomers });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
