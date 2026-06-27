-- =====================================================
-- MaxTA ERP v4.0 - Lamination Module Migration
-- Complete rebuild from scratch
-- =====================================================

-- 1. Add parent/child WO support to work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS parent_wo_id INT NULL AFTER sales_order_line_id;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS wo_category ENUM('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard' AFTER wo_type;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS glass_makeup JSON NULL AFTER interlayer_type;

-- 2. Enhance bom_lines with dimension fields for glass/interlayer
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS width_mm DECIMAL(10,2) NULL AFTER quantity_per;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS height_mm DECIMAL(10,2) NULL AFTER width_mm;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS thickness_mm DECIMAL(6,2) NULL AFTER height_mm;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS component_type ENUM('glass_lite','interlayer','hardware','consumable','other') DEFAULT 'other' AFTER reference_designator;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS consumed_at_operation INT NULL AFTER component_type;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS overhang_mm DECIMAL(6,2) DEFAULT 0 AFTER consumed_at_operation;

-- 3. Interlayer Roll Inventory
CREATE TABLE IF NOT EXISTS lami_interlayer_rolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  item_id INT NULL,
  material_type ENUM('PVB','SGP','EVA','TPU','Acoustic_PVB','Colored_PVB','SentryGlas') NOT NULL,
  thickness_mm DECIMAL(6,2) NOT NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  original_length_m DECIMAL(10,2) NOT NULL,
  current_length_m DECIMAL(10,2) NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NULL,
  color VARCHAR(50) DEFAULT 'Clear',
  location_id INT NULL,
  rack_position VARCHAR(50) NULL,
  received_date DATE NOT NULL,
  expiry_date DATE NULL,
  opened_date DATE NULL,
  status ENUM('sealed','in_use','exhausted','expired','quarantine') DEFAULT 'sealed',
  humidity_exposure_hours DECIMAL(8,2) DEFAULT 0,
  max_humidity_exposure DECIMAL(8,2) DEFAULT 48,
  cost_per_sqm DECIMAL(10,4) NULL,
  supplier_id INT NULL,
  po_number VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Interlayer Cut Plans (strip nesting results)
CREATE TABLE IF NOT EXISTS lami_interlayer_cut_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_number VARCHAR(50) NOT NULL UNIQUE,
  roll_id INT NOT NULL,
  status ENUM('planned','in_progress','completed','cancelled') DEFAULT 'planned',
  total_pieces INT DEFAULT 0,
  total_length_used_m DECIMAL(10,2) DEFAULT 0,
  waste_percent DECIMAL(5,2) DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  notes TEXT NULL
);

-- 5. Interlayer Cut Plan Lines (individual pieces to cut from the roll)
CREATE TABLE IF NOT EXISTS lami_interlayer_cut_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cut_plan_id INT NOT NULL,
  sequence INT NOT NULL,
  work_order_id INT NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  length_mm DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 1,
  material_type VARCHAR(50) NOT NULL,
  thickness_mm DECIMAL(6,2) NOT NULL,
  overhang_mm DECIMAL(6,2) DEFAULT 5,
  status ENUM('pending','cut','verified','rejected') DEFAULT 'pending',
  cut_by INT NULL,
  cut_at DATETIME NULL,
  notes TEXT NULL
);

-- 6. Clean Room Sessions (environmental tracking)
CREATE TABLE IF NOT EXISTS lami_cleanroom_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_number VARCHAR(50) NOT NULL UNIQUE,
  operator_id INT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  temperature_c DECIMAL(5,1) NULL,
  humidity_percent DECIMAL(5,1) NULL,
  status ENUM('active','completed','aborted') DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Clean Room Layup Records (linking WO to interlayer lot)
CREATE TABLE IF NOT EXISTS lami_layup_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  cleanroom_session_id INT NULL,
  roll_id INT NOT NULL,
  roll_lot_number VARCHAR(100) NOT NULL,
  interlayer_width_mm DECIMAL(10,2) NOT NULL,
  interlayer_length_mm DECIMAL(10,2) NOT NULL,
  glass_lite_1_wo_id INT NULL,
  glass_lite_2_wo_id INT NULL,
  glass_lite_3_wo_id INT NULL,
  layup_sequence TEXT NULL,
  operator_id INT NULL,
  layup_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  temperature_c DECIMAL(5,1) NULL,
  humidity_percent DECIMAL(5,1) NULL,
  pre_press_method ENUM('nip_roller','vacuum_bag','none') DEFAULT 'nip_roller',
  pre_press_time_min INT NULL,
  status ENUM('layup_complete','pre_pressed','ready_for_autoclave','in_autoclave','completed','rejected') DEFAULT 'layup_complete',
  qc_passed TINYINT(1) NULL,
  qc_notes TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Autoclave Recipes (temperature/pressure profiles)
CREATE TABLE IF NOT EXISTS lami_autoclave_recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_name VARCHAR(100) NOT NULL,
  recipe_code VARCHAR(20) NOT NULL UNIQUE,
  interlayer_type ENUM('PVB','SGP','EVA','TPU','Acoustic_PVB') NOT NULL,
  min_thickness_mm DECIMAL(6,2) NULL,
  max_thickness_mm DECIMAL(6,2) NULL,
  ramp_rate_c_per_min DECIMAL(5,2) DEFAULT 1.5,
  target_temperature_c DECIMAL(5,1) NOT NULL,
  soak_time_min INT NOT NULL,
  max_pressure_bar DECIMAL(5,2) NOT NULL,
  cooling_rate_c_per_min DECIMAL(5,2) DEFAULT 2.0,
  total_cycle_hours DECIMAL(5,2) NOT NULL,
  vacuum_required TINYINT(1) DEFAULT 0,
  notes TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Autoclave Batches (load groups)
CREATE TABLE IF NOT EXISTS lami_autoclave_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  autoclave_id INT DEFAULT 1,
  recipe_id INT NOT NULL,
  status ENUM('loading','loaded','in_cycle','cooling','completed','failed') DEFAULT 'loading',
  total_pieces INT DEFAULT 0,
  total_sqm DECIMAL(10,2) DEFAULT 0,
  max_capacity_sqm DECIMAL(10,2) DEFAULT 50,
  interlayer_type VARCHAR(50) NOT NULL,
  cycle_start DATETIME NULL,
  cycle_end DATETIME NULL,
  actual_temp_max DECIMAL(5,1) NULL,
  actual_pressure_max DECIMAL(5,2) NULL,
  operator_id INT NULL,
  qc_passed TINYINT(1) NULL,
  qc_inspector_id INT NULL,
  qc_date DATETIME NULL,
  qc_notes TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Autoclave Batch Items (WOs in a batch)
CREATE TABLE IF NOT EXISTS lami_autoclave_batch_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  work_order_id INT NOT NULL,
  layup_record_id INT NULL,
  position_in_load VARCHAR(20) NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  height_mm DECIMAL(10,2) NOT NULL,
  total_thickness_mm DECIMAL(6,2) NOT NULL,
  sqm DECIMAL(10,4) NOT NULL,
  status ENUM('loaded','completed','failed','rejected') DEFAULT 'loaded',
  defect_type VARCHAR(100) NULL,
  notes TEXT NULL
);

-- 11. Lamination Dashboard Stats (materialized view for performance)
CREATE TABLE IF NOT EXISTS lami_dashboard_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL,
  rolls_in_stock INT DEFAULT 0,
  rolls_expiring_soon INT DEFAULT 0,
  pending_layups INT DEFAULT 0,
  batches_today INT DEFAULT 0,
  sqm_produced_today DECIMAL(10,2) DEFAULT 0,
  defect_rate_percent DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (stat_date)
);

-- 12. Seed autoclave recipes
INSERT IGNORE INTO lami_autoclave_recipes (recipe_name, recipe_code, interlayer_type, min_thickness_mm, max_thickness_mm, ramp_rate_c_per_min, target_temperature_c, soak_time_min, max_pressure_bar, cooling_rate_c_per_min, total_cycle_hours, vacuum_required, notes) VALUES
('PVB Standard (up to 12mm)', 'PVB-STD', 'PVB', 0, 12, 1.5, 135, 60, 12.0, 2.0, 3.5, 0, 'Standard PVB cycle for panels up to 12mm total thickness'),
('PVB Heavy (12-25mm)', 'PVB-HVY', 'PVB', 12, 25, 1.0, 140, 90, 12.5, 1.5, 5.0, 0, 'Extended cycle for thick laminated panels'),
('PVB Jumbo (25mm+)', 'PVB-JMB', 'PVB', 25, 100, 0.8, 140, 120, 13.0, 1.0, 6.5, 0, 'Long cycle for very thick or multi-ply laminates'),
('SGP Standard', 'SGP-STD', 'SGP', 0, 20, 1.5, 135, 60, 14.0, 2.0, 4.0, 0, 'SentryGlas Plus standard cycle - higher pressure required'),
('SGP Structural (20mm+)', 'SGP-STR', 'SGP', 20, 100, 1.0, 140, 90, 14.5, 1.5, 5.5, 0, 'SGP structural glass cycle for balustrades/floors'),
('EVA Standard', 'EVA-STD', 'EVA', 0, 20, 2.0, 110, 45, 0, 2.5, 2.5, 1, 'EVA vacuum bag process - lower temperature, no pressure'),
('TPU Standard', 'TPU-STD', 'TPU', 0, 15, 1.5, 130, 60, 12.0, 2.0, 3.5, 0, 'TPU interlayer standard cycle'),
('Acoustic PVB', 'APVB-STD', 'Acoustic_PVB', 0, 20, 1.5, 135, 75, 12.0, 2.0, 4.0, 0, 'Acoustic PVB requires slightly longer soak time');

-- 13. Seed sample interlayer rolls
INSERT IGNORE INTO lami_interlayer_rolls (roll_number, material_type, thickness_mm, width_mm, original_length_m, current_length_m, lot_number, manufacturer, color, received_date, expiry_date, status, cost_per_sqm) VALUES
('ROLL-PVB-001', 'PVB', 0.76, 1830, 300, 285.5, 'LOT-2026-A001', 'Eastman', 'Clear', '2026-05-15', '2027-05-15', 'in_use', 8.50),
('ROLL-PVB-002', 'PVB', 0.76, 2440, 300, 300, 'LOT-2026-A002', 'Eastman', 'Clear', '2026-06-01', '2027-06-01', 'sealed', 8.50),
('ROLL-PVB-003', 'PVB', 1.52, 1830, 200, 142.3, 'LOT-2026-B001', 'Eastman', 'Clear', '2026-04-20', '2027-04-20', 'in_use', 16.00),
('ROLL-SGP-001', 'SGP', 1.52, 1530, 150, 150, 'LOT-2026-SGP01', 'Trosifol', 'Clear', '2026-06-10', '2027-12-10', 'sealed', 45.00),
('ROLL-SGP-002', 'SGP', 2.28, 1830, 100, 78.2, 'LOT-2026-SGP02', 'Trosifol', 'Clear', '2026-03-15', '2027-09-15', 'in_use', 62.00),
('ROLL-EVA-001', 'EVA', 0.76, 2440, 250, 250, 'LOT-2026-EVA01', 'Bridgestone', 'Clear', '2026-06-20', '2028-06-20', 'sealed', 6.50),
('ROLL-APVB-001', 'Acoustic_PVB', 0.76, 1830, 200, 165.0, 'LOT-2026-AC01', 'Eastman', 'Clear', '2026-05-01', '2027-05-01', 'in_use', 12.00),
('ROLL-TPU-001', 'TPU', 0.76, 1530, 150, 150, 'LOT-2026-TPU01', 'Huntsman', 'Clear', '2026-06-15', '2028-06-15', 'sealed', 22.00);
