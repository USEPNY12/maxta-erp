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
    `CREATE TABLE IF NOT EXISTS email_log (id INT AUTO_INCREMENT PRIMARY KEY, template_id INT, recipient_email VARCHAR(255), subject VARCHAR(500), body TEXT, reference_type VARCHAR(50), reference_id INT, status ENUM('sent','failed','pending') DEFAULT 'pending', sent_at DATETIME, error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    // Lamination Module Tables
    `CREATE TABLE IF NOT EXISTS lami_interlayer_rolls (id INT AUTO_INCREMENT PRIMARY KEY, roll_number VARCHAR(50) UNIQUE NOT NULL, material_type ENUM('PVB','SGP','EVA','TPU','Acoustic_PVB','Colored_PVB','SentryGlas') NOT NULL, thickness_mm DECIMAL(6,2) NOT NULL, width_mm DECIMAL(8,2) NOT NULL, original_length_m DECIMAL(8,2) NOT NULL, current_length_m DECIMAL(8,2) NOT NULL, lot_number VARCHAR(100) NOT NULL, manufacturer VARCHAR(255), color VARCHAR(100) DEFAULT 'Clear', received_date DATE NOT NULL, expiry_date DATE, cost_per_sqm DECIMAL(10,2), status ENUM('sealed','in_use','exhausted','expired','quarantine') DEFAULT 'sealed', location VARCHAR(255), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_bom_lines (id INT AUTO_INCREMENT PRIMARY KEY, work_order_id INT NOT NULL, sequence INT DEFAULT 10, component_type ENUM('glass_lite','interlayer','hardware','consumable','other') NOT NULL, component_item_id INT, quantity_per DECIMAL(8,2) DEFAULT 1, width_mm DECIMAL(8,2), height_mm DECIMAL(8,2), thickness_mm DECIMAL(6,2), overhang_mm DECIMAL(6,2) DEFAULT 0, uom VARCHAR(20) DEFAULT 'EA', consumed_at_operation INT, notes TEXT, child_wo_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_autoclave_recipes (id INT AUTO_INCREMENT PRIMARY KEY, recipe_name VARCHAR(255) NOT NULL, recipe_code VARCHAR(50) UNIQUE NOT NULL, interlayer_type ENUM('PVB','SGP','EVA','TPU','Acoustic_PVB') NOT NULL, min_thickness_mm DECIMAL(6,2), max_thickness_mm DECIMAL(6,2), ramp_rate_c_per_min DECIMAL(4,2) DEFAULT 1.5, target_temperature_c DECIMAL(5,1) NOT NULL, soak_time_min INT NOT NULL, max_pressure_bar DECIMAL(5,2) NOT NULL, cooling_rate_c_per_min DECIMAL(4,2) DEFAULT 2.0, total_cycle_hours DECIMAL(4,1) NOT NULL, vacuum_required BOOLEAN DEFAULT FALSE, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_autoclave_batches (id INT AUTO_INCREMENT PRIMARY KEY, batch_number VARCHAR(50) UNIQUE NOT NULL, recipe_id INT NOT NULL, interlayer_type VARCHAR(50), status ENUM('loading','loaded','in_cycle','cooling','completed','failed') DEFAULT 'loading', planned_start DATETIME, actual_start DATETIME, actual_end DATETIME, total_pieces INT DEFAULT 0, total_sqm DECIMAL(10,2) DEFAULT 0, actual_temp_max DECIMAL(5,1), actual_pressure_max DECIMAL(5,2), qc_passed BOOLEAN, qc_notes TEXT, operator_id INT, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_autoclave_batch_items (id INT AUTO_INCREMENT PRIMARY KEY, batch_id INT NOT NULL, work_order_id INT NOT NULL, layup_record_id INT, position_in_batch INT, width_mm DECIMAL(8,2), height_mm DECIMAL(8,2), total_thickness_mm DECIMAL(6,2), sqm DECIMAL(8,4), status ENUM('loaded','in_cycle','completed','failed','removed') DEFAULT 'loaded', notes TEXT)`,
    `CREATE TABLE IF NOT EXISTS lami_cleanroom_sessions (id INT AUTO_INCREMENT PRIMARY KEY, session_number VARCHAR(50) UNIQUE NOT NULL, operator_id INT, temperature_c DECIMAL(4,1), humidity_percent DECIMAL(4,1), start_time DATETIME NOT NULL, end_time DATETIME, status ENUM('active','completed','aborted') DEFAULT 'active', total_layups INT DEFAULT 0, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_layup_records (id INT AUTO_INCREMENT PRIMARY KEY, work_order_id INT NOT NULL, cleanroom_session_id INT, roll_id INT, interlayer_lot_number VARCHAR(100), interlayer_width_mm DECIMAL(8,2), interlayer_length_mm DECIMAL(8,2), temperature_c DECIMAL(4,1), humidity_percent DECIMAL(4,1), pre_press_method ENUM('nip_roller','vacuum_bag','none') DEFAULT 'nip_roller', status ENUM('layup_complete','pre_pressed','ready_for_autoclave','in_autoclave','completed','failed') DEFAULT 'layup_complete', operator_id INT, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_interlayer_cut_plans (id INT AUTO_INCREMENT PRIMARY KEY, plan_number VARCHAR(50) UNIQUE NOT NULL, roll_id INT NOT NULL, total_pieces INT DEFAULT 0, total_length_used_m DECIMAL(8,2) DEFAULT 0, waste_length_m DECIMAL(8,2) DEFAULT 0, waste_percent DECIMAL(5,2) DEFAULT 0, status ENUM('planned','in_progress','completed','cancelled') DEFAULT 'planned', created_by INT, executed_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lami_interlayer_cut_plan_items (id INT AUTO_INCREMENT PRIMARY KEY, plan_id INT NOT NULL, work_order_id INT, sequence INT, cut_width_mm DECIMAL(8,2) NOT NULL, cut_length_mm DECIMAL(8,2) NOT NULL, position_on_roll_m DECIMAL(8,2), notes TEXT)`
  ];

  for (const sql of tables) {
    try { await pool.query(sql); } catch(e) { console.log('Migration:', e.message.substring(0, 80)); }
  }

  // Add columns to work_orders for lamination parent/child WO support
  const phase5AlterStatements = [
    "ALTER TABLE work_orders ADD COLUMN parent_wo_id INT DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN wo_category ENUM('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard'",
    "ALTER TABLE notifications ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE",
    "ALTER TABLE sales_order_lines ADD COLUMN has_notches TINYINT(1) DEFAULT 0",
    "ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type ENUM('receipt','issue','adjustment','transfer','return','scrap','wo_receipt','wo_issue','po_receipt','shipment') NOT NULL",
    "ALTER TABLE wo_receipts ADD COLUMN notes TEXT NULL"
  ];
  for (const sql of phase5AlterStatements) {
    try { await pool.query(sql); } catch(e) { /* column already exists - ignore */ }
  }

  // Performance indexes
  const indexStatements = [
    "CREATE INDEX idx_gl_source ON gl_transactions(source_type, source_id)",
    "CREATE INDEX idx_gl_date ON gl_transactions(transaction_date)",
    "CREATE INDEX idx_wo_status ON work_orders(status)",
    "CREATE INDEX idx_wo_product_type ON work_orders(product_type)",
    "CREATE INDEX idx_wo_parent ON work_orders(parent_wo_id)",
    "CREATE INDEX idx_so_status ON sales_orders(status)",
    "CREATE INDEX idx_sol_prod_status ON sales_order_lines(production_status)",
    "CREATE INDEX idx_ari_status ON ar_invoices(status)",
    "CREATE INDEX idx_pol_po ON po_lines(purchase_order_id)",
    "CREATE INDEX idx_sl_shipment ON shipment_lines(shipment_id)",
    "CREATE INDEX idx_wor_wo_seq ON wo_routing(work_order_id, sequence)",
    "CREATE INDEX idx_invt_item_date ON inventory_transactions(item_id, created_at)"
  ];
  for (const sql of indexStatements) {
    try { await pool.query(sql); } catch(e) { /* index already exists - ignore */ }
  }
  console.log('V3 migrations: All tables verified');

  // Seed data if empty
  try {
    const [racks] = await pool.query('SELECT COUNT(*) as cnt FROM dispatch_racks');
    if (racks[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO dispatch_racks (rack_number, rack_type, capacity_slots, status, location) VALUES 
        ('RACK-001', 'A-frame', 20, 'available', 'Warehouse Bay 1'),
        ('RACK-002', 'A-frame', 20, 'available', 'Warehouse Bay 2'),
        ('RACK-003', 'L-frame', 15, 'available', 'Warehouse Bay 3'),
        ('RACK-004', 'Harp', 30, 'in-use', 'Loading Dock'),
        ('RACK-005', 'A-frame', 20, 'in-transit', 'Customer Site')`);
    }
    const [rules] = await pool.query('SELECT COUNT(*) as cnt FROM notification_rules');
    if (rules[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO notification_rules (rule_name, event_type, condition_field, condition_operator, condition_value, action_type, message_template, is_active) VALUES 
        ('Low Stock Alert', 'inventory_change', 'quantity_on_hand', 'less_than', 'reorder_point', 'in-app', 'Item {{item_name}} is below reorder point', TRUE),
        ('Overdue Invoice', 'daily_check', 'due_date', 'less_than', 'today', 'email', 'Invoice {{invoice_number}} is overdue', TRUE),
        ('WO Deadline Warning', 'daily_check', 'due_date', 'within_days', '2', 'in-app', 'Work Order {{wo_number}} is due soon', TRUE),
        ('New Order Received', 'order_created', 'status', 'equals', 'new', 'in-app', 'New order received from {{customer_name}}', TRUE),
        ('Payment Received', 'payment_received', 'amount', 'greater_than', '0', 'in-app', 'Payment received for invoice {{invoice_number}}', TRUE)`);
    }
    const [templates] = await pool.query('SELECT COUNT(*) as cnt FROM email_templates');
    if (templates[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO email_templates (template_name, subject, body, template_type, is_active) VALUES 
        ('Invoice Email', 'Invoice {{invoice_number}} from Max TA Group', '<p>Dear {{customer_name}},</p><p>Please find attached invoice for {{amount}}. Due: {{due_date}}</p>', 'ar_invoice', TRUE),
        ('Order Confirmation', 'Order Confirmation - {{order_number}}', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed.</p>', 'sales_order', TRUE),
        ('Shipment Notification', 'Your Order Has Shipped', '<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been shipped.</p>', 'shipment', TRUE),
        ('Purchase Order', 'PO {{po_number}} - Max TA Group', '<p>Dear {{vendor_name}},</p><p>Please find attached PO {{po_number}}.</p>', 'purchase_order', TRUE)`);
    }
    console.log('V3 seed: verified');
  } catch(e) { console.log('Seed:', e.message); }

  // Lamination seed data
  try {
    const [recipes] = await pool.query('SELECT COUNT(*) as cnt FROM lami_autoclave_recipes');
    if (recipes[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO lami_autoclave_recipes (recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required, notes) VALUES
        ('PVB Standard', 'PVB-STD', 'PVB', 6.00, 20.00, 1.5, 135.0, 60, 12.00, 2.0, 3.5, FALSE, 'Standard PVB cycle for 6-20mm total thickness'),
        ('PVB Thick', 'PVB-THK', 'PVB', 20.00, 50.00, 1.0, 140.0, 90, 14.00, 1.5, 5.0, FALSE, 'Extended cycle for thick laminated assemblies'),
        ('SGP Standard', 'SGP-STD', 'SGP', 6.00, 30.00, 2.0, 135.0, 45, 12.50, 2.0, 3.0, FALSE, 'Standard SGP/SentryGlas cycle'),
        ('EVA Standard', 'EVA-STD', 'EVA', 4.00, 20.00, 1.5, 110.0, 30, 0.00, 2.0, 2.0, TRUE, 'EVA vacuum-only process - no pressure'),
        ('Acoustic PVB', 'PVB-ACO', 'Acoustic_PVB', 8.00, 30.00, 1.2, 130.0, 75, 12.00, 1.8, 4.0, FALSE, 'Acoustic PVB requires lower temp and longer soak')`);
    }
    const [rolls] = await pool.query('SELECT COUNT(*) as cnt FROM lami_interlayer_rolls');
    if (rolls[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO lami_interlayer_rolls (roll_number, material_type, thickness_mm, width_mm, original_length_m, current_length_m, lot_number, manufacturer, color, received_date, expiry_date, cost_per_sqm, status) VALUES
        ('PVB-R001', 'PVB', 0.76, 2500, 100.00, 78.50, 'LOT-2024-A1', 'Eastman', 'Clear', '2024-06-01', '2026-06-01', 8.50, 'in_use'),
        ('PVB-R002', 'PVB', 1.52, 2500, 100.00, 100.00, 'LOT-2024-A2', 'Eastman', 'Clear', '2024-06-15', '2026-06-15', 14.00, 'sealed'),
        ('SGP-R001', 'SGP', 1.52, 1830, 50.00, 42.30, 'LOT-2024-B1', 'Kuraray', 'Clear', '2024-05-01', '2026-05-01', 45.00, 'in_use'),
        ('EVA-R001', 'EVA', 0.76, 2100, 80.00, 80.00, 'LOT-2024-C1', 'Bridgestone', 'Clear', '2024-07-01', '2026-07-01', 6.00, 'sealed'),
        ('PVB-R003', 'Acoustic_PVB', 0.76, 2500, 100.00, 65.20, 'LOT-2024-D1', 'Eastman', 'Clear', '2024-04-01', '2025-10-01', 12.50, 'in_use')`);
    }
    console.log('Lamination seed: verified');
  } catch(e) { console.log('Lamination seed:', e.message); }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: CPQ, Approvals, Commissions, Exchange Rates
  // ═══════════════════════════════════════════════════════════════════
  const phase2Tables = [
    `CREATE TABLE IF NOT EXISTS pricing_matrix (
      id INT AUTO_INCREMENT PRIMARY KEY,
      glass_type VARCHAR(100) NOT NULL,
      thickness VARCHAR(20) NOT NULL,
      price_per_sqft DECIMAL(10,2) NOT NULL,
      min_sqft DECIMAL(10,2) DEFAULT 3.00,
      min_charge DECIMAL(10,2) DEFAULT 0.00,
      markup_percent DECIMAL(5,2) DEFAULT 0.00,
      cost_per_sqft DECIMAL(10,2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_glass_thickness (glass_type, thickness)
    )`,
    `CREATE TABLE IF NOT EXISTS fabrication_charges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      default_rate DECIMAL(10,2) NOT NULL,
      pricing_method ENUM('per_linear_foot','per_sq_ft','per_hole','per_piece','flat') NOT NULL DEFAULT 'per_piece',
      cost DECIMAL(10,2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quantity_breaks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      min_qty INT NOT NULL,
      max_qty INT NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS approval_workflows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      condition_field VARCHAR(50) NOT NULL,
      condition_operator VARCHAR(10) NOT NULL,
      condition_value DECIMAL(15,2) NOT NULL,
      condition_value2 DECIMAL(15,2) DEFAULT NULL,
      approver_role VARCHAR(50) DEFAULT 'manager',
      approver_user_id INT DEFAULT NULL,
      priority INT DEFAULT 1,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS approval_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_id INT,
      document_type VARCHAR(50) NOT NULL,
      document_id INT NOT NULL,
      document_number VARCHAR(50),
      requested_by INT,
      approver_id INT,
      trigger_reason TEXT,
      trigger_value DECIMAL(15,2),
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      comments TEXT,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      decision_at TIMESTAMP NULL
    )`,
    `CREATE TABLE IF NOT EXISTS exchange_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      from_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      to_currency VARCHAR(3) NOT NULL,
      rate DECIMAL(12,6) NOT NULL,
      effective_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_currency_date (from_currency, to_currency, effective_date)
    )`,
    `CREATE TABLE IF NOT EXISTS commission_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      salesperson_id INT DEFAULT NULL,
      customer_type VARCHAR(100),
      min_revenue DECIMAL(15,2) DEFAULT 0,
      max_revenue DECIMAL(15,2) DEFAULT 999999999,
      commission_rate DECIMAL(5,2) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS commissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      salesperson_id INT NOT NULL,
      invoice_id INT,
      invoice_number VARCHAR(50),
      invoice_amount DECIMAL(15,2),
      commission_rate DECIMAL(5,2),
      commission_amount DECIMAL(15,2),
      status ENUM('pending','approved','paid') DEFAULT 'pending',
      paid_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS salespeople (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      user_id INT,
      commission_rate DECIMAL(5,2) DEFAULT 5.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  for (const sql of phase2Tables) {
    try { await pool.query(sql); } catch(e) { console.log('Phase2 table:', e.message.substring(0, 80)); }
  }
  console.log('Phase 2 tables: verified');

  // Phase 2 seed data
  try {
    const [pm] = await pool.query('SELECT COUNT(*) as cnt FROM pricing_matrix');
    if (pm[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO pricing_matrix (glass_type, thickness, price_per_sqft, min_sqft, min_charge, markup_percent, cost_per_sqft) VALUES
        ('Clear Annealed', '1/8"', 6.00, 3.00, 18.00, 0, 2.50),
        ('Clear Annealed', '3/16"', 7.00, 3.00, 21.00, 0, 3.00),
        ('Clear Annealed', '1/4"', 8.50, 3.00, 25.50, 0, 3.50),
        ('Clear Annealed', '3/8"', 12.00, 3.00, 36.00, 0, 5.00),
        ('Clear Annealed', '1/2"', 16.00, 3.00, 48.00, 0, 7.00),
        ('Clear Annealed', '3/4"', 24.00, 4.00, 96.00, 0, 10.00),
        ('Clear Tempered', '1/8"', 9.00, 3.00, 27.00, 0, 4.00),
        ('Clear Tempered', '3/16"', 10.50, 3.00, 31.50, 0, 4.50),
        ('Clear Tempered', '1/4"', 12.50, 3.00, 37.50, 0, 5.50),
        ('Clear Tempered', '3/8"', 17.00, 3.00, 51.00, 0, 7.50),
        ('Clear Tempered', '1/2"', 22.00, 3.00, 66.00, 0, 10.00),
        ('Clear Tempered', '3/4"', 32.00, 4.00, 128.00, 0, 14.00),
        ('Laminated', '1/4"', 15.00, 3.00, 45.00, 0, 6.50),
        ('Laminated', '3/8"', 20.00, 3.00, 60.00, 0, 9.00),
        ('Laminated', '1/2"', 26.00, 3.00, 78.00, 0, 12.00),
        ('Low-E', '1/4"', 14.00, 3.00, 42.00, 0, 6.00),
        ('Low-E', '3/8"', 18.00, 3.00, 54.00, 0, 8.00),
        ('Low-E', '1/2"', 24.00, 3.00, 72.00, 0, 11.00),
        ('Mirror', '1/8"', 8.00, 3.00, 24.00, 0, 3.50),
        ('Mirror', '3/16"', 9.50, 3.00, 28.50, 0, 4.00),
        ('Mirror', '1/4"', 11.00, 3.00, 33.00, 0, 5.00),
        ('Starphire', '1/4"', 16.00, 3.00, 48.00, 0, 7.00),
        ('Starphire', '3/8"', 22.00, 3.00, 66.00, 0, 10.00),
        ('Starphire', '1/2"', 28.00, 3.00, 84.00, 0, 13.00),
        ('Tinted Bronze', '1/4"', 10.00, 3.00, 30.00, 0, 4.50),
        ('Tinted Gray', '1/4"', 10.00, 3.00, 30.00, 0, 4.50),
        ('Tinted Green', '1/4"', 10.00, 3.00, 30.00, 0, 4.50)`);
    }
    const [fc] = await pool.query('SELECT COUNT(*) as cnt FROM fabrication_charges');
    if (fc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO fabrication_charges (category, name, default_rate, pricing_method, cost) VALUES
        ('Edgework', 'Seamed Edge', 2.00, 'per_linear_foot', 0.80),
        ('Edgework', 'Flat Polish', 4.50, 'per_linear_foot', 1.80),
        ('Edgework', 'Pencil Polish', 3.50, 'per_linear_foot', 1.40),
        ('Edgework', 'Beveled Edge', 8.00, 'per_linear_foot', 3.20),
        ('Edgework', 'Mitered Edge', 6.00, 'per_linear_foot', 2.40),
        ('Edgework', 'OG Edge', 5.50, 'per_linear_foot', 2.20),
        ('Holes', 'Standard Round Hole', 12.00, 'per_hole', 4.00),
        ('Holes', 'Large Hole', 18.00, 'per_hole', 6.00),
        ('Holes', 'Countersink', 22.00, 'per_hole', 8.00),
        ('Cutouts', 'Standard Notch', 35.00, 'per_piece', 12.00),
        ('Cutouts', 'L-Shape Cutout', 45.00, 'per_piece', 16.00),
        ('Cutouts', 'U-Shape Cutout', 55.00, 'per_piece', 20.00),
        ('Coating', 'Hydrophobic Coating', 3.00, 'per_sq_ft', 1.20),
        ('Coating', 'Low-E Coating', 5.00, 'per_sq_ft', 2.00),
        ('Coating', 'Acid Etch', 4.00, 'per_sq_ft', 1.60),
        ('Tempering', 'Standard Temper', 4.50, 'per_sq_ft', 2.00),
        ('Tempering', 'Heat Strengthened', 3.50, 'per_sq_ft', 1.50),
        ('Shape', 'Custom Shape Cut', 50.00, 'per_piece', 20.00)`);
    }
    const [qb] = await pool.query('SELECT COUNT(*) as cnt FROM quantity_breaks');
    if (qb[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO quantity_breaks (name, min_qty, max_qty, discount_percent) VALUES
        ('Single Piece', 1, 4, 0.00),
        ('Small Batch (5-9)', 5, 9, 3.00),
        ('Medium Batch (10-24)', 10, 24, 5.00),
        ('Large Batch (25-49)', 25, 49, 8.00),
        ('Production Run (50-99)', 50, 99, 12.00),
        ('Bulk Order (100+)', 100, 999999, 15.00)`);
    }
    const [aw] = await pool.query('SELECT COUNT(*) as cnt FROM approval_workflows');
    if (aw[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO approval_workflows (name, document_type, condition_field, condition_operator, condition_value, approver_role, priority) VALUES
        ('High Value Quote', 'quote', 'total', 'gt', 10000.00, 'manager', 1),
        ('Large Discount', 'quote', 'max_discount_percent', 'gt', 15.00, 'manager', 2),
        ('Low Margin Alert', 'quote', 'min_margin_percent', 'lt', 20.00, 'director', 3),
        ('High Value PO', 'purchase_order', 'total', 'gt', 25000.00, 'manager', 1),
        ('Large Sales Order', 'sales_order', 'total', 'gt', 50000.00, 'director', 1)`);
    }
    const [cr] = await pool.query('SELECT COUNT(*) as cnt FROM commission_rules');
    if (cr[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO commission_rules (name, salesperson_id, customer_type, min_revenue, max_revenue, commission_rate) VALUES
        ('Default Commission', NULL, NULL, 0, 999999999, 5.00),
        ('High Value Orders (>10K)', NULL, NULL, 10000, 999999999, 7.50),
        ('New Customer Bonus', NULL, 'new', 0, 999999999, 8.00)`);
    }
    const [er] = await pool.query('SELECT COUNT(*) as cnt FROM exchange_rates');
    if (er[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
        ('USD', 'CAD', 1.3600, CURDATE()),
        ('USD', 'EUR', 0.9200, CURDATE()),
        ('USD', 'GBP', 0.7900, CURDATE()),
        ('USD', 'MXN', 17.2000, CURDATE())`);
    }
    const [sp] = await pool.query('SELECT COUNT(*) as cnt FROM salespeople');
    if (sp[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO salespeople (name, email, commission_rate) VALUES
        ('John Smith', 'john@maxtagroup.com', 5.00),
        ('Sarah Johnson', 'sarah@maxtagroup.com', 6.00),
        ('Mike Williams', 'mike@maxtagroup.com', 5.50)`);
    }
    console.log('Phase 2 seed: verified');
  } catch(e) { console.log('Phase2 seed:', e.message); }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: Document Generation, Versioning, Customer Portal
  // ═══════════════════════════════════════════════════════════════════
  const phase3Tables = [
    `CREATE TABLE IF NOT EXISTS document_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_type VARCHAR(50) NOT NULL,
      document_id INT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      file_path VARCHAR(500),
      file_size INT DEFAULT 0,
      generated_by INT,
      generation_method ENUM('manual','auto','batch','email') DEFAULT 'manual',
      checksum VARCHAR(64),
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_docver_type_id (document_type, document_id),
      INDEX idx_docver_created (created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS customer_portal_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      token VARCHAR(128) UNIQUE NOT NULL,
      token_type ENUM('session','document_link','statement_link') DEFAULT 'session',
      document_type VARCHAR(50),
      document_id INT,
      expires_at DATETIME NOT NULL,
      last_accessed DATETIME,
      access_count INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_portal_customer (customer_id),
      INDEX idx_portal_token (token)
    )`,
    `CREATE TABLE IF NOT EXISTS customer_portal_access_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      token_id INT,
      action VARCHAR(50) NOT NULL,
      document_type VARCHAR(50),
      document_id INT,
      ip_address VARCHAR(45),
      user_agent VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_portal_log_customer (customer_id)
    )`,
    `CREATE TABLE IF NOT EXISTS company_branding (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(50) UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS batch_document_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_type ENUM('statements','invoices','quotes','purchase_orders') NOT NULL,
      status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
      total_documents INT DEFAULT 0,
      processed_documents INT DEFAULT 0,
      failed_documents INT DEFAULT 0,
      parameters JSON,
      error_log TEXT,
      started_by INT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS batch_document_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      document_id INT NOT NULL,
      customer_id INT,
      status ENUM('pending','generated','emailed','failed') DEFAULT 'pending',
      file_path VARCHAR(500),
      error_message TEXT,
      processed_at DATETIME,
      INDEX idx_batch_job (job_id)
    )`,
    `CREATE TABLE IF NOT EXISTS customer_statements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      statement_date DATE NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      opening_balance DECIMAL(12,2) DEFAULT 0,
      total_invoiced DECIMAL(12,2) DEFAULT 0,
      total_payments DECIMAL(12,2) DEFAULT 0,
      total_credits DECIMAL(12,2) DEFAULT 0,
      closing_balance DECIMAL(12,2) DEFAULT 0,
      file_path VARCHAR(500),
      emailed_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stmt_customer (customer_id),
      INDEX idx_stmt_date (statement_date)
    )`
  ];
  for (const sql of phase3Tables) {
    try { await pool.query(sql); } catch(e) { console.log('Phase3 table:', e.message.substring(0, 80)); }
  }

  // Phase 3 seed: Company branding defaults
  try {
    const [cb] = await pool.query('SELECT COUNT(*) as cnt FROM company_branding');
    if (cb[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO company_branding (setting_key, setting_value) VALUES
        ('company_name', 'Max TA Group'),
        ('company_address', '123 Glass Industry Blvd, Suite 100'),
        ('company_city', 'Houston'),
        ('company_state', 'TX'),
        ('company_zip', '77001'),
        ('company_phone', '(713) 555-0100'),
        ('company_fax', '(713) 555-0101'),
        ('company_email', 'info@maxtagroup.com'),
        ('company_website', 'www.maxtagroup.com'),
        ('company_logo_url', ''),
        ('primary_color', '#1e40af'),
        ('secondary_color', '#3b82f6'),
        ('accent_color', '#f59e0b'),
        ('document_footer', 'Thank you for your business! Terms: Net 30. Late payments subject to 1.5% monthly finance charge.'),
        ('quote_terms', 'This quote is valid for 30 days from the date above. Prices are subject to change after expiration.'),
        ('invoice_terms', 'Payment is due within 30 days of invoice date. Please reference invoice number on your payment.'),
        ('po_terms', 'Please confirm receipt of this purchase order and provide estimated delivery date within 48 hours.')`);
    }
    console.log('Phase 3 tables + branding: verified');
  } catch(e) { console.log('Phase3 seed:', e.message); }

  // Fix item_type_ids and seed BOM data
  try {
    // Ensure item_type_ids are correct
    await pool.query("UPDATE items SET item_type_id = 8 WHERE item_number = 'TG-001' AND (item_type_id IS NULL OR item_type_id != 8)");
    await pool.query("UPDATE items SET item_type_id = 7 WHERE item_number = 'RG-001' AND (item_type_id IS NULL OR item_type_id != 7)");
    await pool.query("UPDATE items SET item_type_id = 9 WHERE item_number = 'LG-001' AND (item_type_id IS NULL OR item_type_id != 9)");
    
    // Create PVB interlayer item if not exists
    const [pvbCheck] = await pool.query("SELECT id FROM items WHERE item_number = 'PVB-076'");
    if (pvbCheck.length === 0) {
      await pool.query(`INSERT IGNORE INTO items (item_number, description, item_type_id, uom, is_purchased, is_material, standard_cost, qty_on_hand)
        VALUES ('PVB-076', 'PVB Interlayer Film 0.76mm', 6, 'SqFt', 1, 1, 2.50, 5000.0000)`);
    }
    
    // Create BOM for Laminated Glass (item LG-001) if not exists
    const [lgItem] = await pool.query("SELECT id FROM items WHERE item_number = 'LG-001'");
    if (lgItem.length > 0) {
      const [bomCheck] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = 1', [lgItem[0].id]);
      if (bomCheck.length === 0) {
        const [bomResult] = await pool.query(`INSERT IGNORE INTO bom_headers (item_id, revision, description, batch_size, is_active)
          VALUES (?, 'A', 'Laminated Safety Glass BOM - 2 lites + PVB interlayer', 1.0000, 1)`, [lgItem[0].id]);
        const bomId = bomResult.insertId;
        const [rgItem] = await pool.query("SELECT id FROM items WHERE item_number = 'RG-001'");
        const [pvbItem] = await pool.query("SELECT id FROM items WHERE item_number = 'PVB-076'");
        if (rgItem.length > 0 && pvbItem.length > 0) {
          await pool.query(`INSERT IGNORE INTO bom_lines (bom_id, sequence, component_item_id, quantity_per, waste_percent, uom, operation_sequence, component_type, consumed_at_operation, notes) VALUES
            (?, 10, ?, 1.000000, 5.00, 'Sheet', 10, 'glass_lite', 10, 'Outer glass lite - cut to size'),
            (?, 20, ?, 1.000000, 5.00, 'Sheet', 10, 'glass_lite', 10, 'Inner glass lite - cut to size'),
            (?, 30, ?, 1.000000, 3.00, 'SqFt', 40, 'interlayer', 40, 'PVB 0.76mm interlayer - cut in clean room')`,
            [bomId, rgItem[0].id, bomId, rgItem[0].id, bomId, pvbItem[0].id]);
        }
      }
    }
    console.log('BOM seed: verified');
  } catch(e) { console.log('BOM seed:', e.message); }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: Advanced Manufacturing & Scheduling
  // ═══════════════════════════════════════════════════════════════════
  const phase4Tables = [
    `CREATE TABLE IF NOT EXISTS machine_utilization_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_center_id INT NOT NULL,
      log_date DATE NOT NULL,
      shift ENUM('day','evening','night') DEFAULT 'day',
      available_hours DECIMAL(5,2) DEFAULT 8.00,
      productive_hours DECIMAL(5,2) DEFAULT 0.00,
      setup_hours DECIMAL(5,2) DEFAULT 0.00,
      idle_hours DECIMAL(5,2) DEFAULT 0.00,
      downtime_hours DECIMAL(5,2) DEFAULT 0.00,
      total_pieces_produced INT DEFAULT 0,
      total_sqft_produced DECIMAL(10,2) DEFAULT 0.00,
      scrap_pieces INT DEFAULT 0,
      efficiency_percent DECIMAL(5,2) DEFAULT 0.00,
      oee_percent DECIMAL(5,2) DEFAULT 0.00,
      operator_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_util_wc_date (work_center_id, log_date),
      INDEX idx_util_date (log_date)
    )`,
    `CREATE TABLE IF NOT EXISTS machine_downtime (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_center_id INT NOT NULL,
      work_order_id INT,
      downtime_start DATETIME NOT NULL,
      downtime_end DATETIME,
      duration_minutes DECIMAL(8,2),
      reason_code ENUM('breakdown','maintenance','changeover','material_wait','operator_wait','quality_hold','power_outage','other') NOT NULL,
      reason_detail TEXT,
      reported_by INT,
      resolved_by INT,
      resolution_notes TEXT,
      is_planned BOOLEAN DEFAULT FALSE,
      severity ENUM('low','medium','high','critical') DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dt_wc (work_center_id),
      INDEX idx_dt_date (downtime_start)
    )`,
    `CREATE TABLE IF NOT EXISTS qc_checkpoints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_center_id INT NOT NULL,
      checkpoint_name VARCHAR(255) NOT NULL,
      checkpoint_code VARCHAR(50),
      inspection_type ENUM('visual','measurement','functional','documentation') DEFAULT 'visual',
      measurement_type ENUM('pass_fail','numeric','range','text') DEFAULT 'pass_fail',
      target_value DECIMAL(12,4),
      min_value DECIMAL(12,4),
      max_value DECIMAL(12,4),
      unit_of_measure VARCHAR(30),
      is_critical BOOLEAN DEFAULT FALSE,
      sequence INT DEFAULT 10,
      instructions TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_qc_cp_wc (work_center_id)
    )`,
    `CREATE TABLE IF NOT EXISTS qc_checkpoint_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_order_id INT NOT NULL,
      wo_routing_id INT NOT NULL,
      checkpoint_id INT NOT NULL,
      inspector_id INT,
      result ENUM('pass','fail','conditional','na') NOT NULL,
      measured_value DECIMAL(12,4),
      notes TEXT,
      defect_photo_url VARCHAR(500),
      inspected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_qcr_wo (work_order_id),
      INDEX idx_qcr_routing (wo_routing_id)
    )`,
    `CREATE TABLE IF NOT EXISTS barcode_scan_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      barcode VARCHAR(255) NOT NULL,
      scan_type ENUM('wo_start','wo_complete','wo_pause','station_in','station_out','qc_pass','qc_fail','material_issue','rack_load','rack_unload') NOT NULL,
      work_order_id INT,
      wo_routing_id INT,
      work_center_id INT,
      operator_id INT,
      quantity DECIMAL(12,4) DEFAULT 1,
      metadata JSON,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_scan_wo (work_order_id),
      INDEX idx_scan_wc (work_center_id),
      INDEX idx_scan_date (scanned_at),
      INDEX idx_scan_barcode (barcode)
    )`,
    `CREATE TABLE IF NOT EXISTS production_kpis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kpi_date DATE NOT NULL,
      shift ENUM('day','evening','night','all') DEFAULT 'all',
      total_wo_started INT DEFAULT 0,
      total_wo_completed INT DEFAULT 0,
      total_pieces_produced INT DEFAULT 0,
      total_sqft_produced DECIMAL(12,2) DEFAULT 0.00,
      total_scrap_pieces INT DEFAULT 0,
      scrap_rate_percent DECIMAL(5,2) DEFAULT 0.00,
      avg_cycle_time_minutes DECIMAL(8,2) DEFAULT 0.00,
      on_time_delivery_percent DECIMAL(5,2) DEFAULT 0.00,
      avg_oee_percent DECIMAL(5,2) DEFAULT 0.00,
      labor_hours DECIMAL(8,2) DEFAULT 0.00,
      revenue_produced DECIMAL(12,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_kpi_date_shift (kpi_date, shift)
    )`,
    `CREATE TABLE IF NOT EXISTS scheduling_constraints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_center_id INT NOT NULL,
      constraint_type ENUM('max_concurrent','min_batch','max_batch','requires_cooldown','requires_preheat','shift_only') NOT NULL,
      constraint_value DECIMAL(10,2),
      constraint_unit VARCHAR(30),
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      INDEX idx_sc_wc (work_center_id)
    )`,
    `CREATE TABLE IF NOT EXISTS scheduling_blocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_center_id INT NOT NULL,
      work_order_id INT,
      wo_routing_id INT,
      block_start DATETIME NOT NULL,
      block_end DATETIME NOT NULL,
      block_type ENUM('production','setup','maintenance','reserved','break') DEFAULT 'production',
      status ENUM('planned','confirmed','in_progress','completed','cancelled') DEFAULT 'planned',
      assigned_operator_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sb_wc_date (work_center_id, block_start),
      INDEX idx_sb_wo (work_order_id)
    )`
  ];
  for (const sql of phase4Tables) {
    try { await pool.query(sql); } catch(e) { console.log('Phase4 table:', e.message.substring(0, 80)); }
  }

  // Phase 4 seed: QC Checkpoints for each work center
  try {
    const [qccp] = await pool.query('SELECT COUNT(*) as cnt FROM qc_checkpoints');
    if (qccp[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO qc_checkpoints (work_center_id, checkpoint_name, checkpoint_code, inspection_type, measurement_type, target_value, min_value, max_value, unit_of_measure, is_critical, sequence, instructions) VALUES
        (1, 'Cut Size Accuracy', 'CUT-001', 'measurement', 'range', NULL, -0.5, 0.5, 'mm', 1, 10, 'Measure cut dimensions vs spec. Tolerance +/- 0.5mm'),
        (1, 'Edge Chip Check', 'CUT-002', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 20, 'Inspect all edges for chips > 1mm'),
        (1, 'Glass Clarity', 'CUT-003', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 0, 30, 'Check for scratches, inclusions, or distortion'),
        (2, 'Edge Finish Quality', 'EDGE-001', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 10, 'Inspect polished edges for uniformity and smoothness'),
        (2, 'Edge Straightness', 'EDGE-002', 'measurement', 'range', NULL, -0.3, 0.3, 'mm', 1, 20, 'Check edge straightness with straight edge'),
        (3, 'Hole Position Accuracy', 'CNC-001', 'measurement', 'range', NULL, -0.5, 0.5, 'mm', 1, 10, 'Verify hole positions match drawing'),
        (3, 'Hole Diameter', 'CNC-002', 'measurement', 'range', NULL, -0.2, 0.2, 'mm', 1, 20, 'Measure hole diameters with calipers'),
        (3, 'Cutout Dimensions', 'CNC-003', 'measurement', 'range', NULL, -0.5, 0.5, 'mm', 0, 30, 'Verify cutout dimensions match spec'),
        (5, 'Wash Cleanliness', 'WASH-001', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 10, 'Inspect for water spots, residue, or contamination'),
        (6, 'Temper Stress Pattern', 'TEMP-001', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 10, 'Check stress pattern with polarized light'),
        (6, 'Flatness Check', 'TEMP-002', 'measurement', 'range', NULL, 0, 3.0, 'mm/m', 1, 20, 'Measure bow/warp with straight edge. Max 3mm/m'),
        (6, 'Fragmentation Test', 'TEMP-003', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 30, 'Verify fragment count meets EN 12150 (>40 per 50x50mm)'),
        (7, 'Lamination Clarity', 'LAMI-001', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 10, 'Check for bubbles, delamination, or haze'),
        (7, 'Edge Seal Integrity', 'LAMI-002', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 20, 'Inspect edge seal for gaps or moisture ingress'),
        (8, 'Final Dimension Check', 'QC-001', 'measurement', 'range', NULL, -1.0, 1.0, 'mm', 1, 10, 'Final measurement of all dimensions'),
        (8, 'Visual Inspection', 'QC-002', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 20, 'Full visual inspection under inspection light'),
        (8, 'Label Verification', 'QC-003', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 0, 30, 'Verify label matches order specs'),
        (9, 'Packaging Integrity', 'PACK-001', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 1, 10, 'Verify proper edge protection and separation'),
        (9, 'Rack Loading Check', 'PACK-002', 'visual', 'pass_fail', NULL, NULL, NULL, NULL, 0, 20, 'Verify glass is properly secured in rack')`
      );
    }

    // Seed scheduling constraints
    const [sc] = await pool.query('SELECT COUNT(*) as cnt FROM scheduling_constraints');
    if (sc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO scheduling_constraints (work_center_id, constraint_type, constraint_value, constraint_unit, notes) VALUES
        (1, 'max_concurrent', 2, 'tables', 'Max 2 cutting tables running simultaneously'),
        (6, 'min_batch', 4, 'pieces', 'Minimum 4 pieces per tempering run for efficiency'),
        (6, 'requires_preheat', 30, 'minutes', 'Oven requires 30min preheat before first batch'),
        (6, 'requires_cooldown', 15, 'minutes', 'Cooldown between batches'),
        (7, 'requires_preheat', 60, 'minutes', 'Autoclave preheat time'),
        (7, 'max_batch', 12, 'pieces', 'Max 12 pieces per autoclave cycle'),
        (5, 'max_concurrent', 1, 'lines', 'Single wash line'),
        (3, 'max_concurrent', 1, 'machines', 'Single CNC machine')`
      );
    }

    // Update work centers to finite scheduling
    await pool.query("UPDATE work_centers SET scheduling_type = 'finite' WHERE code IN ('CUT','TEMP','LAMI','CNC')");

    console.log('Phase 4 tables + seeds: verified');
  } catch(e) { console.log('Phase4 seed:', e.message); }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 5: Shipping & Logistics
  // ═══════════════════════════════════════════════════════════════════
  const phase5Tables = [
    `CREATE TABLE IF NOT EXISTS delivery_routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_number VARCHAR(30) UNIQUE,
      route_name VARCHAR(255) NOT NULL,
      route_date DATE NOT NULL,
      driver_id INT,
      vehicle_id INT,
      status ENUM('planning','confirmed','in_progress','completed','cancelled') DEFAULT 'planning',
      total_stops INT DEFAULT 0,
      total_distance_miles DECIMAL(8,2) DEFAULT 0,
      estimated_duration_hours DECIMAL(5,2) DEFAULT 0,
      actual_start_time DATETIME,
      actual_end_time DATETIME,
      actual_distance_miles DECIMAL(8,2),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_route_date (route_date),
      INDEX idx_route_driver (driver_id),
      INDEX idx_route_status (status)
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_stops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_id INT NOT NULL,
      stop_sequence INT NOT NULL,
      shipment_id INT,
      customer_id INT NOT NULL,
      delivery_address TEXT NOT NULL,
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      scheduled_arrival DATETIME,
      actual_arrival DATETIME,
      actual_departure DATETIME,
      status ENUM('pending','en_route','arrived','delivered','failed','skipped') DEFAULT 'pending',
      delivery_notes TEXT,
      special_instructions TEXT,
      pieces_count INT DEFAULT 0,
      weight_lbs DECIMAL(10,2) DEFAULT 0,
      INDEX idx_stop_route (route_id),
      INDEX idx_stop_shipment (shipment_id),
      INDEX idx_stop_status (status)
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_proof (
      id INT AUTO_INCREMENT PRIMARY KEY,
      delivery_stop_id INT NOT NULL,
      shipment_id INT,
      signed_by VARCHAR(255),
      signature_data TEXT,
      photo_urls JSON,
      delivery_condition ENUM('perfect','minor_damage','major_damage','refused') DEFAULT 'perfect',
      damage_notes TEXT,
      received_pieces INT,
      refused_pieces INT DEFAULT 0,
      customer_comments TEXT,
      gps_latitude DECIMAL(10,7),
      gps_longitude DECIMAL(10,7),
      delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pod_stop (delivery_stop_id),
      INDEX idx_pod_shipment (shipment_id)
    )`,
    `CREATE TABLE IF NOT EXISTS rack_configurations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rack_code VARCHAR(50) UNIQUE NOT NULL,
      rack_type ENUM('a_frame','l_frame','flat_bed','custom') NOT NULL,
      max_weight_lbs DECIMAL(10,2) NOT NULL,
      max_pieces INT NOT NULL,
      width_inches DECIMAL(8,2),
      height_inches DECIMAL(8,2),
      depth_inches DECIMAL(8,2),
      slot_count INT DEFAULT 10,
      slot_width_inches DECIMAL(6,2) DEFAULT 2.00,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rack_loads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rack_id INT NOT NULL,
      route_id INT,
      load_date DATE NOT NULL,
      status ENUM('planning','loading','loaded','in_transit','unloading','empty') DEFAULT 'planning',
      total_pieces INT DEFAULT 0,
      total_weight_lbs DECIMAL(10,2) DEFAULT 0,
      loaded_by INT,
      verified_by INT,
      loaded_at DATETIME,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rackload_rack (rack_id),
      INDEX idx_rackload_route (route_id),
      INDEX idx_rackload_date (load_date)
    )`,
    `CREATE TABLE IF NOT EXISTS rack_load_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rack_load_id INT NOT NULL,
      slot_number INT NOT NULL,
      work_order_id INT,
      shipment_id INT,
      item_description VARCHAR(255),
      width_inches DECIMAL(8,2),
      height_inches DECIMAL(8,2),
      thickness_mm DECIMAL(5,2),
      weight_lbs DECIMAL(8,2),
      glass_type VARCHAR(100),
      delivery_stop_id INT,
      load_sequence INT,
      unload_sequence INT,
      status ENUM('planned','loaded','in_transit','delivered','damaged') DEFAULT 'planned',
      notes TEXT,
      INDEX idx_rli_load (rack_load_id),
      INDEX idx_rli_wo (work_order_id),
      INDEX idx_rli_stop (delivery_stop_id)
    )`,
    `CREATE TABLE IF NOT EXISTS drivers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_name VARCHAR(255) NOT NULL,
      employee_id VARCHAR(50),
      phone VARCHAR(30),
      email VARCHAR(255),
      license_number VARCHAR(50),
      license_expiry DATE,
      license_class VARCHAR(20),
      is_active BOOLEAN DEFAULT TRUE,
      max_hours_per_day DECIMAL(4,2) DEFAULT 10.00,
      home_zip VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_number VARCHAR(50) UNIQUE NOT NULL,
      vehicle_type ENUM('flatbed','box_truck','van','trailer','pickup') NOT NULL,
      make VARCHAR(100),
      model VARCHAR(100),
      year INT,
      license_plate VARCHAR(30),
      vin VARCHAR(50),
      max_weight_lbs DECIMAL(10,2),
      max_rack_count INT DEFAULT 2,
      fuel_type ENUM('diesel','gasoline','electric','hybrid') DEFAULT 'diesel',
      mpg_estimate DECIMAL(5,2),
      is_active BOOLEAN DEFAULT TRUE,
      last_service_date DATE,
      next_service_date DATE,
      odometer_miles INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS freight_costs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      route_id INT,
      shipment_id INT,
      cost_type ENUM('fuel','labor','tolls','maintenance','insurance','other') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description VARCHAR(255),
      cost_date DATE NOT NULL,
      vehicle_id INT,
      driver_id INT,
      miles_driven DECIMAL(8,2),
      fuel_gallons DECIMAL(8,2),
      fuel_price_per_gallon DECIMAL(5,3),
      is_billable BOOLEAN DEFAULT TRUE,
      billed_to_customer BOOLEAN DEFAULT FALSE,
      invoice_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fc_route (route_id),
      INDEX idx_fc_shipment (shipment_id),
      INDEX idx_fc_date (cost_date)
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_zones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone_name VARCHAR(100) NOT NULL,
      zone_code VARCHAR(20) UNIQUE NOT NULL,
      zip_codes TEXT,
      base_delivery_fee DECIMAL(8,2) DEFAULT 0,
      per_mile_rate DECIMAL(6,4) DEFAULT 0,
      min_order_free_delivery DECIMAL(10,2),
      estimated_transit_days INT DEFAULT 1,
      max_pieces_per_trip INT DEFAULT 50,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS driver_location_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL,
      route_id INT,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      speed_mph DECIMAL(5,1),
      heading DECIMAL(5,1),
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dll_driver (driver_id),
      INDEX idx_dll_route (route_id),
      INDEX idx_dll_time (logged_at)
    )`
  ];
  for (const sql of phase5Tables) {
    try { await pool.query(sql); } catch(e) { console.log('Phase5 table:', e.message.substring(0, 80)); }
  }

  // Phase 5 seed data
  try {
    const [dr] = await pool.query('SELECT COUNT(*) as cnt FROM drivers');
    if (dr[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO drivers (employee_name, employee_id, phone, email, license_number, license_expiry, license_class, home_zip) VALUES
        ('Carlos Rodriguez', 'DRV-001', '(713) 555-0201', 'carlos@maxtagroup.com', 'TX12345678', '2027-08-15', 'Class B', '77001'),
        ('James Wilson', 'DRV-002', '(713) 555-0202', 'james.w@maxtagroup.com', 'TX87654321', '2028-03-22', 'Class B', '77002'),
        ('David Chen', 'DRV-003', '(713) 555-0203', 'david.c@maxtagroup.com', 'TX11223344', '2027-11-30', 'Class A', '77003')`);
    }
    const [vh] = await pool.query('SELECT COUNT(*) as cnt FROM vehicles');
    if (vh[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO vehicles (vehicle_number, vehicle_type, make, model, year, license_plate, max_weight_lbs, max_rack_count, fuel_type, mpg_estimate, odometer_miles) VALUES
        ('TRK-001', 'flatbed', 'Ford', 'F-550', 2023, 'TX-GLZ-001', 15000, 3, 'diesel', 12.5, 45230),
        ('TRK-002', 'flatbed', 'International', 'MV607', 2022, 'TX-GLZ-002', 22000, 4, 'diesel', 10.0, 67890),
        ('VAN-001', 'van', 'Mercedes', 'Sprinter 3500', 2024, 'TX-GLZ-003', 5500, 1, 'diesel', 18.0, 12450),
        ('TRL-001', 'trailer', 'Utility', 'Glass Hauler', 2021, 'TX-GLZ-004', 30000, 6, 'diesel', 8.0, 89000)`);
    }
    const [rc] = await pool.query('SELECT COUNT(*) as cnt FROM rack_configurations');
    if (rc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO rack_configurations (rack_code, rack_type, max_weight_lbs, max_pieces, width_inches, height_inches, depth_inches, slot_count, slot_width_inches) VALUES
        ('AF-001', 'a_frame', 3000, 25, 96, 84, 48, 12, 2.5),
        ('AF-002', 'a_frame', 3000, 25, 96, 84, 48, 12, 2.5),
        ('AF-003', 'a_frame', 2000, 15, 72, 72, 36, 8, 2.5),
        ('LF-001', 'l_frame', 4000, 30, 96, 96, 36, 15, 2.0),
        ('LF-002', 'l_frame', 4000, 30, 96, 96, 36, 15, 2.0),
        ('FB-001', 'flat_bed', 5000, 40, 120, 6, 96, 20, 1.5),
        ('CUS-001', 'custom', 1500, 10, 60, 60, 30, 5, 3.0)`);
    }
    const [dz] = await pool.query('SELECT COUNT(*) as cnt FROM delivery_zones');
    if (dz[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO delivery_zones (zone_name, zone_code, base_delivery_fee, per_mile_rate, min_order_free_delivery, estimated_transit_days, max_pieces_per_trip) VALUES
        ('Houston Metro', 'HOU-METRO', 75.00, 2.50, 2500.00, 0, 100),
        ('Houston Suburbs', 'HOU-BURBS', 125.00, 3.00, 5000.00, 1, 75),
        ('Gulf Coast', 'GULF', 250.00, 3.50, 10000.00, 1, 50),
        ('Central Texas', 'CTX', 400.00, 4.00, 15000.00, 2, 40),
        ('DFW Metro', 'DFW', 500.00, 4.50, 20000.00, 2, 40),
        ('Out of State', 'OOS', 750.00, 5.00, 30000.00, 3, 30)`);
    }
    console.log('Phase 5 tables + seeds: verified');
  } catch(e) { console.log('Phase5 seed:', e.message); }

  // Phase 5 - ALTER TABLE fixes for existing databases (adds missing columns)
  const phase5ColFixes = [
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS total_pieces INT DEFAULT 0",
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS total_weight_lbs DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS loaded_by INT",
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS verified_by INT",
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS loaded_at DATETIME",
    "ALTER TABLE rack_loads ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE delivery_routes ADD COLUMN IF NOT EXISTS optimized_sequence TEXT",
    "ALTER TABLE delivery_routes ADD COLUMN IF NOT EXISTS total_distance_miles DECIMAL(8,2)",
    "ALTER TABLE delivery_routes ADD COLUMN IF NOT EXISTS total_time_minutes INT",
    "ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS delivery_address TEXT",
    "ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100)",
    "ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)",
    "ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS pieces_count INT DEFAULT 0",
    "ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS weight_lbs DECIMAL(10,2) DEFAULT 0"
  ];
  for (const sql of phase5ColFixes) {
    try { await pool.query(sql); } catch(e) { /* ignore - column may already exist or MySQL < 8.0.19 */ }
  }
  console.log('Phase 5 ALTER TABLE fixes applied');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7 - Advanced Accounting & Finance
  // ═══════════════════════════════════════════════════════════════
  try {
    // Multi-currency support on transactions
    await pool.query(`CREATE TABLE IF NOT EXISTS currency_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_type ENUM('ar_invoice','ap_invoice','customer_payment','vendor_payment','quote','sales_order','purchase_order') NOT NULL,
      transaction_id INT NOT NULL,
      currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
      exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
      original_amount DECIMAL(14,2) NOT NULL,
      base_amount DECIMAL(14,2) NOT NULL,
      realized_gain_loss DECIMAL(14,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bank statement imports
    await pool.query(`CREATE TABLE IF NOT EXISTS bank_statements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bank_id INT NOT NULL,
      statement_date DATE NOT NULL,
      opening_balance DECIMAL(14,2) NOT NULL,
      closing_balance DECIMAL(14,2) NOT NULL,
      total_deposits DECIMAL(14,2) DEFAULT 0,
      total_withdrawals DECIMAL(14,2) DEFAULT 0,
      transaction_count INT DEFAULT 0,
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      imported_by INT,
      file_name VARCHAR(255),
      status ENUM('imported','in_progress','reconciled') DEFAULT 'imported'
    )`);

    // Bank statement lines for auto-matching
    await pool.query(`CREATE TABLE IF NOT EXISTS bank_statement_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      statement_id INT NOT NULL,
      transaction_date DATE NOT NULL,
      description VARCHAR(500),
      reference VARCHAR(100),
      amount DECIMAL(14,2) NOT NULL,
      type ENUM('deposit','withdrawal') NOT NULL,
      matched_voucher_id INT,
      matched_payment_id INT,
      match_confidence DECIMAL(5,2),
      match_status ENUM('unmatched','auto_matched','manual_matched','confirmed') DEFAULT 'unmatched',
      category VARCHAR(50),
      notes TEXT
    )`);

    // Budget management (enhanced)
    await pool.query(`CREATE TABLE IF NOT EXISTS budgets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      fiscal_year INT NOT NULL,
      budget_type ENUM('annual','quarterly','monthly') DEFAULT 'annual',
      status ENUM('draft','approved','active','closed') DEFAULT 'draft',
      total_amount DECIMAL(14,2) DEFAULT 0,
      approved_by INT,
      approved_at DATETIME,
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS budget_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      budget_id INT NOT NULL,
      gl_account_id INT NOT NULL,
      period_1 DECIMAL(14,2) DEFAULT 0,
      period_2 DECIMAL(14,2) DEFAULT 0,
      period_3 DECIMAL(14,2) DEFAULT 0,
      period_4 DECIMAL(14,2) DEFAULT 0,
      period_5 DECIMAL(14,2) DEFAULT 0,
      period_6 DECIMAL(14,2) DEFAULT 0,
      period_7 DECIMAL(14,2) DEFAULT 0,
      period_8 DECIMAL(14,2) DEFAULT 0,
      period_9 DECIMAL(14,2) DEFAULT 0,
      period_10 DECIMAL(14,2) DEFAULT 0,
      period_11 DECIMAL(14,2) DEFAULT 0,
      period_12 DECIMAL(14,2) DEFAULT 0,
      annual_total DECIMAL(14,2) DEFAULT 0,
      notes VARCHAR(255)
    )`);

    // Cash flow categories
    await pool.query(`CREATE TABLE IF NOT EXISTS cash_flow_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category_type ENUM('operating','investing','financing') NOT NULL,
      gl_account_id INT,
      is_inflow TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0
    )`);

    // Cash flow projections
    await pool.query(`CREATE TABLE IF NOT EXISTS cash_flow_projections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      projection_date DATE NOT NULL,
      category_id INT,
      source_type VARCHAR(50),
      source_id INT,
      description VARCHAR(255),
      projected_amount DECIMAL(14,2) NOT NULL,
      actual_amount DECIMAL(14,2),
      confidence_level ENUM('high','medium','low') DEFAULT 'medium',
      status ENUM('projected','realized','cancelled') DEFAULT 'projected',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tax jurisdictions
    await pool.query(`CREATE TABLE IF NOT EXISTS tax_jurisdictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      jurisdiction_code VARCHAR(20) NOT NULL,
      jurisdiction_type ENUM('state','county','city','district','federal') NOT NULL,
      parent_jurisdiction_id INT,
      tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
      effective_date DATE,
      expiry_date DATE,
      is_active TINYINT(1) DEFAULT 1
    )`);

    // Tax collected/paid tracking
    await pool.query(`CREATE TABLE IF NOT EXISTS tax_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_type ENUM('collected','paid','adjustment') NOT NULL,
      jurisdiction_id INT NOT NULL,
      document_type VARCHAR(50),
      document_id INT,
      document_number VARCHAR(50),
      customer_id INT,
      vendor_id INT,
      taxable_amount DECIMAL(14,2) NOT NULL,
      tax_rate DECIMAL(6,4) NOT NULL,
      tax_amount DECIMAL(14,2) NOT NULL,
      transaction_date DATE NOT NULL,
      period_id INT,
      is_remitted TINYINT(1) DEFAULT 0,
      remitted_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tax return periods
    await pool.query(`CREATE TABLE IF NOT EXISTS tax_returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jurisdiction_id INT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      filing_frequency ENUM('monthly','quarterly','annually') NOT NULL,
      total_taxable_sales DECIMAL(14,2) DEFAULT 0,
      total_tax_collected DECIMAL(14,2) DEFAULT 0,
      total_tax_paid DECIMAL(14,2) DEFAULT 0,
      net_tax_due DECIMAL(14,2) DEFAULT 0,
      status ENUM('open','filed','paid') DEFAULT 'open',
      filed_date DATE,
      payment_date DATE,
      confirmation_number VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed tax jurisdictions
    const [tj] = await pool.query('SELECT COUNT(*) as cnt FROM tax_jurisdictions');
    if (tj[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO tax_jurisdictions (name, jurisdiction_code, jurisdiction_type, tax_rate, effective_date, is_active) VALUES
        ('Texas State', 'TX', 'state', 6.2500, '2024-01-01', 1),
        ('Harris County', 'TX-HARRIS', 'county', 0.0000, '2024-01-01', 1),
        ('Houston City', 'TX-HOU', 'city', 1.0000, '2024-01-01', 1),
        ('MTA Transit', 'TX-MTA', 'district', 1.0000, '2024-01-01', 1),
        ('California State', 'CA', 'state', 7.2500, '2024-01-01', 1),
        ('Los Angeles County', 'CA-LA', 'county', 2.2500, '2024-01-01', 1)`);
    }

    // Seed cash flow categories
    const [cfc] = await pool.query('SELECT COUNT(*) as cnt FROM cash_flow_categories');
    if (cfc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO cash_flow_categories (name, category_type, is_inflow, sort_order) VALUES
        ('Customer Collections', 'operating', 1, 1),
        ('Vendor Payments', 'operating', 0, 2),
        ('Payroll', 'operating', 0, 3),
        ('Tax Payments', 'operating', 0, 4),
        ('Utilities & Rent', 'operating', 0, 5),
        ('Equipment Purchase', 'investing', 0, 6),
        ('Equipment Sale', 'investing', 1, 7),
        ('Loan Proceeds', 'financing', 1, 8),
        ('Loan Payments', 'financing', 0, 9),
        ('Owner Distributions', 'financing', 0, 10)`);
    }

    // Seed a sample budget for 2026
    const [bg] = await pool.query('SELECT COUNT(*) as cnt FROM budgets');
    if (bg[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO budgets (name, fiscal_year, budget_type, status, total_amount, notes) VALUES
        ('FY2026 Operating Budget', 2026, 'annual', 'active', 2400000.00, 'Annual operating budget for fiscal year 2026')`);
    }

    console.log('Phase 7 tables + seeds: verified');
  } catch(e) { console.log('Phase7 error:', e.message); }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8 - Dashboard & Promotions
  // ═══════════════════════════════════════════════════════════════
  try {
    // Promotions / Announcements Engine
    await pool.query(`CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      promo_type ENUM('announcement','promotion','alert','maintenance','feature') DEFAULT 'announcement',
      priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
      display_type ENUM('banner','modal','toast','sidebar') DEFAULT 'banner',
      target_roles JSON COMMENT 'Array of role names to target, null=all',
      target_departments JSON COMMENT 'Array of department codes, null=all',
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      is_active TINYINT(1) DEFAULT 1,
      is_dismissible TINYINT(1) DEFAULT 1,
      action_url VARCHAR(500) COMMENT 'Optional link/route for CTA button',
      action_label VARCHAR(100) COMMENT 'CTA button text',
      bg_color VARCHAR(20) DEFAULT '#3b82f6',
      icon VARCHAR(50) DEFAULT 'info',
      view_count INT DEFAULT 0,
      dismiss_count INT DEFAULT 0,
      click_count INT DEFAULT 0,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS promotion_interactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      promotion_id INT NOT NULL,
      user_id INT NOT NULL,
      interaction_type ENUM('view','dismiss','click','close') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_promo_user (promotion_id, user_id),
      INDEX idx_user_interactions (user_id, interaction_type)
    )`);

    // Dashboard Configurations (per-user widget layout)
    await pool.query(`CREATE TABLE IF NOT EXISTS dashboard_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      role VARCHAR(50) COMMENT 'Role-level default if user_id is null',
      layout JSON NOT NULL COMMENT 'Array of widget configs with position/size',
      is_default TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_config (user_id),
      INDEX idx_role_config (role)
    )`);

    // Dashboard Widgets Registry
    await pool.query(`CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      widget_key VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category ENUM('financial','sales','manufacturing','inventory','purchasing','shipping','system') NOT NULL,
      widget_type ENUM('kpi','chart','table','list','gauge','map') NOT NULL,
      data_endpoint VARCHAR(200) NOT NULL,
      default_size ENUM('small','medium','large','full') DEFAULT 'medium',
      min_role_level INT DEFAULT 0 COMMENT '0=all, 1=readonly+, 2=dept+, 3=manager+, 4=admin',
      allowed_roles JSON COMMENT 'Specific roles that can see this widget, null=check min_role_level',
      is_active TINYINT(1) DEFAULT 1,
      config_schema JSON COMMENT 'JSON schema for widget-specific settings',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // KPI Snapshots (historical tracking for trend analysis)
    await pool.query(`CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      snapshot_date DATE NOT NULL,
      kpi_key VARCHAR(100) NOT NULL,
      kpi_value DECIMAL(14,2) NOT NULL,
      kpi_metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_kpi_date (kpi_key, snapshot_date)
    )`);

    // Seed default dashboard widgets
    const [wc] = await pool.query('SELECT COUNT(*) as cnt FROM dashboard_widgets');
    if (wc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO dashboard_widgets (widget_key, title, description, category, widget_type, data_endpoint, default_size, min_role_level, allowed_roles) VALUES
        ('sales_mtd', 'Sales MTD', 'Month-to-date sales revenue', 'sales', 'kpi', '/api/dashboard-exec/kpi/sales-mtd', 'small', 0, NULL),
        ('sales_pipeline', 'Sales Pipeline', 'Open quotes and orders value', 'sales', 'kpi', '/api/dashboard-exec/kpi/sales-pipeline', 'small', 0, '["sales","manager","admin"]'),
        ('open_orders', 'Open Orders', 'Active sales orders count', 'sales', 'kpi', '/api/dashboard-exec/kpi/open-orders', 'small', 0, NULL),
        ('ar_aging', 'AR Aging', 'Accounts receivable aging breakdown', 'financial', 'chart', '/api/dashboard-exec/charts/ar-aging', 'medium', 2, '["accounting","manager","admin"]'),
        ('ap_aging', 'AP Aging', 'Accounts payable aging breakdown', 'financial', 'chart', '/api/dashboard-exec/charts/ap-aging', 'medium', 2, '["accounting","purchasing","manager","admin"]'),
        ('cash_position', 'Cash Position', 'Total bank balance', 'financial', 'kpi', '/api/dashboard-exec/kpi/cash-position', 'small', 3, '["accounting","manager","admin"]'),
        ('revenue_trend', 'Revenue Trend', '12-month revenue chart', 'financial', 'chart', '/api/dashboard-exec/charts/revenue-trend', 'large', 3, '["accounting","manager","admin"]'),
        ('production_status', 'Production Status', 'Work orders by status', 'manufacturing', 'chart', '/api/dashboard-exec/charts/production-status', 'medium', 0, '["production","manager","admin"]'),
        ('wo_throughput', 'WO Throughput', 'Work orders completed this week', 'manufacturing', 'kpi', '/api/dashboard-exec/kpi/wo-throughput', 'small', 0, '["production","shipping","manager","admin"]'),
        ('inventory_value', 'Inventory Value', 'Total inventory valuation', 'inventory', 'kpi', '/api/dashboard-exec/kpi/inventory-value', 'small', 2, '["purchasing","accounting","manager","admin"]'),
        ('low_stock_alerts', 'Low Stock Alerts', 'Items below reorder point', 'inventory', 'list', '/api/dashboard-exec/lists/low-stock', 'medium', 0, '["purchasing","production","manager","admin"]'),
        ('overdue_pos', 'Overdue POs', 'Purchase orders past due date', 'purchasing', 'list', '/api/dashboard-exec/lists/overdue-pos', 'medium', 2, '["purchasing","manager","admin"]'),
        ('shipments_today', 'Shipments Today', 'Scheduled shipments for today', 'shipping', 'list', '/api/dashboard-exec/lists/shipments-today', 'medium', 0, '["shipping","sales","production","manager","admin"]'),
        ('top_customers', 'Top Customers MTD', 'Highest revenue customers MTD', 'sales', 'table', '/api/dashboard-exec/tables/top-customers', 'medium', 2, '["sales","accounting","manager","admin"]'),
        ('profit_margin', 'Profit Margin', 'Gross profit margin MTD', 'financial', 'gauge', '/api/dashboard-exec/kpi/profit-margin', 'small', 3, '["accounting","manager","admin"]'),
        ('bookings_chart', 'Bookings by Week', 'Weekly sales bookings trend', 'sales', 'chart', '/api/dashboard-exec/charts/bookings-weekly', 'large', 2, '["sales","manager","admin"]'),
        ('overdue_invoices', 'Overdue Invoices', 'Past-due AR invoices', 'financial', 'list', '/api/dashboard-exec/lists/overdue-invoices', 'medium', 2, '["accounting","sales","manager","admin"]'),
        ('active_users', 'Active Users', 'Currently logged-in users', 'system', 'kpi', '/api/dashboard-exec/kpi/active-users', 'small', 4, '["admin"]')
      `);
    }

    // Seed default role-based dashboard layouts
    const [dc] = await pool.query('SELECT COUNT(*) as cnt FROM dashboard_configs');
    if (dc[0].cnt === 0) {
      const adminLayout = JSON.stringify([
        { widget: 'sales_mtd', x: 0, y: 0, w: 1, h: 1 },
        { widget: 'cash_position', x: 1, y: 0, w: 1, h: 1 },
        { widget: 'profit_margin', x: 2, y: 0, w: 1, h: 1 },
        { widget: 'inventory_value', x: 3, y: 0, w: 1, h: 1 },
        { widget: 'revenue_trend', x: 0, y: 1, w: 2, h: 1 },
        { widget: 'production_status', x: 2, y: 1, w: 2, h: 1 },
        { widget: 'top_customers', x: 0, y: 2, w: 2, h: 1 },
        { widget: 'overdue_invoices', x: 2, y: 2, w: 2, h: 1 }
      ]);
      const salesLayout = JSON.stringify([
        { widget: 'sales_mtd', x: 0, y: 0, w: 1, h: 1 },
        { widget: 'sales_pipeline', x: 1, y: 0, w: 1, h: 1 },
        { widget: 'open_orders', x: 2, y: 0, w: 1, h: 1 },
        { widget: 'bookings_chart', x: 0, y: 1, w: 2, h: 1 },
        { widget: 'top_customers', x: 2, y: 1, w: 2, h: 1 },
        { widget: 'overdue_invoices', x: 0, y: 2, w: 2, h: 1 }
      ]);
      const productionLayout = JSON.stringify([
        { widget: 'wo_throughput', x: 0, y: 0, w: 1, h: 1 },
        { widget: 'production_status', x: 1, y: 0, w: 2, h: 1 },
        { widget: 'shipments_today', x: 3, y: 0, w: 1, h: 1 },
        { widget: 'low_stock_alerts', x: 0, y: 1, w: 2, h: 1 }
      ]);
      const purchasingLayout = JSON.stringify([
        { widget: 'overdue_pos', x: 0, y: 0, w: 2, h: 1 },
        { widget: 'inventory_value', x: 2, y: 0, w: 1, h: 1 },
        { widget: 'low_stock_alerts', x: 0, y: 1, w: 2, h: 1 },
        { widget: 'ap_aging', x: 2, y: 1, w: 2, h: 1 }
      ]);
      const accountingLayout = JSON.stringify([
        { widget: 'cash_position', x: 0, y: 0, w: 1, h: 1 },
        { widget: 'profit_margin', x: 1, y: 0, w: 1, h: 1 },
        { widget: 'sales_mtd', x: 2, y: 0, w: 1, h: 1 },
        { widget: 'revenue_trend', x: 0, y: 1, w: 2, h: 1 },
        { widget: 'ar_aging', x: 2, y: 1, w: 2, h: 1 },
        { widget: 'ap_aging', x: 0, y: 2, w: 2, h: 1 },
        { widget: 'overdue_invoices', x: 2, y: 2, w: 2, h: 1 }
      ]);
      const shippingLayout = JSON.stringify([
        { widget: 'shipments_today', x: 0, y: 0, w: 2, h: 1 },
        { widget: 'open_orders', x: 2, y: 0, w: 1, h: 1 },
        { widget: 'production_status', x: 0, y: 1, w: 2, h: 1 }
      ]);
      await pool.query(`INSERT IGNORE INTO dashboard_configs (user_id, role, layout, is_default) VALUES
        (NULL, 'admin', ?, 1),
        (NULL, 'manager', ?, 1),
        (NULL, 'sales', ?, 1),
        (NULL, 'production', ?, 1),
        (NULL, 'purchasing', ?, 1),
        (NULL, 'accounting', ?, 1),
        (NULL, 'shipping', ?, 1)
      `, [adminLayout, adminLayout, salesLayout, productionLayout, purchasingLayout, accountingLayout, shippingLayout]);
    }

    // Seed sample promotions
    const [pc] = await pool.query('SELECT COUNT(*) as cnt FROM promotions');
    if (pc[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO promotions (title, message, promo_type, priority, display_type, target_roles, start_date, end_date, is_active, action_url, action_label, bg_color, icon, created_by) VALUES
        ('System Update Scheduled', 'ERP system maintenance window: Saturday 10PM-2AM EST. Please save all work before 10PM.', 'maintenance', 'high', 'banner', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, NULL, NULL, '#f59e0b', 'warning', 1),
        ('New Feature: Financial Dashboard', 'The advanced Financial Dashboard is now available! Track budgets, cash flow, and tax reporting in real-time.', 'feature', 'normal', 'modal', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, '/accounting/financial-dashboard', 'Try It Now', '#3b82f6', 'info', 1),
        ('Q3 Sales Target', 'Q3 sales target: $500K. Current progress: $125K (25%). Keep pushing team!', 'promotion', 'normal', 'sidebar', '["sales","manager","admin"]', NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 1, '/sales', 'View Sales', '#10b981', 'chart', 1)
      `);
    }

    console.log('Phase 8 tables + seeds: verified');
  } catch(e) { console.log('Phase8 error:', e.message); }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 9: Mobile App Readiness - Push Notifications, Kiosk, Offline Sync
  // ═══════════════════════════════════════════════════════════════════════
  try {
    const phase9Tables = [
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(500),
        auth_key VARCHAR(255),
        device_name VARCHAR(100),
        device_type ENUM('desktop','mobile','tablet') DEFAULT 'desktop',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS notification_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category VARCHAR(50) NOT NULL,
        push_enabled BOOLEAN DEFAULT TRUE,
        in_app_enabled BOOLEAN DEFAULT TRUE,
        email_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_cat (user_id, category),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS kiosk_stations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        station_name VARCHAR(100) NOT NULL,
        station_code VARCHAR(20) NOT NULL UNIQUE,
        work_center_id INT,
        department_id INT,
        pin_code VARCHAR(10),
        allowed_actions JSON,
        is_active BOOLEAN DEFAULT TRUE,
        last_heartbeat TIMESTAMP NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        config JSON
      )`,
      `CREATE TABLE IF NOT EXISTS kiosk_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        station_id INT NOT NULL,
        user_id INT,
        action_type VARCHAR(50),
        action_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (station_id) REFERENCES kiosk_stations(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS offline_sync_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(100),
        action_type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        status ENUM('pending','synced','failed','conflict') DEFAULT 'pending',
        error_message TEXT,
        queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP NULL,
        retry_count INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];
    for (const sql of phase9Tables) {
      await pool.query(sql);
    }
    // Seed kiosk stations
    const [ks] = await pool.query('SELECT COUNT(*) as cnt FROM kiosk_stations');
    if (ks[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO kiosk_stations (station_name, station_code, work_center_id, pin_code, allowed_actions, is_active, config) VALUES
        ('Cutting Table 1', 'CUT-01', 1, '1234', '["scan_wo","log_production","report_issue"]', 1, '{"theme":"dark","timeout":120}'),
        ('Tempering Oven', 'TEMP-01', 2, '1234', '["scan_wo","log_production","clock_in","clock_out"]', 1, '{"theme":"dark","timeout":120}'),
        ('Lamination Station', 'LAMI-01', 3, '1234', '["scan_wo","log_production","report_issue","quality_check"]', 1, '{"theme":"dark","timeout":120}'),
        ('Shipping Dock', 'SHIP-01', NULL, '1234', '["scan_shipment","verify_packing","log_dispatch"]', 1, '{"theme":"dark","timeout":180}'),
        ('Receiving Bay', 'RECV-01', NULL, '1234', '["scan_po","receive_item","inspect_quality"]', 1, '{"theme":"dark","timeout":180}')
      `);
    }
    // Seed notification preferences for admin (schema: user_id, email_enabled, in_app_enabled, digest_frequency, muted_categories)
    const [np] = await pool.query('SELECT COUNT(*) as cnt FROM notification_preferences WHERE user_id = 1');
    if (np[0].cnt === 0) {
      await pool.query(`INSERT IGNORE INTO notification_preferences (user_id, email_enabled, in_app_enabled, digest_frequency, muted_categories) VALUES
        (1, 1, 1, 'immediate', '[]')
      `);
    }
    console.log('Phase 9 tables + seeds: verified');
  } catch(e) { console.log('Phase9 error:', e.message); }

  // === PHASE 10: Serial Number Traceability ===
  try {
    const phase10Tables = [
      `CREATE TABLE IF NOT EXISTS serial_numbers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial_number VARCHAR(100) NOT NULL UNIQUE,
        item_id INT,
        lot_id INT,
        location_id INT,
        status ENUM('available','reserved','sold','scrapped','in_service','in_transit') DEFAULT 'available',
        received_date DATE,
        sold_date DATE,
        customer_id INT,
        sales_order_id INT,
        shipment_id INT,
        work_order_id INT,
        wo_receipt_id INT,
        lot_number VARCHAR(100),
        manufactured_date DATE,
        qc_status ENUM('pending','passed','failed') DEFAULT 'pending',
        qc_notes TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_serial_status (status),
        INDEX idx_serial_wo (work_order_id),
        INDEX idx_serial_so (sales_order_id),
        INDEX idx_serial_item (item_id)
      )`,
      `CREATE TABLE IF NOT EXISTS serial_number_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prefix VARCHAR(50) NOT NULL UNIQUE,
        next_number INT DEFAULT 1,
        pad_length INT DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];
    for (const sql of phase10Tables) {
      await pool.query(sql);
    }
    // Add awaiting_receipt to work_orders status ENUM if not already there
    try {
      await pool.query(`ALTER TABLE work_orders MODIFY COLUMN status ENUM('draft','planned','released','in_progress','completed','closed','cancelled','on_hold','awaiting_receipt') DEFAULT 'draft'`);
    } catch(e) { /* already modified */ }
    console.log('Phase 10 tables (Serial Numbers): verified');
  } catch(e) { console.log('Phase10 error:', e.message); }

  // Phase 11: Customer Master Upgrade
  try {
    const customerCols = [
      ['dba_name', 'VARCHAR(200)'],
      ['status', "ENUM('active','inactive','on_hold','prospect','cod_only') DEFAULT 'active'"],
      ['parent_customer_id', 'INT'],
      ['fax', 'VARCHAR(20)'],
      ['website', 'VARCHAR(200)'],
      ['bill_address1', 'VARCHAR(200)'],
      ['bill_address2', 'VARCHAR(200)'],
      ['bill_city', 'VARCHAR(100)'],
      ['bill_state', 'VARCHAR(50)'],
      ['bill_zip', 'VARCHAR(20)'],
      ['bill_country', "VARCHAR(50) DEFAULT 'USA'"],
      ['ship_address1', 'VARCHAR(200)'],
      ['ship_address2', 'VARCHAR(200)'],
      ['ship_city', 'VARCHAR(100)'],
      ['ship_state', 'VARCHAR(50)'],
      ['ship_zip', 'VARCHAR(20)'],
      ['ship_country', "VARCHAR(50) DEFAULT 'USA'"],
      ['payment_method', "ENUM('check','wire','ach','credit_card','cod') DEFAULT 'check'"],
      ['discount_percent', 'DECIMAL(5,2) DEFAULT 0'],
      ['credit_status', "ENUM('good','warning','hold','cod_only') DEFAULT 'good'"],
      ['credit_approved_by', 'VARCHAR(100)'],
      ['credit_approved_date', 'DATE'],
      ['finance_charge_exempt', 'BOOLEAN DEFAULT FALSE'],
      ['send_statements', 'BOOLEAN DEFAULT TRUE'],
      ['statement_cycle', "ENUM('monthly','weekly','biweekly') DEFAULT 'monthly'"],
      ['collection_priority', "ENUM('low','medium','high') DEFAULT 'medium'"],
      ['territory', 'VARCHAR(100)'],
      ['account_manager', 'VARCHAR(100)'],
      ['source', 'VARCHAR(50)'],
      ['industry', 'VARCHAR(100)'],
      ['default_ship_via', 'VARCHAR(100)'],
      ['shipping_method', "ENUM('our_truck','common_carrier','customer_pickup','will_call') DEFAULT 'our_truck'"],
      ['freight_terms', "ENUM('prepaid','collect','prepaid_add','fob_origin','fob_destination') DEFAULT 'prepaid'"],
      ['preferred_delivery_days', 'VARCHAR(100)'],
      ['delivery_time_window', 'VARCHAR(50)'],
      ['requires_appointment', 'BOOLEAN DEFAULT FALSE'],
      ['requires_liftgate', 'BOOLEAN DEFAULT FALSE'],
      ['loading_dock_available', 'BOOLEAN DEFAULT TRUE'],
      ['requires_rack_return', 'BOOLEAN DEFAULT FALSE'],
      ['rack_deposit_required', 'BOOLEAN DEFAULT FALSE'],
      ['racks_at_customer', 'INT DEFAULT 0'],
      ['max_truck_size', 'VARCHAR(50)'],
      ['delivery_instructions', 'TEXT'],
      ['delivery_contact_name', 'VARCHAR(100)'],
      ['delivery_contact_phone', 'VARCHAR(20)'],
      ['route_zone', 'VARCHAR(50)'],
      ['tax_exempt_number', 'VARCHAR(50)'],
      ['resale_cert_number', 'VARCHAR(50)'],
      ['tax_exempt_expiry', 'DATE'],
      ['tax_id', 'VARCHAR(50)'],
      ['requires_coc', 'BOOLEAN DEFAULT FALSE'],
      ['breakage_claim_days', 'INT DEFAULT 3'],
      ['recut_policy', "ENUM('standard','free_recuts','charge_all','first_free') DEFAULT 'standard'"],
      ['quality_tier', "ENUM('standard','premium','architectural') DEFAULT 'standard'"],
      ['lead_time_days', 'INT'],
      ['min_order_amount', 'DECIMAL(12,2)'],
      ['alert_message', 'TEXT'],
      ['internal_notes', 'TEXT'],
      ['currency_code', "VARCHAR(3) DEFAULT 'USD'"],
      ['current_balance', 'DECIMAL(12,2) DEFAULT 0']
    ];
    for (const [col, def] of customerCols) {
      try { await pool.query(`ALTER TABLE customers ADD COLUMN ${col} ${def}`); } catch(e) { /* already exists */ }
    }
    // Customer addresses table
    await pool.query(`CREATE TABLE IF NOT EXISTS customer_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      address_type ENUM('shipping','billing','job_site','mailing') DEFAULT 'shipping',
      label VARCHAR(100),
      attention_to VARCHAR(100),
      address1 VARCHAR(200) NOT NULL,
      address2 VARCHAR(200),
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      country VARCHAR(50) DEFAULT 'USA',
      phone VARCHAR(20),
      is_default_billing BOOLEAN DEFAULT FALSE,
      is_default_shipping BOOLEAN DEFAULT FALSE,
      delivery_instructions TEXT,
      delivery_hours VARCHAR(100),
      requires_liftgate BOOLEAN DEFAULT FALSE,
      requires_inside_delivery BOOLEAN DEFAULT FALSE,
      loading_dock BOOLEAN DEFAULT FALSE,
      floor_suite VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cust_addr (customer_id)
    )`);
    // Expand customer_contacts
    const contactCols = [
      ['title', 'VARCHAR(100)'],
      ['role', 'VARCHAR(50)'],
      ['mobile', 'VARCHAR(20)'],
      ['department', 'VARCHAR(100)'],
      ['is_primary', 'BOOLEAN DEFAULT FALSE'],
      ['is_active', 'BOOLEAN DEFAULT TRUE'],
      ['receives_invoices', 'BOOLEAN DEFAULT FALSE'],
      ['receives_statements', 'BOOLEAN DEFAULT FALSE'],
      ['receives_quotes', 'BOOLEAN DEFAULT FALSE'],
      ['receives_pos', 'BOOLEAN DEFAULT FALSE']
    ];
    for (const [col, def] of contactCols) {
      try { await pool.query(`ALTER TABLE customer_contacts ADD COLUMN ${col} ${def}`); } catch(e) { /* already exists */ }
    }
    console.log('Phase 11 (Customer Master Upgrade): verified');
  } catch(e) { console.log('Phase11 error:', e.message); }
};
