const PDFDocument = require('pdfkit');
const pool = require('../config/database');

/**
 * PDF Service for generating printable documents
 * Generates: Quotes, Order Confirmations, Packing Lists, Invoices, POs, Credit Memos
 */

class PDFService {
  constructor() {
    this.companyName = 'Max TA Group LLC';
    this.companyAddress = '';
    this.companyPhone = '';
  }

  async getCompanyInfo() {
    try {
      const [info] = await pool.query("SELECT * FROM company_settings LIMIT 1");
      if (info.length) {
        this.companyName = info[0].company_name || this.companyName;
        this.companyAddress = `${info[0].address1 || ''} ${info[0].city || ''}, ${info[0].state || ''} ${info[0].zip || ''}`.trim();
        this.companyPhone = info[0].phone || '';
      }
    } catch (e) { /* use defaults */ }
  }

  addHeader(doc, title, docNumber) {
    doc.fontSize(20).font('Helvetica-Bold').text(this.companyName, 50, 50);
    doc.fontSize(9).font('Helvetica').text(this.companyAddress, 50, 75);
    if (this.companyPhone) doc.text(`Phone: ${this.companyPhone}`, 50, 87);
    
    doc.fontSize(16).font('Helvetica-Bold').text(title, 350, 50, { align: 'right' });
    doc.fontSize(11).font('Helvetica').text(`#${docNumber}`, 350, 72, { align: 'right' });
    
    doc.moveTo(50, 105).lineTo(560, 105).stroke();
    return 120;
  }

  addInfoBlock(doc, y, leftInfo, rightInfo) {
    doc.fontSize(9).font('Helvetica');
    let ly = y;
    leftInfo.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label + ':', 50, ly, { continued: true });
      doc.font('Helvetica').text(' ' + (value || 'N/A'), { continued: false });
      ly += 14;
    });
    let ry = y;
    rightInfo.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label + ':', 350, ry, { continued: true });
      doc.font('Helvetica').text(' ' + (value || 'N/A'), { continued: false });
      ry += 14;
    });
    return Math.max(ly, ry) + 10;
  }

  addTable(doc, y, headers, rows, colWidths) {
    const startX = 50;
    const rowHeight = 18;
    
    // Header
    doc.rect(startX, y, 510, rowHeight).fill('#f0f0f0');
    doc.fill('#000').fontSize(8).font('Helvetica-Bold');
    let x = startX + 5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5, { width: colWidths[i] - 10, align: i >= headers.length - 2 ? 'right' : 'left' });
      x += colWidths[i];
    });
    y += rowHeight;

    // Rows
    doc.font('Helvetica').fontSize(8);
    rows.forEach(row => {
      if (y > 700) { doc.addPage(); y = 50; }
      x = startX + 5;
      row.forEach((cell, i) => {
        doc.text(String(cell || ''), x, y + 4, { width: colWidths[i] - 10, align: i >= headers.length - 2 ? 'right' : 'left' });
        x += colWidths[i];
      });
      doc.moveTo(startX, y + rowHeight - 1).lineTo(startX + 510, y + rowHeight - 1).stroke('#eee');
      y += rowHeight;
    });
    return y + 5;
  }

  addTotals(doc, y, totals) {
    doc.fontSize(10);
    totals.forEach(([label, value, bold]) => {
      if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.text(label, 350, y, { width: 120, align: 'right' });
      doc.text(value, 475, y, { width: 85, align: 'right' });
      y += 16;
    });
    return y;
  }

  // Generate Invoice PDF
  async generateInvoice(invoiceId) {
    await this.getCompanyInfo();
    const [invoices] = await pool.query(
      `SELECT i.*, c.company_name, c.bill_address1, c.bill_city, c.bill_state, c.bill_zip
       FROM ar_invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`, [invoiceId]
    );
    if (!invoices.length) throw new Error('Invoice not found');
    const inv = invoices[0];

    const [lines] = await pool.query(`SELECT * FROM ar_invoice_lines WHERE invoice_id = ?`, [invoiceId]);

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const buffers = [];
    doc.on('data', d => buffers.push(d));

    let y = this.addHeader(doc, 'INVOICE', inv.invoice_number);
    y = this.addInfoBlock(doc, y,
      [['Bill To', inv.company_name], ['Address', inv.bill_address1 || ''], ['City/State', `${inv.bill_city || ''}, ${inv.bill_state || ''} ${inv.bill_zip || ''}`]],
      [['Invoice Date', new Date(inv.invoice_date).toLocaleDateString()], ['Due Date', new Date(inv.due_date).toLocaleDateString()], ['Terms', inv.payment_terms || 'Net 30'], ['Status', inv.status]]
    );

    y = this.addTable(doc, y,
      ['Item', 'Description', 'Qty', 'Unit Price', 'Amount'],
      lines.map(l => [l.item_number || '', l.description || '', l.quantity, `$${parseFloat(l.unit_price || 0).toFixed(2)}`, `$${parseFloat(l.line_total || 0).toFixed(2)}`]),
      [80, 200, 50, 80, 100]
    );

    y = this.addTotals(doc, y, [
      ['Subtotal:', `$${parseFloat(inv.subtotal || 0).toFixed(2)}`, false],
      ['Tax:', `$${parseFloat(inv.tax_amount || 0).toFixed(2)}`, false],
      ['Total:', `$${parseFloat(inv.total_amount || 0).toFixed(2)}`, true],
      ['Amount Paid:', `$${parseFloat(inv.amount_paid || 0).toFixed(2)}`, false],
      ['Balance Due:', `$${parseFloat((inv.total_amount || 0) - (inv.amount_paid || 0)).toFixed(2)}`, true]
    ]);

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
  }

  // Generate Purchase Order PDF
  async generatePurchaseOrder(poId) {
    await this.getCompanyInfo();
    const [pos] = await pool.query(
      `SELECT po.*, v.company_name as vendor_name, v.address1, v.city, v.state, v.zip
       FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ?`, [poId]
    );
    if (!pos.length) throw new Error('PO not found');
    const po = pos[0];

    const [lines] = await pool.query(
      `SELECT pol.*, i.item_number, i.description
       FROM po_lines pol LEFT JOIN items i ON pol.item_id = i.id WHERE pol.purchase_order_id = ?`, [poId]
    );

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const buffers = [];
    doc.on('data', d => buffers.push(d));

    let y = this.addHeader(doc, 'PURCHASE ORDER', po.po_number);
    y = this.addInfoBlock(doc, y,
      [['Vendor', po.vendor_name], ['Address', po.address1 || ''], ['City/State', `${po.city || ''}, ${po.state || ''} ${po.zip || ''}`]],
      [['PO Date', new Date(po.order_date || po.created_at).toLocaleDateString()], ['Required Date', po.required_date ? new Date(po.required_date).toLocaleDateString() : 'ASAP'], ['Terms', po.payment_terms || 'Net 30'], ['Status', po.status]]
    );

    y = this.addTable(doc, y,
      ['Item #', 'Description', 'Qty', 'Unit Cost', 'Amount'],
      lines.map(l => [l.item_number || '', l.description || '', l.quantity_ordered || l.quantity, `$${parseFloat(l.unit_cost || l.unit_price || 0).toFixed(2)}`, `$${parseFloat(l.line_total || 0).toFixed(2)}`]),
      [80, 200, 50, 80, 100]
    );

    y = this.addTotals(doc, y, [
      ['PO Total:', `$${parseFloat(po.total_amount || 0).toFixed(2)}`, true]
    ]);

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
  }

  // Generate Packing List PDF
  async generatePackingList(shipmentId) {
    await this.getCompanyInfo();
    const [shipments] = await pool.query(
      `SELECT s.*, so.order_number, c.company_name, c.ship_address1, c.ship_city, c.ship_state, c.ship_zip
       FROM shipments s 
       JOIN sales_orders so ON s.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       WHERE s.id = ?`, [shipmentId]
    );
    if (!shipments.length) throw new Error('Shipment not found');
    const ship = shipments[0];

    const [lines] = await pool.query(
      `SELECT sl.*, i.item_number, i.description
       FROM shipment_lines sl LEFT JOIN items i ON sl.item_id = i.id WHERE sl.shipment_id = ?`, [shipmentId]
    );

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const buffers = [];
    doc.on('data', d => buffers.push(d));

    let y = this.addHeader(doc, 'PACKING LIST', ship.shipment_number || `SHP-${shipmentId}`);
    y = this.addInfoBlock(doc, y,
      [['Ship To', ship.company_name], ['Address', ship.ship_address1 || ''], ['City/State', `${ship.ship_city || ''}, ${ship.ship_state || ''} ${ship.ship_zip || ''}`]],
      [['Order #', ship.order_number], ['Ship Date', new Date(ship.ship_date || ship.created_at).toLocaleDateString()], ['Carrier', ship.carrier || 'N/A'], ['Tracking', ship.tracking_number || 'N/A']]
    );

    y = this.addTable(doc, y,
      ['Item #', 'Description', 'Qty Ordered', 'Qty Shipped'],
      lines.map(l => [l.item_number || '', l.description || '', l.quantity_ordered || '', l.quantity_shipped || l.quantity]),
      [100, 230, 90, 90]
    );

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
  }
}

module.exports = new PDFService();
