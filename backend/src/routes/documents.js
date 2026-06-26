const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pool = require('../config/database');

// Try to use new template service, fall back to old pdfService
let templateService;
let pdfService;
try {
  templateService = require('../services/templateService');
} catch (e) {
  console.log('Template service not available, using legacy pdfService');
}
try {
  pdfService = require('../services/pdfService');
} catch (e) {
  console.log('Legacy pdfService not available');
}

// === PDF GENERATION ENDPOINTS ===

// Generate Purchase Order PDF
router.get('/purchase-order/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('purchase_order', req.params.id);
    } else {
      buffer = await pdfService.generatePurchaseOrder(req.params.id);
    }
    await req.audit('purchase_orders', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="po-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('PO PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Quote PDF
router.get('/quote/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('quote', req.params.id);
    } else {
      buffer = await pdfService.generateQuote(req.params.id);
    }
    await req.audit('quotes', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quote-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Quote PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Sales Order Confirmation PDF
router.get('/order/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('sales_order', req.params.id);
    } else {
      buffer = await pdfService.generateOrderConfirmation(req.params.id);
    }
    await req.audit('sales_orders', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="order-confirmation-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Order PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Invoice PDF
router.get('/invoice/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('ar_invoice', req.params.id);
    } else {
      buffer = await pdfService.generateInvoice(req.params.id);
    }
    await req.audit('ar_invoices', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Invoice PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Packing List PDF
router.get('/packing-list/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('packing_slip', req.params.id);
    } else {
      buffer = await pdfService.generatePackingList(req.params.id);
    }
    await req.audit('shipments', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="packing-list-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Packing list PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Work Order PDF
router.get('/work-order/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('work_order', req.params.id);
    } else {
      throw new Error('Work Order PDF requires template service');
    }
    await req.audit('work_orders', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="work-order-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Work Order PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Receiving Report PDF
router.get('/receiving-report/:id/pdf', authenticate, async (req, res) => {
  try {
    let buffer;
    if (templateService) {
      buffer = await templateService.generateDocument('receiving_report', req.params.id);
    } else {
      throw new Error('Receiving Report PDF requires template service');
    }
    await req.audit('po_receipts', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receiving-report-${req.params.id}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Receiving Report PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === PREVIEW ENDPOINTS (returns HTML for iframe preview) ===

router.get('/preview/:type/:id', authenticate, async (req, res) => {
  try {
    if (!templateService) throw new Error('Template service not available');
    const html = await templateService.generatePreview(req.params.type, req.params.id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === TEMPLATE MANAGEMENT ENDPOINTS ===

// List all templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    if (!templateService) return res.json([]);
    const templates = await templateService.listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const [templates] = await pool.query("SELECT * FROM document_templates WHERE id = ?", [req.params.id]);
    if (!templates.length) return res.status(404).json({ error: 'Template not found' });
    res.json(templates[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    if (!templateService) throw new Error('Template service not available');
    await templateService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, message: 'Template updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get email template info for a document type (pre-fills the email dialog)
router.get('/email-template/:type/:id', authenticate, async (req, res) => {
  try {
    if (!templateService) throw new Error('Template service not available');
    const emailData = await templateService.compileEmail(req.params.type, req.params.id);
    res.json(emailData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
