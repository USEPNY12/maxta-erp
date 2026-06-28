-- Phase 9 Kiosk Stations Seed Data
INSERT IGNORE INTO kiosk_stations (station_name, station_code, work_center_id, pin_code, allowed_actions, config) VALUES
('Cutting Table 1', 'CUT-01', 1, '1234', '["scan_wo","log_production","report_issue","clock_in","clock_out"]', '{"timeout":120}'),
('Tempering Oven', 'TEMP-01', 2, '1234', '["scan_wo","log_production","quality_check","report_issue"]', '{"timeout":180}'),
('Lamination Station', 'LAM-01', 3, '1234', '["scan_wo","log_production","report_issue"]', '{"timeout":120}'),
('Shipping Dock', 'SHIP-01', NULL, '5678', '["scan_shipment","verify_packing","log_dispatch"]', '{"timeout":300}'),
('Receiving Bay', 'RECV-01', NULL, '5678', '["scan_po","receive_item","inspect_quality"]', '{"timeout":300}');
