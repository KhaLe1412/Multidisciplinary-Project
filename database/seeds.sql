use DADN;
SET NAMES utf8mb4;

-- Passwords: admin123 / staff123 (bcrypt)
INSERT INTO users (full_name, email, phone, password_hash, role, status)
VALUES 
('Admin User', 'admin@test.com', '0900000001', '$2b$12$N32m.C/YWUryfcAIu9Mk9OhXVN7rPAlFV7LCbIZ2VeFvulk528FnK', 'admin', 'active'),
('Staff User', 'staff@test.com', '0900000002', '$2b$12$EtvC/RxcSP3zoW5tIH0lH.rQjiOZhQgx/.pEqGpF5oPH7VhJS/Yje', 'staff', 'active');

INSERT INTO areas (name, description, manager_id)
VALUES 
('Khu A', 'Khu vực sấy trái cây', 1);

INSERT INTO dryers (name, capacity, status, area_id, manager_id)
VALUES 
('Máy sấy 1', 100, 'on', 1, 1);

INSERT INTO device_types (name, unit, max_value, min_value, category)
VALUES 
('Temperature Sensor', '°C', 100, 0, 'sensor'),
('Fan Controller', '%', 100, 0, 'controller'),
('Humidity Sensor', '%', 100, 0, 'sensor'),
('Fan Controller 2', 'boolean', 1, 0, 'controller'),
('Door Controller', 'boolean', 1, 0, 'controller');

INSERT INTO devices (id, name, power_status, install_date, dryer_id, type_id)
VALUES 
('sensor','Temp Sensor 1', 1, '2025-01-01', 1, 1),
('worker','Fan 1', 1, '2025-01-01', 1, 4);

INSERT INTO crops (name, description)
VALUES 
('Xoài', 'Sấy xoài'),
('Chuối', 'Sấy chuối');

INSERT INTO schedules (name, crop_id)
VALUES 
('Lịch trình xoài', 1);

INSERT INTO schedule_virtual_devices (schedule_id, name, device_type_id)
VALUES 
(1, 'Fan Speed', 4);

INSERT INTO stages (schedule_id, name, start_offset)
VALUES 
(1, 'Giai đoạn 1', 5),
(1, 'Giai đoạn 2', 10),
(1, 'Giai đoạn 3', 15);

INSERT INTO schedule_actions (stage_id, schedule_virtual_device_id, value)
VALUES 
(1, 1, 1), -- bật quạt (svd id=2: Fan Speed)
(2, 1, 0), -- tắt quạt
(3, 1, 1); -- bật quạt lại

INSERT INTO rules (name, description, crop_id)
VALUES 
('Rule nhiệt độ cao', 'Cảnh báo khi nhiệt độ vượt ngưỡng', 1);

INSERT INTO rule_virtual_devices (rule_id, name, device_type_id)
VALUES 
(1, 'Temperature', 1),
(1, 'Fan Speed', 4);

INSERT INTO value_pairs (rule_id, name)
VALUES 
(1, 'High Temp Alert'),
(1, "Normal Temp Action");

INSERT INTO conditions (value_pair_id, rule_virtual_device_id, operator, compare_value )
VALUES 
(1, 1,'>', 70), -- nhiệt độ > 70
(2, 1,'<=', 70); -- nhiệt độ <= 70

INSERT INTO rule_actions (value_pair_id, rule_virtual_device_id, value)
VALUES 
(1, 2, 1), -- bật quạt max
(2, 2, 0); -- tắt quạt

INSERT INTO event_types (event_code, name) VALUES
('START_BATCH', 'Khởi động mẻ sấy'), ('END_BATCH', 'Kết thúc mẻ sấy'), ('DEVICE_CONTROL', 'Điều khiển thiết bị'),
('RULE_ALERT', 'Cảnh báo quy tắc'), ('RULE_ACTION', 'Hành động quy tắc'), ('SCHEDULE_STAGE', 'Giai đoạn lịch trình'), ('SCHEDULE_ACTION', 'Hành động lịch trình'),
('AREA_CHANGE', 'Thay đổi khu vực'), ('DRYER_CHANGE', 'Thay đổi máy sấy'), ('DEVICE_CHANGE', 'Thay đổi thiết bị'), ('DEVICE_TYPE_CHANGE', 'Thay đổi loại thiết bị'),
('SCHEDULE_CHANGE', 'Thay đổi lịch trình'), ('RULE_CHANGE', 'Thay đổi quy tắc'), ('CROP_CHANGE', 'Thay đổi cây trồng'), ('PROFILE_CHANGE', 'Thay đổi hồ sơ');

INSERT INTO severity_levels (level)
VALUES 
('info'),
('warning'),
('error');

-- Local schedules (per-dryer instances of global schedules)
-- INSERT INTO local_schedules (dryer_id, schedule_id, name)
-- VALUES 
-- (1, 1, 'Lịch xoài - Máy 1');

-- INSERT INTO local_schedule_device_mapping (local_schedule_id, schedule_virtual_device_id, device_id)
-- VALUES 
-- (1, 1, 'sensor'),
-- (1, 2, 'worker');

-- -- Local rules (per-dryer instances of global rules)
-- INSERT INTO local_rules (dryer_id, rule_id, name)
-- VALUES 
-- (1, 1, 'Rule nhiệt độ - Máy 1');

-- INSERT INTO local_rule_device_mapping (local_rule_id, rule_virtual_device_id, device_id)
-- VALUES 
-- (1, 1, 'sensor'),
-- (1, 2, 'worker');
