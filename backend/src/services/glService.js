/**
 * GL Service - Centralized General Ledger posting engine
 * All modules use this service to create GL entries, ensuring consistency
 * and period lock enforcement.
 */
const pool = require('../config/database');

class GLService {
  /**
   * Get GL default account number from system_settings
   */
  static async getDefaultAccount(settingKey) {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = ?", [settingKey]
    );
    return rows.length ? rows[0].setting_value : null;
  }

  /**
   * Get GL account ID by account number
   */
  static async getAccountId(accountNumber) {
    const [rows] = await pool.query(
      "SELECT id FROM gl_accounts WHERE account_number = ?", [accountNumber]
    );
    if (!rows.length) throw new Error(`GL Account ${accountNumber} not found`);
    return rows[0].id;
  }

  /**
   * Get GL account ID from system settings key
   */
  static async getDefaultAccountId(settingKey) {
    const accountNumber = await this.getDefaultAccount(settingKey);
    if (!accountNumber) throw new Error(`GL Default setting '${settingKey}' not configured`);
    return this.getAccountId(accountNumber);
  }

  /**
   * Get the item-specific GL account or fall back to default
   */
  static async getItemGLAccount(itemId, accountType, defaultSettingKey) {
    const [rows] = await pool.query(
      `SELECT ga.account_number FROM item_gl_accounts iga 
       JOIN gl_accounts ga ON iga.gl_account_id = ga.id 
       WHERE iga.item_id = ? AND iga.account_type = ?`, [itemId, accountType]
    );
    if (rows.length) return rows[0].account_number;
    return this.getDefaultAccount(defaultSettingKey);
  }

  /**
   * Check if a period is open for a given date
   */
  static async validatePeriod(transactionDate) {
    const date = new Date(transactionDate);
    const [periods] = await pool.query(
      `SELECT * FROM accounting_periods 
       WHERE start_date <= ? AND end_date >= ? LIMIT 1`,
      [date, date]
    );
    if (!periods.length) {
      throw new Error(`No accounting period defined for date ${transactionDate}`);
    }
    if (periods[0].status === 'closed') {
      throw new Error(`Accounting period ${periods[0].period_number}/${periods[0].period_year} is closed. Cannot post transactions to a closed period.`);
    }
    return `${periods[0].period_number}-${periods[0].period_year}`;
  }

  /**
   * Get period string for a date (without enforcing open status - for queries)
   */
  static getPeriodString(date) {
    const d = new Date(date || new Date());
    return `${d.getMonth() + 1}-${d.getFullYear()}`;
  }

  /**
   * Post a balanced GL Journal Entry (multiple debit/credit lines)
   * @param {Object} options
   * @param {string} options.transactionDate - Date of the transaction
   * @param {string} options.sourceType - Source module (e.g., 'customer_payment', 'vendor_payment', 'po_receipt', 'shipment', 'wo_receipt')
   * @param {number} options.sourceId - ID of the source document
   * @param {string} options.memo - Description of the transaction
   * @param {number} options.postedBy - User ID who triggered the posting
   * @param {Array} options.lines - Array of {accountNumber, debit, credit}
   * @param {Object} [options.connection] - Optional existing DB connection for transactions
   */
  static async postJournalEntry({ transactionDate, sourceType, sourceId, memo, postedBy, lines, connection }) {
    const conn = connection || pool;
    const date = transactionDate || new Date();
    
    // Validate period is open
    const period = await this.validatePeriod(date);
    
    // Validate the entry is balanced
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`GL Entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }

    // Post each line
    for (const line of lines) {
      if ((line.debit || 0) === 0 && (line.credit || 0) === 0) continue;
      
      const accountId = await this.getAccountId(line.accountNumber);
      
      await conn.query(
        `INSERT INTO gl_transactions (gl_account_id, transaction_date, period, debit, credit, source_type, source_id, memo, posted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountId, date, period, line.debit || 0, line.credit || 0, sourceType, sourceId, memo, postedBy]
      );

      // Update running balance on GL account
      const balanceChange = (line.debit || 0) - (line.credit || 0);
      await conn.query(
        'UPDATE gl_accounts SET balance = COALESCE(balance, 0) + ? WHERE id = ?',
        [balanceChange, accountId]
      );
    }

    return { period, totalDebit, totalCredit, lineCount: lines.length };
  }

  /**
   * Post Customer Payment GL entry: Debit Bank, Credit AR
   */
  static async postCustomerPayment({ paymentId, amount, bankAccountNumber, transactionDate, memo, postedBy, connection }) {
    const bankAcct = bankAccountNumber || await this.getDefaultAccount('gl_default_bank');
    const arAcct = await this.getDefaultAccount('gl_default_ar');
    
    return this.postJournalEntry({
      transactionDate,
      sourceType: 'customer_payment',
      sourceId: paymentId,
      memo: memo || `Customer Payment #${paymentId}`,
      postedBy,
      lines: [
        { accountNumber: bankAcct, debit: amount, credit: 0 },
        { accountNumber: arAcct, debit: 0, credit: amount }
      ],
      connection
    });
  }

  /**
   * Post Vendor Payment GL entry: Debit AP, Credit Bank
   */
  static async postVendorPayment({ paymentId, amount, bankAccountNumber, transactionDate, memo, postedBy, connection }) {
    const bankAcct = bankAccountNumber || await this.getDefaultAccount('gl_default_bank');
    const apAcct = await this.getDefaultAccount('gl_default_ap');
    
    return this.postJournalEntry({
      transactionDate,
      sourceType: 'vendor_payment',
      sourceId: paymentId,
      memo: memo || `Vendor Payment #${paymentId}`,
      postedBy,
      lines: [
        { accountNumber: apAcct, debit: amount, credit: 0 },
        { accountNumber: bankAcct, debit: 0, credit: amount }
      ],
      connection
    });
  }

  /**
   * Post PO Receipt GL entry: Debit Inventory (Raw Materials), Credit AP Accrual
   */
  static async postPOReceipt({ receiptId, lines, transactionDate, memo, postedBy, connection }) {
    const apAcct = await this.getDefaultAccount('gl_default_ap');
    const glLines = [];
    let totalCost = 0;

    for (const line of lines) {
      if (!line.itemId || !line.quantity || !line.unitCost) continue;
      const cost = line.quantity * line.unitCost;
      totalCost += cost;
      
      // Get item-specific inventory account or default
      const invAcct = await this.getItemGLAccount(line.itemId, 'inventory', 'gl_default_inventory_raw');
      
      // Accumulate by account
      const existing = glLines.find(l => l.accountNumber === invAcct && l.debit > 0);
      if (existing) {
        existing.debit += cost;
      } else {
        glLines.push({ accountNumber: invAcct, debit: cost, credit: 0 });
      }
    }

    if (totalCost > 0) {
      glLines.push({ accountNumber: apAcct, debit: 0, credit: totalCost });
      
      return this.postJournalEntry({
        transactionDate,
        sourceType: 'po_receipt',
        sourceId: receiptId,
        memo: memo || `PO Receipt #${receiptId}`,
        postedBy,
        lines: glLines,
        connection
      });
    }
  }

  /**
   * Post Shipment GL entry: Debit COGS, Credit Inventory (Finished Goods)
   */
  static async postShipment({ shipmentId, lines, transactionDate, memo, postedBy, connection }) {
    const glLines = [];
    let totalCost = 0;

    for (const line of lines) {
      if (!line.itemId || !line.quantity) continue;
      // Get item standard cost
      const [items] = await (connection || pool).query('SELECT standard_cost FROM items WHERE id = ?', [line.itemId]);
      const cost = line.quantity * (items.length ? Number(items[0].standard_cost || 0) : 0);
      if (cost <= 0) continue;
      totalCost += cost;
      
      const cogsAcct = await this.getItemGLAccount(line.itemId, 'cogs', 'gl_default_cogs');
      const invAcct = await this.getItemGLAccount(line.itemId, 'inventory', 'gl_default_inventory_fg');
      
      glLines.push({ accountNumber: cogsAcct, debit: cost, credit: 0 });
      glLines.push({ accountNumber: invAcct, debit: 0, credit: cost });
    }

    if (totalCost > 0) {
      // Consolidate lines by account
      const consolidated = {};
      for (const l of glLines) {
        const key = `${l.accountNumber}-${l.debit > 0 ? 'D' : 'C'}`;
        if (!consolidated[key]) consolidated[key] = { ...l };
        else { consolidated[key].debit += l.debit; consolidated[key].credit += l.credit; }
      }

      return this.postJournalEntry({
        transactionDate,
        sourceType: 'shipment',
        sourceId: shipmentId,
        memo: memo || `Shipment #${shipmentId}`,
        postedBy,
        lines: Object.values(consolidated),
        connection
      });
    }
  }

  /**
   * Post WO Material Issue GL entry: Debit WIP, Credit Raw Materials Inventory
   */
  static async postMaterialIssue({ workOrderId, lines, transactionDate, memo, postedBy, connection }) {
    const wipAcct = await this.getDefaultAccount('gl_default_inventory_wip');
    const glLines = [];
    let totalCost = 0;

    for (const line of lines) {
      if (!line.itemId || !line.quantity) continue;
      const [items] = await (connection || pool).query('SELECT standard_cost FROM items WHERE id = ?', [line.itemId]);
      const cost = line.quantity * (items.length ? Number(items[0].standard_cost || 0) : 0);
      if (cost <= 0) continue;
      totalCost += cost;
      
      const rawAcct = await this.getItemGLAccount(line.itemId, 'inventory', 'gl_default_inventory_raw');
      glLines.push({ accountNumber: rawAcct, debit: 0, credit: cost });
    }

    if (totalCost > 0) {
      glLines.push({ accountNumber: wipAcct, debit: totalCost, credit: 0 });
      
      return this.postJournalEntry({
        transactionDate,
        sourceType: 'wo_material_issue',
        sourceId: workOrderId,
        memo: memo || `WO Material Issue - WO #${workOrderId}`,
        postedBy,
        lines: glLines,
        connection
      });
    }
  }

  /**
   * Post WO Receipt GL entry: Debit Finished Goods, Credit WIP
   */
  static async postWOReceipt({ workOrderId, itemId, quantity, transactionDate, memo, postedBy, connection }) {
    const wipAcct = await this.getDefaultAccount('gl_default_inventory_wip');
    const fgAcct = await this.getItemGLAccount(itemId, 'inventory', 'gl_default_inventory_fg');
    
    const [items] = await (connection || pool).query('SELECT standard_cost FROM items WHERE id = ?', [itemId]);
    const cost = quantity * (items.length ? Number(items[0].standard_cost || 0) : 0);
    
    if (cost > 0) {
      return this.postJournalEntry({
        transactionDate,
        sourceType: 'wo_receipt',
        sourceId: workOrderId,
        memo: memo || `WO Receipt - WO #${workOrderId}`,
        postedBy,
        lines: [
          { accountNumber: fgAcct, debit: cost, credit: 0 },
          { accountNumber: wipAcct, debit: 0, credit: cost }
        ],
        connection
      });
    }
  }

  /**
   * Post Inventory Adjustment GL entry: Debit/Credit Inventory, Credit/Debit Adjustment Expense
   */
  static async postInventoryAdjustment({ adjustmentId, itemId, quantity, cost, adjustmentType, transactionDate, memo, postedBy, connection }) {
    const invAcct = await this.getItemGLAccount(itemId, 'inventory', 'gl_default_inventory_raw');
    // Use COGS as the offset account for adjustments (could be a separate adjustment account)
    const offsetAcct = await this.getDefaultAccount('gl_default_cogs');
    
    const totalCost = Math.abs(quantity * (cost || 0));
    if (totalCost <= 0) return;

    const lines = adjustmentType === 'increase'
      ? [
          { accountNumber: invAcct, debit: totalCost, credit: 0 },
          { accountNumber: offsetAcct, debit: 0, credit: totalCost }
        ]
      : [
          { accountNumber: offsetAcct, debit: totalCost, credit: 0 },
          { accountNumber: invAcct, debit: 0, credit: totalCost }
        ];

    return this.postJournalEntry({
      transactionDate,
      sourceType: 'inventory_adjustment',
      sourceId: adjustmentId,
      memo: memo || `Inventory Adjustment #${adjustmentId}`,
      postedBy,
      lines,
      connection
    });
  }
}

module.exports = GLService;
