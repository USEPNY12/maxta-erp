-- Seed racks
INSERT IGNORE INTO dispatch_racks (rack_number, rack_type, capacity_sqft, capacity_pieces, max_weight_lbs, max_height_inches, max_width_inches, status, current_location) VALUES
('RACK-001', 'a-frame', 120, 20, 2000, 96, 144, 'available', 'Warehouse'),
('RACK-002', 'a-frame', 120, 20, 2000, 96, 144, 'available', 'Warehouse'),
('RACK-003', 'l-rack', 80, 15, 1500, 72, 120, 'available', 'Warehouse'),
('RACK-004', 'a-frame', 120, 20, 2000, 96, 144, 'loaded', 'Production Floor'),
('RACK-005', 'stillage', 60, 10, 1000, 48, 96, 'available', 'Warehouse'),
('RACK-006', 'a-frame', 120, 20, 2000, 96, 144, 'in-transit', 'En route - Job 1042'),
('RACK-007', 'flat-bed', 200, 30, 3000, 120, 180, 'at-customer', 'ABC Construction'),
('RACK-008', 'a-frame', 120, 20, 2000, 96, 144, 'maintenance', 'Shop');

-- Seed notification rules
INSERT IGNORE INTO notification_rules (rule_name, rule_type, conditions, notify_roles, notify_method, frequency, is_active) VALUES
('Low Stock Alert', 'low_stock', '{"threshold": "reorder_point"}', '["admin","inventory"]', 'in_app', 'daily', 1),
('Overdue Invoice', 'overdue_invoice', '{"days_overdue": 30}', '["admin","accounting"]', 'in_app', 'daily', 1),
('WO Due Soon', 'wo_deadline', '{"days_ahead": 3}', '["admin","manufacturing"]', 'in_app', 'daily', 1),
('PO Past Due', 'po_past_due', '{"days_overdue": 7}', '["admin","purchasing"]', 'in_app', 'daily', 1),
('Machine Maintenance', 'maintenance_due', '{"interval_days": 30}', '["admin","manufacturing"]', 'in_app', 'weekly', 1),
('Credit Limit Warning', 'credit_limit', '{"threshold_pct": 90}', '["admin","sales"]', 'in_app', 'realtime', 1);

-- Seed email templates
INSERT IGNORE INTO email_templates (template_name, template_type, subject, body_html, is_active) VALUES
('Invoice Email', 'invoice', 'Invoice from Max TA Group', '<h2>Invoice</h2><p>Dear Customer,</p><p>Please find attached your invoice.</p><p>Thank you for your business!</p><p>Max TA Group LLC</p>', 1),
('Order Confirmation', 'order_confirmation', 'Order Confirmation', '<h2>Order Confirmed</h2><p>Dear Customer,</p><p>Your order has been confirmed and is now in production.</p><p>Thank you!</p>', 1),
('Shipment Notification', 'shipment_notification', 'Your Order Has Shipped', '<h2>Shipment Notification</h2><p>Dear Customer,</p><p>Your order has been shipped.</p><p>Expected delivery within 3-5 business days.</p>', 1),
('Overdue Reminder', 'overdue_reminder', 'Payment Reminder', '<h2>Payment Reminder</h2><p>Dear Customer,</p><p>This is a friendly reminder that your invoice is past due.</p><p>Please arrange payment at your earliest convenience.</p>', 1),
('Quote Follow-up', 'quote', 'Following Up on Your Quote', '<h2>Quote Follow-up</h2><p>Dear Customer,</p><p>We wanted to follow up on the quote we sent recently.</p><p>Please let us know if you have any questions.</p>', 1);

-- Seed work center capacity (Mon-Fri for existing work centers)
INSERT IGNORE INTO work_center_capacity (work_center_id, day_of_week, shift_start, shift_end, capacity_hours, max_concurrent_jobs, is_available)
SELECT wc.id, d.day, '07:00:00', '17:00:00', 10.00, 1, 1
FROM work_centers wc
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) d
WHERE wc.is_active = 1
ON DUPLICATE KEY UPDATE capacity_hours = 10.00;
