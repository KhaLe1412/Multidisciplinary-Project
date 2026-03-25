create database DADN;
use DADN;

-- -----------------------------------------------------
-- Người dùng
-- -----------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    last_login DATETIME,
    role ENUM('admin', 'staff', 'viewer'),
    status ENUM('active', 'disabled')
);

-- -----------------------------------------------------
-- Khu vực
-- -----------------------------------------------------
CREATE TABLE areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    manager_id INT,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- -----------------------------------------------------
-- Máy sấy
-- -----------------------------------------------------
CREATE TABLE dryers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    capacity FLOAT,
    status ENUM('off', 'on', 'running'),
    area_id INT,
    manager_id INT,
    FOREIGN KEY (area_id) REFERENCES areas(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- -----------------------------------------------------
-- Loại thiết bị
-- -----------------------------------------------------
CREATE TABLE device_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    unit VARCHAR(50),
    max_value FLOAT,
    min_value FLOAT,
    category ENUM('sensor', 'controller')
);

-- -----------------------------------------------------
-- Thiết bị
-- -----------------------------------------------------
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    power_status FLOAT,
    install_date DATE,
    dryer_id INT,
    type_id INT,
    FOREIGN KEY (dryer_id) REFERENCES dryers(id),
    FOREIGN KEY (type_id) REFERENCES device_types(id)
);

-- -----------------------------------------------------
-- Nông sản
-- -----------------------------------------------------
CREATE TABLE crops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT
);

-- -----------------------------------------------------
-- Lịch trình
-- -----------------------------------------------------
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    crop_id INT,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- -----------------------------------------------------
-- Thiết bị ảo
-- -----------------------------------------------------
CREATE TABLE virtual_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255)
);

-- -----------------------------------------------------
-- Thiết bị ảo lịch trình
-- -----------------------------------------------------
CREATE TABLE schedule_virtual_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT,
    virtual_device_id INT,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id)
);

-- -----------------------------------------------------
-- Giai đoạn
-- -----------------------------------------------------
CREATE TABLE stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT,
    name VARCHAR(255),
    start_offset INT,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

-- -----------------------------------------------------
-- Hành động lịch trình
-- -----------------------------------------------------
CREATE TABLE schedule_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stage_id INT,
    virtual_device_id INT,
    value FLOAT,
    FOREIGN KEY (stage_id) REFERENCES stages(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id)
);

-- -----------------------------------------------------
-- Quy tắc
-- -----------------------------------------------------
CREATE TABLE rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT
);

-- -----------------------------------------------------
-- Thiết bị ảo quy tắc
-- -----------------------------------------------------
CREATE TABLE rule_virtual_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT,
    virtual_device_id INT,
    FOREIGN KEY (rule_id) REFERENCES rules(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id)
);

-- -----------------------------------------------------
-- Cặp giá trị
-- -----------------------------------------------------
CREATE TABLE value_pairs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT,
    FOREIGN KEY (rule_id) REFERENCES rules(id)
);

-- -----------------------------------------------------
-- Điều kiện
-- -----------------------------------------------------
CREATE TABLE conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value_pair_id INT,
    operator ENUM('>', '<', '=', '>=', '<='),
    compare_value FLOAT,
    virtual_device_id INT,
    FOREIGN KEY (value_pair_id) REFERENCES value_pairs(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id)
);

-- -----------------------------------------------------
-- Hành động quy tắc
-- -----------------------------------------------------
CREATE TABLE rule_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value_pair_id INT,
    virtual_device_id INT,
    value FLOAT,
    FOREIGN KEY (value_pair_id) REFERENCES value_pairs(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id)
);

-- -----------------------------------------------------
-- Mẻ sấy
-- -----------------------------------------------------
CREATE TABLE batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    input_weight FLOAT,
    output_weight FLOAT,
    start_time DATETIME,
    end_time DATETIME,
    rating INT,
    dryer_id INT,
    crop_id INT,
    schedule_id INT,
    rule_id INT,
    FOREIGN KEY (dryer_id) REFERENCES dryers(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (rule_id) REFERENCES rules(id)
);

-- -----------------------------------------------------
-- Quan hệ 3 ngôi: Thiết bị ảo - Mẻ sấy - Thiết bị
-- -----------------------------------------------------
CREATE TABLE batch_device_mapping (
    batch_id INT,
    virtual_device_id INT,
    device_id INT,
    PRIMARY KEY (batch_id, virtual_device_id, device_id),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    FOREIGN KEY (virtual_device_id) REFERENCES virtual_devices(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- -----------------------------------------------------
-- Log cảm biến
-- -----------------------------------------------------
CREATE TABLE sensor_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    device_id INT,
    value FLOAT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- -----------------------------------------------------
-- Loại sự kiện
-- -----------------------------------------------------
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('device_control', 'device_change', 'policy_change', 'alert')
);

-- -----------------------------------------------------
-- Mức độ
-- -----------------------------------------------------
CREATE TABLE severity_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warning', 'error')
);

-- -----------------------------------------------------
-- Log hệ thống
-- -----------------------------------------------------
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    user_id INT,
    dryer_id INT,
    event_type_id INT,
    severity_id INT,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (dryer_id) REFERENCES dryers(id),
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (severity_id) REFERENCES severity_levels(id)
);

-- -----------------------------------------------------
-- Cảnh báo
-- -----------------------------------------------------
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    name VARCHAR(255),
    description TEXT,

    severity_id INT,          -- mức độ cảnh báo
    event_type_id INT,        -- loại sự kiện (alert)

    crop_id INT,              -- cảnh báo theo loại nông sản
    rule_id INT,              -- cảnh báo do rule nào sinh ra
    batch_id INT,             -- cảnh báo thuộc mẻ sấy nào
    dryer_id INT,             -- máy sấy liên quan

    status ENUM('active', 'resolved', 'ignored') DEFAULT 'active',

    triggered_at DATETIME,
    resolved_at DATETIME,

    FOREIGN KEY (severity_id) REFERENCES severity_levels(id),
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id),
    FOREIGN KEY (rule_id) REFERENCES rules(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    FOREIGN KEY (dryer_id) REFERENCES dryers(id)
);

INSERT INTO users (full_name, email, phone, role, status)
VALUES 
('Admin User', 'admin@test.com', '0900000001', 'admin', 'active'),
('Staff User', 'staff@test.com', '0900000002', 'staff', 'active');

INSERT INTO areas (name, description, manager_id)
VALUES 
('Khu A', 'Khu vực sấy trái cây', 1);

INSERT INTO dryers (name, capacity, status, area_id, manager_id)
VALUES 
('Máy sấy 1', 100, 'running', 1, 1);

INSERT INTO device_types (name, unit, max_value, min_value, category)
VALUES 
('Temperature Sensor', '°C', 100, 0, 'sensor'),
('Fan Controller', '%', 100, 0, 'controller');

INSERT INTO devices (name, power_status, install_date, dryer_id, type_id)
VALUES 
('Temp Sensor 1', 1, '2025-01-01', 1, 1),
('Fan 1', 0, '2025-01-01', 1, 2);

INSERT INTO crops (name, description)
VALUES 
('Xoài', 'Sấy xoài'),
('Chuối', 'Sấy chuối');

INSERT INTO schedules (name, crop_id)
VALUES 
('Lịch trình xoài', 1);

INSERT INTO virtual_devices (name)
VALUES 
('Temperature'),
('Fan Speed');

INSERT INTO schedule_virtual_devices (schedule_id, virtual_device_id)
VALUES 
(1, 1),
(1, 2);

INSERT INTO stages (schedule_id, name, start_offset)
VALUES 
(1, 'Giai đoạn 1', 0),
(1, 'Giai đoạn 2', 60);

INSERT INTO schedule_actions (stage_id, virtual_device_id, value)
VALUES 
(1, 1, 60), -- nhiệt độ 60
(1, 2, 50), -- quạt 50%
(2, 1, 50),
(2, 2, 30);

INSERT INTO rules (name, description)
VALUES 
('Rule nhiệt độ cao', 'Cảnh báo khi nhiệt độ vượt ngưỡng');

INSERT INTO rule_virtual_devices (rule_id, virtual_device_id)
VALUES 
(1, 1);

INSERT INTO value_pairs (rule_id)
VALUES (1);

INSERT INTO conditions (value_pair_id, operator, compare_value, virtual_device_id)
VALUES 
(1, '>', 70, 1); -- nhiệt độ > 70

INSERT INTO rule_actions (value_pair_id, virtual_device_id, value)
VALUES 
(1, 2, 100); -- bật quạt max

INSERT INTO batches (
    input_weight, start_time,
    dryer_id, crop_id, schedule_id, rule_id
)
VALUES 
(50, NOW(), 1, 1, 1, 1);

INSERT INTO batch_device_mapping (batch_id, virtual_device_id, device_id)
VALUES 
(1, 1, 1), -- nhiệt độ → sensor
(1, 2, 2); -- quạt → fan

INSERT INTO sensor_logs (timestamp, device_id, value)
VALUES 
(NOW(), 1, 65),
(NOW(), 1, 75); -- cái này sẽ trigger alert

INSERT INTO event_types (name)
VALUES 
('device_control'),
('device_change'),
('policy_change'),
('alert');

INSERT INTO severity_levels (level)
VALUES 
('info'),
('warning'),
('error');

INSERT INTO system_logs (
    timestamp, user_id, dryer_id,
    event_type_id, severity_id, description
)
VALUES 
(NOW(), 1, 1, 4, 2, 'Nhiệt độ vượt ngưỡng');

INSERT INTO alerts (
    name, description,
    severity_id, event_type_id,
    crop_id, rule_id, batch_id, dryer_id,
    status, triggered_at
)
VALUES 
(
    'High Temperature',
    'Nhiệt độ vượt 70°C',
    2, 4,
    1, 1, 1, 1,
    'active',
    NOW()
);

SELECT * FROM sensor_logs;
SELECT * FROM alerts;
SELECT * FROM batches;


-- -----------------------------------------------------
-- Tạo mẻ
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE create_batch (
    IN p_dryer_id INT,
    IN p_crop_id INT,
    IN p_schedule_id INT,
    IN p_rule_id INT,
    IN p_input_weight FLOAT
)
BEGIN
    INSERT INTO batches (
        dryer_id, crop_id, schedule_id, rule_id,
        input_weight, start_time
    )
    VALUES (
        p_dryer_id, p_crop_id, p_schedule_id, p_rule_id,
        p_input_weight, NOW()
    );
END $$

DELIMITER ;


-- -----------------------------------------------------
-- Update sau khi hoàn thành mẻ
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE finish_batch (
    IN p_batch_id INT,
    IN p_output_weight FLOAT,
    IN p_rating INT
)
BEGIN
    UPDATE batches
    SET 
        output_weight = p_output_weight,
        rating = p_rating,
        end_time = NOW()
    WHERE id = p_batch_id;
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Thêm log cảm biến
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE insert_sensor_log (
    IN p_device_id INT,
    IN p_value FLOAT
)
BEGIN
    INSERT INTO sensor_logs (timestamp, device_id, value)
    VALUES (NOW(), p_device_id, p_value);
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Tạo cảnh báo
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE create_alert (
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_severity_id INT,
    IN p_event_type_id INT,
    IN p_crop_id INT,
    IN p_rule_id INT,
    IN p_batch_id INT,
    IN p_dryer_id INT
)
BEGIN
    INSERT INTO alerts (
        name, description,
        severity_id, event_type_id,
        crop_id, rule_id, batch_id, dryer_id,
        status, triggered_at
    )
    VALUES (
        p_name, p_description,
        p_severity_id, p_event_type_id,
        p_crop_id, p_rule_id, p_batch_id, p_dryer_id,
        'active', NOW()
    );
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Update sau khi giải quyết cảnh báo
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE resolve_alert (
    IN p_alert_id INT
)
BEGIN
    UPDATE alerts
    SET 
        status = 'resolved',
        resolved_at = NOW()
    WHERE id = p_alert_id;
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Thêm log hệ thống
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE insert_system_log (
    IN p_user_id INT,
    IN p_dryer_id INT,
    IN p_event_type_id INT,
    IN p_severity_id INT,
    IN p_description TEXT
)
BEGIN
    INSERT INTO system_logs (
        timestamp, user_id, dryer_id,
        event_type_id, severity_id, description
    )
    VALUES (
        NOW(), p_user_id, p_dryer_id,
        p_event_type_id, p_severity_id, p_description
    );
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Tính hiệu suất mẻ sấy
-- -----------------------------------------------------
DELIMITER $$

CREATE FUNCTION calc_efficiency (
    p_batch_id INT
)
RETURNS FLOAT
DETERMINISTIC
BEGIN
    DECLARE input_w FLOAT;
    DECLARE output_w FLOAT;

    SELECT input_weight, output_weight
    INTO input_w, output_w
    FROM batches
    WHERE id = p_batch_id;

    IF input_w = 0 THEN
        RETURN 0;
    END IF;

    RETURN (output_w / input_w) * 100;
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Check vượt ngưỡng
-- -----------------------------------------------------
DELIMITER $$

CREATE FUNCTION check_condition (
    p_value FLOAT,
    p_operator VARCHAR(5),
    p_compare FLOAT
)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN (
        (p_operator = '>' AND p_value > p_compare) OR
        (p_operator = '<' AND p_value < p_compare) OR
        (p_operator = '=' AND p_value = p_compare) OR
        (p_operator = '>=' AND p_value >= p_compare) OR
        (p_operator = '<=' AND p_value <= p_compare)
    );
END $$

DELIMITER ;

-- -----------------------------------------------------
-- Check rule và tạo cảnh báo nếu vi phạm
-- -----------------------------------------------------
DELIMITER $$

CREATE PROCEDURE check_and_create_alert (
    IN p_device_id INT,
    IN p_value FLOAT,
    IN p_batch_id INT
)
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_condition_id INT;
    DECLARE v_operator VARCHAR(5);
    DECLARE v_compare FLOAT;
    DECLARE v_rule_id INT;

    DECLARE cur CURSOR FOR
        SELECT c.id, c.operator, c.compare_value, vp.rule_id
        FROM conditions c
        JOIN value_pairs vp ON c.value_pair_id = vp.id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_condition_id, v_operator, v_compare, v_rule_id;
        IF done THEN
            LEAVE read_loop;
        END IF;

        IF check_condition(p_value, v_operator, v_compare) THEN
            CALL create_alert(
                'Violation detected',
                CONCAT('Condition ', v_condition_id, ' violated'),
                2, -- warning
                1, -- alert
                NULL,
                v_rule_id,
                p_batch_id,
                NULL
            );
        END IF;

    END LOOP;

    CLOSE cur;
END $$

DELIMITER ;

CALL insert_sensor_log(1, 75);

CALL check_and_create_alert(1, 75, 1);

SELECT * FROM alerts;
