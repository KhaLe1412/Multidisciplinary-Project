use DADN;
SET NAMES utf8mb4;
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
    IN p_device_id VARCHAR(255),
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
-- DELIMITER $$

-- CREATE PROCEDURE create_alert (
--     IN p_name VARCHAR(255),
--     IN p_description TEXT,
--     IN p_severity_id INT,
--     IN p_event_type_id INT,
--     IN p_crop_id INT,
--     IN p_rule_id INT,
--     IN p_batch_id INT,
--     IN p_dryer_id INT
-- )
-- BEGIN
--     INSERT INTO alerts (
--         name, description,
--         severity_id, event_type_id,
--         crop_id, rule_id, batch_id, dryer_id,
--         status, triggered_at
--     )
--     VALUES (
--         p_name, p_description,
--         p_severity_id, p_event_type_id,
--         p_crop_id, p_rule_id, p_batch_id, p_dryer_id,
--         'active', NOW()
--     );
-- END $$

-- DELIMITER ;

-- -----------------------------------------------------
-- Update sau khi giải quyết cảnh báo
-- -----------------------------------------------------
-- DELIMITER $$

-- CREATE PROCEDURE resolve_alert (
--     IN p_alert_id INT
-- )
-- BEGIN
--     UPDATE alerts
--     SET 
--         status = 'resolved',
--         resolved_at = NOW()
--     WHERE id = p_alert_id;
-- END $$

-- DELIMITER ;

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
    IN p_device_id VARCHAR(255),
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
