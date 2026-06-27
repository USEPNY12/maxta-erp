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
  const alterStatements = [
    "ALTER TABLE work_orders ADD COLUMN parent_wo_id INT DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN wo_category ENUM('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard'",
    "ALTER TABLE notifications ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE",
    "ALTER TABLE sales_order_lines ADD COLUMN has_notches TINYINT(1) DEFAULT 0",
    "ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type ENUM('receipt','issue','adjustment','transfer','return','scrap','wo_receipt','wo_issue','po_receipt','shipment') NOT NULL",
    "ALTER TABLE wo_receipts ADD COLUMN notes TEXT NULL"
  ];
  for (const sql of alterStatements) {
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

  // Lamination seed data
  try {
    const [recipes] = await pool.query('SELECT COUNT(*) as cnt FROM lami_autoclave_recipes');
    if (recipes[0].cnt === 0) {
      await pool.query(`INSERT INTO lami_autoclave_recipes (recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required, notes) VALUES
        ('PVB Standard', 'PVB-STD', 'PVB', 6.00, 20.00, 1.5, 135.0, 60, 12.00, 2.0, 3.5, FALSE, 'Standard PVB cycle for 6-20mm total thickness'),
        ('PVB Thick', 'PVB-THK', 'PVB', 20.00, 50.00, 1.0, 140.0, 90, 14.00, 1.5, 5.0, FALSE, 'Extended cycle for thick laminated assemblies'),
        ('SGP Standard', 'SGP-STD', 'SGP', 6.00, 30.00, 2.0, 135.0, 45, 12.50, 2.0, 3.0, FALSE, 'Standard SGP/SentryGlas cycle'),
        ('EVA Standard', 'EVA-STD', 'EVA', 4.00, 20.00, 1.5, 110.0, 30, 0.00, 2.0, 2.0, TRUE, 'EVA vacuum-only process - no pressure'),
        ('Acoustic PVB', 'PVB-ACO', 'Acoustic_PVB', 8.00, 30.00, 1.2, 130.0, 75, 12.00, 1.8, 4.0, FALSE, 'Acoustic PVB requires lower temp and longer soak')`);
    }
    const [rolls] = await pool.query('SELECT COUNT(*) as cnt FROM lami_interlayer_rolls');
    if (rolls[0].cnt === 0) {
      await pool.query(`INSERT INTO lami_interlayer_rolls (roll_number, material_type, thickness_mm, width_mm, original_length_m, current_length_m, lot_number, manufacturer, color, received_date, expiry_date, cost_per_sqm, status) VALUES
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
      await pool.query(`INSERT INTO pricing_matrix (glass_type, thickness, price_per_sqft, min_sqft, min_charge, markup_percent, cost_per_sqft) VALUES
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
      await pool.query(`INSERT INTO fabrication_charges (category, name, default_rate, pricing_method, cost) VALUES
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
      await pool.query(`INSERT INTO quantity_breaks (name, min_qty, max_qty, discount_percent) VALUES
        ('Single Piece', 1, 4, 0.00),
        ('Small Batch (5-9)', 5, 9, 3.00),
        ('Medium Batch (10-24)', 10, 24, 5.00),
        ('Large Batch (25-49)', 25, 49, 8.00),
        ('Production Run (50-99)', 50, 99, 12.00),
        ('Bulk Order (100+)', 100, 999999, 15.00)`);
    }
    const [aw] = await pool.query('SELECT COUNT(*) as cnt FROM approval_workflows');
    if (aw[0].cnt === 0) {
      await pool.query(`INSERT INTO approval_workflows (name, document_type, condition_field, condition_operator, condition_value, approver_role, priority) VALUES
        ('High Value Quote', 'quote', 'total', 'gt', 10000.00, 'manager', 1),
        ('Large Discount', 'quote', 'max_discount_percent', 'gt', 15.00, 'manager', 2),
        ('Low Margin Alert', 'quote', 'min_margin_percent', 'lt', 20.00, 'director', 3),
        ('High Value PO', 'purchase_order', 'total', 'gt', 25000.00, 'manager', 1),
        ('Large Sales Order', 'sales_order', 'total', 'gt', 50000.00, 'director', 1)`);
    }
    const [cr] = await pool.query('SELECT COUNT(*) as cnt FROM commission_rules');
    if (cr[0].cnt === 0) {
      await pool.query(`INSERT INTO commission_rules (name, salesperson_id, customer_type, min_revenue, max_revenue, commission_rate) VALUES
        ('Default Commission', NULL, NULL, 0, 999999999, 5.00),
        ('High Value Orders (>10K)', NULL, NULL, 10000, 999999999, 7.50),
        ('New Customer Bonus', NULL, 'new', 0, 999999999, 8.00)`);
    }
    const [er] = await pool.query('SELECT COUNT(*) as cnt FROM exchange_rates');
    if (er[0].cnt === 0) {
      await pool.query(`INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
        ('USD', 'CAD', 1.3600, CURDATE()),
        ('USD', 'EUR', 0.9200, CURDATE()),
        ('USD', 'GBP', 0.7900, CURDATE()),
        ('USD', 'MXN', 17.2000, CURDATE())`);
    }
    const [sp] = await pool.query('SELECT COUNT(*) as cnt FROM salespeople');
    if (sp[0].cnt === 0) {
      await pool.query(`INSERT INTO salespeople (name, email, commission_rate) VALUES
        ('John Smith', 'john@maxtagroup.com', 5.00),
        ('Sarah Johnson', 'sarah@maxtagroup.com', 6.00),
        ('Mike Williams', 'mike@maxtagroup.com', 5.50)`);
    }
    console.log('Phase 2 seed: verified');
  } catch(e) { console.log('Phase2 seed:', e.message); }

  // Fix item_type_ids and seed BOM data
  try {
    // Ensure item_type_ids are correct
    await pool.query("UPDATE items SET item_type_id = 8 WHERE item_number = 'TG-001' AND (item_type_id IS NULL OR item_type_id != 8)");
    await pool.query("UPDATE items SET item_type_id = 7 WHERE item_number = 'RG-001' AND (item_type_id IS NULL OR item_type_id != 7)");
    await pool.query("UPDATE items SET item_type_id = 9 WHERE item_number = 'LG-001' AND (item_type_id IS NULL OR item_type_id != 9)");
    
    // Create PVB interlayer item if not exists
    const [pvbCheck] = await pool.query("SELECT id FROM items WHERE item_number = 'PVB-076'");
    if (pvbCheck.length === 0) {
      await pool.query(`INSERT INTO items (item_number, description, item_type_id, uom, is_purchased, is_material, standard_cost, qty_on_hand)
        VALUES ('PVB-076', 'PVB Interlayer Film 0.76mm', 6, 'SqFt', 1, 1, 2.50, 5000.0000)`);
    }
    
    // Create BOM for Laminated Glass (item LG-001) if not exists
    const [lgItem] = await pool.query("SELECT id FROM items WHERE item_number = 'LG-001'");
    if (lgItem.length > 0) {
      const [bomCheck] = await pool.query('SELECT id FROM bom_headers WHERE item_id = ? AND is_active = 1', [lgItem[0].id]);
      if (bomCheck.length === 0) {
        const [bomResult] = await pool.query(`INSERT INTO bom_headers (item_id, revision, description, batch_size, is_active)
          VALUES (?, 'A', 'Laminated Safety Glass BOM - 2 lites + PVB interlayer', 1.0000, 1)`, [lgItem[0].id]);
        const bomId = bomResult.insertId;
        const [rgItem] = await pool.query("SELECT id FROM items WHERE item_number = 'RG-001'");
        const [pvbItem] = await pool.query("SELECT id FROM items WHERE item_number = 'PVB-076'");
        if (rgItem.length > 0 && pvbItem.length > 0) {
          await pool.query(`INSERT INTO bom_lines (bom_id, sequence, component_item_id, quantity_per, waste_percent, uom, operation_sequence, component_type, consumed_at_operation, notes) VALUES
            (?, 10, ?, 1.000000, 5.00, 'Sheet', 10, 'glass_lite', 10, 'Outer glass lite - cut to size'),
            (?, 20, ?, 1.000000, 5.00, 'Sheet', 10, 'glass_lite', 10, 'Inner glass lite - cut to size'),
            (?, 30, ?, 1.000000, 3.00, 'SqFt', 40, 'interlayer', 40, 'PVB 0.76mm interlayer - cut in clean room')`,
            [bomId, rgItem[0].id, bomId, rgItem[0].id, bomId, pvbItem[0].id]);
        }
      }
    }
    console.log('BOM seed: verified');
  } catch(e) { console.log('BOM seed:', e.message); }
};
