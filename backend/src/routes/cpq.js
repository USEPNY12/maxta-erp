/**
 * CPQ (Configure, Price, Quote) API Routes
 * Handles glass pricing calculations, pricing matrix management, and approval workflows
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const cpqService = require('../services/cpqService');
const pool = require('../config/database');

// ============ CPQ CALCULATION ============

// Calculate price for a glass line item configuration
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const result = await cpqService.calculateLinePrice(req.body);
    res.json(result);
  } catch (err) {
    console.error('CPQ calculation error:', err);
    res.status(500).json({ error: 'Price calculation failed', details: err.message });
  }
});

// Get glass configurator options (dropdowns)
router.get('/options', authenticate, async (req, res) => {
  try {
    const options = await cpqService.getGlassOptions();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRICING MATRIX MANAGEMENT ============

// Get full pricing matrix
router.get('/pricing-matrix', authenticate, async (req, res) => {
  try {
    const matrix = await cpqService.getPricingMatrix();
    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update pricing matrix entry
router.put('/pricing-matrix/:id', authenticate, async (req, res) => {
  try {
    await cpqService.updatePricingMatrix(req.params.id, req.body);
    res.json({ message: 'Pricing updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new pricing matrix entry
router.post('/pricing-matrix', authenticate, async (req, res) => {
  try {
    const { glass_type, thickness, price_per_sqft, min_sqft, min_charge, markup_percent } = req.body;
    const [result] = await pool.query(
      `INSERT INTO pricing_matrix (glass_type, thickness, price_per_sqft, min_sqft, min_charge, markup_percent) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [glass_type, thickness, price_per_sqft, min_sqft || 3, min_charge || 0, markup_percent || 0]
    );
    res.json({ id: result.insertId, message: 'Pricing entry added' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This glass type + thickness combination already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete pricing matrix entry
router.delete('/pricing-matrix/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM pricing_matrix WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pricing entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ QUANTITY BREAKS ============

router.get('/quantity-breaks', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM quantity_breaks ORDER BY min_qty');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quantity-breaks/:id', authenticate, async (req, res) => {
  try {
    const { name, min_qty, max_qty, discount_percent, is_active } = req.body;
    await pool.query(
      'UPDATE quantity_breaks SET name = ?, min_qty = ?, max_qty = ?, discount_percent = ?, is_active = ? WHERE id = ?',
      [name, min_qty, max_qty, discount_percent, is_active, req.params.id]
    );
    res.json({ message: 'Quantity break updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ APPROVAL WORKFLOWS ============

// Get all approval workflows
router.get('/approvals/workflows', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM approval_workflows ORDER BY document_type, priority');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create approval workflow rule
router.post('/approvals/workflows', authenticate, async (req, res) => {
  try {
    const { name, document_type, condition_field, condition_operator, condition_value, condition_value2, approver_role, approver_user_id, priority } = req.body;
    const [result] = await pool.query(
      `INSERT INTO approval_workflows (name, document_type, condition_field, condition_operator, condition_value, condition_value2, approver_role, approver_user_id, priority) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, document_type, condition_field, condition_operator, condition_value, condition_value2, approver_role, approver_user_id, priority || 1]
    );
    res.json({ id: result.insertId, message: 'Workflow created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update approval workflow
router.put('/approvals/workflows/:id', authenticate, async (req, res) => {
  try {
    const { name, condition_value, approver_role, is_active, priority } = req.body;
    await pool.query(
      'UPDATE approval_workflows SET name = ?, condition_value = ?, approver_role = ?, is_active = ?, priority = ? WHERE id = ?',
      [name, condition_value, approver_role, is_active, priority, req.params.id]
    );
    res.json({ message: 'Workflow updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending approvals queue
router.get('/approvals/queue', authenticate, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const [rows] = await pool.query(`
      SELECT aq.*, aw.name as workflow_name, aw.document_type,
             u.username as requested_by_name,
             au.username as approver_name
      FROM approval_queue aq
      JOIN approval_workflows aw ON aq.workflow_id = aw.id
      LEFT JOIN users u ON aq.requested_by = u.id
      LEFT JOIN users au ON aq.approver_id = au.id
      WHERE aq.status = ?
      ORDER BY aq.requested_at DESC
    `, [status]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all approvals (with filters)
router.get('/approvals/all', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT aq.*, aw.name as workflow_name, aw.document_type,
             u.username as requested_by_name,
             au.username as approver_name
      FROM approval_queue aq
      JOIN approval_workflows aw ON aq.workflow_id = aw.id
      LEFT JOIN users u ON aq.requested_by = u.id
      LEFT JOIN users au ON aq.approver_id = au.id
      ORDER BY aq.requested_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit document for approval
router.post('/approvals/submit', authenticate, async (req, res) => {
  try {
    const { document_type, document_id, document_number } = req.body;
    const userId = req.user.id;

    // Get the document details to check against workflows
    let docTotal = 0;
    let maxDiscount = 0;
    let minMargin = 100;

    if (document_type === 'quote') {
      const [quote] = await pool.query('SELECT total FROM quotes WHERE id = ?', [document_id]);
      if (quote.length > 0) docTotal = parseFloat(quote[0].total) || 0;
      
      const [lines] = await pool.query('SELECT discount_percent, margin_percent FROM quote_lines WHERE quote_id = ?', [document_id]);
      lines.forEach(l => {
        if (parseFloat(l.discount_percent) > maxDiscount) maxDiscount = parseFloat(l.discount_percent);
        if (parseFloat(l.margin_percent) < minMargin && parseFloat(l.margin_percent) > 0) minMargin = parseFloat(l.margin_percent);
      });
    } else if (document_type === 'sales_order') {
      const [order] = await pool.query('SELECT total FROM sales_orders WHERE id = ?', [document_id]);
      if (order.length > 0) docTotal = parseFloat(order[0].total) || 0;
    } else if (document_type === 'purchase_order') {
      const [po] = await pool.query('SELECT total FROM purchase_orders WHERE id = ?', [document_id]);
      if (po.length > 0) docTotal = parseFloat(po[0].total) || 0;
    }

    // Check all active workflows for this document type
    const [workflows] = await pool.query(
      'SELECT * FROM approval_workflows WHERE document_type = ? AND is_active = 1 ORDER BY priority',
      [document_type]
    );

    const triggered = [];
    for (const wf of workflows) {
      let fieldValue = 0;
      if (wf.condition_field === 'total') fieldValue = docTotal;
      else if (wf.condition_field === 'max_discount_percent') fieldValue = maxDiscount;
      else if (wf.condition_field === 'min_margin_percent') fieldValue = minMargin;

      let isTriggered = false;
      const condVal = parseFloat(wf.condition_value);
      switch (wf.condition_operator) {
        case 'gt': isTriggered = fieldValue > condVal; break;
        case 'lt': isTriggered = fieldValue < condVal; break;
        case 'gte': isTriggered = fieldValue >= condVal; break;
        case 'lte': isTriggered = fieldValue <= condVal; break;
        case 'eq': isTriggered = fieldValue === condVal; break;
      }

      if (isTriggered) {
        triggered.push({
          workflow_id: wf.id,
          reason: `${wf.name}: ${wf.condition_field} = ${fieldValue} (threshold: ${wf.condition_operator} ${condVal})`,
          value: fieldValue
        });
      }
    }

    if (triggered.length === 0) {
      // No approval needed - auto-approve
      return res.json({ requires_approval: false, message: 'No approval required' });
    }

    // Create approval queue entries
    for (const t of triggered) {
      await pool.query(
        `INSERT INTO approval_queue (workflow_id, document_type, document_id, document_number, requested_by, trigger_reason, trigger_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.workflow_id, document_type, document_id, document_number, userId, t.reason, t.value]
      );
    }

    // Update document status to pending_approval
    if (document_type === 'quote') {
      await pool.query('UPDATE quotes SET status = ? WHERE id = ?', ['pending_approval', document_id]);
    } else if (document_type === 'sales_order') {
      await pool.query('UPDATE sales_orders SET status = ? WHERE id = ?', ['pending_approval', document_id]);
    }

    res.json({
      requires_approval: true,
      approvals_created: triggered.length,
      reasons: triggered.map(t => t.reason)
    });
  } catch (err) {
    console.error('Approval submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Approve or reject a pending approval
router.post('/approvals/:id/decision', authenticate, async (req, res) => {
  try {
    const { decision, comments } = req.body; // decision: 'approved' or 'rejected'
    const approverId = req.user.id;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected' });
    }

    // Update the approval queue entry
    await pool.query(
      `UPDATE approval_queue SET status = ?, approver_id = ?, decision_at = NOW(), comments = ? WHERE id = ?`,
      [decision, approverId, comments, req.params.id]
    );

    // Get the approval details to update the document
    const [approval] = await pool.query('SELECT * FROM approval_queue WHERE id = ?', [req.params.id]);
    if (approval.length > 0) {
      const { document_type, document_id } = approval[0];

      // Check if all approvals for this document are resolved
      const [pending] = await pool.query(
        'SELECT COUNT(*) as cnt FROM approval_queue WHERE document_type = ? AND document_id = ? AND status = ?',
        [document_type, document_id, 'pending']
      );

      if (pending[0].cnt === 0) {
        // All approvals resolved - check if any were rejected
        const [rejected] = await pool.query(
          'SELECT COUNT(*) as cnt FROM approval_queue WHERE document_type = ? AND document_id = ? AND status = ?',
          [document_type, document_id, 'rejected']
        );

        const newStatus = rejected[0].cnt > 0 ? 'draft' : (document_type === 'quote' ? 'sent' : 'open');

        if (document_type === 'quote') {
          await pool.query('UPDATE quotes SET status = ? WHERE id = ?', [newStatus, document_id]);
        } else if (document_type === 'sales_order') {
          await pool.query('UPDATE sales_orders SET status = ? WHERE id = ?', [newStatus, document_id]);
        }
      }
    }

    res.json({ message: `Approval ${decision}`, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ EXCHANGE RATES ============

router.get('/exchange-rates', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM exchange_rates 
      ORDER BY effective_date DESC, to_currency
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exchange-rates', authenticate, async (req, res) => {
  try {
    const { from_currency, to_currency, rate, effective_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES (?, ?, ?, ?)',
      [from_currency || 'USD', to_currency, rate, effective_date]
    );
    res.json({ id: result.insertId, message: 'Exchange rate added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current exchange rate for a currency pair
router.get('/exchange-rates/:currency', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rate FROM exchange_rates 
      WHERE to_currency = ? AND effective_date <= CURDATE()
      ORDER BY effective_date DESC LIMIT 1
    `, [req.params.currency]);
    
    if (rows.length === 0) {
      // Fallback to currencies table
      const [curr] = await pool.query('SELECT exchange_rate FROM currencies WHERE code = ? LIMIT 1', [req.params.currency]);
      if (curr.length > 0) return res.json({ rate: parseFloat(curr[0].exchange_rate), source: 'currencies_table' });
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    res.json({ rate: parseFloat(rows[0].rate), source: 'exchange_rates' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ COMMISSION TRACKING ============

// Get commission rules
router.get('/commissions/rules', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cr.*, s.name as salesperson_name 
      FROM commission_rules cr
      LEFT JOIN salespeople s ON cr.salesperson_id = s.id
      ORDER BY cr.commission_rate DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create commission rule
router.post('/commissions/rules', authenticate, async (req, res) => {
  try {
    const { name, salesperson_id, customer_type, min_revenue, max_revenue, commission_rate } = req.body;
    const [result] = await pool.query(
      `INSERT INTO commission_rules (name, salesperson_id, customer_type, min_revenue, max_revenue, commission_rate) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, salesperson_id, customer_type, min_revenue || 0, max_revenue || 999999999, commission_rate]
    );
    res.json({ id: result.insertId, message: 'Commission rule created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get commission ledger (earned commissions)
router.get('/commissions/ledger', authenticate, async (req, res) => {
  try {
    const { status, salesperson_id } = req.query;
    let query = `
      SELECT c.*, s.name as salesperson_name, ai.invoice_number
      FROM commissions c
      JOIN salespeople s ON c.salesperson_id = s.id
      LEFT JOIN ar_invoices ai ON c.invoice_id = ai.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND c.status = ?'; params.push(status); }
    if (salesperson_id) { query += ' AND c.salesperson_id = ?'; params.push(salesperson_id); }
    query += ' ORDER BY c.id DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate and record commission for an invoice
router.post('/commissions/calculate', authenticate, async (req, res) => {
  try {
    const { invoice_id } = req.body;

    // Get invoice details
    const [invoice] = await pool.query(`
      SELECT ai.*, so.salesperson_id, c.currency_code
      FROM ar_invoices ai
      LEFT JOIN sales_orders so ON ai.sales_order_id = so.id
      LEFT JOIN customers c ON ai.customer_id = c.id
      WHERE ai.id = ?
    `, [invoice_id]);

    if (invoice.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    if (!invoice[0].salesperson_id) return res.json({ message: 'No salesperson assigned', commission: 0 });

    const salespersonId = invoice[0].salesperson_id;
    const invoiceAmount = parseFloat(invoice[0].total) || 0;

    // Find applicable commission rule
    const [rules] = await pool.query(`
      SELECT commission_rate FROM commission_rules 
      WHERE (salesperson_id = ? OR salesperson_id IS NULL)
        AND min_revenue <= ? AND max_revenue >= ?
        AND is_active = 1
      ORDER BY salesperson_id DESC, commission_rate DESC
      LIMIT 1
    `, [salespersonId, invoiceAmount, invoiceAmount]);

    const rate = rules.length > 0 ? parseFloat(rules[0].commission_rate) : 5.00;
    const commissionAmount = invoiceAmount * (rate / 100);

    // Record commission
    const [result] = await pool.query(
      `INSERT INTO commissions (salesperson_id, invoice_id, commission_rate, invoice_amount, commission_amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [salespersonId, invoice_id, rate, invoiceAmount, commissionAmount]
    );

    res.json({
      id: result.insertId,
      salesperson_id: salespersonId,
      invoice_amount: invoiceAmount,
      commission_rate: rate,
      commission_amount: Math.round(commissionAmount * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark commissions as paid
router.post('/commissions/pay', authenticate, async (req, res) => {
  try {
    const { commission_ids } = req.body;
    if (!commission_ids || commission_ids.length === 0) {
      return res.status(400).json({ error: 'No commission IDs provided' });
    }
    await pool.query(
      `UPDATE commissions SET status = 'paid', paid_date = CURDATE() WHERE id IN (?)`,
      [commission_ids]
    );
    res.json({ message: `${commission_ids.length} commissions marked as paid` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Commission summary report
router.get('/commissions/summary', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id as salesperson_id,
        s.name as salesperson_name,
        COUNT(c.id) as total_commissions,
        SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN c.status = 'approved' THEN c.commission_amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END) as paid_amount,
        SUM(c.commission_amount) as total_amount,
        SUM(c.invoice_amount) as total_revenue
      FROM salespeople s
      LEFT JOIN commissions c ON s.id = c.salesperson_id
      GROUP BY s.id, s.name
      ORDER BY total_amount DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
