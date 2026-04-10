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
(1, 'Temperature', 1),
(1, 'Fan Speed', 4);

INSERT INTO stages (schedule_id, name, start_offset)
VALUES 
(1, 'Giai đoạn 1', 0),
(1, 'Giai đoạn 2', 10);

INSERT INTO schedule_actions (stage_id, schedule_virtual_device_id, value)
VALUES 
(1, 2, 1), -- bật quạt (svd id=2: Fan Speed)
(2, 2, 0); -- tắt quạt

INSERT INTO rules (name, description, crop_id)
VALUES 
('Rule nhiệt độ cao', 'Cảnh báo khi nhiệt độ vượt ngưỡng', 1);

INSERT INTO rule_virtual_devices (rule_id, name, device_type_id)
VALUES 
(1, 'Temperature', 1),
(1, 'Fan Speed', 4);

INSERT INTO value_pairs (rule_id, name)
VALUES (1, 'High Temp Alert');

INSERT INTO conditions (value_pair_id, rule_virtual_device_id, operator, compare_value )
VALUES 
(1, 1,'>', 70); -- nhiệt độ > 70

INSERT INTO rule_actions (value_pair_id, rule_virtual_device_id, value)
VALUES 
(1, 2, 1); -- bật quạt max

INSERT INTO event_types (name) VALUES
('batch_start'), ('batch_end'), ('device_control'),
('rule_alert'), ('rule_action'), ('schedule_stage'), ('schedule_action'),
('area_change'), ('dryer_change'), ('device_change'), ('device_type_change'),
('schedule_change'), ('rule_change'), ('crop_change'), ('profile_change');

INSERT INTO severity_levels (level)
VALUES 
('info'),
('warning'),
('error');
