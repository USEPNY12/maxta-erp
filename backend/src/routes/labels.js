const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============ PRODUCT LABELS (Post-Manufacturing) ============
router.get('/product/:work_order_id', authenticate, async (req, res) => {
  try {
    const [wo] = await pool.query(`
      SELECT wo.*, i.item_number, i.description, i.glass_type, i.glass_thickness, i.edge_type,
        so.order_number as sales_order_number, c.company_name as customer_name
      FROM work_orders wo 
      JOIN items i ON wo.item_id = i.id 
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      LEFT JOIN customers c ON wo.customer_id = c.id
      WHERE wo.id = ?`, [req.params.work_order_id]);
    if (wo.length === 0) return res.status(404).json({ error: 'Work order not found' });

    const labelData = {
      type: 'product',
      wo_number: wo[0].wo_number,
      item_number: wo[0].item_number,
      description: wo[0].description,
      glass_type: wo[0].glass_type,
      thickness: wo[0].glass_thickness,
      edge_type: wo[0].edge_type,
      width: wo[0].width,
      height: wo[0].height,
      quantity: wo[0].quantity,
      customer: wo[0].customer_name,
      sales_order: wo[0].sales_order_number,
      lot_number: wo[0].lot_number,
      serial_number: wo[0].serial_number,
      barcode: wo[0].wo_number,
      date_completed: new Date().toISOString().split('T')[0]
    };
    res.json(labelData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ STATION/ROUTING LABELS ============
router.get('/station/:wo_routing_id', authenticate, async (req, res) => {
  try {
    const [routing] = await pool.query(`
      SELECT wor.*, wo.wo_number, wc.name as work_center_name, wc.department,
        i.item_number, i.description
      FROM wo_routing wor 
      JOIN work_orders wo ON wor.work_order_id = wo.id
      JOIN work_centers wc ON wor.work_center_id = wc.id
      JOIN items i ON wo.item_id = i.id
      WHERE wor.id = ?`, [req.params.wo_routing_id]);
    if (routing.length === 0) return res.status(404).json({ error: 'Routing step not found' });

    const labelData = {
      type: 'station_complete',
      wo_number: routing[0].wo_number,
      item_number: routing[0].item_number,
      description: routing[0].description,
      station_completed: routing[0].work_center_name,
      department: routing[0].department,
      operation_seq: routing[0].sequence,
      completed_by: req.user.first_name + ' ' + req.user.last_name,
      completed_date: new Date().toISOString().split('T')[0],
      completed_time: new Date().toTimeString().split(' ')[0],
      barcode: `${routing[0].wo_number}-${routing[0].sequence}`,
      next_station: null // Will be filled by frontend
    };

    // Get next station
    const [nextStep] = await pool.query(`
      SELECT wc.name FROM wo_routing wor JOIN work_centers wc ON wor.work_center_id = wc.id
      WHERE wor.work_order_id = ? AND wor.sequence > ? ORDER BY wor.sequence LIMIT 1`,
      [routing[0].work_order_id, routing[0].sequence]);
    if (nextStep.length > 0) labelData.next_station = nextStep[0].name;

    res.json(labelData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ SHIPPING LABELS ============
router.get('/shipping/:shipment_id', authenticate, async (req, res) => {
  try {
    const [shipment] = await pool.query(`
      SELECT s.*, so.order_number, c.company_name, c.address1, c.address2, c.city, c.state, c.zip, c.phone
      FROM shipments s 
      JOIN sales_orders so ON s.sales_order_id = so.id
      JOIN customers c ON so.customer_id = c.id
      WHERE s.id = ?`, [req.params.shipment_id]);
    if (shipment.length === 0) return res.status(404).json({ error: 'Shipment not found' });

    const labelData = {
      type: 'shipping',
      shipment_number: shipment[0].shipment_number,
      sales_order: shipment[0].order_number,
      ship_to: {
        company: shipment[0].ship_to_company || shipment[0].company_name,
        address1: shipment[0].ship_to_address1 || shipment[0].address1,
        address2: shipment[0].ship_to_address2 || shipment[0].address2,
        city: shipment[0].ship_to_city || shipment[0].city,
        state: shipment[0].ship_to_state || shipment[0].state,
        zip: shipment[0].ship_to_zip || shipment[0].zip
      },
      ship_from: { company: 'Max TA Group LLC', address1: '', city: '', state: '', zip: '' },
      carrier: shipment[0].carrier,
      tracking_number: shipment[0].tracking_number,
      weight: shipment[0].total_weight,
      packages: shipment[0].package_count,
      ship_date: shipment[0].ship_date,
      barcode: shipment[0].shipment_number
    };
    res.json(labelData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ INVENTORY RECEIPT LABELS ============
router.get('/receipt/:receipt_id', authenticate, async (req, res) => {
  try {
    const [receipt] = await pool.query(`
      SELECT prl.*, pr.receipt_number, i.item_number, i.description, po.po_number, v.company_name as vendor_name
      FROM po_receipt_lines prl
      JOIN po_receipts pr ON prl.po_receipt_id = pr.id
      JOIN items i ON prl.item_id = i.id
      JOIN purchase_orders po ON pr.purchase_order_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      WHERE pr.id = ?`, [req.params.receipt_id]);

    const labels = receipt.map(r => ({
      type: 'inventory_receipt',
      receipt_number: r.receipt_number,
      po_number: r.po_number,
      vendor: r.vendor_name,
      item_number: r.item_number,
      description: r.description,
      quantity: r.quantity_received,
      lot_number: r.lot_number,
      serial_number: r.serial_number,
      received_date: new Date().toISOString().split('T')[0],
      barcode: r.lot_number || r.item_number
    }));
    res.json(labels);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
