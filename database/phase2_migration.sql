-- Phase 2 Migration: Create tables and seed data for CPQ, Approvals, Commissions
-- This file runs AFTER the main dump import to ensure Phase 2 tables exist with seed data
-- All statements use IF NOT EXISTS / INSERT IGNORE for idempotency

CREATE TABLE IF NOT EXISTS pricing_matrix (
  id INT AUTO_INCREMENT PRIMARY KEY,
  glass_type VARCHAR(100) NOT NULL,
  thickness DECIMAL(5,3) NOT NULL,
  price_per_sqft DECIMAL(10,2) NOT NULL,
  min_sqft DECIMAL(10,2) DEFAULT 3.00,
  cost_per_sqft DECIMAL(10,2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_glass_thickness (glass_type, thickness)
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  document_type ENUM('quote','sales_order','purchase_order','work_order') NOT NULL,
  condition_field VARCHAR(50) NOT NULL,
  condition_operator ENUM('>','<','>=','<=','=','!=') NOT NULL,
  condition_value DECIMAL(15,2) NOT NULL,
  approver_role VARCHAR(50) DEFAULT 'manager',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  document_id INT NOT NULL,
  document_number VARCHAR(50),
  workflow_id INT,
  submitted_by INT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  comments TEXT,
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_currency_date (from_currency, to_currency, effective_date)
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  condition_type ENUM('default','high_value','new_customer','product_category') NOT NULL,
  condition_value VARCHAR(100),
  commission_rate DECIMAL(5,2) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesperson_id INT NOT NULL,
  invoice_id INT,
  invoice_number VARCHAR(50),
  invoice_total DECIMAL(15,2),
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(15,2),
  status ENUM('pending','earned','paid') DEFAULT 'pending',
  earned_date DATE,
  paid_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fabrication_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  charge_type ENUM('per_sqft','per_linear_ft','per_hole','per_piece','flat') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data
INSERT IGNORE INTO pricing_matrix (glass_type, thickness, price_per_sqft, cost_per_sqft, min_sqft) VALUES
('Clear Annealed', 0.125, 6.00, 2.50, 3.00),
('Clear Annealed', 0.188, 7.00, 3.00, 3.00),
('Clear Annealed', 0.250, 8.50, 3.50, 3.00),
('Clear Annealed', 0.375, 12.00, 5.00, 3.00),
('Clear Annealed', 0.500, 16.00, 7.00, 3.00),
('Clear Annealed', 0.750, 24.00, 10.00, 4.00),
('Clear Tempered', 0.125, 9.00, 4.00, 3.00),
('Clear Tempered', 0.188, 10.50, 4.50, 3.00),
('Clear Tempered', 0.250, 12.50, 5.50, 3.00),
('Clear Tempered', 0.375, 17.00, 7.50, 3.00),
('Clear Tempered', 0.500, 22.00, 10.00, 3.00),
('Clear Tempered', 0.750, 32.00, 14.00, 4.00),
('Laminated', 0.250, 15.00, 6.50, 3.00),
('Laminated', 0.375, 20.00, 9.00, 3.00),
('Laminated', 0.500, 26.00, 12.00, 3.00),
('Low-E', 0.250, 14.00, 6.00, 3.00),
('Low-E', 0.375, 18.00, 8.00, 3.00),
('Low-E', 0.500, 24.00, 11.00, 3.00),
('Mirror', 0.125, 8.00, 3.50, 3.00),
('Mirror', 0.188, 9.50, 4.00, 3.00),
('Mirror', 0.250, 11.00, 5.00, 3.00),
('Starphire', 0.250, 16.00, 7.00, 3.00),
('Starphire', 0.375, 22.00, 10.00, 3.00),
('Starphire', 0.500, 28.00, 13.00, 3.00),
('Tinted Bronze', 0.250, 10.00, 4.50, 3.00),
('Tinted Gray', 0.250, 10.00, 4.50, 3.00),
('Tinted Green', 0.250, 10.00, 4.50, 3.00);

INSERT IGNORE INTO fabrication_charges (category, name, charge_type, price, cost) VALUES
('Edge Work', 'Seamed Edge', 'per_linear_ft', 2.00, 0.80),
('Edge Work', 'Flat Polish', 'per_linear_ft', 4.50, 1.80),
('Edge Work', 'Pencil Polish', 'per_linear_ft', 3.50, 1.40),
('Edge Work', 'Beveled Edge', 'per_linear_ft', 8.00, 3.20),
('Edge Work', 'Mitered Edge', 'per_linear_ft', 6.00, 2.40),
('Holes', 'Standard Hole', 'per_hole', 12.00, 4.00),
('Holes', 'Large Hole', 'per_hole', 18.00, 6.00),
('Holes', 'Countersink', 'per_hole', 22.00, 8.00),
('Cutouts', 'Standard Notch', 'per_piece', 35.00, 12.00),
('Cutouts', 'L-Shape Cutout', 'per_piece', 45.00, 16.00),
('Cutouts', 'U-Shape Cutout', 'per_piece', 55.00, 20.00),
('Coatings', 'Hydrophobic Coating', 'per_sqft', 3.00, 1.20),
('Coatings', 'Low-E Coating', 'per_sqft', 5.00, 2.00),
('Coatings', 'Acid Etch', 'per_sqft', 4.00, 1.60),
('Tempering', 'Heat Strengthened', 'per_sqft', 3.50, 1.50),
('Tempering', 'Fully Tempered', 'per_sqft', 4.50, 2.00);

INSERT IGNORE INTO approval_workflows (name, document_type, condition_field, condition_operator, condition_value, approver_role) VALUES
('High Value Quote', 'quote', 'total_amount', '>', 10000.00, 'manager'),
('Large Discount', 'quote', 'discount_percent', '>', 15.00, 'manager'),
('Low Margin Alert', 'quote', 'margin_percent', '<', 20.00, 'director'),
('High Value PO', 'purchase_order', 'total_amount', '>', 25000.00, 'manager');

INSERT IGNORE INTO commission_rules (name, condition_type, condition_value, commission_rate) VALUES
('Default Commission', 'default', NULL, 5.00),
('High Value Orders (>$10K)', 'high_value', '10000', 7.50),
('New Customer Bonus', 'new_customer', NULL, 8.00);

INSERT IGNORE INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
('USD', 'CAD', 1.3600, '2026-06-27'),
('USD', 'EUR', 0.9200, '2026-06-27'),
('USD', 'GBP', 0.7900, '2026-06-27'),
('USD', 'MXN', 17.2000, '2026-06-27');
