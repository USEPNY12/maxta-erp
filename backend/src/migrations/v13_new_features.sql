-- =====================================================
-- MaxTA ERP v13 - New Features Migration
-- Features: Smart Glazier Integration, Dispatch/Rack,
--           Notifications, Gantt Scheduling, CRM, Documents/Email
-- =====================================================

-- =====================================================
-- FEATURE 1: Smart Glazier Integration
-- =====================================================

CREATE TABLE IF NOT EXISTS sg_integration_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_url VARCHAR(255) DEFAULT 'https://api.smartglazier.com',
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  company_id VARCHAR(100),
  sync_enabled TINYINT(1) DEFAULT 0,
  sync_interval_minutes INT DEFAULT 15,
  last_sync_at DATETIME,
  last_sync_status ENUM('success','failed','running') DEFAULT NULL,
  last_sync_message TEXT,
  auto_create_so TINYINT(1) DEFAULT 1,
  auto_create_wo TINYINT(1) DEFAULT 0,
  default_payment_terms VARCHAR(50) DEFAULT 'Net 30',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sg_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sg_order_id VARCHAR(100) UNIQUE NOT NULL,
  sg_order_number VARCHAR(50),
  sg_customer_id VARCHAR(100),
  sg_customer_name VARCHAR(200),
  sg_customer_email VARCHAR(200),
  sg_order_date DATETIME,
  sg_status VARCHAR(50),
  sg_total DECIMAL(12,2),
  sg_currency VARCHAR(10) DEFAULT 'USD',
  sg_raw_data JSON,
  local_customer_id INT,
  local_sales_order_id INT,
  local_work_order_id INT,
  sync_status ENUM('pending','synced','error','ignored') DEFAULT 'pending',
  sync_error TEXT,
  synced_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (local_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (local_sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sg_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sg_order_id INT NOT NULL,
  sg_line_id VARCHAR(100),
  product_type VARCHAR(100),
  description TEXT,
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  thickness DECIMAL(10,2),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  glass_type VARCHAR(100),
  edge_work VARCHAR(100),
  cutouts TEXT,
  hardware JSON,
  dxf_file_url VARCHAR(500),
  local_item_id INT,
  local_so_line_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sg_order_id) REFERENCES sg_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (local_item_id) REFERENCES items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sg_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_type ENUM('orders','customers','products','status_push') NOT NULL,
  direction ENUM('pull','push') NOT NULL,
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  status ENUM('success','partial','failed') NOT NULL,
  error_details TEXT,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FEATURE 2: Dispatch & Rack Management
-- =====================================================

CREATE TABLE IF NOT EXISTS racks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rack_number VARCHAR(30) UNIQUE NOT NULL,
  rack_type ENUM('a-frame','l-rack','stillage','flat-bed','custom') NOT NULL,
  capacity_sqft DECIMAL(10,2),
  capacity_pieces INT,
  max_weight_lbs DECIMAL(10,2),
  max_height_inches DECIMAL(10,2),
  max_width_inches DECIMAL(10,2),
  status ENUM('available','loaded','in-transit','at-customer','maintenance','retired') DEFAULT 'available',
  current_location VARCHAR(100),
  current_shipment_id INT,
  last_inspection_date DATE,
  next_inspection_date DATE,
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (current_shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rack_loads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rack_id INT NOT NULL,
  shipment_id INT,
  work_order_id INT,
  sales_order_id INT,
  loaded_by INT,
  loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unloaded_at DATETIME,
  unloaded_by INT,
  load_sequence INT,
  piece_count INT,
  total_weight_lbs DECIMAL(10,2),
  total_sqft DECIMAL(10,2),
  notes TEXT,
  status ENUM('loading','loaded','in-transit','delivered','unloaded') DEFAULT 'loading',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (loaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dispatch_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_number VARCHAR(30) UNIQUE NOT NULL,
  route_date DATE NOT NULL,
  driver_name VARCHAR(100),
  vehicle VARCHAR(100),
  status ENUM('planning','confirmed','in-progress','completed','cancelled') DEFAULT 'planning',
  estimated_start TIME,
  actual_start TIME,
  estimated_end TIME,
  actual_end TIME,
  total_stops INT DEFAULT 0,
  total_miles DECIMAL(10,2),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dispatch_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  stop_sequence INT NOT NULL,
  shipment_id INT,
  customer_id INT,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  contact_name VARCHAR(100),
  contact_phone VARCHAR(30),
  estimated_arrival TIME,
  actual_arrival TIME,
  status ENUM('pending','arrived','delivered','failed','skipped') DEFAULT 'pending',
  delivery_notes TEXT,
  signature_file VARCHAR(255),
  photo_files JSON,
  rack_ids JSON,
  racks_returned JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES dispatch_routes(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- =====================================================
-- FEATURE 3: Notifications & Alerts Engine
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type ENUM('inventory_low','invoice_overdue','wo_deadline','credit_limit','payment_received','order_received','shipment_delivered','maintenance_due','custom') NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  conditions JSON,
  notify_roles JSON,
  notify_users JSON,
  notify_method ENUM('in_app','email','both') DEFAULT 'in_app',
  frequency ENUM('immediate','daily_digest','weekly_digest') DEFAULT 'immediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  rule_id INT,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','error','success') DEFAULT 'info',
  category ENUM('inventory','sales','purchasing','manufacturing','accounting','system','dispatch') NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME,
  is_dismissed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email_enabled TINYINT(1) DEFAULT 1,
  in_app_enabled TINYINT(1) DEFAULT 1,
  digest_frequency ENUM('immediate','daily','weekly','none') DEFAULT 'immediate',
  muted_categories JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- FEATURE 4: Gantt Production Scheduling
-- =====================================================

CREATE TABLE IF NOT EXISTS production_schedule_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  work_center_id INT,
  routing_step_id INT,
  title VARCHAR(200),
  scheduled_start DATETIME NOT NULL,
  scheduled_end DATETIME NOT NULL,
  actual_start DATETIME,
  actual_end DATETIME,
  duration_hours DECIMAL(8,2),
  status ENUM('planned','scheduled','in-progress','completed','delayed','blocked') DEFAULT 'planned',
  priority INT DEFAULT 5,
  dependencies JSON,
  assigned_to VARCHAR(100),
  color VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_center_capacity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_center_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  shift_start TIME NOT NULL DEFAULT '07:00:00',
  shift_end TIME NOT NULL DEFAULT '17:00:00',
  capacity_hours DECIMAL(5,2) DEFAULT 10.00,
  max_concurrent_jobs INT DEFAULT 1,
  is_available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS capacity_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_center_id INT NOT NULL,
  override_date DATE NOT NULL,
  capacity_hours DECIMAL(5,2),
  is_closed TINYINT(1) DEFAULT 0,
  reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE CASCADE
);

-- =====================================================
-- FEATURE 5: CRM & Activity Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(200),
  contact_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(30),
  source ENUM('website','referral','trade_show','cold_call','smart_glazier','walk_in','other') DEFAULT 'other',
  status ENUM('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new',
  estimated_value DECIMAL(12,2),
  assigned_to INT,
  customer_id INT,
  notes TEXT,
  lost_reason VARCHAR(200),
  won_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_type ENUM('call','email','meeting','site_visit','quote_sent','follow_up','note','task') NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  customer_id INT,
  lead_id INT,
  contact_name VARCHAR(100),
  scheduled_at DATETIME,
  completed_at DATETIME,
  duration_minutes INT,
  status ENUM('planned','completed','cancelled','overdue') DEFAULT 'planned',
  assigned_to INT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_pipeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stages JSON NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FEATURE 6: Document Management & Email Integration
-- =====================================================

CREATE TABLE IF NOT EXISTS document_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  mime_type VARCHAR(100),
  reference_type ENUM('sales_order','work_order','purchase_order','shipment','invoice','customer','vendor','quote','rack','dispatch') NOT NULL,
  reference_id INT NOT NULL,
  category ENUM('drawing','dxf','photo','document','email','signature','other') DEFAULT 'document',
  uploaded_by INT,
  description TEXT,
  is_from_smart_glazier TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  template_type ENUM('invoice','quote','order_confirmation','shipment_notification','payment_receipt','overdue_reminder','welcome','custom') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(100),
  cc_email VARCHAR(255),
  bcc_email VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_id INT,
  reference_type VARCHAR(50),
  reference_id INT,
  attachments JSON,
  status ENUM('queued','sending','sent','failed','cancelled') DEFAULT 'queued',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  sent_at DATETIME,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default notification rules
INSERT INTO notification_rules (rule_name, rule_type, is_active, conditions, notify_roles, notify_method) VALUES
('Low Stock Alert', 'inventory_low', 1, '{"threshold_type": "reorder_point"}', '["admin","inventory_manager"]', 'both'),
('Invoice Overdue 30 Days', 'invoice_overdue', 1, '{"days_overdue": 30}', '["admin","accounting"]', 'both'),
('WO Deadline Tomorrow', 'wo_deadline', 1, '{"days_before": 1}', '["admin","production_manager"]', 'in_app'),
('Credit Limit Exceeded', 'credit_limit', 1, '{"threshold_percent": 90}', '["admin","sales_manager"]', 'both'),
('Payment Received', 'payment_received', 1, '{}', '["admin","accounting"]', 'in_app'),
('New Order from Smart Glazier', 'order_received', 1, '{"source": "smart_glazier"}', '["admin","sales"]', 'both'),
('Shipment Delivered', 'shipment_delivered', 1, '{}', '["admin","shipping"]', 'in_app'),
('Rack Maintenance Due', 'maintenance_due', 1, '{"days_before": 7}', '["admin","shipping"]', 'in_app');

-- Default email templates
INSERT INTO email_templates (template_name, template_type, subject, body_html, variables) VALUES
('Invoice Email', 'invoice', 'Invoice {{invoice_number}} from Max TA Group', '<h2>Invoice {{invoice_number}}</h2><p>Dear {{customer_name}},</p><p>Please find attached invoice {{invoice_number}} for {{total}} due on {{due_date}}.</p><p>Thank you for your business.</p><p>Max TA Group LLC</p>', '["invoice_number","customer_name","total","due_date"]'),
('Quote Email', 'quote', 'Quote {{quote_number}} from Max TA Group', '<h2>Quote {{quote_number}}</h2><p>Dear {{customer_name}},</p><p>Thank you for your inquiry. Please find our quote attached.</p><p>This quote is valid for 30 days.</p><p>Max TA Group LLC</p>', '["quote_number","customer_name","total"]'),
('Order Confirmation', 'order_confirmation', 'Order Confirmation {{order_number}}', '<h2>Order Confirmed</h2><p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed and is in production.</p><p>Estimated delivery: {{estimated_delivery}}</p><p>Max TA Group LLC</p>', '["order_number","customer_name","estimated_delivery"]'),
('Shipment Notification', 'shipment_notification', 'Your Order Has Shipped - {{shipment_number}}', '<h2>Shipment Notification</h2><p>Dear {{customer_name}},</p><p>Your order has been shipped (Shipment: {{shipment_number}}).</p><p>Tracking: {{tracking_number}}</p><p>Max TA Group LLC</p>', '["shipment_number","customer_name","tracking_number"]'),
('Payment Receipt', 'payment_receipt', 'Payment Receipt - {{payment_number}}', '<h2>Payment Received</h2><p>Dear {{customer_name}},</p><p>We have received your payment of {{amount}}. Thank you!</p><p>Max TA Group LLC</p>', '["payment_number","customer_name","amount"]'),
('Overdue Reminder', 'overdue_reminder', 'Payment Reminder - Invoice {{invoice_number}} Overdue', '<h2>Payment Reminder</h2><p>Dear {{customer_name}},</p><p>Invoice {{invoice_number}} for {{total}} was due on {{due_date}} and is now {{days_overdue}} days overdue.</p><p>Please remit payment at your earliest convenience.</p><p>Max TA Group LLC</p>', '["invoice_number","customer_name","total","due_date","days_overdue"]');

-- Default CRM pipeline
INSERT INTO crm_pipeline (name, stages, is_default) VALUES
('Default Sales Pipeline', '["New Lead","Initial Contact","Qualification","Proposal Sent","Negotiation","Closed Won","Closed Lost"]', 1);

-- Default work center capacity (Mon-Fri, 7am-5pm)
INSERT INTO work_center_capacity (work_center_id, day_of_week, shift_start, shift_end, capacity_hours, max_concurrent_jobs)
SELECT wc.id, dow.d, '07:00:00', '17:00:00', 10.00, 1
FROM work_centers wc
CROSS JOIN (SELECT 1 AS d UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) dow
WHERE NOT EXISTS (SELECT 1 FROM work_center_capacity WHERE work_center_id = wc.id AND day_of_week = dow.d);

-- Default racks
INSERT INTO racks (rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, status, current_location) VALUES
('RACK-001', 'a-frame', 120.00, 20, 2000.00, 96.00, 144.00, 'available', 'Warehouse'),
('RACK-002', 'a-frame', 120.00, 20, 2000.00, 96.00, 144.00, 'available', 'Warehouse'),
('RACK-003', 'a-frame', 80.00, 15, 1500.00, 84.00, 120.00, 'available', 'Warehouse'),
('RACK-004', 'l-rack', 60.00, 10, 1000.00, 72.00, 96.00, 'available', 'Warehouse'),
('RACK-005', 'l-rack', 60.00, 10, 1000.00, 72.00, 96.00, 'available', 'Warehouse'),
('RACK-006', 'stillage', 200.00, 30, 3000.00, 108.00, 168.00, 'available', 'Warehouse'),
('RACK-007', 'flat-bed', 300.00, 50, 5000.00, 120.00, 240.00, 'available', 'Warehouse'),
('RACK-008', 'a-frame', 120.00, 20, 2000.00, 96.00, 144.00, 'available', 'Warehouse');
