-- Max TA Group ERP - Complete Database Schema
-- Glass Fabrication / Manufacturing ERP System

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role ENUM('admin','manager','sales','production','purchasing','accounting','shipping','readonly') NOT NULL DEFAULT 'readonly',
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  category VARCHAR(50),
  description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS company_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(100),
  address_line2 VARCHAR(100),
  city VARCHAR(50),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  phone VARCHAR(30),
  fax VARCHAR(30),
  email VARCHAR(100),
  website VARCHAR(100),
  tax_id VARCHAR(50),
  logo_path VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_number INT NOT NULL,
  period_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  closed_by INT,
  closed_at DATETIME,
  UNIQUE KEY (period_number, period_year)
);

CREATE TABLE IF NOT EXISTS item_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  location_group VARCHAR(50),
  address VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_number VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  additional_info VARCHAR(255),
  item_type_id INT,
  uom VARCHAR(20) NOT NULL DEFAULT 'Each',
  is_purchased BOOLEAN DEFAULT FALSE,
  is_manufactured BOOLEAN DEFAULT FALSE,
  is_sold BOOLEAN DEFAULT FALSE,
  is_material BOOLEAN DEFAULT FALSE,
  lot_control BOOLEAN DEFAULT FALSE,
  serial_control BOOLEAN DEFAULT FALSE,
  is_taxable BOOLEAN DEFAULT TRUE,
  is_backorderable BOOLEAN DEFAULT TRUE,
  exempt_from_commission BOOLEAN DEFAULT FALSE,
  has_warranty BOOLEAN DEFAULT FALSE,
  is_hazardous BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  include_in_forecast BOOLEAN DEFAULT TRUE,
  standard_cost DECIMAL(12,4) DEFAULT 0,
  weighted_avg_cost DECIMAL(12,4) DEFAULT 0,
  last_cost DECIMAL(12,4) DEFAULT 0,
  qty_on_hand DECIMAL(12,4) DEFAULT 0,
  receipt_location_id INT,
  shipping_location_id INT,
  bin VARCHAR(20),
  cycle_code VARCHAR(10),
  item_group VARCHAR(50),
  item_master_group VARCHAR(50),
  min_order_qty DECIMAL(12,4) DEFAULT 1,
  minimum_qty DECIMAL(12,4) DEFAULT 1,
  lead_time_days INT DEFAULT 0,
  production_days INT DEFAULT 0,
  production_qty DECIMAL(12,4) DEFAULT 0,
  batch_size DECIMAL(12,4) DEFAULT 1,
  revision VARCHAR(20),
  drawing_number VARCHAR(50),
  unit_weight DECIMAL(10,4) DEFAULT 0,
  glass_type ENUM('clear','low_e','tinted','frosted','mirror','laminated') NULL,
  glass_thickness VARCHAR(10) NULL,
  tempering_status ENUM('annealed','tempered','heat_strengthened','laminated') NULL,
  edge_type ENUM('flat_polish','pencil_polish','beveled','seamed','raw') NULL,
  pricing_method ENUM('per_unit','per_sqft','per_linear_ft') DEFAULT 'per_unit',
  custom_field_1 VARCHAR(100),
  custom_field_2 VARCHAR(100),
  custom_field_3 VARCHAR(100),
  custom_field_4 VARCHAR(100),
  custom_field_5 VARCHAR(100),
  notes TEXT,
  internal_notes TEXT,
  entered_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_type_id) REFERENCES item_types(id),
  FOREIGN KEY (receipt_location_id) REFERENCES locations(id),
  FOREIGN KEY (shipping_location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS item_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  price_list VARCHAR(50) DEFAULT 'Standard',
  min_qty DECIMAL(12,4) DEFAULT 0,
  max_qty DECIMAL(12,4) DEFAULT 999999,
  unit_price DECIMAL(12,4) NOT NULL,
  tier_type ENUM('stock_sheet','half_sheet','custom_cut','standard') DEFAULT 'standard',
  price_per_sqft DECIMAL(10,4) DEFAULT 0,
  minimum_charge DECIMAL(10,2) DEFAULT 0,
  effective_date DATE,
  expiry_date DATE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS item_vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  vendor_id INT,
  vendor_item_number VARCHAR(50),
  vendor_description VARCHAR(255),
  unit_cost DECIMAL(12,4),
  lead_time_days INT DEFAULT 0,
  min_order_qty DECIMAL(12,4) DEFAULT 1,
  is_preferred BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS lots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lot_number VARCHAR(50) NOT NULL,
  item_id INT NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 0,
  location_id INT,
  expiration_date DATE,
  supplier_lot_number VARCHAR(50),
  status ENUM('available','on_hold','quarantine','expired') DEFAULT 'available',
  received_date DATE,
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS serial_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  item_id INT NOT NULL,
  lot_id INT,
  location_id INT,
  status ENUM('available','issued','sold','scrapped','in_service','reserved') DEFAULT 'available',
  received_date DATE,
  sold_date DATE,
  customer_id INT,
  sales_order_id INT,
  work_order_id INT,
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (lot_id) REFERENCES lots(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adjustment_number VARCHAR(20) UNIQUE NOT NULL,
  item_id INT NOT NULL,
  location_id INT,
  adjustment_type ENUM('increase','decrease','transfer') NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  reason_code VARCHAR(50),
  lot_number VARCHAR(50),
  serial_number VARCHAR(100),
  cost DECIMAL(12,4),
  notes TEXT,
  adjusted_by INT,
  adjustment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS physical_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  count_number VARCHAR(20) UNIQUE NOT NULL,
  count_date DATE NOT NULL,
  location_id INT,
  status ENUM('draft','in_progress','completed','posted') DEFAULT 'draft',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physical_count_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  count_id INT NOT NULL,
  item_id INT NOT NULL,
  location_id INT,
  system_qty DECIMAL(12,4) DEFAULT 0,
  counted_qty DECIMAL(12,4) DEFAULT 0,
  variance_qty DECIMAL(12,4) DEFAULT 0,
  lot_number VARCHAR(50),
  serial_number VARCHAR(100),
  FOREIGN KEY (count_id) REFERENCES physical_counts(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS customer_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tax_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  rate DECIMAL(6,4) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS carriers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  phone VARCHAR(30),
  account_number VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS salespeople (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  email VARCHAR(100),
  phone VARCHAR(30),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS price_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  markup_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_number VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  bill_address1 VARCHAR(100),
  bill_address2 VARCHAR(100),
  bill_city VARCHAR(50),
  bill_state VARCHAR(50),
  bill_zip VARCHAR(20),
  bill_country VARCHAR(50) DEFAULT 'USA',
  ship_address1 VARCHAR(100),
  ship_address2 VARCHAR(100),
  ship_city VARCHAR(50),
  ship_state VARCHAR(50),
  ship_zip VARCHAR(20),
  ship_country VARCHAR(50) DEFAULT 'USA',
  phone VARCHAR(30),
  fax VARCHAR(30),
  email VARCHAR(100),
  website VARCHAR(100),
  customer_type_id INT,
  tax_group_id INT,
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  price_list_id INT,
  salesperson_id INT,
  carrier_id INT,
  tax_exempt BOOLEAN DEFAULT FALSE,
  tax_exempt_number VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_type_id) REFERENCES customer_types(id),
  FOREIGN KEY (tax_group_id) REFERENCES tax_groups(id),
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
  FOREIGN KEY (salesperson_id) REFERENCES salespeople(id),
  FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

CREATE TABLE IF NOT EXISTS customer_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(50),
  phone VARCHAR(30),
  email VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  quote_date DATE NOT NULL,
  expiry_date DATE,
  status ENUM('draft','sent','accepted','rejected','expired','converted') DEFAULT 'draft',
  salesperson_id INT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  terms_conditions TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (salesperson_id) REFERENCES salespeople(id)
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  line_number INT NOT NULL,
  item_id INT NOT NULL,
  description VARCHAR(255),
  quantity DECIMAL(12,4) NOT NULL,
  uom VARCHAR(20),
  unit_price DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) DEFAULT 0,
  width_inches DECIMAL(8,3),
  height_inches DECIMAL(8,3),
  sqft DECIMAL(10,4),
  notes TEXT,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  customer_po VARCHAR(50),
  order_date DATE NOT NULL,
  required_date DATE,
  promised_date DATE,
  ship_date DATE,
  status ENUM('draft','open','partial','complete','closed','cancelled') DEFAULT 'draft',
  quote_id INT,
  salesperson_id INT,
  carrier_id INT,
  ship_via VARCHAR(50),
  fob VARCHAR(50),
  ship_to_name VARCHAR(100),
  ship_address1 VARCHAR(100),
  ship_address2 VARCHAR(100),
  ship_city VARCHAR(50),
  ship_state VARCHAR(50),
  ship_zip VARCHAR(20),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (quote_id) REFERENCES quotes(id),
  FOREIGN KEY (salesperson_id) REFERENCES salespeople(id),
  FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sales_order_id INT NOT NULL,
  line_number INT NOT NULL,
  item_id INT NOT NULL,
  description VARCHAR(255),
  quantity_ordered DECIMAL(12,4) NOT NULL,
  quantity_shipped DECIMAL(12,4) DEFAULT 0,
  quantity_backordered DECIMAL(12,4) DEFAULT 0,
  uom VARCHAR(20),
  unit_price DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) DEFAULT 0,
  width_inches DECIMAL(8,3),
  height_inches DECIMAL(8,3),
  sqft DECIMAL(10,4),
  work_order_id INT,
  status ENUM('open','partial','complete','cancelled') DEFAULT 'open',
  required_date DATE,
  notes TEXT,
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipment_number VARCHAR(20) UNIQUE NOT NULL,
  sales_order_id INT NOT NULL,
  customer_id INT NOT NULL,
  shipment_date DATE NOT NULL,
  carrier_id INT,
  tracking_number VARCHAR(100),
  weight DECIMAL(10,2),
  freight_charge DECIMAL(10,2) DEFAULT 0,
  status ENUM('draft','shipped','delivered','cancelled') DEFAULT 'draft',
  ship_to_name VARCHAR(100),
  ship_address1 VARCHAR(100),
  ship_address2 VARCHAR(100),
  ship_city VARCHAR(50),
  ship_state VARCHAR(50),
  ship_zip VARCHAR(20),
  notes TEXT,
  shipped_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

CREATE TABLE IF NOT EXISTS shipment_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id INT NOT NULL,
  sales_order_line_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity_shipped DECIMAL(12,4) NOT NULL,
  lot_number VARCHAR(50),
  serial_number VARCHAR(100),
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_line_id) REFERENCES sales_order_lines(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS work_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  capacity_type ENUM('hours','units','sqft','linear_inches','weight') DEFAULT 'hours',
  available_hours_per_day DECIMAL(5,2) DEFAULT 8,
  num_machines INT DEFAULT 1,
  efficiency_rate DECIMAL(5,2) DEFAULT 100,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  overhead_rate DECIMAL(10,2) DEFAULT 0,
  queue_time_hours DECIMAL(5,2) DEFAULT 0,
  move_time_hours DECIMAL(5,2) DEFAULT 0,
  scheduling_type ENUM('finite','infinite') DEFAULT 'infinite',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bom_headers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  revision VARCHAR(20),
  description VARCHAR(255),
  effective_date DATE,
  expiry_date DATE,
  batch_size DECIMAL(12,4) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS bom_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id INT NOT NULL,
  sequence INT NOT NULL,
  component_item_id INT NOT NULL,
  quantity_per DECIMAL(12,6) NOT NULL,
  waste_percent DECIMAL(5,2) DEFAULT 0,
  uom VARCHAR(20),
  operation_sequence INT,
  is_fixed_qty BOOLEAN DEFAULT FALSE,
  reference_designator VARCHAR(50),
  notes TEXT,
  FOREIGN KEY (bom_id) REFERENCES bom_headers(id) ON DELETE CASCADE,
  FOREIGN KEY (component_item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS routings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  revision VARCHAR(20),
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS routing_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  routing_id INT NOT NULL,
  sequence INT NOT NULL,
  work_center_id INT NOT NULL,
  operation_description VARCHAR(255),
  setup_time_hours DECIMAL(8,4) DEFAULT 0,
  run_time_hours DECIMAL(8,4) DEFAULT 0,
  overlap_percent DECIMAL(5,2) DEFAULT 0,
  efficiency_percent DECIMAL(5,2) DEFAULT 100,
  is_subcontract BOOLEAN DEFAULT FALSE,
  subcontract_vendor_id INT,
  instructions TEXT,
  FOREIGN KEY (routing_id) REFERENCES routings(id) ON DELETE CASCADE,
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id)
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  wo_type VARCHAR(20),
  item_id INT NOT NULL,
  description VARCHAR(255),
  quantity DECIMAL(12,4) NOT NULL,
  quantity_completed DECIMAL(12,4) DEFAULT 0,
  quantity_scrapped DECIMAL(12,4) DEFAULT 0,
  sales_order_id INT,
  sales_order_line INT,
  customer_id INT,
  status ENUM('planned','released','in_progress','complete','closed','cancelled') DEFAULT 'planned',
  priority VARCHAR(20) DEFAULT 'Normal',
  scheduling_type ENUM('forward','backward','floating') DEFAULT 'floating',
  release_date DATE,
  start_date DATE,
  finish_date DATE,
  requested_date DATE,
  location_id INT,
  lot_number VARCHAR(50),
  estimated_material_cost DECIMAL(12,2) DEFAULT 0,
  estimated_labor_cost DECIMAL(12,2) DEFAULT 0,
  estimated_setup_cost DECIMAL(12,2) DEFAULT 0,
  estimated_overhead_cost DECIMAL(12,2) DEFAULT 0,
  estimated_outside_cost DECIMAL(12,2) DEFAULT 0,
  actual_material_cost DECIMAL(12,2) DEFAULT 0,
  actual_labor_cost DECIMAL(12,2) DEFAULT 0,
  actual_setup_cost DECIMAL(12,2) DEFAULT 0,
  actual_overhead_cost DECIMAL(12,2) DEFAULT 0,
  actual_outside_cost DECIMAL(12,2) DEFAULT 0,
  project_number VARCHAR(50),
  purchase_order VARCHAR(50),
  service_job VARCHAR(50),
  comments TEXT,
  wo_printed BOOLEAN DEFAULT FALSE,
  entered_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS wo_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  line_number INT NOT NULL,
  item_id INT NOT NULL,
  description VARCHAR(255),
  quantity_required DECIMAL(12,4) NOT NULL,
  waste_percent DECIMAL(5,2) DEFAULT 0,
  total_qty DECIMAL(12,4) NOT NULL,
  quantity_issued DECIMAL(12,4) DEFAULT 0,
  unit_cost DECIMAL(12,4) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  lot_number VARCHAR(50),
  location_id INT,
  notes TEXT,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS wo_routing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  sequence INT NOT NULL,
  work_center_id INT NOT NULL,
  operation_description VARCHAR(255),
  setup_hours_estimated DECIMAL(8,4) DEFAULT 0,
  run_hours_estimated DECIMAL(8,4) DEFAULT 0,
  setup_hours_actual DECIMAL(8,4) DEFAULT 0,
  run_hours_actual DECIMAL(8,4) DEFAULT 0,
  quantity_completed DECIMAL(12,4) DEFAULT 0,
  quantity_scrapped DECIMAL(12,4) DEFAULT 0,
  status ENUM('pending','in_progress','complete') DEFAULT 'pending',
  start_date DATETIME,
  end_date DATETIME,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id)
);

CREATE TABLE IF NOT EXISTS wo_labor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  wo_routing_id INT,
  employee_name VARCHAR(100),
  work_date DATE NOT NULL,
  hours_worked DECIMAL(6,2) NOT NULL,
  labor_type ENUM('setup','run') DEFAULT 'run',
  labor_rate DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  operation_sequence INT,
  notes TEXT,
  entered_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (wo_routing_id) REFERENCES wo_routing(id)
);

CREATE TABLE IF NOT EXISTS wo_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  work_order_id INT NOT NULL,
  receipt_date DATE NOT NULL,
  quantity_completed DECIMAL(12,4) NOT NULL,
  quantity_scrapped DECIMAL(12,4) DEFAULT 0,
  scrap_code VARCHAR(20),
  is_final BOOLEAN DEFAULT FALSE,
  material_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  setup_cost DECIMAL(12,2) DEFAULT 0,
  overhead_cost DECIMAL(12,2) DEFAULT 0,
  outside_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  location_id INT,
  lot_number VARCHAR(50),
  serial_number_start VARCHAR(100),
  serial_number_end VARCHAR(100),
  use_estimated_cost BOOLEAN DEFAULT FALSE,
  use_net_wip BOOLEAN DEFAULT FALSE,
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  entered_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS shop_floor_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  wo_routing_id INT NOT NULL,
  work_center_id INT NOT NULL,
  status ENUM('queued','in_progress','complete','on_hold','recut') DEFAULT 'queued',
  operator_name VARCHAR(100),
  started_at DATETIME,
  completed_at DATETIME,
  quantity_good DECIMAL(12,4) DEFAULT 0,
  quantity_scrap DECIMAL(12,4) DEFAULT 0,
  scrap_code VARCHAR(20),
  scrap_reason TEXT,
  label_printed BOOLEAN DEFAULT FALSE,
  label_printed_at DATETIME,
  notes TEXT,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (wo_routing_id) REFERENCES wo_routing(id),
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id)
);

CREATE TABLE IF NOT EXISTS scrap_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vendor_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_number VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  address1 VARCHAR(100),
  address2 VARCHAR(100),
  city VARCHAR(50),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  phone VARCHAR(30),
  fax VARCHAR(30),
  email VARCHAR(100),
  website VARCHAR(100),
  vendor_type_id INT,
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  tax_id VARCHAR(50),
  is_1099 BOOLEAN DEFAULT FALSE,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_type_id) REFERENCES vendor_types(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(20) UNIQUE NOT NULL,
  vendor_id INT NOT NULL,
  po_type ENUM('standard','blanket','buyout','supporting') DEFAULT 'standard',
  order_date DATE NOT NULL,
  required_date DATE,
  promised_date DATE,
  status ENUM('draft','open','partial','complete','closed','cancelled') DEFAULT 'draft',
  work_order_id INT,
  sales_order_id INT,
  ship_to_location_id INT,
  fob VARCHAR(50),
  ship_via VARCHAR(50),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  created_by INT,
  approved_by INT,
  approved_date DATETIME,
  po_printed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (ship_to_location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS po_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  line_number INT NOT NULL,
  item_id INT NOT NULL,
  description VARCHAR(255),
  quantity_ordered DECIMAL(12,4) NOT NULL,
  quantity_received DECIMAL(12,4) DEFAULT 0,
  uom VARCHAR(20),
  unit_cost DECIMAL(12,4) NOT NULL,
  line_total DECIMAL(12,2) DEFAULT 0,
  required_date DATE,
  status ENUM('open','partial','complete','cancelled') DEFAULT 'open',
  gl_account VARCHAR(20),
  notes TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS po_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  purchase_order_id INT NOT NULL,
  vendor_id INT NOT NULL,
  receipt_date DATE NOT NULL,
  packing_slip_number VARCHAR(50),
  status ENUM('draft','received','posted') DEFAULT 'draft',
  notes TEXT,
  received_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS po_receipt_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  po_line_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity_received DECIMAL(12,4) NOT NULL,
  quantity_rejected DECIMAL(12,4) DEFAULT 0,
  unit_cost DECIMAL(12,4),
  lot_number VARCHAR(50),
  serial_number VARCHAR(100),
  location_id INT,
  notes TEXT,
  FOREIGN KEY (receipt_id) REFERENCES po_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (po_line_id) REFERENCES po_lines(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS gl_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_type ENUM('asset','liability','equity','revenue','expense','cogs') NOT NULL,
  sub_type VARCHAR(50),
  parent_account_id INT,
  normal_balance ENUM('debit','credit') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255),
  current_balance DECIMAL(14,2) DEFAULT 0,
  FOREIGN KEY (parent_account_id) REFERENCES gl_accounts(id)
);

CREATE TABLE IF NOT EXISTS banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50),
  routing_number VARCHAR(20),
  gl_account_id INT,
  current_balance DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

CREATE TABLE IF NOT EXISTS journal_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucher_number VARCHAR(20) UNIQUE NOT NULL,
  voucher_date DATE NOT NULL,
  period_id INT,
  description VARCHAR(255),
  source VARCHAR(50),
  source_reference VARCHAR(50),
  total_debit DECIMAL(14,2) DEFAULT 0,
  total_credit DECIMAL(14,2) DEFAULT 0,
  status ENUM('draft','posted','reversed') DEFAULT 'draft',
  posted_date DATETIME,
  posted_by INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucher_id INT NOT NULL,
  line_number INT NOT NULL,
  gl_account_id INT NOT NULL,
  debit_amount DECIMAL(14,2) DEFAULT 0,
  credit_amount DECIMAL(14,2) DEFAULT 0,
  description VARCHAR(255),
  reference VARCHAR(50),
  FOREIGN KEY (voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

CREATE TABLE IF NOT EXISTS ar_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  sales_order_id INT,
  shipment_id INT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  status ENUM('draft','posted','partial','paid','void') DEFAULT 'draft',
  terms VARCHAR(50),
  salesperson_id INT,
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  gl_voucher_id INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (shipment_id) REFERENCES shipments(id),
  FOREIGN KEY (salesperson_id) REFERENCES salespeople(id)
);

CREATE TABLE IF NOT EXISTS ar_invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  line_number INT NOT NULL,
  item_id INT,
  description VARCHAR(255),
  quantity DECIMAL(12,4),
  unit_price DECIMAL(12,4),
  line_total DECIMAL(12,2),
  gl_account_id INT,
  FOREIGN KEY (invoice_id) REFERENCES ar_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('check','wire','ach','credit_card','cash') NOT NULL,
  reference_number VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  bank_id INT,
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  gl_voucher_id INT,
  notes TEXT,
  received_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS payment_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  invoice_id INT NOT NULL,
  amount_applied DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES customer_payments(id),
  FOREIGN KEY (invoice_id) REFERENCES ar_invoices(id)
);

CREATE TABLE IF NOT EXISTS ap_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL,
  vendor_id INT NOT NULL,
  purchase_order_id INT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  status ENUM('draft','posted','partial','paid','void') DEFAULT 'draft',
  terms VARCHAR(50),
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  gl_voucher_id INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);

CREATE TABLE IF NOT EXISTS vendor_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(20) UNIQUE NOT NULL,
  check_number VARCHAR(20),
  vendor_id INT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('check','wire','ach') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  bank_id INT,
  posted BOOLEAN DEFAULT FALSE,
  posted_date DATETIME,
  gl_voucher_id INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_id INT NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(14,2) NOT NULL,
  book_balance DECIMAL(14,2),
  adjusted_balance DECIMAL(14,2),
  difference DECIMAL(14,2),
  status ENUM('in_progress','reconciled') DEFAULT 'in_progress',
  reconciled_by INT,
  reconciled_date DATETIME,
  FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS gl_budget (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gl_account_id INT NOT NULL,
  period_id INT NOT NULL,
  budget_amount DECIMAL(14,2) DEFAULT 0,
  actual_amount DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id),
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
);

CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesperson_id INT NOT NULL,
  invoice_id INT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  invoice_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','approved','paid') DEFAULT 'pending',
  paid_date DATE,
  FOREIGN KEY (salesperson_id) REFERENCES salespeople(id),
  FOREIGN KEY (invoice_id) REFERENCES ar_invoices(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  doc_type ENUM('quote','sales_order','invoice','packing_slip','bill_of_lading','purchase_order','work_order','receipt_label','shipping_label','product_label','check','statement') NOT NULL,
  template_html TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS label_configurations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label_type ENUM('product','shipping','receipt','barcode','rack','station') NOT NULL,
  name VARCHAR(100) NOT NULL,
  width_inches DECIMAL(5,2) NOT NULL,
  height_inches DECIMAL(5,2) NOT NULL,
  barcode_format ENUM('code128','code39','qr','ean13','upc') DEFAULT 'code128',
  template_html TEXT,
  fields_json JSON,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seq_name VARCHAR(50) UNIQUE NOT NULL,
  prefix VARCHAR(10) DEFAULT '',
  current_value INT DEFAULT 0,
  increment_by INT DEFAULT 1,
  pad_length INT DEFAULT 5
);

INSERT INTO sequences (seq_name, prefix, current_value, pad_length) VALUES
('quote', 'QT-', 1000, 5),
('sales_order', 'SO-', 10000, 5),
('shipment', 'SH-', 1000, 5),
('work_order', 'WO-', 20000, 5),
('purchase_order', 'PO-', 5000, 5),
('ar_invoice', 'INV-', 10000, 5),
('ap_invoice', 'AP-', 1000, 5),
('customer', 'C-', 10000, 5),
('vendor', 'V-', 1000, 5),
('receipt', 'REC-', 1000, 5),
('payment', 'PMT-', 1000, 5),
('journal', 'JV-', 1000, 5),
('adjustment', 'ADJ-', 1000, 5),
('wo_receipt', 'WOR-', 1000, 5),
('po_receipt', 'POR-', 1000, 5)
ON DUPLICATE KEY UPDATE seq_name=seq_name;

INSERT INTO item_types (name, description) VALUES
('Raw Material', 'Raw materials purchased from vendors'),
('Finished Good', 'Completed products ready for sale'),
('Sub-Assembly', 'Intermediate assemblies used in production'),
('Purchased Part', 'Parts bought and resold or used in assembly'),
('Service', 'Non-inventory service items'),
('Consumable', 'Items consumed in production but not tracked per unit')
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO scrap_codes (code, description) VALUES
('BREAK', 'Glass breakage during handling'),
('CHIP', 'Edge chip during processing'),
('SCRATCH', 'Surface scratch detected in QC'),
('TEMPER', 'Tempering failure'),
('CUT-ERR', 'Cutting error - wrong dimensions'),
('DRILL-ERR', 'Drilling error - wrong position'),
('EDGE-ERR', 'Edge processing error'),
('LAMI-ERR', 'Lamination defect'),
('INCL', 'Inclusion or contamination'),
('WARP', 'Warping during tempering'),
('OTHER', 'Other - see notes')
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO work_centers (code, name, department, capacity_type, labor_rate, overhead_rate) VALUES
('CUT', 'Cutting Table', 'Cutting', 'sqft', 25.00, 15.00),
('EDGE', 'Edge Polisher', 'Polishing', 'linear_inches', 30.00, 12.00),
('CNC', 'CNC/Waterjet', 'Fabrication', 'hours', 45.00, 25.00),
('DRILL', 'Drilling Station', 'Fabrication', 'hours', 28.00, 10.00),
('WASH', 'Wash Line', 'Preparation', 'sqft', 15.00, 8.00),
('TEMP', 'Tempering Oven', 'Tempering', 'sqft', 35.00, 40.00),
('LAMI', 'Lamination Line', 'Lamination', 'sqft', 32.00, 20.00),
('QC', 'Quality Control', 'Inspection', 'units', 22.00, 5.00),
('PACK', 'Packing Station', 'Shipping', 'units', 18.00, 8.00)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO gl_accounts (account_number, account_name, account_type, normal_balance) VALUES
('1000', 'Cash - Operating', 'asset', 'debit'),
('1100', 'Accounts Receivable', 'asset', 'debit'),
('1200', 'Inventory - Raw Materials', 'asset', 'debit'),
('1210', 'Inventory - Work in Progress', 'asset', 'debit'),
('1220', 'Inventory - Finished Goods', 'asset', 'debit'),
('1500', 'Fixed Assets', 'asset', 'debit'),
('2000', 'Accounts Payable', 'liability', 'credit'),
('2100', 'Accrued Liabilities', 'liability', 'credit'),
('2200', 'Sales Tax Payable', 'liability', 'credit'),
('3000', 'Common Stock', 'equity', 'credit'),
('3100', 'Retained Earnings', 'equity', 'credit'),
('4000', 'Sales Revenue', 'revenue', 'credit'),
('4100', 'Freight Revenue', 'revenue', 'credit'),
('5000', 'Cost of Goods Sold', 'cogs', 'debit'),
('5010', 'Material Cost Variance', 'cogs', 'debit'),
('5020', 'Labor Cost Variance', 'cogs', 'debit'),
('5100', 'Direct Labor', 'cogs', 'debit'),
('5200', 'Manufacturing Overhead', 'cogs', 'debit'),
('6000', 'Salaries & Wages', 'expense', 'debit'),
('6100', 'Rent Expense', 'expense', 'debit'),
('6200', 'Utilities Expense', 'expense', 'debit'),
('6600', 'Shipping Expense', 'expense', 'debit'),
('6700', 'Commission Expense', 'expense', 'debit')
ON DUPLICATE KEY UPDATE account_number=account_number;
