const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pdfService = require('../services/pdfService');

// Generate Invoice PDF
router.get('/invoice/:id/pdf', authenticate, async (req, res) => {
  try {
    const buffer = await pdfService.generateInvoice(req.params.id);
    await req.audit('ar_invoices', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Purchase Order PDF
router.get('/purchase-order/:id/pdf', authenticate, async (req, res) => {
  try {
    const buffer = await pdfService.generatePurchaseOrder(req.params.id);
    await req.audit('purchase_orders', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="po-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Packing List PDF
router.get('/packing-list/:id/pdf', authenticate, async (req, res) => {
  try {
    const buffer = await pdfService.generatePackingList(req.params.id);
    await req.audit('shipments', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="packing-list-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Quote PDF
router.get('/quote/:id/pdf', authenticate, async (req, res) => {
  try {
    const buffer = await pdfService.generateQuote(req.params.id);
    await req.audit('quotes', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quote-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Sales Order Confirmation PDF
router.get('/order/:id/pdf', authenticate, async (req, res) => {
  try {
    const buffer = await pdfService.generateOrderConfirmation(req.params.id);
    await req.audit('sales_orders', req.params.id, 'PRINT', null, { action: 'pdf_generated' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="order-confirmation-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
