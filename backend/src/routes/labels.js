const express = require('express');
const router = express.Router();
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============ BARCODE/QR GENERATION HELPERS ============

async function generateBarcode(text, options = {}) {
  try {
    const opts = {
      bcid: options.type || 'code128',
      text: String(text),
      scale: options.scale || 3,
      height: options.height || 10,
      includetext: options.includeText !== false,
      textxalign: 'center'
    };
    const png = await bwipjs.toBuffer(opts);
    return png.toString('base64');
  } catch (e) { return null; }
}

async function generateQRDataURL(text, size = 200) {
  try {
    return await QRCode.toDataURL(String(text), { width: size, margin: 1, errorCorrectionLevel: 'M' });
  } catch (e) { return null; }
}

// ============ LABEL DATA ENDPOINTS ============

// Get label data for an item (right-click → Print Label)
router.get('/item/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, it.name as type_name,
        (SELECT COALESCE(SUM(quantity_on_hand),0) FROM inventory_balances WHERE item_id = i.id) as total_qty
      FROM items i
      LEFT JOIN item_types it ON i.item_type_id = it.id
      WHERE i.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const item = rows[0];

    const barcodeText = item.item_number || `ITEM-${item.id}`;
    const baseUrl = `http://34.26.235.14:8081`;
    const qrText = `${baseUrl}/inventory/items?id=${item.id}`;

    const barcode = await generateBarcode(barcodeText);
    const qrDataUrl = await generateQRDataURL(qrText);

    res.json({
      label_type: 'item',
      data: {
        item_number: item.item_number,
        description: item.description,
        type: item.type_name,
        glass_type: item.glass_type,
        thickness: item.thickness || item.glass_thickness,
        uom: item.uom,
        qty_on_hand: item.total_qty || 0,
        standard_cost: item.standard_cost,
        base_price: item.base_price
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl,
      qr_text: qrText
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get label data for a location
router.get('/location/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM locations WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Location not found' });
    const loc = rows[0];

    const barcodeText = loc.code || `LOC-${loc.id}`;
    const qrText = `http://34.26.235.14:8081/inventory/locations?id=${loc.id}`;

    const barcode = await generateBarcode(barcodeText, { height: 15, scale: 4 });
    const qrDataUrl = await generateQRDataURL(qrText);

    res.json({
      label_type: 'location',
      data: {
        location_code: loc.code,
        name: loc.name,
        type: loc.location_type,
        warehouse: loc.warehouse_code || loc.parent_location
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl,
      qr_text: qrText
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get label data for a work order (production label - most important for glass)
router.get('/work-order/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT wo.*, i.item_number, i.description as item_desc, i.glass_type,
        i.glass_thickness, i.edge_type,
        so.order_number as so_number, c.company_name as customer_name, so.project_name
      FROM work_orders wo
      LEFT JOIN items i ON wo.item_id = i.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE wo.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = rows[0];

    // Get fabrication charges
    const [fabCharges] = await pool.query(`
      SELECT fc.name, fc.category, wlf.quantity, fc.pricing_method
      FROM wo_line_fabrication wlf
      JOIN fabrication_charges fc ON wlf.fabrication_charge_id = fc.id
      WHERE wlf.work_order_id = ?`, [wo.id]).catch(() => [[]]);

    const barcodeText = wo.wo_number || wo.order_number || `WO-${wo.id}`;
    const qrText = `http://34.26.235.14:8081/manufacturing/work-orders?wo=${wo.id}`;

    const barcode = await generateBarcode(barcodeText);
    const qrDataUrl = await generateQRDataURL(qrText);

    // Summarize fabrication by category
    const fabSummary = {};
    (fabCharges || []).forEach(fc => {
      if (!fabSummary[fc.category]) fabSummary[fc.category] = [];
      fabSummary[fc.category].push({ name: fc.name, qty: fc.quantity, method: fc.pricing_method });
    });

    res.json({
      label_type: 'production',
      data: {
        wo_number: barcodeText,
        status: wo.status,
        item_number: wo.item_number,
        item_desc: wo.item_desc,
        glass_type: wo.glass_type,
        thickness: wo.thickness || wo.glass_thickness,
        edge_type: wo.edge_type,
        width: wo.width,
        height: wo.height,
        quantity: wo.quantity,
        customer: wo.customer_name,
        project: wo.project_name,
        so_number: wo.so_number,
        due_date: wo.due_date,
        fabrication: fabSummary
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl,
      qr_text: qrText
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get label data for a lot
router.get('/lot/:lotNumber', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, i.item_number, i.description as item_desc, v.company_name as vendor_name
      FROM lots l
      LEFT JOIN items i ON l.item_id = i.id
      LEFT JOIN vendors v ON l.vendor_id = v.id
      WHERE l.lot_number = ?`, [req.params.lotNumber]);
    if (!rows.length) return res.status(404).json({ error: 'Lot not found' });
    const lot = rows[0];

    const barcodeText = lot.lot_number;
    const barcode = await generateBarcode(barcodeText);
    const qrDataUrl = await generateQRDataURL(barcodeText);

    res.json({
      label_type: 'lot',
      data: {
        lot_number: lot.lot_number,
        item_number: lot.item_number,
        item_desc: lot.item_desc,
        quantity: lot.quantity,
        vendor: lot.vendor_name,
        received_date: lot.received_date,
        expiry_date: lot.expiry_date,
        po_number: lot.po_number
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get label data for a shipment (shipping label)
router.get('/shipment/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, so.order_number as so_number, c.company_name as customer_name,
        c.address1, c.address2, c.city, c.state, c.zip, c.phone
      FROM shipments s
      LEFT JOIN sales_orders so ON s.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE s.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Shipment not found' });
    const ship = rows[0];

    const barcodeText = ship.shipment_number || `SHIP-${ship.id}`;
    const barcode = await generateBarcode(barcodeText);
    const qrDataUrl = await generateQRDataURL(barcodeText);

    res.json({
      label_type: 'shipping',
      data: {
        shipment_number: barcodeText,
        so_number: ship.so_number,
        customer: ship.customer_name,
        ship_to: {
          company: ship.ship_to_company || ship.customer_name,
          address1: ship.ship_to_address1 || ship.address1,
          address2: ship.ship_to_address2 || ship.address2,
          city: ship.ship_to_city || ship.city,
          state: ship.ship_to_state || ship.state,
          zip: ship.ship_to_zip || ship.zip
        },
        carrier: ship.carrier,
        tracking_number: ship.tracking_number,
        ship_date: ship.ship_date,
        piece_count: ship.package_count || ship.total_pieces
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get label data for a PO receipt (receiving labels)
router.get('/receipt/:id', authenticate, async (req, res) => {
  try {
    const [receipt] = await pool.query(`
      SELECT pr.*, po.po_number, v.company_name as vendor_name
      FROM po_receipts pr
      LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE pr.id = ?`, [req.params.id]);
    if (!receipt.length) return res.status(404).json({ error: 'Receipt not found' });

    const [lines] = await pool.query(`
      SELECT prl.*, i.item_number, i.description
      FROM po_receipt_lines prl
      JOIN items i ON prl.item_id = i.id
      WHERE prl.po_receipt_id = ?`, [req.params.id]);

    const barcodeText = receipt[0].receipt_number || `RCV-${receipt[0].id}`;
    const barcode = await generateBarcode(barcodeText);
    const qrDataUrl = await generateQRDataURL(barcodeText);

    res.json({
      label_type: 'receiving',
      data: {
        receipt_number: barcodeText,
        po_number: receipt[0].po_number,
        vendor: receipt[0].vendor_name,
        received_date: receipt[0].received_date || receipt[0].receipt_date,
        lines: lines.map(l => ({
          item_number: l.item_number,
          description: l.description,
          quantity: l.quantity_received || l.quantity,
          lot_number: l.lot_number,
          location: l.location_code
        }))
      },
      barcode,
      barcode_text: barcodeText,
      qr_data_url: qrDataUrl
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SERIAL NUMBER MANAGEMENT ============

router.post('/serial/generate', authenticate, async (req, res) => {
  try {
    const { item_id, work_order_id, quantity = 1 } = req.body;
    const prefix = 'MTA';
    const year = new Date().getFullYear();

    const [last] = await pool.query(`SELECT serial_number FROM serial_numbers ORDER BY id DESC LIMIT 1`);
    let nextNum = 1;
    if (last.length) {
      const match = last[0].serial_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const serials = [];
    for (let i = 0; i < quantity; i++) {
      const serial = `${prefix}-${year}-${String(nextNum + i).padStart(6, '0')}`;
      await pool.query(
        `INSERT INTO serial_numbers (serial_number, item_id, work_order_id, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
        [serial, item_id, work_order_id]
      );
      serials.push(serial);
    }
    res.json({ serials });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/serial/:serial', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sn.*, i.item_number, i.description, wo.wo_number, wo.order_number,
        c.company_name as customer_name, so.order_number as so_number
      FROM serial_numbers sn
      LEFT JOIN items i ON sn.item_id = i.id
      LEFT JOIN work_orders wo ON sn.work_order_id = wo.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE sn.serial_number = ?`, [req.params.serial]);
    if (!rows.length) return res.status(404).json({ error: 'Serial not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ UNIVERSAL BARCODE SCAN LOOKUP ============

router.post('/scan/lookup', authenticate, async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: 'Barcode required' });
    const code = barcode.trim();

    // Work Order
    if (code.match(/^WO-/i)) {
      const [rows] = await pool.query(`SELECT w.id, w.wo_number, w.order_number, w.status, w.quantity, w.start_date, i.item_number, i.description as item_desc FROM work_orders w LEFT JOIN items i ON w.item_id = i.id WHERE w.wo_number = ? OR w.order_number = ?`, [code, code]);
      if (rows.length) return res.json({ type: 'work_order', data: rows[0] });
    }
    // Sales Order
    if (code.match(/^SO-/i)) {
      const [rows] = await pool.query(`SELECT id, order_number, status FROM sales_orders WHERE order_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'sales_order', data: rows[0] });
    }
    // Purchase Order
    if (code.match(/^PO-/i)) {
      const [rows] = await pool.query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'purchase_order', data: rows[0] });
    }
    // Serial Number
    if (code.match(/^MTA-/i)) {
      const [rows] = await pool.query(`SELECT * FROM serial_numbers WHERE serial_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'serial_number', data: rows[0] });
    }
    // Location
    const [locs] = await pool.query(`SELECT id, code as location_code, name, location_type FROM locations WHERE code = ?`, [code]);
    if (locs.length) return res.json({ type: 'location', data: locs[0] });
    // Item
    const [items] = await pool.query(`SELECT i.id, i.item_number, i.description, i.uom, i.qty_on_hand, i.glass_type, i.glass_thickness, i.standard_cost, it.name as type_name FROM items i LEFT JOIN item_types it ON i.item_type_id = it.id WHERE i.item_number = ?`, [code]);
    if (items.length) return res.json({ type: 'item', data: items[0] });
    // Lot
    const [lots] = await pool.query(`SELECT * FROM lots WHERE lot_number = ?`, [code]);
    if (lots.length) return res.json({ type: 'lot', data: lots[0] });
    // Shipment
    const [ships] = await pool.query(`SELECT id, shipment_number, status FROM shipments WHERE shipment_number = ?`, [code]);
    if (ships.length) return res.json({ type: 'shipment', data: ships[0] });

    return res.json({ type: 'unknown', barcode: code, message: 'No matching record found' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SCAN-BASED TRANSACTIONS ============

// Scan to count (physical inventory)
router.post('/scan/count', authenticate, async (req, res) => {
  try {
    const { physical_count_id, barcode, quantity, location_code } = req.body;

    const [items] = await pool.query(`SELECT id, item_number, description FROM items WHERE item_number = ?`, [barcode]);
    if (!items.length) return res.status(404).json({ error: `Item not found: ${barcode}` });
    const item = items[0];

    let locationId = null;
    if (location_code) {
      const [locs] = await pool.query(`SELECT id FROM locations WHERE code = ?`, [location_code]);
      if (locs.length) locationId = locs[0].id;
    }

    // Check existing count line
    const [existing] = await pool.query(
      `SELECT id FROM physical_count_lines WHERE count_id = ? AND item_id = ? AND (location_id = ? OR (location_id IS NULL AND ? IS NULL))`,
      [physical_count_id, item.id, locationId, locationId]
    );

    if (existing.length) {
      await pool.query(
        `UPDATE physical_count_lines SET counted_qty = ? WHERE id = ?`,
        [quantity, existing[0].id]
      );
    } else {
      const [bal] = await pool.query(
        `SELECT COALESCE(SUM(quantity_on_hand), 0) as qty FROM inventory_balances WHERE item_id = ? ${locationId ? 'AND location_id = ?' : ''}`,
        locationId ? [item.id, locationId] : [item.id]
      );
      await pool.query(
        `INSERT INTO physical_count_lines (count_id, item_id, location_id, system_qty, counted_qty) VALUES (?, ?, ?, ?, ?)`,
        [physical_count_id, item.id, locationId, bal[0].qty, quantity]
      );
    }

    res.json({ success: true, item: item.item_number, description: item.description, quantity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scan to transfer inventory between locations
router.post('/scan/transfer', authenticate, async (req, res) => {
  try {
    const { barcode, from_location_code, to_location_code, quantity, lot_number } = req.body;

    const [items] = await pool.query(`SELECT id, item_number FROM items WHERE item_number = ?`, [barcode]);
    if (!items.length) return res.status(404).json({ error: `Item not found: ${barcode}` });

    const [fromLoc] = await pool.query(`SELECT id, code as location_code FROM locations WHERE code = ?`, [from_location_code]);
    if (!fromLoc.length) return res.status(404).json({ error: `From location not found: ${from_location_code}` });

    const [toLoc] = await pool.query(`SELECT id, code as location_code FROM locations WHERE code = ?`, [to_location_code]);
    if (!toLoc.length) return res.status(404).json({ error: `To location not found: ${to_location_code}` });

    // Check available qty
    const [bal] = await pool.query(
      `SELECT COALESCE(SUM(quantity_on_hand), 0) as qty FROM inventory_balances WHERE item_id = ? AND location_id = ?`,
      [items[0].id, fromLoc[0].id]
    );
    if (bal[0].qty < quantity) return res.status(400).json({ error: `Insufficient qty. Available: ${bal[0].qty}` });

    // Deduct from source
    await pool.query(
      `UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand - ? WHERE item_id = ? AND location_id = ?`,
      [quantity, items[0].id, fromLoc[0].id]
    );

    // Add to destination
    const [existTo] = await pool.query(`SELECT id FROM inventory_balances WHERE item_id = ? AND location_id = ?`, [items[0].id, toLoc[0].id]);
    if (existTo.length) {
      await pool.query(`UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?`, [quantity, existTo[0].id]);
    } else {
      await pool.query(`INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand) VALUES (?, ?, ?)`, [items[0].id, toLoc[0].id, quantity]);
    }

    // Log transaction
    await pool.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, from_location_id, to_location_id, lot_number, reference_type, created_by, created_at) VALUES (?, 'transfer', ?, ?, ?, ?, 'scan_transfer', ?, NOW())`,
      [items[0].id, quantity, fromLoc[0].id, toLoc[0].id, lot_number || null, req.user.id]
    );

    // === BROADCAST: Transfer scan ===
    if (global.wsBroadcast) {
      global.wsBroadcast('inventory_transfer', { item: items[0].item_number, from: from_location_code, to: to_location_code, quantity, user_id: req.user.id });
    }
    try { await pool.query(`INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at) VALUES ('inventory_transfer', ?, 1, ?, NOW())`, [`Transfer: ${quantity}x ${items[0].item_number} from ${from_location_code} to ${to_location_code}`, JSON.stringify({ item: items[0].item_number, from: from_location_code, to: to_location_code, quantity, user_id: req.user.id })]); } catch (e) { /* ignore */ }
    res.json({ success: true, item: items[0].item_number, quantity, from: from_location_code, to: to_location_code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scan to receive PO items
router.post('/scan/receive', authenticate, async (req, res) => {
  try {
    const { po_number, barcode, quantity, location_code, lot_number } = req.body;

    const [pos] = await pool.query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = ?`, [po_number]);
    if (!pos.length) return res.status(404).json({ error: `PO not found: ${po_number}` });

    const [items] = await pool.query(`SELECT id, item_number FROM items WHERE item_number = ?`, [barcode]);
    if (!items.length) return res.status(404).json({ error: `Item not found: ${barcode}` });

    const [poLines] = await pool.query(
      `SELECT id, quantity_ordered as ordered, COALESCE(quantity_received, 0) as received FROM po_lines WHERE purchase_order_id = ? AND item_id = ?`,
      [pos[0].id, items[0].id]
    );
    if (!poLines.length) return res.status(404).json({ error: `Item ${barcode} not on PO ${po_number}` });

    const remaining = poLines[0].ordered - poLines[0].received;
    if (quantity > remaining) return res.status(400).json({ error: `Over-receiving. Remaining: ${remaining}` });

    // Update PO line
    await pool.query(`UPDATE po_lines SET quantity_received = COALESCE(quantity_received, 0) + ? WHERE id = ?`, [quantity, poLines[0].id]);

    // Update inventory
    let locationId = null;
    if (location_code) {
      const [locs] = await pool.query(`SELECT id FROM locations WHERE code = ?`, [location_code]);
      if (locs.length) locationId = locs[0].id;
    }
    if (locationId) {
      const [existBal] = await pool.query(`SELECT id FROM inventory_balances WHERE item_id = ? AND location_id = ?`, [items[0].id, locationId]);
      if (existBal.length) {
        await pool.query(`UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?`, [quantity, existBal[0].id]);
      } else {
        await pool.query(`INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand) VALUES (?, ?, ?)`, [items[0].id, locationId, quantity]);
      }
    }

    // Log transaction
    await pool.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, to_location_id, lot_number, reference_type, reference_id, created_by, created_at) VALUES (?, 'receipt', ?, ?, ?, 'purchase_order', ?, ?, NOW())`,
      [items[0].id, quantity, locationId, lot_number || null, pos[0].id, req.user.id]
    );

    // === BROADCAST: Receive scan ===
    if (global.wsBroadcast) {
      global.wsBroadcast('po_receive', { po_number, item: barcode, quantity, user_id: req.user.id });
    }
    try { await pool.query(`INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at) VALUES ('po_received', ?, 1, ?, NOW())`, [`PO ${po_number}: Received ${quantity}x ${barcode}`, JSON.stringify({ po_number, item: barcode, quantity, user_id: req.user.id })]); } catch (e) { /* ignore */ }
    res.json({ success: true, item: barcode, quantity, po: po_number, remaining: remaining - quantity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// INTEGRATED PRODUCTION SCAN - Auto-receipt, inventory, GL, notifications
// ═══════════════════════════════════════════════════════════════════
// Scan production tracking - log piece at a station + advance WO routing
// When all routing steps complete: auto-creates WO receipt, adds finished goods
// to inventory, logs GL entries, and broadcasts real-time WebSocket events
router.post('/scan/production', authenticate, async (req, res) => {
  try {
    const { barcode, station, status = 'completed', notes } = req.body;
    const [wos] = await pool.query(`SELECT id, wo_number, order_number, status as wo_status, current_station_id, item_id, quantity, sales_order_id FROM work_orders WHERE wo_number = ? OR order_number = ?`, [barcode, barcode]);
    if (!wos.length) return res.status(404).json({ error: `Work order not found: ${barcode}` });
    const wo = wos[0];
    // Record the scan
    await pool.query(
      `INSERT INTO production_scans (work_order_id, station, status, notes, scanned_by, scanned_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [wo.id, station, status, notes || null, req.user.id]
    );
    // Advance WO routing when station scan is marked completed
    let routingAdvanced = false;
    let nextStation = null;
    let woCompleted = false;
    let receiptNumber = null;
    if (status === 'completed') {
      // Find the current (first pending/in_progress) routing step
      const [currentSteps] = await pool.query(
        `SELECT wr.id, wr.sequence, wr.work_center_id, wc.name as wc_name
         FROM wo_routing wr
         LEFT JOIN work_centers wc ON wr.work_center_id = wc.id
         WHERE wr.work_order_id = ? AND wr.status IN ('pending','in_progress')
         ORDER BY wr.sequence ASC LIMIT 1`, [wo.id]);
      if (currentSteps.length > 0) {
        const currentStep = currentSteps[0];
        // Mark current step as completed
        await pool.query(
          `UPDATE wo_routing SET status = 'completed', actual_finish = NOW() WHERE id = ?`,
          [currentStep.id]);
        // Find next step
        const [nextSteps] = await pool.query(
          `SELECT wr.id, wr.sequence, wr.work_center_id, wc.name as wc_name
           FROM wo_routing wr
           LEFT JOIN work_centers wc ON wr.work_center_id = wc.id
           WHERE wr.work_order_id = ? AND wr.sequence > ? AND wr.status = 'pending'
           ORDER BY wr.sequence ASC LIMIT 1`,
          [wo.id, currentStep.sequence]);
        if (nextSteps.length > 0) {
          // Advance to next step
          await pool.query(
            `UPDATE wo_routing SET status = 'in_progress', actual_start = NOW() WHERE id = ?`,
            [nextSteps[0].id]);
          await pool.query(
            `UPDATE work_orders SET current_station_id = ? WHERE id = ?`,
            [nextSteps[0].work_center_id, wo.id]);
          nextStation = nextSteps[0].wc_name;
          routingAdvanced = true;
          // === BROADCAST: Station advance ===
          if (global.wsBroadcast) {
            global.wsBroadcast('production_scan', {
              wo: barcode, station, next_station: nextStation,
              action: 'station_advance', user_id: req.user.id
            });
          }
        } else {
          // ═══ ALL ROUTING STEPS COMPLETED - FULL INTEGRATION ═══
          woCompleted = true;
          await pool.query(
            `UPDATE work_orders SET status = 'completed', current_station_id = NULL WHERE id = ? AND status != 'completed'`,
            [wo.id]);
          nextStation = 'COMPLETED';
          routingAdvanced = true;
          // --- AUTO-RECEIPT: Create WO Receipt & add finished goods to inventory ---
          try {
            const { getNextNumber } = require('../utils/sequence');
            receiptNumber = await getNextNumber('wo_receipt');
            const woQty = Number(wo.quantity) || 1;
            // Create the WO receipt record
            await pool.query(
              `INSERT INTO wo_receipts (receipt_number, work_order_id, receipt_date, quantity_completed, quantity_scrapped, is_final, location_id, notes, received_by)
               VALUES (?, ?, CURDATE(), ?, 0, 1, 1, ?, ?)`,
              [receiptNumber, wo.id, woQty, `Auto-receipt from final production scan at ${station}`, req.user.id]
            );
            // Update WO quantities
            await pool.query('UPDATE work_orders SET qty_completed = quantity, quantity_completed = quantity WHERE id = ?', [wo.id]);
            // Add finished goods to inventory (items table + inventory_balances)
            if (wo.item_id) {
              await pool.query('UPDATE items SET qty_on_hand = qty_on_hand + ? WHERE id = ?', [woQty, wo.item_id]);
              // Sync inventory_balances (location-level tracking)
              const [existBal] = await pool.query('SELECT id FROM inventory_balances WHERE item_id = ? AND location_id = 1', [wo.item_id]);
              if (existBal.length > 0) {
                await pool.query('UPDATE inventory_balances SET quantity_on_hand = quantity_on_hand + ?, last_count_date = NOW() WHERE id = ?', [woQty, existBal[0].id]);
              } else {
                await pool.query('INSERT INTO inventory_balances (item_id, location_id, quantity_on_hand, last_count_date) VALUES (?, 1, ?, NOW())', [wo.item_id, woQty]);
              }
              // Log inventory transaction
              await pool.query(
                `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, to_location_id, reference_type, reference_id, reference_number, notes, created_by)
                 VALUES (?, 'wo_receipt', ?, 1, 'work_order', ?, ?, 'Auto-receipt from production scan', ?)`,
                [wo.item_id, woQty, wo.id, wo.order_number || wo.wo_number, req.user.id]
              );
              // --- GL POSTING: Debit Finished Goods, Credit WIP ---
              try {
                const GLService = require('../services/glService');
                await GLService.postWOReceipt({
                  workOrderId: wo.id, itemId: wo.item_id, quantity: woQty,
                  transactionDate: new Date(),
                  memo: `Auto WO Receipt ${receiptNumber} - ${wo.order_number || wo.wo_number}`,
                  postedBy: req.user.id
                });
              } catch (glErr) { console.error('[ScanIntegration] GL posting error:', glErr.message); }
            }
            // --- UPDATE SALES ORDER LINE STATUS if linked ---
            if (wo.sales_order_id) {
              try {
                await pool.query(
                  `UPDATE sales_order_lines SET production_status = 'complete' WHERE work_order_id = ?`,
                  [wo.id]
                );
              } catch (e) { /* ignore if column doesn't exist */ }
            }
          } catch (receiptErr) {
            console.error('[ScanIntegration] Auto-receipt error:', receiptErr.message);
          }
          // --- NOTIFICATION: WO Completed ---
          try {
            await pool.query(
              `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
               VALUES ('wo_completed', ?, 1, ?, NOW())`,
              [`Work Order ${wo.order_number || wo.wo_number} completed via scan at ${station}`,
               JSON.stringify({ wo_id: wo.id, wo_number: wo.order_number || wo.wo_number, station, receipt_number: receiptNumber, scanned_by: req.user.id })]
            );
          } catch (e) { /* ignore notification errors */ }
          // === BROADCAST: WO Completed ===
          if (global.wsBroadcast) {
            global.wsBroadcast('wo_completed', {
              wo: barcode, wo_id: wo.id, receipt_number: receiptNumber,
              station, user_id: req.user.id
            });
          }
        }
      }
      // Also log to shop_floor_tracking
      try {
        await pool.query(
          `INSERT INTO shop_floor_tracking (work_order_id, station, action, scanned_by, scanned_at)
           VALUES (?, ?, 'scan_complete', ?, NOW())`,
          [wo.id, station, req.user.id]);
      } catch (e) { /* ignore if shop_floor_tracking has different schema */ }
    }
    res.json({
      success: true, wo: barcode, station, status,
      routing_advanced: routingAdvanced,
      next_station: nextStation,
      wo_completed: woCompleted,
      receipt_number: receiptNumber,
      timestamp: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get production scan history for a WO
router.get('/scan/production/:woId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ps.*, u.username as scanned_by_name
      FROM production_scans ps
      LEFT JOIN users u ON ps.scanned_by = u.id
      WHERE ps.work_order_id = ?
      ORDER BY ps.scanned_at DESC`, [req.params.woId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scan location to see what's in it
router.post('/scan/location-inventory', authenticate, async (req, res) => {
  try {
    const { location_code } = req.body;
    const [locs] = await pool.query(`SELECT id, code as location_code, name, location_type FROM locations WHERE code = ?`, [location_code]);
    if (!locs.length) return res.status(404).json({ error: `Location not found: ${location_code}` });

    const [inventory] = await pool.query(`
      SELECT ib.*, i.item_number, i.description, i.glass_type, i.glass_thickness
      FROM inventory_balances ib
      JOIN items i ON ib.item_id = i.id
      WHERE ib.location_id = ? AND ib.quantity_on_hand > 0
      ORDER BY i.item_number`, [locs[0].id]);

    res.json({ location: locs[0], inventory });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// INTEGRATED SHIP SCAN - Updates quantity_shipped, inventory, GL, notifications
// ═══════════════════════════════════════════════════════════════════
// Scan to ship - verify item against sales order AND update shipped quantities
router.post('/scan/ship', authenticate, async (req, res) => {
  try {
    const { so_number, barcode, quantity = 1 } = req.body;
    const [sos] = await pool.query(`SELECT id, order_number, status FROM sales_orders WHERE order_number = ?`, [so_number]);
    if (!sos.length) return res.status(404).json({ error: `Sales order not found: ${so_number}` });
    const [items] = await pool.query(`SELECT id, item_number, description FROM items WHERE item_number = ?`, [barcode]);
    if (!items.length) return res.status(404).json({ error: `Item not found: ${barcode}` });
    // Verify item is on the SO
    const [soLines] = await pool.query(
      `SELECT id, quantity_ordered as quantity, COALESCE(quantity_shipped, 0) as shipped FROM sales_order_lines WHERE sales_order_id = ? AND item_id = ?`,
      [sos[0].id, items[0].id]
    );
    if (!soLines.length) return res.status(404).json({ error: `Item ${barcode} not on SO ${so_number}` });
    const remaining = soLines[0].quantity - soLines[0].shipped;
    const shipQty = Math.min(Number(quantity) || 1, remaining);
    if (remaining <= 0) {
      return res.json({ success: false, error: 'Already fully shipped', item: items[0].item_number, ordered: soLines[0].quantity, already_shipped: soLines[0].shipped, remaining: 0 });
    }
    // --- UPDATE QUANTITY SHIPPED on SO line ---
    await pool.query(
      `UPDATE sales_order_lines SET quantity_shipped = COALESCE(quantity_shipped, 0) + ? WHERE id = ?`,
      [shipQty, soLines[0].id]
    );
    // Update SO line status
    const newShipped = soLines[0].shipped + shipQty;
    if (newShipped >= soLines[0].quantity) {
      await pool.query(`UPDATE sales_order_lines SET status = 'complete' WHERE id = ?`, [soLines[0].id]);
    } else {
      await pool.query(`UPDATE sales_order_lines SET status = 'partial' WHERE id = ?`, [soLines[0].id]);
    }
    // --- DEDUCT FROM INVENTORY ---
    try {
      await pool.query('UPDATE items SET qty_on_hand = GREATEST(0, qty_on_hand - ?) WHERE id = ?', [shipQty, items[0].id]);
      // Deduct from default shipping location (location_id = 1)
      const [existBal] = await pool.query('SELECT id, quantity_on_hand FROM inventory_balances WHERE item_id = ? AND location_id = 1', [items[0].id]);
      if (existBal.length > 0) {
        await pool.query('UPDATE inventory_balances SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?) WHERE id = ?', [shipQty, existBal[0].id]);
      }
      // Log inventory transaction
      await pool.query(
        `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, from_location_id, reference_type, reference_id, reference_number, notes, created_by)
         VALUES (?, 'shipment', ?, 1, 'sales_order', ?, ?, 'Ship scan verification', ?)`,
        [items[0].id, shipQty, sos[0].id, so_number, req.user.id]
      );
    } catch (invErr) { console.error('[ShipScan] Inventory deduction error:', invErr.message); }
    // --- CHECK IF ALL SO LINES COMPLETE → Update SO status ---
    try {
      const [openLines] = await pool.query(
        `SELECT COUNT(*) as cnt FROM sales_order_lines WHERE sales_order_id = ? AND status != 'complete' AND status != 'cancelled'`,
        [sos[0].id]
      );
      if (openLines[0].cnt === 0) {
        await pool.query(`UPDATE sales_orders SET status = 'shipped' WHERE id = ? AND status NOT IN ('shipped','closed','cancelled')`, [sos[0].id]);
        // --- NOTIFICATION: SO Fully Shipped ---
        try {
          await pool.query(
            `INSERT INTO notification_log (notification_type, subject, item_count, details, sent_at)
             VALUES ('so_shipped', ?, 1, ?, NOW())`,
            [`Sales Order ${so_number} fully shipped`,
             JSON.stringify({ so_id: sos[0].id, so_number, scanned_by: req.user.id })]
          );
        } catch (e) { /* ignore */ }
        // === BROADCAST: SO Fully Shipped ===
        if (global.wsBroadcast) {
          global.wsBroadcast('so_shipped', { so_number, so_id: sos[0].id, user_id: req.user.id });
        }
      }
    } catch (e) { /* ignore */ }
    // === BROADCAST: Ship scan ===
    if (global.wsBroadcast) {
      global.wsBroadcast('ship_scan', {
        so_number, item: items[0].item_number, quantity: shipQty, user_id: req.user.id
      });
    }
    res.json({
      success: true,
      item: items[0].item_number,
      description: items[0].description,
      ordered: soLines[0].quantity,
      already_shipped: newShipped,
      remaining: soLines[0].quantity - newShipped,
      scan_qty: shipQty,
      verified: true
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
