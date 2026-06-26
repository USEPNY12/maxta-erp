const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const pool = require('../config/database');

/**
 * Template Service - Handlebars + Puppeteer based document generation
 * Replaces the old PDFKit-based approach with beautiful HTML templates
 */
class TemplateService {
  constructor() {
    this.browser = null;
    this.companyInfo = null;
    this.registerHelpers();
  }

  // Register Handlebars helpers for formatting
  registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (value) => {
      const num = parseFloat(value || 0);
      return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });

    Handlebars.registerHelper('formatDate', (value) => {
      if (!value) return 'N/A';
      return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    });

    Handlebars.registerHelper('formatDateShort', (value) => {
      if (!value) return 'N/A';
      return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    });

    Handlebars.registerHelper('uppercase', (str) => (str || '').toUpperCase());

    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('multiply', (a, b) => {
      return parseFloat(a || 0) * parseFloat(b || 0);
    });

    Handlebars.registerHelper('add', (a, b) => parseFloat(a || 0) + parseFloat(b || 0));

    Handlebars.registerHelper('subtract', (a, b) => parseFloat(a || 0) - parseFloat(b || 0));

    Handlebars.registerHelper('inc', (value) => parseInt(value) + 1);

    Handlebars.registerHelper('or', (a, b) => a || b);

    Handlebars.registerHelper('today', () => {
      return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    });
  }

  // Get or launch Puppeteer browser
  async getBrowser() {
    try {
      if (this.browser && typeof this.browser.isConnected === 'function' && this.browser.isConnected()) {
        return this.browser;
      }
    } catch (e) {
      // browser in bad state, re-launch
    }
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath: undefined // Use puppeteer's bundled chromium
    });
    return this.browser;
  }

  // Get company info from database
  async getCompanyInfo() {
    if (this.companyInfo) return this.companyInfo;
    try {
      const [info] = await pool.query("SELECT * FROM company_settings LIMIT 1");
      if (info.length) {
        this.companyInfo = {
          name: info[0].company_name || 'Max TA Group LLC',
          address: info[0].address1 || '115 East High St EXT',
          city: info[0].city || 'Sharpsville',
          state: info[0].state || 'PA',
          zip: info[0].zip || '16150',
          phone: info[0].phone || '724-979-1834',
          email: info[0].email || '',
          website: info[0].website || 'www.maxtagroup.com',
          logo_url: info[0].logo_url || ''
        };
      } else {
        this.companyInfo = {
          name: 'Max TA Group LLC',
          address: '115 East High St EXT',
          city: 'Sharpsville',
          state: 'PA',
          zip: '16150',
          phone: '724-979-1834',
          email: '',
          website: 'www.maxtagroup.com',
          logo_url: ''
        };
      }
    } catch (e) {
      this.companyInfo = { name: 'Max TA Group LLC', address: '115 East High St EXT', city: 'Sharpsville', state: 'PA', zip: '16150', phone: '724-979-1834', email: '', website: '', logo_url: '' };
    }
    return this.companyInfo;
  }

  // Load template - first check DB, then fall back to file system
  async getTemplate(documentType) {
    try {
      // Check if there's a custom template in the database
      const [templates] = await pool.query(
        "SELECT * FROM document_templates WHERE document_type = ? AND is_active = 1 LIMIT 1",
        [documentType]
      );
      if (templates.length && templates[0].pdf_template) {
        return templates[0].pdf_template;
      }
    } catch (e) {
      // Table might not exist yet, fall through to file-based templates
    }

    // Fall back to file-based template
    const templateMap = {
      'purchase_order': 'purchasing/purchase-order.hbs',
      'quote': 'sales/quote.hbs',
      'sales_order': 'sales/sales-order.hbs',
      'ar_invoice': 'sales/invoice.hbs',
      'packing_slip': 'sales/packing-slip.hbs',
      'work_order': 'manufacturing/work-order.hbs',
      'receiving_report': 'purchasing/receiving-report.hbs',
      'payment_receipt': 'sales/payment-receipt.hbs',
      'statement': 'sales/statement.hbs',
      'remittance': 'purchasing/remittance.hbs'
    };

    const templateFile = templateMap[documentType];
    if (!templateFile) throw new Error(`No template found for document type: ${documentType}`);

    const templatePath = path.join(__dirname, '..', 'templates', templateFile);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  }

  // Get email template
  async getEmailTemplate(documentType) {
    try {
      const [templates] = await pool.query(
        "SELECT * FROM document_templates WHERE document_type = ? AND is_active = 1 LIMIT 1",
        [documentType]
      );
      if (templates.length) {
        return {
          subject: templates[0].subject_template || '',
          body: templates[0].body_template || ''
        };
      }
    } catch (e) { /* fall through */ }

    // Default email templates
    const defaults = {
      'purchase_order': {
        subject: 'Purchase Order {{po_number}} - {{company.name}}',
        body: `<p>Dear {{vendor_name}},</p>
<p>Please find attached Purchase Order <strong>{{po_number}}</strong>.</p>
<p>Kindly confirm receipt and expected delivery date at your earliest convenience.</p>
<p>Thank you,<br>{{company.name}}<br>{{company.phone}}</p>`
      },
      'quote': {
        subject: 'Quote {{quote_number}} - {{company.name}}',
        body: `<p>Dear {{customer_name}},</p>
<p>Thank you for your inquiry. Please find attached our Quote <strong>{{quote_number}}</strong>.</p>
<p>This quote is valid for 30 days. Please don't hesitate to contact us with any questions.</p>
<p>Best regards,<br>{{company.name}}<br>{{company.phone}}</p>`
      },
      'ar_invoice': {
        subject: 'Invoice {{invoice_number}} - {{company.name}}',
        body: `<p>Dear {{customer_name}},</p>
<p>Please find attached Invoice <strong>{{invoice_number}}</strong> for your recent order.</p>
<p>Payment is due by {{due_date}}. Please reference the invoice number with your payment.</p>
<p>Thank you for your business,<br>{{company.name}}<br>{{company.phone}}</p>`
      },
      'sales_order': {
        subject: 'Order Confirmation {{order_number}} - {{company.name}}',
        body: `<p>Dear {{customer_name}},</p>
<p>This confirms your order <strong>{{order_number}}</strong> has been received and is being processed.</p>
<p>We will notify you when your order ships.</p>
<p>Thank you,<br>{{company.name}}<br>{{company.phone}}</p>`
      },
      'packing_slip': {
        subject: 'Shipment Notification - Order {{order_number}} - {{company.name}}',
        body: `<p>Dear {{customer_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has been shipped.</p>
<p>Tracking: {{tracking_number}}<br>Carrier: {{carrier}}</p>
<p>Thank you,<br>{{company.name}}</p>`
      }
    };

    return defaults[documentType] || { subject: 'Document from {{company.name}}', body: '<p>Please find the attached document.</p>' };
  }

  // Compile template with data
  compileTemplate(templateHtml, data) {
    const template = Handlebars.compile(templateHtml);
    return template(data);
  }

  // Generate PDF from HTML
  async generatePdf(html, options = {}) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: options.format || 'Letter',
      printBackground: true,
      margin: {
        top: options.marginTop || '0.4in',
        bottom: options.marginBottom || '0.4in',
        left: options.marginLeft || '0.4in',
        right: options.marginRight || '0.4in'
      }
    });

    await page.close();
    return pdfBuffer;
  }

  // Main method: Generate a document PDF
  async generateDocument(documentType, documentId) {
    const company = await this.getCompanyInfo();
    const data = await this.getDocumentData(documentType, documentId);
    data.company = company;

    const templateHtml = await this.getTemplate(documentType);
    const renderedHtml = this.compileTemplate(templateHtml, data);
    const pdfBuffer = await this.generatePdf(renderedHtml);

    return pdfBuffer;
  }

  // Generate HTML preview (for frontend display)
  async generatePreview(documentType, documentId) {
    const company = await this.getCompanyInfo();
    const data = await this.getDocumentData(documentType, documentId);
    data.company = company;

    const templateHtml = await this.getTemplate(documentType);
    return this.compileTemplate(templateHtml, data);
  }

  // Compile email subject and body with data
  async compileEmail(documentType, documentId) {
    const company = await this.getCompanyInfo();
    const data = await this.getDocumentData(documentType, documentId);
    data.company = company;

    const emailTemplate = await this.getEmailTemplate(documentType);
    const subject = this.compileTemplate(emailTemplate.subject, data);
    const body = this.compileTemplate(emailTemplate.body, data);
    return { subject, body, data };
  }

  // Fetch document data based on type
  async getDocumentData(documentType, documentId) {
    switch (documentType) {
      case 'purchase_order': return this.getPurchaseOrderData(documentId);
      case 'quote': return this.getQuoteData(documentId);
      case 'sales_order': return this.getSalesOrderData(documentId);
      case 'ar_invoice': return this.getInvoiceData(documentId);
      case 'packing_slip': return this.getPackingSlipData(documentId);
      case 'work_order': return this.getWorkOrderData(documentId);
      case 'receiving_report': return this.getReceivingReportData(documentId);
      default: throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  // === DATA FETCHERS ===

  async getPurchaseOrderData(poId) {
    const [pos] = await pool.query(
      `SELECT po.*, v.company_name as vendor_name, v.contact_name as vendor_contact,
              v.email as vendor_email, v.phone as vendor_phone,
              v.address1 as vendor_address, v.city as vendor_city, 
              v.state as vendor_state, v.zip as vendor_zip
       FROM purchase_orders po 
       JOIN vendors v ON po.vendor_id = v.id 
       WHERE po.id = ?`, [poId]
    );
    if (!pos.length) throw new Error('Purchase Order not found');
    const po = pos[0];

    const [lines] = await pool.query(
      `SELECT pol.*, i.item_number, i.description as item_description
       FROM po_lines pol 
       LEFT JOIN items i ON pol.item_id = i.id 
       WHERE pol.purchase_order_id = ?
       ORDER BY pol.id`, [poId]
    );

    return {
      ...po,
      po_number: po.po_number,
      order_date: po.order_date || po.created_at,
      required_date: po.required_date,
      payment_terms: po.payment_terms || 'Net 30',
      ship_to: po.ship_to || '',
      notes: po.notes || '',
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        vendor_item_number: l.vendor_item_number || '',
        description: l.description || l.item_description || '',
        glass_type: l.glass_type || '',
        thickness: l.thickness || '',
        width: l.width || '',
        height: l.height || '',
        quantity: l.quantity_ordered || l.quantity || 0,
        unit_cost: parseFloat(l.unit_cost || l.unit_price || 0),
        line_total: parseFloat(l.line_total || (l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0) || 0)
      })),
      subtotal: parseFloat(po.subtotal || 0) || lines.reduce((sum, l) => sum + parseFloat(l.line_total || (l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0) || 0), 0),
      tax: parseFloat(po.tax_amount || 0),
      freight: parseFloat(po.freight_amount || 0),
      total: parseFloat(po.total || 0) || lines.reduce((sum, l) => sum + parseFloat(l.line_total || (l.quantity_ordered || l.quantity || 0) * (l.unit_cost || l.unit_price || 0) || 0), 0)
    };
  }

  async getQuoteData(quoteId) {
    const [quotes] = await pool.query(
      `SELECT q.*, c.company_name as customer_name, c.contact_name as customer_contact,
              c.email as customer_email, c.phone as customer_phone,
              c.bill_address1 as customer_address, c.bill_city as customer_city,
              c.bill_state as customer_state, c.bill_zip as customer_zip
       FROM quotes q 
       JOIN customers c ON q.customer_id = c.id 
       WHERE q.id = ?`, [quoteId]
    );
    if (!quotes.length) throw new Error('Quote not found');
    const quote = quotes[0];

    const [lines] = await pool.query(
      `SELECT ql.*, i.item_number, i.description as item_description
       FROM quote_lines ql 
       LEFT JOIN items i ON ql.item_id = i.id 
       WHERE ql.quote_id = ?
       ORDER BY ql.id`, [quoteId]
    );

    return {
      ...quote,
      quote_number: quote.quote_number,
      quote_date: quote.quote_date || quote.created_at,
      valid_until: quote.valid_until,
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        description: l.description || l.item_description || '',
        glass_type: l.glass_type || '',
        thickness: l.thickness || '',
        width: l.width || '',
        height: l.height || '',
        edge_type: l.edge_type || '',
        quantity: l.quantity || 0,
        unit_price: parseFloat(l.unit_price || 0),
        line_total: parseFloat(l.line_total || (l.quantity * l.unit_price) || 0)
      })),
      subtotal: parseFloat(quote.subtotal || quote.total_amount || 0),
      tax: parseFloat(quote.tax_amount || 0),
      total: parseFloat(quote.total_amount || 0)
    };
  }

  async getSalesOrderData(orderId) {
    const [orders] = await pool.query(
      `SELECT so.*, c.company_name as customer_name, c.contact_name as customer_contact,
              c.email as customer_email, c.phone as customer_phone,
              c.bill_address1 as customer_address, c.bill_city as customer_city,
              c.bill_state as customer_state, c.bill_zip as customer_zip,
              c.ship_address1 as ship_address, c.ship_city, c.ship_state, c.ship_zip
       FROM sales_orders so 
       JOIN customers c ON so.customer_id = c.id 
       WHERE so.id = ?`, [orderId]
    );
    if (!orders.length) throw new Error('Sales Order not found');
    const order = orders[0];

    const [lines] = await pool.query(
      `SELECT sol.*, i.item_number, i.description as item_description
       FROM sales_order_lines sol 
       LEFT JOIN items i ON sol.item_id = i.id 
       WHERE sol.sales_order_id = ?
       ORDER BY sol.id`, [orderId]
    );

    return {
      ...order,
      order_number: order.order_number,
      order_date: order.order_date || order.created_at,
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        description: l.description || l.item_description || '',
        glass_type: l.glass_type || '',
        thickness: l.thickness || '',
        width: l.width || '',
        height: l.height || '',
        quantity: l.quantity || 0,
        unit_price: parseFloat(l.unit_price || 0),
        line_total: parseFloat(l.line_total || (l.quantity * l.unit_price) || 0)
      })),
      subtotal: parseFloat(order.subtotal || order.total_amount || 0),
      tax: parseFloat(order.tax_amount || 0),
      total: parseFloat(order.total_amount || 0)
    };
  }

  async getInvoiceData(invoiceId) {
    const [invoices] = await pool.query(
      `SELECT i.*, c.company_name as customer_name, c.contact_name as customer_contact,
              c.email as customer_email, c.phone as customer_phone,
              c.bill_address1 as customer_address, c.bill_city as customer_city,
              c.bill_state as customer_state, c.bill_zip as customer_zip
       FROM ar_invoices i 
       JOIN customers c ON i.customer_id = c.id 
       WHERE i.id = ?`, [invoiceId]
    );
    if (!invoices.length) throw new Error('Invoice not found');
    const inv = invoices[0];

    const [lines] = await pool.query(
      `SELECT il.*, i.item_number, i.description as item_description
       FROM ar_invoice_lines il 
       LEFT JOIN items i ON il.item_id = i.id 
       WHERE il.invoice_id = ?
       ORDER BY il.id`, [invoiceId]
    );

    return {
      ...inv,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date || inv.created_at,
      due_date: inv.due_date,
      payment_terms: inv.payment_terms || 'Net 30',
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        description: l.description || l.item_description || '',
        quantity: l.quantity || 0,
        unit_price: parseFloat(l.unit_price || 0),
        line_total: parseFloat(l.line_total || (l.quantity * l.unit_price) || 0)
      })),
      subtotal: parseFloat(inv.subtotal || inv.total || 0),
      tax: parseFloat(inv.tax_amount || 0),
      total: parseFloat(inv.total || inv.total_amount || 0),
      amount_paid: parseFloat(inv.amount_paid || 0),
      balance_due: parseFloat((inv.total || inv.total_amount || 0) - (inv.amount_paid || 0))
    };
  }

  async getPackingSlipData(shipmentId) {
    const [shipments] = await pool.query(
      `SELECT s.*, so.order_number, c.company_name as customer_name, 
              c.ship_address1 as ship_address, c.ship_city, c.ship_state, c.ship_zip,
              c.contact_name as customer_contact, c.phone as customer_phone
       FROM shipments s 
       JOIN sales_orders so ON s.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       WHERE s.id = ?`, [shipmentId]
    );
    if (!shipments.length) throw new Error('Shipment not found');
    const ship = shipments[0];

    const [lines] = await pool.query(
      `SELECT sl.*, i.item_number, i.description as item_description
       FROM shipment_lines sl 
       LEFT JOIN items i ON sl.item_id = i.id 
       WHERE sl.shipment_id = ?
       ORDER BY sl.id`, [shipmentId]
    );

    return {
      ...ship,
      shipment_number: ship.shipment_number || `SHP-${shipmentId}`,
      order_number: ship.order_number,
      ship_date: ship.ship_date || ship.created_at,
      carrier: ship.carrier || 'N/A',
      tracking_number: ship.tracking_number || '',
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        description: l.description || l.item_description || '',
        quantity_ordered: l.quantity_ordered || '',
        quantity_shipped: l.quantity_shipped || l.quantity || 0
      }))
    };
  }

  async getWorkOrderData(woId) {
    const [wos] = await pool.query(
      `SELECT wo.*, i.item_number, i.description as item_description,
              so.order_number
       FROM work_orders wo 
       LEFT JOIN items i ON wo.item_id = i.id
       LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
       WHERE wo.id = ?`, [woId]
    );
    if (!wos.length) throw new Error('Work Order not found');
    const wo = wos[0];

    // Get routing steps
    const [routing] = await pool.query(
      `SELECT * FROM work_order_operations WHERE work_order_id = ? ORDER BY sequence`, [woId]
    );

    // Get materials
    const [materials] = await pool.query(
      `SELECT wom.*, i.item_number, i.description as item_description
       FROM work_order_materials wom
       LEFT JOIN items i ON wom.item_id = i.id
       WHERE wom.work_order_id = ?`, [woId]
    );

    return {
      ...wo,
      wo_number: wo.wo_number,
      item_number: wo.item_number || '',
      item_description: wo.item_description || wo.description || '',
      order_number: wo.order_number || '',
      start_date: wo.start_date || wo.scheduled_start,
      due_date: wo.due_date || wo.scheduled_end,
      quantity: wo.quantity || 0,
      glass_type: wo.glass_type || '',
      thickness: wo.thickness || '',
      width: wo.width || '',
      height: wo.height || '',
      edge_type: wo.edge_type || '',
      routing: routing.map((r, i) => ({
        step: i + 1,
        operation: r.operation_name || r.operation || '',
        work_center: r.work_center_name || r.work_center || '',
        setup_time: r.setup_time || '',
        run_time: r.run_time || '',
        status: r.status || 'pending'
      })),
      materials: materials.map(m => ({
        item_number: m.item_number || '',
        description: m.description || m.item_description || '',
        quantity_required: m.quantity_required || m.quantity || 0,
        quantity_issued: m.quantity_issued || 0
      }))
    };
  }

  async getReceivingReportData(receiptId) {
    const [receipts] = await pool.query(
      `SELECT r.*, po.po_number, v.company_name as vendor_name
       FROM po_receipts r 
       JOIN purchase_orders po ON r.purchase_order_id = po.id
       JOIN vendors v ON po.vendor_id = v.id
       WHERE r.id = ?`, [receiptId]
    );
    if (!receipts.length) throw new Error('Receipt not found');
    const receipt = receipts[0];

    const [lines] = await pool.query(
      `SELECT rl.*, i.item_number, i.description as item_description
       FROM po_receipt_lines rl
       LEFT JOIN items i ON rl.item_id = i.id
       WHERE rl.receipt_id = ?
       ORDER BY rl.id`, [receiptId]
    );

    return {
      ...receipt,
      receipt_number: receipt.receipt_number || `RCV-${receiptId}`,
      po_number: receipt.po_number,
      vendor_name: receipt.vendor_name,
      received_date: receipt.received_date || receipt.created_at,
      lines: lines.map((l, i) => ({
        line_num: i + 1,
        item_number: l.item_number || '',
        description: l.description || l.item_description || '',
        quantity_ordered: l.quantity_ordered || '',
        quantity_received: l.quantity_received || l.quantity || 0,
        lot_number: l.lot_number || '',
        location: l.location_name || l.location || ''
      }))
    };
  }

  // List all available templates
  async listTemplates() {
    try {
      const [templates] = await pool.query(
        "SELECT id, name, document_type, category, is_active, subject_template, updated_at FROM document_templates ORDER BY category, document_type"
      );
      return templates;
    } catch (e) {
      return [];
    }
  }

  // Update a template
  async updateTemplate(templateId, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.pdf_template !== undefined) { fields.push('pdf_template = ?'); values.push(updates.pdf_template); }
    if (updates.subject_template !== undefined) { fields.push('subject_template = ?'); values.push(updates.subject_template); }
    if (updates.body_template !== undefined) { fields.push('body_template = ?'); values.push(updates.body_template); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }
    
    fields.push('updated_at = NOW()');
    values.push(templateId);

    await pool.query(`UPDATE document_templates SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // Cleanup
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new TemplateService();
