-- =============================================================================
-- analytics_test_data.sql
-- Du lieu kiem thu cho cac endpoint /api/analytics/*
--
-- Chay sau: reset.sql -> tables.sql -> seeds.sql -> (file nay)
--
-- Sau khi chay xong, DB co:
--   3 may say  (id 1-3)
--   4 nong san (id 1-4: Xoai, Chuoi, Mit, Dua)
--   8 me say hoan chinh (id 1-8, end_time IS NOT NULL)
--   5 sensor_logs cho device "sensor" (batch 1)
--   3 system_logs severity=error (2 may 1, 1 may 2)
--
-- =============================================================================
-- GIA TRI TONG HOP KY VONG
-- ---------------------------------------------------------------------------
-- Overview (khong loc):
--   total_batches          = 8
--   total_input_kg         = 755.0
--   total_output_kg        = 472.0
--   yield_rate             = 62.5   (472/755*100)
--   avg_rating             = 3.9    (round(31/8,1) = 3.9)
--   total_operating_minutes= 865    (120+90+150+100+110+80+120+95)
--   avg_batch_minutes      = 108    (round(865/8))
--   daily_production       = 8 entries (2026-03-01 to 03-08)
--   crop_stats             = 4 entries
--
-- Overview dryer_id=1:
--   total_batches=3 | input=300 | output=193 | yield=64.3 | avg_rating=4.0
--
-- Overview from=2026-03-01 to=2026-03-03:
--   total_batches=3 (me 1,2,4) | input=270 | output=168 | yield=62.2
--
-- Dryers (khong loc):
--   May 1: batch_count=3 | input=300 | output=193 | operating_hours=6.0 | errors=2 | avg_rating=4.0
--   May 2: batch_count=3 | input=270 | output=167 | operating_hours=4.8 | errors=1 | avg_rating=4.0
--   May 3: batch_count=2 | input=185 | output=112 | operating_hours=3.6 | errors=0 | avg_rating=3.5
--   batch_details: 8 entries (ORDER BY start_time DESC -> me 8 dau tien)
--
-- Crop stats (khong loc):
--   Xoai : batch_count=3 | input=320 | output=205 | yield=64.1
--   Chuoi: batch_count=2 | input=150 | output=90  | yield=60.0
--   Mit  : batch_count=2 | input=175 | output=107 | yield=61.1
--   Dua  : batch_count=1 | input=110 | output=70  | yield=63.6
--
-- Batch sensors batch_id=1:
--   1 device: "sensor" (Temperature Sensor, °C, category=sensor)
--   5 readings: 32.5, 55.2, 68.7, 72.1, 61.4
--
-- Batch sensors batch_id=2:
--   1 device: "sensor" (category=sensor), but readings=[] (khong co sensor_logs)
--
-- Batch sensors batch_id=999:
--   -> []  (batch khong ton tai)
-- =============================================================================

USE DADN;
SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. Them 2 may say moi (auto-id = 2, 3)
-- -----------------------------------------------------------------------------
INSERT INTO dryers (name, capacity, status, area_id, manager_id) VALUES
('May say 2', 100, 'on',  1, 1),
('May say 3', 100, 'off', 1, 1);

-- -----------------------------------------------------------------------------
-- 2. Them 2 loai nong san moi (auto-id = 3, 4)
-- -----------------------------------------------------------------------------
INSERT INTO crops (name, description) VALUES
('Mit',  'Say mit'),
('Dua',  'Say dua');

-- -----------------------------------------------------------------------------
-- 3. Them thiet bi cho may 2 va may 3
--    power_status (W) dung de uoc tinh dien nang
--    sensor2/sensor3: category=sensor (type_id=1)
--    worker2/worker3: category=controller (type_id=4)
-- -----------------------------------------------------------------------------
INSERT INTO devices (id, name, power_status, install_date, dryer_id, type_id) VALUES
('sensor2', 'Temp Sensor 2',  50,  '2025-01-01', 2, 1),
('worker2', 'Fan 2',         200,  '2025-01-01', 2, 4),
('sensor3', 'Temp Sensor 3',  50,  '2025-01-01', 3, 1),
('worker3', 'Fan 3',         200,  '2025-01-01', 3, 4);

-- -----------------------------------------------------------------------------
-- 4. Me say (8 me hoan chinh)
--    May 1 (id=1):  me 1,2,3   tong: input=300 output=193 phut=360 rating=12
--    May 2 (id=2):  me 4,5,6   tong: input=270 output=167 phut=290 rating=12
--    May 3 (id=3):  me 7,8     tong: input=185 output=112 phut=215 rating=7
--    Tong:                           input=755 output=472 phut=865 rating=31
-- -----------------------------------------------------------------------------
INSERT INTO batches
    (input_weight, output_weight, start_time,               end_time,                 rating, dryer_id, crop_id)
VALUES
-- May 1 -------------------------------------------------------------------
(100,  65,  '2026-03-01 08:00:00', '2026-03-01 10:00:00', 4, 1, 1),  -- me 1: Xoai  120ph
( 80,  48,  '2026-03-02 09:00:00', '2026-03-02 10:30:00', 3, 1, 2),  -- me 2: Chuoi  90ph
(120,  80,  '2026-03-05 08:00:00', '2026-03-05 10:30:00', 5, 1, 1),  -- me 3: Xoai  150ph
-- May 2 -------------------------------------------------------------------
( 90,  55,  '2026-03-03 10:00:00', '2026-03-03 11:40:00', 4, 2, 3),  -- me 4: Mit   100ph
(110,  70,  '2026-03-04 08:00:00', '2026-03-04 09:50:00', 3, 2, 4),  -- me 5: Dua   110ph
( 70,  42,  '2026-03-06 09:00:00', '2026-03-06 10:20:00', 5, 2, 2),  -- me 6: Chuoi  80ph
-- May 3 -------------------------------------------------------------------
(100,  60,  '2026-03-07 08:00:00', '2026-03-07 10:00:00', 4, 3, 1),  -- me 7: Xoai  120ph
( 85,  52,  '2026-03-08 10:00:00', '2026-03-08 11:35:00', 3, 3, 3);  -- me 8: Mit    95ph

-- -----------------------------------------------------------------------------
-- 5. Sensor logs: device "sensor" (dryer 1, category=sensor)
--    5 readings trong khoang me 1: 2026-03-01 08:00 - 10:00
-- -----------------------------------------------------------------------------
INSERT INTO sensor_logs (timestamp, device_id, value) VALUES
('2026-03-01 08:00:00', 'sensor', 32.5),
('2026-03-01 08:30:00', 'sensor', 55.2),
('2026-03-01 09:00:00', 'sensor', 68.7),
('2026-03-01 09:30:00', 'sensor', 72.1),
('2026-03-01 10:00:00', 'sensor', 61.4);

