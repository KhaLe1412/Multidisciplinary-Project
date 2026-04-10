create database DADN CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
use DADN;
SET NAMES utf8mb4;

-- -----------------------------------------------------
-- Người dùng
-- -----------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
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
    id VARCHAR(255) PRIMARY KEY,
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
-- Thiết bị ảo lịch trình (inline, không còn bảng virtual_devices riêng)
-- -----------------------------------------------------
CREATE TABLE schedule_virtual_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT,
    name VARCHAR(255),
    device_type_id INT,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (device_type_id) REFERENCES device_types(id)
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
    schedule_virtual_device_id INT,
    value FLOAT,
    FOREIGN KEY (stage_id) REFERENCES stages(id),
    FOREIGN KEY (schedule_virtual_device_id) REFERENCES schedule_virtual_devices(id)
);

-- -----------------------------------------------------
-- Quy tắc
-- -----------------------------------------------------
CREATE TABLE rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    crop_id INT,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- -----------------------------------------------------
-- Thiết bị ảo quy tắc (inline, không còn bảng virtual_devices riêng)
-- -----------------------------------------------------
CREATE TABLE rule_virtual_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT,
    name VARCHAR(255),
    device_type_id INT,
    FOREIGN KEY (rule_id) REFERENCES rules(id),
    FOREIGN KEY (device_type_id) REFERENCES device_types(id)
);

-- -----------------------------------------------------
-- Cặp giá trị
-- -----------------------------------------------------
CREATE TABLE value_pairs (
    id INT AUTO_INCREMENT PRIMARY KEY,\
    name VARCHAR(255),
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
    rule_virtual_device_id INT,
    FOREIGN KEY (value_pair_id) REFERENCES value_pairs(id),
    FOREIGN KEY (rule_virtual_device_id) REFERENCES rule_virtual_devices(id)
);

-- -----------------------------------------------------
-- Hành động quy tắc
-- -----------------------------------------------------
CREATE TABLE rule_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value_pair_id INT,
    rule_virtual_device_id INT,
    value FLOAT,
    FOREIGN KEY (value_pair_id) REFERENCES value_pairs(id),
    FOREIGN KEY (rule_virtual_device_id) REFERENCES rule_virtual_devices(id)
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
    FOREIGN KEY (dryer_id) REFERENCES dryers(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- -----------------------------------------------------
-- Mapping: Mẻ sấy - Lịch trình - Thiết bị ảo lịch trình - Thiết bị vật lý
-- -----------------------------------------------------
CREATE TABLE batch_schedule_device_mapping (
    batch_id INT,
    schedule_id INT,
    schedule_virtual_device_id INT,
    device_id VARCHAR(255),
    PRIMARY KEY (batch_id, schedule_id, schedule_virtual_device_id, device_id),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (schedule_virtual_device_id) REFERENCES schedule_virtual_devices(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- -----------------------------------------------------
-- Mapping: Mẻ sấy - Quy tắc - Thiết bị ảo quy tắc - Thiết bị vật lý
-- -----------------------------------------------------
CREATE TABLE batch_rule_device_mapping (
    batch_id INT,
    rule_id INT,
    rule_virtual_device_id INT,
    device_id VARCHAR(255),
    PRIMARY KEY (batch_id, rule_id, rule_virtual_device_id, device_id),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    FOREIGN KEY (rule_id) REFERENCES rules(id),
    FOREIGN KEY (rule_virtual_device_id) REFERENCES rule_virtual_devices(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- -----------------------------------------------------
-- Log cảm biến
-- -----------------------------------------------------
CREATE TABLE sensor_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    device_id VARCHAR(255),
    value FLOAT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- -----------------------------------------------------
-- Loại sự kiện
-- -----------------------------------------------------
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
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
-- CREATE TABLE alerts (
--     id INT AUTO_INCREMENT PRIMARY KEY,
    
--     name VARCHAR(255),
--     description TEXT,

--     severity_id INT,          -- mức độ cảnh báo
--     event_type_id INT,        -- loại sự kiện (alert)

--     crop_id INT,              -- cảnh báo theo loại nông sản
--     rule_id INT,              -- cảnh báo do rule nào sinh ra
--     batch_id INT,             -- cảnh báo thuộc mẻ sấy nào
--     dryer_id INT,             -- máy sấy liên quan

--     status ENUM('active', 'resolved', 'ignored') DEFAULT 'active',

--     triggered_at DATETIME,
--     resolved_at DATETIME,

--     FOREIGN KEY (severity_id) REFERENCES severity_levels(id),
--     FOREIGN KEY (event_type_id) REFERENCES event_types(id),
--     FOREIGN KEY (crop_id) REFERENCES crops(id),
--     FOREIGN KEY (rule_id) REFERENCES rules(id),
--     FOREIGN KEY (batch_id) REFERENCES batches(id),
--     FOREIGN KEY (dryer_id) REFERENCES dryers(id)
-- );
