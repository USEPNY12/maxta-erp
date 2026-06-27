const pool = require('./config/database');

module.exports = async () => {
  const tables = [
    // DISPATCH MODULE
    `CREATE TABLE IF NOT EXISTS racks (id INT AUTO_INCREMENT PRIMARY KEY, rack_number VARCHAR(50) UNIQUE, rack_type ENUM('A-frame','L-frame','Harp','Flat','Custom') DEFAULT 'A-frame', capacity_sqft DECIMAL(10,2), capacity_pieces INT DEFAULT 20, max_weight_lbs DECIMAL(10,2), max_height_inches DECIMAL(10,2), max_width_inches DECIMAL(10,2), status ENUM('available','loaded','in-transit','at-customer','maintenance','retired') DEFAULT 'available', current_location VARCHAR(255), assigned_route_id INT, last_inspection DATE, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS rack_loads (id INT AUTO_INCREMENT PRIMARY KEY, rack_id INT, shipment_id INT, work_order_id INT, sales_order_id INT, loaded_by INT, load_sequence INT, piece_count INT, total_weight_lbs DECIMAL(10,2), total_sqft DECIMAL(10,2), notes TEXT, status ENUM('loaded','in-transit','delivered','unloaded') DEFAULT 'loaded', loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, delivered_at DATETIME, unloaded_at DATETIME)`,
    `CREATE TABLE IF NOT EXISTS dispatch_routes (id INT AUTO_INCREMENT PRIMARY KEY, route_name VARCHAR(255), route_date DATE, driver_name VARCHAR(255), vehicle VARCHAR(100), status ENUM('planning','scheduled','in-progress','completed','cancelled') DEFAULT 'planning', total_stops INT DEFAULT 0, total_distance_miles DECIMAL(10,2), estimated_duration_hours DECIMAL(5,1), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS dispatch_stops (id INT AUTO_INCREMENT PRIMARY KEY, route_id INT, stop_order INT, customer_id INT, customer_name VARCHAR(255), address TEXT, city VARCHAR(100), state VARCHAR(50), zip VARCHAR(20), sales_order_id INT, shipment_id INT, rack_id INT, estimated_arrival TIME, actual_arrival TIME, status ENUM('pending','en-route','arrived','delivered','failed','skipped') DEFAULT 'pending', signature_url VARCHAR(500), delivery_notes TEXT, photo_urls JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

    // NOTIFICATIONS MODULE
    `CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, title VARCHAR(255), message TEXT, category VARCHAR(50) DEFAULT 'general', priority ENUM('low','normal','high','urgent') DEFAULT 'normal', reference_type VARCHAR(50), reference_id INT, is_read BOOLEAN DEFAULT FALSE, is_dismissed BOOLEAN DEFAULT FALSE, read_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS notification_rules (id INT AUTO_INCREMENT PRIMARY KEY, rule_name VARCHAR(255), rule_type VARCHAR(100), event_type VARCHAR(100), conditions JSON, notify_roles JSON, notify_users JSON, notify_method ENUM('in-app','email','both') DEFAULT 'in-app', frequency ENUM('immediate','hourly','daily') DEFAULT 'immediate', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT UNIQUE, email_enabled BOOLEAN DEFAULT TRUE, in_app_enabled BOOLEAN DEFAULT TRUE, digest_frequency ENUM('immediate','hourly','daily','weekly') DEFAULT 'immediate', muted_categories JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,

    // SCHEDULING MODULE
    `CREATE TABLE IF NOT EXISTS production_schedule_entries (id INT AUTO_INCREMENT PRIMARY KEY, work_order_id INT, work_center_id INT, routing_step_id INT, title VARCHAR(255), scheduled_start DATETIME, scheduled_end DATETIME, duration_hours DECIMAL(6,2), priority INT DEFAULT 5, assigned_to VARCHAR(255), color VARCHAR(20) DEFAULT '#3B82F6', notes TEXT, dependencies JSON, status ENUM('scheduled','in-progress','completed','delayed','cancelled','on-hold') DEFAULT 'scheduled', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS work_center_capacity (id INT AUTO_INCREMENT PRIMARY KEY, work_center_id INT, day_of_week TINYINT, capacity_hours DECIMAL(5,2) DEFAULT 8.0, shift_start TIME DEFAULT '07:00:00', shift_end TIME DEFAULT '15:30:00', is_available BOOLEAN DEFAULT TRUE, UNIQUE KEY unique_wc_day (work_center_id, day_of_week))`,
    `CREATE TABLE IF NOT EXISTS capacity_overrides (id INT AUTO_INCREMENT PRIMARY KEY, work_center_id INT, override_date DATE, capacity_hours DECIMAL(5,2), is_closed BOOLEAN DEFAULT FALSE, reason VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_wc_date (work_center_id, override_date))`,

    // CRM MODULE
    `CREATE TABLE IF NOT EXISTS crm_leads (id INT AUTO_INCREMENT PRIMARY KEY, lead_number VARCHAR(50) UNIQUE, company_name VARCHAR(255), contact_name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), source VARCHAR(100), status ENUM('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new', pipeline_stage_id INT, estimated_value DECIMAL(12,2), probability INT DEFAULT 50, expected_close_date DATE, notes TEXT, assigned_to INT, customer_id INT, lost_reason VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS crm_activities (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT, customer_id INT, activity_type ENUM('call','email','meeting','note','task','follow-up','quote') DEFAULT 'note', subject VARCHAR(255), description TEXT, due_date DATETIME, completed_at DATETIME, outcome VARCHAR(255), assigned_to INT, created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS crm_pipeline (id INT AUTO_INCREMENT PRIMARY KEY, pipeline_name VARCHAR(255), stages JSON, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

    // SMART GLAZIER MODULE
    `CREATE TABLE IF NOT EXISTS sg_integration_config (id INT AUTO_INCREMENT PRIMARY KEY, api_url VARCHAR(500), api_key VARCHAR(255), api_secret VARCHAR(255), company_id VARCHAR(100), sync_enabled BOOLEAN DEFAULT FALSE, sync_interval_minutes INT DEFAULT 30, auto_create_so BOOLEAN DEFAULT TRUE, auto_create_wo BOOLEAN DEFAULT FALSE, default_payment_terms VARCHAR(50), last_sync_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sg_orders (id INT AUTO_INCREMENT PRIMARY KEY, sg_order_id VARCHAR(100) UNIQUE, sg_quote_id VARCHAR(100), sg_customer_name VARCHAR(255), sg_customer_email VARCHAR(255), sg_customer_phone VARCHAR(50), order_date DATETIME, total_amount DECIMAL(12,2), currency VARCHAR(10) DEFAULT 'USD', status ENUM('pending','imported','processing','completed','cancelled','error') DEFAULT 'pending', local_customer_id INT, local_sales_order_id INT, local_work_order_id INT, raw_data JSON, error_message TEXT, imported_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sg_order_lines (id INT AUTO_INCREMENT PRIMARY KEY, sg_order_id INT, line_number INT, product_type VARCHAR(100), description TEXT, width_mm DECIMAL(10,2), height_mm DECIMAL(10,2), quantity INT DEFAULT 1, glass_type VARCHAR(100), thickness_mm DECIMAL(5,2), edge_work VARCHAR(100), coatings VARCHAR(255), tint VARCHAR(100), unit_price DECIMAL(10,2), total_price DECIMAL(10,2), dxf_url VARCHAR(500), notes TEXT)`,
    `CREATE TABLE IF NOT EXISTS sg_sync_log (id INT AUTO_INCREMENT PRIMARY KEY, sync_type VARCHAR(50), direction ENUM('inbound','outbound') DEFAULT 'inbound', status ENUM('success','partial','failed') DEFAULT 'success', records_processed INT DEFAULT 0, records_created INT DEFAULT 0, records_updated INT DEFAULT 0, records_failed INT DEFAULT 0, error_details TEXT, started_at DATETIME, completed_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

    // DOCUMENT MANAGEMENT MODULE
    `CREATE TABLE IF NOT EXISTS document_attachments (id INT AUTO_INCREMENT PRIMARY KEY, file_name VARCHAR(255), file_path VARCHAR(500), file_type VARCHAR(50), file_size INT, mime_type VARCHAR(100), reference_type VARCHAR(50), reference_id INT, category VARCHAR(50) DEFAULT 'general', description TEXT, uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS email_templates (id INT AUTO_INCREMENT PRIMARY KEY, template_name VARCHAR(255), template_type VARCHAR(50), subject VARCHAR(500), body_html TEXT, body_text TEXT, variables JSON, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS email_queue (id INT AUTO_INCREMENT PRIMARY KEY, to_email VARCHAR(255), to_name VARCHAR(255), cc_email VARCHAR(255), subject VARCHAR(500), body_html TEXT, body_text TEXT, template_id INT, reference_type VARCHAR(50), reference_id INT, attachments JSON, status ENUM('queued','sending','sent','failed') DEFAULT 'queued', sent_at DATETIME, error_message TEXT, retry_count INT DEFAULT 0, created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const sql of tables) {
    try { await pool.query(sql); } catch(e) { console.log('Migration:', e.message.substring(0, 100)); }
  }
  // Add missing columns to existing tables (no IF NOT EXISTS - not supported in MySQL < 8.0.37)
  const alterations = [
    `ALTER TABLE notifications ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE AFTER is_read`,
  ];
  for (const sql of alterations) {
    try { await pool.query(sql); } catch(e) { /* column may already exist - ignore error 1060 */ }  
  }
  console.log('V3 migrations: All tables created/verified');

  // Seed initial data
  try {
    const [racks] = await pool.query('SELECT COUNT(*) as cnt FROM racks');
    if (racks[0].cnt === 0) {
      await pool.query(`INSERT INTO racks (rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, status, current_location) VALUES 
        ('RACK-001', 'A-frame', 120.00, 20, 2000, 96, 60, 'available', 'Warehouse Bay 1'),
        ('RACK-002', 'A-frame', 120.00, 20, 2000, 96, 60, 'available', 'Warehouse Bay 2'),
        ('RACK-003', 'L-frame', 80.00, 15, 1500, 72, 48, 'available', 'Warehouse Bay 3'),
        ('RACK-004', 'Harp', 200.00, 30, 3000, 120, 72, 'loaded', 'Loading Dock'),
        ('RACK-005', 'A-frame', 120.00, 20, 2000, 96, 60, 'in-transit', 'En route - Customer ABC')`);
    }
    const [rules] = await pool.query('SELECT COUNT(*) as cnt FROM notification_rules');
    if (rules[0].cnt === 0) {
      await pool.query(`INSERT INTO notification_rules (rule_name, rule_type, event_type, conditions, notify_roles, notify_users, notify_method, frequency, is_active) VALUES 
        ('Low Stock Alert', 'threshold', 'inventory_change', '{"field":"quantity_on_hand","operator":"less_than","value":"reorder_point"}', '["admin","inventory"]', '[]', 'both', 'immediate', TRUE),
        ('Overdue Invoice Alert', 'schedule', 'daily_check', '{"field":"due_date","operator":"less_than","value":"today"}', '["admin","accounting"]', '[]', 'email', 'daily', TRUE),
        ('WO Due Soon', 'schedule', 'daily_check', '{"field":"due_date","operator":"within_days","value":"2"}', '["admin","production"]', '[]', 'in-app', 'daily', TRUE),
        ('New Sales Order', 'event', 'order_created', '{"field":"status","operator":"equals","value":"new"}', '["admin","sales"]', '[]', 'in-app', 'immediate', TRUE),
        ('Payment Received', 'event', 'payment_received', '{"field":"amount","operator":"greater_than","value":"0"}', '["admin","accounting"]', '[]', 'in-app', 'immediate', TRUE)`);
    }
    const [templates] = await pool.query('SELECT COUNT(*) as cnt FROM email_templates');
    if (templates[0].cnt === 0) {
      await pool.query(`INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, is_active) VALUES 
        ('Invoice Email', 'ar_invoice', 'Invoice {{invoice_number}} from Max TA Group', '<p>Dear {{customer_name}},</p><p>Please find attached invoice {{invoice_number}} for {{amount}}.</p><p>Due: {{due_date}}</p>', 'Invoice {{invoice_number}} - Amount: {{amount}} - Due: {{due_date}}', TRUE),
        ('Order Confirmation', 'sales_order', 'Order Confirmation - {{order_number}}', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed and is in production.</p>', 'Order {{order_number}} confirmed.', TRUE),
        ('Shipment Notification', 'shipment', 'Your Order Has Shipped - {{order_number}}', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been shipped.</p>', 'Order {{order_number}} shipped.', TRUE),
        ('Purchase Order', 'purchase_order', 'PO {{po_number}} - Max TA Group', '<p>Dear {{vendor_name}},</p><p>Please find attached PO {{po_number}}. Required by: {{required_date}}</p>', 'PO {{po_number}} - Required by {{required_date}}', TRUE)`);
    }
    const [pipeline] = await pool.query('SELECT COUNT(*) as cnt FROM crm_pipeline');
    if (pipeline[0].cnt === 0) {
      await pool.query(`INSERT INTO crm_pipeline (pipeline_name, stages, is_default) VALUES ('Default Sales Pipeline', '["New Lead","Contacted","Qualified","Proposal Sent","Negotiation","Closed Won","Closed Lost"]', TRUE)`);
    }
    console.log('V3 seed data: verified');
  } catch(e) { console.log('Seed:', e.message); }
};
