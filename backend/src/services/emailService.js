const nodemailer = require('nodemailer');
const pool = require('../config/database');

/**
 * Email Service for sending documents to customers and vendors
 * Supports: Quotes, Order Confirmations, Packing Lists, Invoices, POs, Credit Memos, Statements
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async init() {
    try {
      // Get email settings from system_settings
      const [settings] = await pool.query(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'email_%'"
      );
      const config = {};
      settings.forEach(s => { config[s.setting_key] = s.setting_value; });

      if (config.email_host && config.email_user) {
        this.transporter = nodemailer.createTransport({
          host: config.email_host,
          port: parseInt(config.email_port || '587'),
          secure: config.email_secure === 'true',
          auth: {
            user: config.email_user,
            pass: config.email_password
          }
        });
        this.fromAddress = config.email_from || config.email_user;
        this.companyName = config.email_company_name || 'Max TA Group LLC';
        this.initialized = true;
      } else {
        console.log('Email not configured - set email_host, email_user, email_password in system_settings');
      }
    } catch (err) {
      console.error('Email service init error:', err.message);
    }
  }

  async sendEmail({ to, cc, subject, html, text, attachments, documentType, documentId, sentBy }) {
    if (!this.initialized) {
      await this.init();
    }
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set SMTP settings in System Setup > Email Configuration.');
    }

    const mailOptions = {
      from: `"${this.companyName}" <${this.fromAddress}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
      attachments: attachments || []
    };

    const result = await this.transporter.sendMail(mailOptions);

    // Log the email sent
    await pool.query(
      `INSERT INTO email_log (document_type, document_id, to_address, cc_address, subject, sent_by, sent_at, message_id, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'sent')`,
      [documentType, documentId, mailOptions.to, mailOptions.cc || null, subject, sentBy, result.messageId]
    );

    return result;
  }

  // Send Quote to Customer
  async sendQuote(quoteId, userId) {
    const [quotes] = await pool.query(
      `SELECT q.*, c.company_name, c.email as customer_email 
       FROM quotes q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`, [quoteId]
    );
    if (!quotes.length) throw new Error('Quote not found');
    const quote = quotes[0];
    if (!quote.customer_email) throw new Error('Customer has no email address');

    const html = this.buildQuoteEmail(quote);
    return this.sendEmail({
      to: quote.customer_email,
      subject: `Quote ${quote.quote_number} from ${this.companyName}`,
      html,
      documentType: 'quote',
      documentId: quoteId,
      sentBy: userId
    });
  }

  // Send Sales Order Confirmation
  async sendOrderConfirmation(orderId, userId) {
    const [orders] = await pool.query(
      `SELECT so.*, c.company_name, c.email as customer_email
       FROM sales_orders so JOIN customers c ON so.customer_id = c.id WHERE so.id = ?`, [orderId]
    );
    if (!orders.length) throw new Error('Sales Order not found');
    const order = orders[0];
    if (!order.customer_email) throw new Error('Customer has no email address');

    const [lines] = await pool.query(
      `SELECT sol.*, i.item_number, i.description 
       FROM sales_order_lines sol LEFT JOIN items i ON sol.item_id = i.id WHERE sol.sales_order_id = ?`, [orderId]
    );

    const html = this.buildOrderConfirmationEmail(order, lines);
    return this.sendEmail({
      to: order.customer_email,
      subject: `Order Confirmation ${order.order_number} - ${this.companyName}`,
      html,
      documentType: 'sales_order',
      documentId: orderId,
      sentBy: userId
    });
  }

  // Send Invoice to Customer
  async sendInvoice(invoiceId, userId) {
    const [invoices] = await pool.query(
      `SELECT i.*, c.company_name, c.email as customer_email
       FROM ar_invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`, [invoiceId]
    );
    if (!invoices.length) throw new Error('Invoice not found');
    const invoice = invoices[0];
    if (!invoice.customer_email) throw new Error('Customer has no email address');

    const [lines] = await pool.query(
      `SELECT * FROM ar_invoice_lines WHERE invoice_id = ?`, [invoiceId]
    );

    const html = this.buildInvoiceEmail(invoice, lines);
    return this.sendEmail({
      to: invoice.customer_email,
      subject: `Invoice ${invoice.invoice_number} from ${this.companyName}`,
      html,
      documentType: 'ar_invoice',
      documentId: invoiceId,
      sentBy: userId
    });
  }

  // Send Purchase Order to Vendor
  async sendPurchaseOrder(poId, userId) {
    const [pos] = await pool.query(
      `SELECT po.*, v.company_name as vendor_name, v.email as vendor_email
       FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ?`, [poId]
    );
    if (!pos.length) throw new Error('Purchase Order not found');
    const po = pos[0];
    if (!po.vendor_email) throw new Error('Vendor has no email address');

    const [lines] = await pool.query(
      `SELECT pol.*, i.item_number, i.description
       FROM po_lines pol LEFT JOIN items i ON pol.item_id = i.id WHERE pol.purchase_order_id = ?`, [poId]
    );

    const html = this.buildPurchaseOrderEmail(po, lines);
    return this.sendEmail({
      to: po.vendor_email,
      subject: `Purchase Order ${po.po_number} from ${this.companyName}`,
      html,
      documentType: 'purchase_order',
      documentId: poId,
      sentBy: userId
    });
  }

  // Send Packing List
  async sendPackingList(shipmentId, userId) {
    const [shipments] = await pool.query(
      `SELECT s.*, so.order_number, c.company_name, c.email as customer_email
       FROM shipments s 
       JOIN sales_orders so ON s.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       WHERE s.id = ?`, [shipmentId]
    );
    if (!shipments.length) throw new Error('Shipment not found');
    const shipment = shipments[0];
    if (!shipment.customer_email) throw new Error('Customer has no email address');

    const [lines] = await pool.query(
      `SELECT sl.*, i.item_number, i.description
       FROM shipment_lines sl LEFT JOIN items i ON sl.item_id = i.id WHERE sl.shipment_id = ?`, [shipmentId]
    );

    const html = this.buildPackingListEmail(shipment, lines);
    return this.sendEmail({
      to: shipment.customer_email,
      subject: `Packing List - Shipment for Order ${shipment.order_number} - ${this.companyName}`,
      html,
      documentType: 'shipment',
      documentId: shipmentId,
      sentBy: userId
    });
  }

  // Send Credit Memo
  async sendCreditMemo(creditMemoId, userId) {
    const [memos] = await pool.query(
      `SELECT cm.*, c.company_name, c.email as customer_email
       FROM credit_memos cm JOIN customers c ON cm.customer_id = c.id WHERE cm.id = ?`, [creditMemoId]
    );
    if (!memos.length) throw new Error('Credit Memo not found');
    const memo = memos[0];
    if (!memo.customer_email) throw new Error('Customer has no email address');

    const html = this.buildCreditMemoEmail(memo);
    return this.sendEmail({
      to: memo.customer_email,
      subject: `Credit Memo ${memo.memo_number} from ${this.companyName}`,
      html,
      documentType: 'credit_memo',
      documentId: creditMemoId,
      sentBy: userId
    });
  }

  // ===== Email Template Builders =====

  buildBaseTemplate(title, content) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${title}</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="border-bottom: 3px solid #1a56db; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #1a56db; margin: 0; font-size: 24px;">${this.companyName}</h1>
        <p style="margin: 5px 0 0; color: #666; font-size: 12px;">Glass Fabrication & Manufacturing</p>
      </div>
      ${content}
      <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 15px; font-size: 11px; color: #999;">
        <p>This email was generated by ${this.companyName} ERP System.</p>
        <p>If you have questions, please contact us.</p>
      </div>
    </body>
    </html>`;
  }

  buildQuoteEmail(quote) {
    return this.buildBaseTemplate('Quote', `
      <h2 style="color: #333;">Quote ${quote.quote_number}</h2>
      <p>Dear ${quote.company_name},</p>
      <p>Thank you for your inquiry. Please find our quote details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Quote #:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${quote.quote_number}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(quote.quote_date).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Valid Until:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString() : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 18px; color: #1a56db;"><strong>$${parseFloat(quote.total_amount || 0).toFixed(2)}</strong></td></tr>
      </table>
      <p>Please contact us to proceed with this quote or if you have any questions.</p>
      <p>Best regards,<br>${this.companyName}</p>
    `);
  }

  buildOrderConfirmationEmail(order, lines) {
    let linesHtml = lines.map(l => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.item_number || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.description || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity_ordered}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.line_total || l.quantity_ordered * l.unit_price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return this.buildBaseTemplate('Order Confirmation', `
      <h2 style="color: #333;">Order Confirmation</h2>
      <p>Dear ${order.company_name},</p>
      <p>Thank you for your order. This confirms we have received and are processing your order:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px;"><strong>Order #:</strong></td><td>${order.order_number}</td></tr>
        <tr><td style="padding: 8px;"><strong>Date:</strong></td><td>${new Date(order.order_date).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Requested Ship Date:</strong></td><td>${order.ship_date ? new Date(order.ship_date).toLocaleDateString() : 'TBD'}</td></tr>
      </table>
      <h3>Order Lines</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: left;">Description</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
        <tfoot><tr style="font-weight: bold;">
          <td colspan="4" style="padding: 8px; text-align: right;">Order Total:</td>
          <td style="padding: 8px; text-align: right;">$${parseFloat(order.total_amount || 0).toFixed(2)}</td>
        </tr></tfoot>
      </table>
      <p>We will notify you when your order ships.</p>
      <p>Best regards,<br>${this.companyName}</p>
    `);
  }

  buildInvoiceEmail(invoice, lines) {
    let linesHtml = lines.map(l => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.item_number || l.description || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return this.buildBaseTemplate('Invoice', `
      <h2 style="color: #333;">Invoice ${invoice.invoice_number}</h2>
      <p>Dear ${invoice.company_name},</p>
      <p>Please find your invoice below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px;"><strong>Invoice #:</strong></td><td>${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 8px;"><strong>Date:</strong></td><td>${new Date(invoice.invoice_date).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Due Date:</strong></td><td>${new Date(invoice.due_date).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Terms:</strong></td><td>${invoice.payment_terms || 'Net 30'}</td></tr>
      </table>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Description</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Amount</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
      </table>
      <table style="width: 50%; margin-left: auto; margin-top: 10px;">
        <tr><td style="padding: 5px;"><strong>Subtotal:</strong></td><td style="text-align: right;">$${parseFloat(invoice.subtotal || 0).toFixed(2)}</td></tr>
        <tr><td style="padding: 5px;"><strong>Tax:</strong></td><td style="text-align: right;">$${parseFloat(invoice.tax_amount || 0).toFixed(2)}</td></tr>
        <tr style="font-size: 18px; color: #1a56db;"><td style="padding: 5px;"><strong>Total Due:</strong></td><td style="text-align: right;"><strong>$${parseFloat(invoice.total_amount || 0).toFixed(2)}</strong></td></tr>
      </table>
      <p style="margin-top: 20px;">Payment is due by ${new Date(invoice.due_date).toLocaleDateString()}. Thank you for your business.</p>
      <p>Best regards,<br>${this.companyName}</p>
    `);
  }

  buildPurchaseOrderEmail(po, lines) {
    let linesHtml = lines.map(l => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.item_number || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.description || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity_ordered || l.quantity}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.unit_cost || l.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(l.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return this.buildBaseTemplate('Purchase Order', `
      <h2 style="color: #333;">Purchase Order ${po.po_number}</h2>
      <p>Dear ${po.vendor_name},</p>
      <p>Please find our purchase order below. Kindly confirm receipt and expected delivery date.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px;"><strong>PO #:</strong></td><td>${po.po_number}</td></tr>
        <tr><td style="padding: 8px;"><strong>Date:</strong></td><td>${new Date(po.order_date || po.created_at).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Required Date:</strong></td><td>${po.required_date ? new Date(po.required_date).toLocaleDateString() : 'ASAP'}</td></tr>
        <tr><td style="padding: 8px;"><strong>Ship To:</strong></td><td>${this.companyName}</td></tr>
      </table>
      <h3>Order Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Item #</th>
          <th style="padding: 8px; text-align: left;">Description</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Unit Cost</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
        <tfoot><tr style="font-weight: bold;">
          <td colspan="4" style="padding: 8px; text-align: right;">PO Total:</td>
          <td style="padding: 8px; text-align: right;">$${parseFloat(po.total_amount || 0).toFixed(2)}</td>
        </tr></tfoot>
      </table>
      <p style="margin-top: 20px;"><strong>Terms:</strong> ${po.payment_terms || 'Net 30'}</p>
      <p>Please confirm this order by replying to this email.</p>
      <p>Thank you,<br>${this.companyName}</p>
    `);
  }

  buildPackingListEmail(shipment, lines) {
    let linesHtml = lines.map(l => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.item_number || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee;">${l.description || ''}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity_shipped || l.quantity}</td>
      </tr>
    `).join('');

    return this.buildBaseTemplate('Packing List', `
      <h2 style="color: #333;">Packing List</h2>
      <p>Dear ${shipment.company_name},</p>
      <p>Your order has been shipped. Details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px;"><strong>Order #:</strong></td><td>${shipment.order_number}</td></tr>
        <tr><td style="padding: 8px;"><strong>Ship Date:</strong></td><td>${new Date(shipment.ship_date || shipment.created_at).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Carrier:</strong></td><td>${shipment.carrier || 'N/A'}</td></tr>
        <tr><td style="padding: 8px;"><strong>Tracking #:</strong></td><td>${shipment.tracking_number || 'N/A'}</td></tr>
      </table>
      <h3>Items Shipped</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Item #</th>
          <th style="padding: 8px; text-align: left;">Description</th>
          <th style="padding: 8px; text-align: center;">Qty Shipped</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
      </table>
      <p>Best regards,<br>${this.companyName}</p>
    `);
  }

  buildCreditMemoEmail(memo) {
    return this.buildBaseTemplate('Credit Memo', `
      <h2 style="color: #333;">Credit Memo ${memo.memo_number}</h2>
      <p>Dear ${memo.company_name},</p>
      <p>A credit has been applied to your account:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px;"><strong>Credit Memo #:</strong></td><td>${memo.memo_number}</td></tr>
        <tr><td style="padding: 8px;"><strong>Date:</strong></td><td>${new Date(memo.memo_date || memo.created_at).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px;"><strong>Reason:</strong></td><td>${memo.reason || 'N/A'}</td></tr>
        <tr><td style="padding: 8px;"><strong>Credit Amount:</strong></td><td style="font-size: 18px; color: #16a34a;"><strong>$${parseFloat(memo.amount).toFixed(2)}</strong></td></tr>
      </table>
      <p>This credit will be applied to your outstanding balance.</p>
      <p>Best regards,<br>${this.companyName}</p>
    `);
  }
}

module.exports = new EmailService();
