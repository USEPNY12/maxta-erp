const pool = require('./config/database');

module.exports = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS sg_orders (id INT AUTO_INCREMENT PRIMARY KEY, sg_order_id VARCHAR(100), sg_quote_id VARCHAR(100), customer_name VARCHAR(255), customer_email VARCHAR(255), order_date DATETIME, total_amount DECIMAL(12,2), status ENUM('pending','imported','processing','completed','cancelled') DEFAULT 'pending', sales_order_id INT, raw_data JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sg_order_items (id INT AUTO_INCREMENT PRIMARY KEY, sg_order_id INT, product_type VARCHAR(100), width DECIMAL(10,2), height DECIMAL(10,2), quantity INT DEFAULT 1, glass_type VARCHAR(100), thickness VARCHAR(50), edge_work VARCHAR(100), coatings VARCHAR(255), unit_price DECIMAL(10,2), notes TEXT, dxf_file_url VARCHAR(500))`,
    `CREATE TABLE IF NOT EXISTS sg_config (id INT AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) UNIQUE, setting_value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS dispatch_racks (id INT AUTO_INCREMENT PRIMARY KEY, rack_number VARCHAR(50) UNIQUE, rack_type ENUM('A-frame','L-frame','Harp','Flat') DEFAULT 'A-frame', capacity_slots INT DEFAULT 20, current_load INT DEFAULT 0, status ENUM('available','in-use','in-transit','maintenance','retired') DEFAULT 'available', location VARCHAR(255), assigned_route_id INT, last_inspection DATE, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS dispatch_routes (id INT AUTO_INCREMENT PRIMARY KEY, route_name VARCHAR(255), driver_name VARCHAR(255), vehicle VARCHAR(100), planned_date DATE, status ENUM('planning','scheduled','in-progress','completed','cancelled') DEFAULT 'planning', total_stops INT DEFAULT 0, total_distance DECIMAL(10,2), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS dispatch_stops (id INT AUTO_INCREMENT PRIMARY KEY, route_id INT, stop_order INT, customer_name VARCHAR(255), address TEXT, sales_order_id INT, rack_id INT, estimated_arrival TIME, actual_arrival TIME, status ENUM('pending','arrived','delivered','failed') DEFAULT 'pending', signature_url VARCHAR(500), notes TEXT)`,
    `CREATE TABLE IF NOT EXISTS notification_rules (id INT AUTO_INCREMENT PRIMARY KEY, rule_name VARCHAR(255), event_type VARCHAR(100), condition_field VARCHAR(100), condition_operator VARCHAR(20), condition_value VARCHAR(255), action_type ENUM('in-app','email','sms','webhook') DEFAULT 'in-app', recipients TEXT, message_template TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, title VARCHAR(255), message TEXT, type VARCHAR(50) DEFAULT 'info', reference_type VARCHAR(50), reference_id INT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS schedule_entries (id INT AUTO_INCREMENT PRIMARY KEY, work_order_id INT, work_center_id INT, operation_name VARCHAR(255), planned_start DATETIME, planned_end DATETIME, actual_start DATETIME, actual_end DATETIME, status ENUM('scheduled','in-progress','completed','delayed','cancelled') DEFAULT 'scheduled', priority INT DEFAULT 5, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS work_center_capacity (id INT AUTO_INCREMENT PRIMARY KEY, work_center_id INT, day_of_week TINYINT, available_hours DECIMAL(4,1) DEFAULT 8.0, shift_start TIME DEFAULT '07:00:00', shift_end TIME DEFAULT '15:30:00', is_available BOOLEAN DEFAULT TRUE)`,
    `CREATE TABLE IF NOT EXISTS crm_leads (id INT AUTO_INCREMENT PRIMARY KEY, company_name VARCHAR(255), contact_name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), source VARCHAR(100), status ENUM('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new', estimated_value DECIMAL(12,2), notes TEXT, assigned_to INT, customer_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS crm_activities (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT, customer_id INT, activity_type ENUM('call','email','meeting','note','task','follow-up') DEFAULT 'note', subject VARCHAR(255), description TEXT, due_date DATETIME, completed_at DATETIME, assigned_to INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS document_attachments (id INT AUTO_INCREMENT PRIMARY KEY, reference_type VARCHAR(50), reference_id INT, file_name VARCHAR(255), file_path VARCHAR(500), file_size INT, mime_type VARCHAR(100), uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS email_templates (id INT AUTO_INCREMENT PRIMARY KEY, template_name VARCHAR(255), subject VARCHAR(500), body TEXT, template_type VARCHAR(50), variables JSON, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS email_log (id INT AUTO_INCREMENT PRIMARY KEY, template_id INT, recipient_email VARCHAR(255), subject VARCHAR(500), body TEXT, reference_type VARCHAR(50), reference_id INT, status ENUM('sent','failed','pending') DEFAULT 'pending', sent_at DATETIME, error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const sql of tables) {
    try { await pool.query(sql); } catch(e) { console.log('Migration:', e.message.substring(0, 80)); }
  }
  console.log('V3 migrations: All tables verified');

  // Seed data if empty
  try {
    const [racks] = await pool.query('SELECT COUNT(*) as cnt FROM dispatch_racks');
    if (racks[0].cnt === 0) {
      await pool.query(`INSERT INTO dispatch_racks (rack_number, rack_type, capacity_slots, status, location) VALUES 
        ('RACK-001', 'A-frame', 20, 'available', 'Warehouse Bay 1'),
        ('RACK-002', 'A-frame', 20, 'available', 'Warehouse Bay 2'),
        ('RACK-003', 'L-frame', 15, 'available', 'Warehouse Bay 3'),
        ('RACK-004', 'Harp', 30, 'in-use', 'Loading Dock'),
        ('RACK-005', 'A-frame', 20, 'in-transit', 'Customer Site')`);
    }
    const [rules] = await pool.query('SELECT COUNT(*) as cnt FROM notification_rules');
    if (rules[0].cnt === 0) {
      await pool.query(`INSERT INTO notification_rules (rule_name, event_type, condition_field, condition_operator, condition_value, action_type, message_template, is_active) VALUES 
        ('Low Stock Alert', 'inventory_change', 'quantity_on_hand', 'less_than', 'reorder_point', 'in-app', 'Item {{item_name}} is below reorder point', TRUE),
        ('Overdue Invoice', 'daily_check', 'due_date', 'less_than', 'today', 'email', 'Invoice {{invoice_number}} is overdue', TRUE),
        ('WO Deadline Warning', 'daily_check', 'due_date', 'within_days', '2', 'in-app', 'Work Order {{wo_number}} is due soon', TRUE),
        ('New Order Received', 'order_created', 'status', 'equals', 'new', 'in-app', 'New order received from {{customer_name}}', TRUE),
        ('Payment Received', 'payment_received', 'amount', 'greater_than', '0', 'in-app', 'Payment received for invoice {{invoice_number}}', TRUE)`);
    }
    const [templates] = await pool.query('SELECT COUNT(*) as cnt FROM email_templates');
    if (templates[0].cnt === 0) {
      await pool.query(`INSERT INTO email_templates (template_name, subject, body, template_type, is_active) VALUES 
        ('Invoice Email', 'Invoice {{invoice_number}} from Max TA Group', '<p>Dear {{customer_name}},</p><p>Please find attached invoice for {{amount}}. Due: {{due_date}}</p>', 'ar_invoice', TRUE),
        ('Order Confirmation', 'Order Confirmation - {{order_number}}', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed.</p>', 'sales_order', TRUE),
        ('Shipment Notification', 'Your Order Has Shipped', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been shipped.</p>', 'shipment', TRUE),
        ('Purchase Order', 'PO {{po_number}} - Max TA Group', '<p>Dear {{vendor_name}},</p><p>Please find attached PO {{po_number}}.</p>', 'purchase_order', TRUE)`);
    }
    console.log('V3 seed: verified');
  } catch(e) { console.log('Seed:', e.message); }
};
