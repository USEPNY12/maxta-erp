-- Max TA Group ERP - Schema V2 Additions
-- Adds: email_log, credit_memos, credit_memo_lines, customer_deposits, 
--        debit_memos, quality_ncr, and new columns on existing tables

-- Email Log - tracks all emails sent from the system
CREATE TABLE IF NOT EXISTS email_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL,
    document_id INT NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    cc_address VARCHAR(255) NULL,
    subject VARCHAR(255) NOT NULL,
    sent_by INT NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_id VARCHAR(255) NULL,
    status ENUM('sent', 'failed', 'bounced') DEFAULT 'sent',
    error_message TEXT NULL,
    INDEX idx_document (document_type, document_id),
    INDEX idx_sent_at (sent_at)
);

-- Credit Memos (AR) - issued to customers for returns, errors, discounts
CREATE TABLE IF NOT EXISTS credit_memos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    memo_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    invoice_id INT NULL,
    memo_date DATE NOT NULL,
    reason ENUM('return', 'damaged', 'pricing_error', 'discount', 'other') NOT NULL DEFAULT 'other',
    reason_notes TEXT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_applied DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('draft', 'posted', 'applied', 'void') NOT NULL DEFAULT 'draft',
    notes TEXT NULL,
    created_by INT NOT NULL,
    posted_by INT NULL,
    posted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
);

-- Credit Memo Lines
CREATE TABLE IF NOT EXISTS credit_memo_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_memo_id INT NOT NULL,
    item_id INT NULL,
    description VARCHAR(255) NULL,
    quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (credit_memo_id) REFERENCES credit_memos(id)
);

-- Customer Deposits - advance payments on sales orders before shipping
CREATE TABLE IF NOT EXISTS customer_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deposit_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    sales_order_id INT NOT NULL,
    deposit_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('check', 'credit_card', 'wire_transfer', 'ach', 'cash') NOT NULL DEFAULT 'check',
    reference_number VARCHAR(50) NULL,
    bank_id INT NULL,
    amount_applied DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('received', 'unapplied', 'applied', 'refunded', 'void') NOT NULL DEFAULT 'unapplied',
    notes TEXT NULL,
    received_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_id),
    INDEX idx_sales_order (sales_order_id),
    INDEX idx_status (status)
);

-- Debit Memos (AP) - charges to vendors for returns, shortages
CREATE TABLE IF NOT EXISTS debit_memos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    memo_number VARCHAR(20) NOT NULL UNIQUE,
    vendor_id INT NOT NULL,
    ap_invoice_id INT NULL,
    memo_date DATE NOT NULL,
    reason ENUM('return', 'shortage', 'damaged', 'pricing_error', 'other') NOT NULL DEFAULT 'other',
    reason_notes TEXT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_applied DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('draft', 'posted', 'applied', 'void') NOT NULL DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vendor (vendor_id)
);

-- Quality Control / Non-Conformance Reports
CREATE TABLE IF NOT EXISTS quality_ncr (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ncr_number VARCHAR(20) NOT NULL UNIQUE,
    work_order_id INT NULL,
    item_id INT NULL,
    operation_id INT NULL,
    ncr_date DATE NOT NULL,
    defect_type ENUM('crack', 'chip', 'scratch', 'dimension', 'coating', 'inclusion', 'warp', 'other') NOT NULL,
    severity ENUM('minor', 'major', 'critical') NOT NULL DEFAULT 'major',
    quantity_affected DECIMAL(12,4) NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    disposition ENUM('pending', 'accept', 'rework', 'scrap', 'return_to_vendor') NOT NULL DEFAULT 'pending',
    disposition_notes TEXT NULL,
    reported_by INT NOT NULL,
    disposition_by INT NULL,
    disposition_date DATE NULL,
    status ENUM('open', 'in_review', 'closed') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_work_order (work_order_id),
    INDEX idx_status (status)
);

-- Recreate audit_log with proper structure if it doesn't have the right columns
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    record_id BIGINT UNSIGNED NOT NULL,
    operation VARCHAR(20) NOT NULL,
    changed_by INT UNSIGNED NULL,
    changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    old_data JSON NULL,
    new_data JSON NULL,
    ip_address VARCHAR(45) NULL,
    notes VARCHAR(255) NULL,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_changed_by (changed_by),
    INDEX idx_changed_at (changed_at)
);

-- Ensure system_settings exists
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    category VARCHAR(50) NULL,
    description VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings for email
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('email_host', '', 'string', 'email', 'SMTP server hostname'),
('email_port', '587', 'number', 'email', 'SMTP server port'),
('email_secure', 'false', 'boolean', 'email', 'Use TLS/SSL'),
('email_user', '', 'string', 'email', 'SMTP username/email'),
('email_password', '', 'string', 'email', 'SMTP password'),
('email_from', '', 'string', 'email', 'From email address'),
('email_company_name', 'Max TA Group LLC', 'string', 'email', 'Company name in emails'),
('company_phone', '', 'string', 'company', 'Company phone number'),
('company_address', '', 'string', 'company', 'Company address'),
('default_payment_terms', 'Net 30', 'string', 'sales', 'Default payment terms for new customers'),
('tax_rate', '0', 'number', 'sales', 'Default tax rate percentage'),
('require_deposit', 'false', 'boolean', 'sales', 'Require deposit on new orders'),
('deposit_percentage', '50', 'number', 'sales', 'Default deposit percentage');

-- Add sequences for new document types (using existing table structure: seq_name, prefix, current_value, increment_by, pad_length)
INSERT IGNORE INTO sequences (seq_name, prefix, current_value, increment_by, pad_length) VALUES
('credit_memo', 'CM-', 1000, 1, 4),
('deposit', 'DEP-', 1000, 1, 4),
('debit_memo', 'DM-', 1000, 1, 4),
('ncr', 'NCR-', 1000, 1, 4);
