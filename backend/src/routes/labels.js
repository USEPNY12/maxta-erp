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
      const [rows] = await pool.query(`SELECT id, wo_number, order_number, status, item_id FROM work_orders WHERE wo_number = ? OR order_number = ?`, [code, code]);
      if (rows.length) return res.json({ type: 'work_order', record: rows[0] });
    }
    // Sales Order
    if (code.match(/^SO-/i)) {
      const [rows] = await pool.query(`SELECT id, order_number, status FROM sales_orders WHERE order_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'sales_order', record: rows[0] });
    }
    // Purchase Order
    if (code.match(/^PO-/i)) {
      const [rows] = await pool.query(`SELECT id, po_number, status FROM purchase_orders WHERE po_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'purchase_order', record: rows[0] });
    }
    // Serial Number
    if (code.match(/^MTA-/i)) {
      const [rows] = await pool.query(`SELECT * FROM serial_numbers WHERE serial_number = ?`, [code]);
      if (rows.length) return res.json({ type: 'serial_number', record: rows[0] });
    }
    // Location
    const [locs] = await pool.query(`SELECT id, code as location_code, name, location_type FROM locations WHERE code = ?`, [code]);
    if (locs.length) return res.json({ type: 'location', record: locs[0] });
    // Item
    const [items] = await pool.query(`SELECT id, item_number, description, uom FROM items WHERE item_number = ?`, [code]);
    if (items.length) return res.json({ type: 'item', record: items[0] });
    // Lot
    const [lots] = await pool.query(`SELECT * FROM lots WHERE lot_number = ?`, [code]);
    if (lots.length) return res.json({ type: 'lot', record: lots[0] });
    // Shipment
    const [ships] = await pool.query(`SELECT id, shipment_number, status FROM shipments WHERE shipment_number = ?`, [code]);
    if (ships.length) return res.json({ type: 'shipment', record: ships[0] });

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
      `SELECT id, quantity as ordered, COALESCE(quantity_received, 0) as received FROM po_lines WHERE purchase_order_id = ? AND item_id = ?`,
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

    res.json({ success: true, item: barcode, quantity, po: po_number, remaining: remaining - quantity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scan production tracking - log piece at a station
router.post('/scan/production', authenticate, async (req, res) => {
  try {
    const { barcode, station, status = 'completed', notes } = req.body;

    const [wos] = await pool.query(`SELECT id, wo_number, order_number, status as wo_status FROM work_orders WHERE wo_number = ? OR order_number = ?`, [barcode, barcode]);
    if (!wos.length) return res.status(404).json({ error: `Work order not found: ${barcode}` });

    await pool.query(
      `INSERT INTO production_scans (work_order_id, station, status, notes, scanned_by, scanned_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [wos[0].id, station, status, notes || null, req.user.id]
    );

    res.json({ success: true, wo: barcode, station, status, timestamp: new Date().toISOString() });
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

// Scan to ship - verify item against sales order
router.post('/scan/ship', authenticate, async (req, res) => {
  try {
    const { so_number, barcode, quantity } = req.body;

    const [sos] = await pool.query(`SELECT id, order_number FROM sales_orders WHERE order_number = ?`, [so_number]);
    if (!sos.length) return res.status(404).json({ error: `Sales order not found: ${so_number}` });

    const [items] = await pool.query(`SELECT id, item_number, description FROM items WHERE item_number = ?`, [barcode]);
    if (!items.length) return res.status(404).json({ error: `Item not found: ${barcode}` });

    // Verify item is on the SO
    const [soLines] = await pool.query(
      `SELECT id, quantity, COALESCE(quantity_shipped, 0) as shipped FROM sales_order_lines WHERE sales_order_id = ? AND item_id = ?`,
      [sos[0].id, items[0].id]
    );
    if (!soLines.length) return res.status(404).json({ error: `Item ${barcode} not on SO ${so_number}` });

    const remaining = soLines[0].quantity - soLines[0].shipped;

    res.json({
      success: true,
      item: items[0].item_number,
      description: items[0].description,
      ordered: soLines[0].quantity,
      already_shipped: soLines[0].shipped,
      remaining,
      scan_qty: quantity,
      verified: quantity <= remaining
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
