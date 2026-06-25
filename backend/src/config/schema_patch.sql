-- Schema Patch: Align schema with route code expectations
-- MySQL 8.0 compatible (no ADD COLUMN IF NOT EXISTS)

-- 1. Add 'balance' column to ar_invoices
ALTER TABLE ar_invoices ADD COLUMN balance DECIMAL(12,2) DEFAULT 0 AFTER total;

-- 2. Add 'freight' column to ar_invoices (route inserts 'freight')
ALTER TABLE ar_invoices ADD COLUMN freight DECIMAL(12,2) DEFAULT 0 AFTER freight_amount;

-- 3. Modify ar_invoices status enum to include 'open'
ALTER TABLE ar_invoices MODIFY COLUMN status ENUM('draft','open','posted','partial','paid','void') DEFAULT 'draft';

-- 4. Add 'balance' column to ap_invoices
ALTER TABLE ap_invoices ADD COLUMN balance DECIMAL(12,2) DEFAULT 0 AFTER total;

-- 5. Add 'amount' and 'freight' columns to ap_invoices
ALTER TABLE ap_invoices ADD COLUMN amount DECIMAL(12,2) DEFAULT 0 AFTER subtotal;
ALTER TABLE ap_invoices ADD COLUMN freight DECIMAL(12,2) DEFAULT 0 AFTER freight_amount;

-- 6. Add 'entered_by' to ap_invoices
ALTER TABLE ap_invoices ADD COLUMN entered_by INT AFTER notes;

-- 7. Modify ap_invoices status enum to include 'open'
ALTER TABLE ap_invoices MODIFY COLUMN status ENUM('draft','open','posted','partial','paid','void') DEFAULT 'draft';

-- 8. Add 'balance' column to gl_accounts
ALTER TABLE gl_accounts ADD COLUMN balance DECIMAL(14,2) DEFAULT 0 AFTER current_balance;

-- 9. Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  routing_number VARCHAR(20),
  gl_account_id INT,
  current_balance DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

-- 10. Create journal_voucher_lines table
CREATE TABLE IF NOT EXISTS journal_voucher_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_voucher_id INT NOT NULL,
  line_number INT NOT NULL,
  gl_account_id INT NOT NULL,
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  memo VARCHAR(255),
  reference VARCHAR(50),
  FOREIGN KEY (journal_voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

-- 11. Add columns to journal_vouchers
ALTER TABLE journal_vouchers ADD COLUMN period VARCHAR(20) AFTER period_id;
ALTER TABLE journal_vouchers ADD COLUMN memo VARCHAR(255) AFTER description;
ALTER TABLE journal_vouchers ADD COLUMN reference VARCHAR(50) AFTER memo;
ALTER TABLE journal_vouchers ADD COLUMN total_debit_amt DECIMAL(14,2) DEFAULT 0 AFTER total_credit;
ALTER TABLE journal_vouchers ADD COLUMN total_credit_amt DECIMAL(14,2) DEFAULT 0 AFTER total_debit_amt;

-- 12. Create gl_transactions table
CREATE TABLE IF NOT EXISTS gl_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gl_account_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  period VARCHAR(20),
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  source_type VARCHAR(50),
  source_id INT,
  memo VARCHAR(255),
  posted_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

-- 13. Create recuts table
CREATE TABLE IF NOT EXISTS recuts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  work_center_id INT,
  quantity DECIMAL(12,4) NOT NULL,
  reason_code VARCHAR(20),
  notes TEXT,
  reported_by INT,
  reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id)
);

-- 14. Add columns to work_orders
ALTER TABLE work_orders ADD COLUMN wo_number VARCHAR(20) AFTER order_number;
ALTER TABLE work_orders ADD COLUMN qty_completed DECIMAL(12,4) DEFAULT 0 AFTER quantity_completed;
ALTER TABLE work_orders ADD COLUMN qty_scrapped DECIMAL(12,4) DEFAULT 0 AFTER quantity_scrapped;
ALTER TABLE work_orders ADD COLUMN actual_finish_date DATETIME AFTER finish_date;
ALTER TABLE work_orders ADD COLUMN order_date DATE AFTER release_date;

-- 15. Modify work_orders status enum to include 'scheduled' and 'completed'
ALTER TABLE work_orders MODIFY COLUMN status ENUM('planned','scheduled','released','in_progress','complete','completed','closed','cancelled') DEFAULT 'planned';

-- 16. Add columns to wo_routing
ALTER TABLE wo_routing ADD COLUMN operation_number INT AFTER sequence;
ALTER TABLE wo_routing ADD COLUMN actual_start DATETIME AFTER end_date;
ALTER TABLE wo_routing ADD COLUMN actual_finish DATETIME AFTER actual_start;
ALTER TABLE wo_routing ADD COLUMN actual_hours DECIMAL(8,4) DEFAULT 0 AFTER actual_finish;

-- 17. Modify wo_routing status enum to include 'completed'
ALTER TABLE wo_routing MODIFY COLUMN status ENUM('pending','in_progress','complete','completed') DEFAULT 'pending';

-- 18. Add columns to shop_floor_tracking
ALTER TABLE shop_floor_tracking ADD COLUMN operator_id INT AFTER operator_name;
ALTER TABLE shop_floor_tracking ADD COLUMN quantity_in DECIMAL(12,4) DEFAULT 0 AFTER operator_id;
ALTER TABLE shop_floor_tracking ADD COLUMN quantity_out DECIMAL(12,4) DEFAULT 0 AFTER quantity_in;
ALTER TABLE shop_floor_tracking ADD COLUMN quantity_scrapped DECIMAL(12,4) DEFAULT 0 AFTER quantity_out;

-- 19. Make wo_routing_id nullable in shop_floor_tracking
ALTER TABLE shop_floor_tracking MODIFY COLUMN wo_routing_id INT NULL;

-- 20. Modify shop_floor_tracking status enum
ALTER TABLE shop_floor_tracking MODIFY COLUMN status ENUM('queued','in_progress','complete','completed','on_hold','recut') DEFAULT 'queued';

-- 21. Add columns to wo_labor
ALTER TABLE wo_labor ADD COLUMN work_center_id INT AFTER work_order_id;
ALTER TABLE wo_labor ADD COLUMN employee_id INT AFTER work_center_id;
ALTER TABLE wo_labor ADD COLUMN hours DECIMAL(6,2) DEFAULT 0 AFTER hours_worked;
ALTER TABLE wo_labor ADD COLUMN rate DECIMAL(10,2) DEFAULT 0 AFTER hours;

-- 22. Create vendor_items table
CREATE TABLE IF NOT EXISTS vendor_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  vendor_id INT NOT NULL,
  vendor_item_number VARCHAR(50),
  vendor_description VARCHAR(255),
  unit_cost DECIMAL(12,4),
  lead_time_days INT DEFAULT 0,
  min_order_qty DECIMAL(12,4) DEFAULT 1,
  is_preferred BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- 23. Add bank_account_id to customer_payments
ALTER TABLE customer_payments ADD COLUMN bank_account_id INT AFTER bank_id;

-- 24. Add ar_invoice_id to payment_applications
ALTER TABLE payment_applications ADD COLUMN ar_invoice_id INT AFTER invoice_id;

-- 25. Add location_id to po_receipts
ALTER TABLE po_receipts ADD COLUMN location_id INT AFTER status;

-- 26. Add po_receipt_id to po_receipt_lines
ALTER TABLE po_receipt_lines ADD COLUMN po_receipt_id INT AFTER receipt_id;

-- 27. Add sequence_order to work_centers
ALTER TABLE work_centers ADD COLUMN sequence_order INT DEFAULT 0 AFTER is_active;

-- 28. Add received_by and is_posted to wo_receipts
ALTER TABLE wo_receipts ADD COLUMN received_by INT AFTER entered_by;
ALTER TABLE wo_receipts ADD COLUMN is_posted BOOLEAN DEFAULT FALSE AFTER posted;

-- 29. Create bank_reconciliations table
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_account_id INT NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(14,2) NOT NULL,
  book_balance DECIMAL(14,2),
  adjusted_balance DECIMAL(14,2),
  difference DECIMAL(14,2),
  status ENUM('in_progress','reconciled') DEFAULT 'in_progress',
  reconciled_by INT,
  reconciled_date DATETIME,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- 30. Add item_type to items
ALTER TABLE items ADD COLUMN item_type VARCHAR(50) AFTER item_type_id;

-- 31. Add vendor_id and po_number to lots
ALTER TABLE lots ADD COLUMN vendor_id INT AFTER location_id;
ALTER TABLE lots ADD COLUMN po_number VARCHAR(50) AFTER vendor_id;

-- 32. Add journal_voucher sequence
INSERT INTO sequences (seq_name, prefix, current_value, pad_length) VALUES
('journal_voucher', 'JV-', 1000, 5)
ON DUPLICATE KEY UPDATE seq_name=seq_name;

-- 33. Populate wo_number from order_number
UPDATE work_orders SET wo_number = order_number WHERE wo_number IS NULL;
UPDATE work_orders SET order_date = COALESCE(release_date, created_at) WHERE order_date IS NULL;
UPDATE wo_routing SET operation_number = sequence WHERE operation_number IS NULL;
UPDATE wo_labor SET hours = hours_worked WHERE hours = 0 AND hours_worked > 0;
UPDATE wo_labor SET rate = labor_rate WHERE rate = 0 AND labor_rate > 0;

-- 34. Seed bank_accounts from banks
INSERT INTO bank_accounts (account_name, bank_name, account_number, routing_number, gl_account_id, current_balance, is_active)
SELECT bank_name, bank_name, account_number, routing_number, gl_account_id, current_balance, is_active FROM banks
ON DUPLICATE KEY UPDATE account_name=account_name;

-- 35. Update work_centers sequence_order
UPDATE work_centers SET sequence_order = id WHERE sequence_order = 0;
