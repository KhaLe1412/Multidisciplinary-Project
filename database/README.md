# Database — DrierSystem (DADN)

## Giới thiệu

Cơ sở dữ liệu **DADN** là trung tâm lưu trữ toàn bộ dữ liệu của hệ thống DrierSystem. Được xây dựng trên **MySQL 8.0** với bộ ký tự `utf8mb4` (hỗ trợ đầy đủ Unicode và tiếng Việt), database bao gồm **24 bảng** tổ chức thành 6 nhóm chức năng.

---

## Công nghệ

| Thành phần | Chi tiết                                                             |
| ---------- | -------------------------------------------------------------------- |
| DBMS       | MySQL 8.0                                                            |
| Charset    | `utf8mb4` / Collation: `utf8mb4_unicode_ci`                          |
| Kết nối    | Port `3307` (host) → `3306` (container)                              |
| Triển khai | Docker (image `mysql:8.0`) với volume persistent                     |
| Khởi tạo   | Shell script `init.sh` chạy tự động qua `docker-entrypoint-initdb.d` |

---

## Cấu trúc thư mục

```
database/
├── tables.sql              # Tạo database DADN và toàn bộ 24 bảng
├── seeds.sql               # Dữ liệu mẫu ban đầu để chạy thử
├── procedures.sql          # Stored procedures cho các nghiệp vụ lõi
├── analytics_test_data.sql # Dữ liệu mẫu phục vụ kiểm thử analytics
├── reset.sql               # Script xoá và tạo lại database (dev only)
└── init.sh                 # Entrypoint script: chạy 4 file trên theo thứ tự
```

---

## Thứ tự khởi tạo

`init.sh` được Docker tự động thực thi khi volume MySQL còn trống:

```bash
1. tables.sql           → Tạo database DADN + 24 bảng
2. seeds.sql            → Chèn dữ liệu mẫu (users, dryers, schedules, rules...)
3. procedures.sql       → Tạo stored procedures
4. analytics_test_data.sql → Chèn dữ liệu batch mẫu để test thống kê
```

> **Lý do dùng shell script thay vì mount .sql trực tiếp**: MySQL entrypoint chạy `.sql` bằng `mysql` client một lần, nhưng `procedures.sql` dùng `DELIMITER $$` — cú pháp này yêu cầu mysql client mới xử lý đúng; shell script đảm bảo điều đó.

---

## Sơ đồ quan hệ tóm tắt

```
users ───────── areas ─────── dryers ────┬── devices (sensor/controller)
                                          │       └── sensor_logs
                                          ├── batches ───┬── batch_schedule_queue ── local_schedules
                                          │              └── batch_rule_set ── local_rules
                                          ├── local_schedules ── local_schedule_device_mapping
                                          ├── local_rules ── local_rule_device_mapping
                                          └── system_logs

crops ──────────┬── schedules ─── schedule_virtual_devices
                │        └── stages ── schedule_actions
                ├── rules ─── rule_virtual_devices
                │      └── value_pairs ──┬── conditions
                │                        └── rule_actions
                └── batches

batch_schedule_device_mapping: batches × schedules × schedule_virtual_devices × devices
batch_rule_device_mapping:     batches × rules × rule_virtual_devices × devices

event_types + severity_levels ── system_logs
```

---

## Mô tả chi tiết các bảng

### Nhóm 1: Quản lý người dùng và cơ sở hạ tầng

#### `users` — Người dùng hệ thống

| Cột             | Kiểu                           | Mô tả                |
| --------------- | ------------------------------ | -------------------- |
| `id`            | INT PK AUTO                    | ID người dùng        |
| `full_name`     | VARCHAR(255)                   | Họ tên đầy đủ        |
| `email`         | VARCHAR(255) UNIQUE            | Email đăng nhập      |
| `phone`         | VARCHAR(20)                    | Số điện thoại        |
| `password_hash` | VARCHAR(255)                   | Mật khẩu băm bcrypt  |
| `last_login`    | DATETIME                       | Lần đăng nhập cuối   |
| `role`          | ENUM('admin','staff','viewer') | Vai trò phân quyền   |
| `status`        | ENUM('active','disabled')      | Trạng thái tài khoản |

#### `areas` — Khu vực sản xuất

| Cột           | Kiểu         | Mô tả           |
| ------------- | ------------ | --------------- |
| `id`          | INT PK AUTO  | ID khu vực      |
| `name`        | VARCHAR(255) | Tên khu vực     |
| `description` | TEXT         | Mô tả           |
| `manager_id`  | INT FK→users | Người phụ trách |

#### `dryers` — Máy sấy

| Cột          | Kiểu                       | Mô tả                |
| ------------ | -------------------------- | -------------------- |
| `id`         | INT PK AUTO                | ID máy sấy           |
| `name`       | VARCHAR(255)               | Tên máy              |
| `capacity`   | FLOAT                      | Sức chứa (kg)        |
| `status`     | ENUM('off','on','running') | Trạng thái hoạt động |
| `area_id`    | INT FK→areas               | Khu vực đặt máy      |
| `manager_id` | INT FK→users               | Người phụ trách      |

---

### Nhóm 2: Quản lý thiết bị

#### `device_types` — Loại thiết bị

| Cột           | Kiểu                        | Mô tả                             |
| ------------- | --------------------------- | --------------------------------- |
| `id`          | INT PK AUTO                 | ID loại                           |
| `name`        | VARCHAR(255)                | Tên loại (vd: Temperature Sensor) |
| `description` | TEXT                        | Mô tả                             |
| `unit`        | VARCHAR(50)                 | Đơn vị đo lường (°C, %, boolean)  |
| `max_value`   | FLOAT                       | Giá trị tối đa                    |
| `min_value`   | FLOAT                       | Giá trị tối thiểu                 |
| `category`    | ENUM('sensor','controller') | Phân loại chức năng               |

#### `devices` — Thiết bị vật lý

| Cột            | Kiểu                | Mô tả                                     |
| -------------- | ------------------- | ----------------------------------------- |
| `id`           | VARCHAR(255) PK     | Feed ID trên Adafruit IO (vd: `'sensor'`) |
| `name`         | VARCHAR(255)        | Tên hiển thị                              |
| `power_status` | FLOAT               | Công suất tiêu thụ (W)                    |
| `install_date` | DATE                | Ngày lắp đặt                              |
| `dryer_id`     | INT FK→dryers       | Máy sấy chứa thiết bị                     |
| `type_id`      | INT FK→device_types | Loại thiết bị                             |

> `id` của device chính là `feed_id` trên Adafruit IO — được dùng trực tiếp làm khóa MQTT.

---

### Nhóm 3: Dữ liệu cảm biến và nhật ký

#### `sensor_logs` — Lịch sử giá trị cảm biến

| Cột         | Kiểu                    | Mô tả            |
| ----------- | ----------------------- | ---------------- |
| `id`        | INT PK AUTO             | ID bản ghi       |
| `timestamp` | DATETIME                | Thời điểm đo     |
| `device_id` | VARCHAR(255) FK→devices | Thiết bị ghi log |
| `value`     | FLOAT                   | Giá trị đo được  |

Ghi chú: `ON DELETE CASCADE` — xóa thiết bị thì tự động xóa toàn bộ log.

#### `event_types` — Danh mục loại sự kiện

| Cột          | Kiểu               | Mô tả                          |
| ------------ | ------------------ | ------------------------------ |
| `id`         | INT PK AUTO        | ID                             |
| `event_code` | VARCHAR(50) UNIQUE | Mã sự kiện (vd: `START_BATCH`) |
| `name`       | VARCHAR(50) UNIQUE | Tên hiển thị                   |

Danh sách event codes đã định nghĩa trong seeds.sql:
`START_BATCH`, `END_BATCH`, `DEVICE_CONTROL`, `RULE_ALERT`, `RULE_ACTION`, `SCHEDULE_STAGE`, `SCHEDULE_ACTION`, `AREA_CHANGE`, `DRYER_CHANGE`, `DEVICE_CHANGE`, `DEVICE_TYPE_CHANGE`, `SCHEDULE_CHANGE`, `RULE_CHANGE`, `CROP_CHANGE`, `PROFILE_CHANGE`

#### `severity_levels` — Mức độ nghiêm trọng

| Cột     | Kiểu                           | Mô tả  |
| ------- | ------------------------------ | ------ |
| `id`    | INT PK AUTO                    | ID     |
| `level` | ENUM('info','warning','error') | Mức độ |

#### `system_logs` — Nhật ký hệ thống

| Cột             | Kiểu                   | Mô tả                                  |
| --------------- | ---------------------- | -------------------------------------- |
| `id`            | INT PK AUTO            | ID                                     |
| `timestamp`     | DATETIME               | Thời điểm ghi                          |
| `user_id`       | INT FK→users           | Người dùng thực hiện (NULL = hệ thống) |
| `dryer_id`      | INT FK→dryers          | Máy sấy liên quan (NULL = toàn cục)    |
| `event_type_id` | INT FK→event_types     | Loại sự kiện                           |
| `severity_id`   | INT FK→severity_levels | Mức độ                                 |
| `description`   | TEXT                   | Mô tả chi tiết                         |

---

### Nhóm 4: Tự động hoá — Lịch trình

#### `crops` — Nông sản

| Cột           | Kiểu         | Mô tả                 |
| ------------- | ------------ | --------------------- |
| `id`          | INT PK AUTO  | ID nông sản           |
| `name`        | VARCHAR(255) | Tên (vd: Xoài, Chuối) |
| `description` | TEXT         | Mô tả                 |

#### `schedules` — Lịch trình sấy (template toàn cục)

| Cột       | Kiểu         | Mô tả            |
| --------- | ------------ | ---------------- |
| `id`      | INT PK AUTO  | ID lịch trình    |
| `name`    | VARCHAR(255) | Tên lịch trình   |
| `crop_id` | INT FK→crops | Nông sản áp dụng |

#### `schedule_virtual_devices` — Thiết bị ảo của lịch trình

Lớp trừu tượng hoá: đặt tên chức năng (vd: "Fan Speed") thay vì gắn cứng thiết bị vật lý.

| Cột              | Kiểu                | Mô tả                           |
| ---------------- | ------------------- | ------------------------------- |
| `id`             | INT PK AUTO         | ID                              |
| `schedule_id`    | INT FK→schedules    | Lịch trình cha                  |
| `name`           | VARCHAR(255)        | Tên chức năng (vd: "Fan Speed") |
| `device_type_id` | INT FK→device_types | Loại thiết bị gợi ý             |

#### `stages` — Giai đoạn của lịch trình

| Cột            | Kiểu             | Mô tả                                                   |
| -------------- | ---------------- | ------------------------------------------------------- |
| `id`           | INT PK AUTO      | ID giai đoạn                                            |
| `schedule_id`  | INT FK→schedules | Lịch trình cha                                          |
| `name`         | VARCHAR(255)     | Tên giai đoạn                                           |
| `start_offset` | INT              | Thời điểm bắt đầu (phút tính từ lúc schedule khởi chạy) |

#### `schedule_actions` — Hành động trong giai đoạn

| Cột                          | Kiểu                            | Mô tả                       |
| ---------------------------- | ------------------------------- | --------------------------- |
| `id`                         | INT PK AUTO                     | ID                          |
| `stage_id`                   | INT FK→stages                   | Giai đoạn                   |
| `schedule_virtual_device_id` | INT FK→schedule_virtual_devices | Thiết bị ảo được điều khiển |
| `value`                      | FLOAT                           | Giá trị đặt cho thiết bị    |

---

### Nhóm 5: Tự động hoá — Quy tắc

#### `rules` — Quy tắc tự động hoá (template toàn cục)

| Cột           | Kiểu         | Mô tả            |
| ------------- | ------------ | ---------------- |
| `id`          | INT PK AUTO  | ID quy tắc       |
| `name`        | VARCHAR(255) | Tên quy tắc      |
| `description` | TEXT         | Mô tả            |
| `crop_id`     | INT FK→crops | Nông sản áp dụng |

#### `rule_virtual_devices` — Thiết bị ảo của quy tắc

| Cột              | Kiểu                | Mô tả                             |
| ---------------- | ------------------- | --------------------------------- |
| `id`             | INT PK AUTO         | ID                                |
| `rule_id`        | INT FK→rules        | Quy tắc cha                       |
| `name`           | VARCHAR(255)        | Tên chức năng (vd: "Temperature") |
| `device_type_id` | INT FK→device_types | Loại thiết bị gợi ý               |

#### `value_pairs` — Cặp điều kiện–hành động

Mỗi value pair thuộc một rule, gồm một tập điều kiện (AND logic) và tập hành động tương ứng.

| Cột       | Kiểu         | Mô tả                           |
| --------- | ------------ | ------------------------------- |
| `id`      | INT PK AUTO  | ID                              |
| `name`    | VARCHAR(255) | Tên cặp (vd: "High Temp Alert") |
| `rule_id` | INT FK→rules | Quy tắc cha                     |

#### `conditions` — Điều kiện

| Cột                      | Kiểu                        | Mô tả                    |
| ------------------------ | --------------------------- | ------------------------ |
| `id`                     | INT PK AUTO                 | ID                       |
| `value_pair_id`          | INT FK→value_pairs          | Cặp giá trị              |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | Thiết bị ảo cần kiểm tra |
| `operator`               | ENUM('>','<','=','>=','<=') | Toán tử so sánh          |
| `compare_value`          | FLOAT                       | Ngưỡng so sánh           |

#### `rule_actions` — Hành động khi điều kiện thoả

| Cột                      | Kiểu                        | Mô tả                  |
| ------------------------ | --------------------------- | ---------------------- |
| `id`                     | INT PK AUTO                 | ID                     |
| `value_pair_id`          | INT FK→value_pairs          | Cặp giá trị            |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | Thiết bị ảo điều khiển |
| `value`                  | FLOAT                       | Giá trị điều khiển     |

---

### Nhóm 6: Quản lý mẻ sấy (Batch)

#### `batches` — Mẻ sấy

| Cột                | Kiểu          | Mô tả                                         |
| ------------------ | ------------- | --------------------------------------------- |
| `id`               | INT PK AUTO   | ID mẻ                                         |
| `input_weight`     | FLOAT         | Khối lượng nguyên liệu đầu vào (kg)           |
| `output_weight`    | FLOAT         | Khối lượng sản phẩm đầu ra (kg)               |
| `start_time`       | DATETIME      | Thời điểm bắt đầu                             |
| `end_time`         | DATETIME      | Thời điểm kết thúc (NULL nếu đang chạy)       |
| `rating`           | INT           | Đánh giá chất lượng mẻ (1–5 sao)              |
| `runtime`          | INT NULL      | Giới hạn thời gian (giây), NULL = vô thời hạn |
| `schedule_enabled` | BOOLEAN       | Schedule engine có đang bật không             |
| `rule_enabled`     | BOOLEAN       | Rule engine có đang bật không                 |
| `dryer_id`         | INT FK→dryers | Máy sấy thực hiện                             |
| `crop_id`          | INT FK→crops  | Loại nông sản                                 |

#### `local_schedules` — Instance lịch trình per-dryer

Cho phép tái sử dụng schedule template toàn cục với mapping thiết bị riêng cho từng máy sấy.

| Cột           | Kiểu                   | Mô tả                  |
| ------------- | ---------------------- | ---------------------- |
| `id`          | INT PK AUTO            | ID                     |
| `dryer_id`    | INT FK→dryers          | Máy sấy                |
| `schedule_id` | INT FK→schedules       | Schedule template gốc  |
| `name`        | VARCHAR(255)           | Tên đặt bởi người dùng |
| `created_at`  | DATETIME DEFAULT NOW() | Thời điểm tạo          |

#### `local_schedule_device_mapping` — Ánh xạ thiết bị cho local schedule

| Cột                          | Kiểu                            | Mô tả                      |
| ---------------------------- | ------------------------------- | -------------------------- |
| `local_schedule_id`          | INT FK→local_schedules          | Local schedule             |
| `schedule_virtual_device_id` | INT FK→schedule_virtual_devices | Thiết bị ảo trong schedule |
| `device_id`                  | VARCHAR(255) FK→devices         | Thiết bị vật lý tương ứng  |

> PK composite: (`local_schedule_id`, `schedule_virtual_device_id`). ON DELETE CASCADE.

#### `local_rules` — Instance quy tắc per-dryer

| Cột          | Kiểu                   | Mô tả                  |
| ------------ | ---------------------- | ---------------------- |
| `id`         | INT PK AUTO            | ID                     |
| `dryer_id`   | INT FK→dryers          | Máy sấy                |
| `rule_id`    | INT FK→rules           | Rule template gốc      |
| `name`       | VARCHAR(255)           | Tên đặt bởi người dùng |
| `created_at` | DATETIME DEFAULT NOW() | Thời điểm tạo          |

#### `local_rule_device_mapping` — Ánh xạ thiết bị cho local rule

| Cột                      | Kiểu                        | Mô tả                     |
| ------------------------ | --------------------------- | ------------------------- |
| `local_rule_id`          | INT FK→local_rules          | Local rule                |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | Thiết bị ảo trong rule    |
| `device_id`              | VARCHAR(255) FK→devices     | Thiết bị vật lý tương ứng |

> PK composite: (`local_rule_id`, `rule_virtual_device_id`). ON DELETE CASCADE.

#### `batch_schedule_queue` — Hàng đợi lịch trình trong mẻ

Các local schedule được thực thi tuần tự theo `queue_order`.

| Cột                 | Kiểu                                              | Mô tả                      |
| ------------------- | ------------------------------------------------- | -------------------------- |
| `id`                | INT PK AUTO                                       | ID                         |
| `batch_id`          | INT FK→batches                                    | Mẻ sấy                     |
| `local_schedule_id` | INT FK→local_schedules                            | Lịch trình cục bộ          |
| `queue_order`       | INT                                               | Thứ tự trong hàng đợi      |
| `status`            | ENUM('pending','running','completed','cancelled') | Trạng thái                 |
| `started_at`        | DATETIME NULL                                     | Thời điểm bắt đầu thực thi |
| `completed_at`      | DATETIME NULL                                     | Thời điểm hoàn thành       |

#### `batch_rule_set` — Tập quy tắc trong mẻ

Các local rule được đánh giá đồng thời (polling mỗi 3 giây) trong suốt mẻ sấy.

| Cột              | Kiểu                 | Mô tả               |
| ---------------- | -------------------- | ------------------- |
| `id`             | INT PK AUTO          | ID                  |
| `batch_id`       | INT FK→batches       | Mẻ sấy              |
| `local_rule_id`  | INT FK→local_rules   | Quy tắc cục bộ      |
| `priority_order` | INT                  | Thứ tự ưu tiên      |
| `active`         | BOOLEAN DEFAULT TRUE | Đang được kích hoạt |

> UNIQUE: (`batch_id`, `local_rule_id`) — không cho phép thêm cùng một rule hai lần trong một mẻ.

#### `batch_schedule_device_mapping` — Mapping mẻ × schedule × thiết bị

Lưu lại ánh xạ thiết bị tại thời điểm mẻ bắt đầu để phục vụ truy vấn lịch sử.

| Cột                          | Kiểu                            | PK  |
| ---------------------------- | ------------------------------- | --- |
| `batch_id`                   | INT FK→batches                  | ✓   |
| `schedule_id`                | INT FK→schedules                | ✓   |
| `schedule_virtual_device_id` | INT FK→schedule_virtual_devices | ✓   |
| `device_id`                  | VARCHAR(255) FK→devices         | ✓   |

#### `batch_rule_device_mapping` — Mapping mẻ × rule × thiết bị

| Cột                      | Kiểu                        | PK  |
| ------------------------ | --------------------------- | --- |
| `batch_id`               | INT FK→batches              | ✓   |
| `rule_id`                | INT FK→rules                | ✓   |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | ✓   |
| `device_id`              | VARCHAR(255) FK→devices     | ✓   |

---

## Stored Procedures (`procedures.sql`)

### `create_batch(p_dryer_id, p_crop_id, p_input_weight, p_runtime)`

Tạo một mẻ sấy mới. Chèn bản ghi vào `batches` với `start_time = NOW()`.

```sql
INSERT INTO batches (dryer_id, crop_id, input_weight, runtime, start_time)
VALUES (p_dryer_id, p_crop_id, p_input_weight, p_runtime, NOW());
```

### `finish_batch(p_batch_id, p_output_weight, p_rating)`

Kết thúc mẻ sấy, ghi thông tin đánh giá.

```sql
UPDATE batches SET output_weight = p_output_weight, rating = p_rating,
                   end_time = NOW()
WHERE id = p_batch_id;
```

### `insert_sensor_log(p_device_id VARCHAR(255), p_value FLOAT)`

Ghi một điểm dữ liệu cảm biến vào `sensor_logs`. Được gọi mỗi khi nhận MQTT message từ Adafruit IO.

```sql
INSERT INTO sensor_logs (timestamp, device_id, value)
VALUES (NOW(), p_device_id, p_value);
```

### `insert_system_log(p_user_id, p_dryer_id, p_event_type_id, p_severity_id, p_description)`

Ghi một bản ghi nhật ký hệ thống. Được gọi sau mọi thao tác quan trọng trong backend (điều khiển thiết bị, thay đổi cấu hình, bắt đầu/kết thúc mẻ...).

---

## Dữ liệu mẫu (`seeds.sql`)

| Bảng                       | Dữ liệu khởi tạo                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `users`                    | admin (`admin@test.com` / `admin123`), staff (`staff@test.com` / `staff123`)                                            |
| `areas`                    | Khu A — Khu vực sấy trái cây                                                                                            |
| `dryers`                   | Máy sấy 1, sức chứa 100 kg, trạng thái `on`                                                                             |
| `device_types`             | Temperature Sensor (°C), Fan Controller (%), Humidity Sensor (%), Fan Controller 2 (boolean), Door Controller (boolean) |
| `devices`                  | `sensor` — Temp Sensor 1, `worker` — Fan 1                                                                              |
| `crops`                    | Xoài, Chuối                                                                                                             |
| `schedules`                | Lịch trình xoài — 3 giai đoạn (bật quạt → tắt → bật lại)                                                                |
| `schedule_virtual_devices` | Fan Speed (thuộc lịch trình xoài)                                                                                       |
| `rules`                    | Rule nhiệt độ cao: nếu nhiệt độ > 70°C → bật quạt; ≤ 70°C → tắt quạt                                                    |
| `rule_virtual_devices`     | Temperature, Fan Speed (thuộc rule)                                                                                     |
| `event_types`              | 15 loại sự kiện (`START_BATCH`, `DEVICE_CONTROL`, v.v.)                                                                 |
| `severity_levels`          | info, warning, error                                                                                                    |

> **Mật khẩu** được lưu dạng bcrypt hash, không lưu plaintext. File `seeds.sql` có ghi chú plaintext chỉ để tiện phát triển.

---

## Thiết kế nổi bật

### Mô hình thiết bị ảo (Virtual Device)

Thay vì gắn cứng tên thiết bị vật lý vào schedule và rule (khiến chúng không tái sử dụng được), hệ thống dùng lớp trừu tượng:

```
schedule/rule
  └── virtual device (vd: "Fan Speed", "Temperature")
        └── local_schedule/local_rule mapping
              └── device vật lý cụ thể (vd: feed_id = "worker")
```

Điều này cho phép **cùng một schedule template** được áp dụng cho nhiều máy sấy với mapping thiết bị khác nhau.

### Phân tách template và instance

- **Template toàn cục** (`schedules`, `rules`): tạo một lần, dùng lại nhiều lần.
- **Local instance** (`local_schedules`, `local_rules`): liên kết template với máy sấy cụ thể + mapping thiết bị.
- **Batch assignment** (`batch_schedule_queue`, `batch_rule_set`): gán local instances vào mẻ sấy đang chạy.

### Hàng đợi lịch trình vs. tập quy tắc

|               | `batch_schedule_queue`     | `batch_rule_set`       |
| ------------- | -------------------------- | ---------------------- |
| Thực thi      | Tuần tự (lần lượt)         | Song song (đồng thời)  |
| Thêm/xóa động | Có (khi đang chạy)         | Có (khi đang chạy)     |
| Bật/tắt       | Theo `schedule_enabled`    | Theo `active` per-rule |
| Tần suất      | Theo `start_offset` (phút) | Mỗi 3 giây (polling)   |

---

## Ghi chú triển khai

- **Không đặt `MYSQL_DATABASE`** trong docker-compose: `tables.sql` tự tạo database `DADN` với charset chính xác thay vì để Docker tạo với charset mặc định.
- **Volume `mysql_data`**: dữ liệu được persist qua các lần restart container.
- **Port mapping**: `3307:3306` để tránh xung đột nếu đã có MySQL local chạy trên port 3306.
- **Bảng `alerts`** đã được thiết kế nhưng hiện comment out trong `tables.sql` — chức năng cảnh báo được log qua `system_logs` (event_type `RULE_ALERT`) thay thế.

---

## Sơ đồ quan hệ (tóm tắt)

```
users ──┬── areas ── dryers ──┬── devices (sensor/controller)
        │                     ├── batches ──┬── batch_schedule_queue ── local_schedules
        │                     │             └── batch_rule_set ── local_rules
        │                     ├── local_schedules ── local_schedule_device_mapping
        │                     └── local_rules ── local_rule_device_mapping
        └── dryers

crops ──┬── schedules ── stages ── schedule_actions
        ├── rules ── value_pairs ──┬── conditions
        │                          └── rule_actions
        └── batches

virtual_devices ── schedule_virtual_devices
               └── rule_virtual_devices

batch_schedule_device_mapping ── batches × schedules × schedule_virtual_devices × devices
batch_rule_device_mapping ── batches × rules × rule_virtual_devices × devices

sensor_logs ── devices
system_logs ── event_types / severity_levels
alerts      ── severity_levels / event_types / crops / rules / batches / dryers
```

---

## Bảng dữ liệu

### `users` — Người dùng

| Cột          | Kiểu                           | Mô tả                |
| ------------ | ------------------------------ | -------------------- |
| `id`         | INT PK AUTO                    | ID người dùng        |
| `full_name`  | VARCHAR(255)                   | Họ tên đầy đủ        |
| `email`      | VARCHAR(255) UNIQUE            | Email đăng nhập      |
| `phone`      | VARCHAR(20)                    | Số điện thoại        |
| `last_login` | DATETIME                       | Lần đăng nhập cuối   |
| `role`       | ENUM('admin','staff','viewer') | Vai trò              |
| `status`     | ENUM('active','disabled')      | Trạng thái tài khoản |

---

### `areas` — Khu vực

| Cột           | Kiểu         | Mô tả         |
| ------------- | ------------ | ------------- |
| `id`          | INT PK AUTO  | ID khu vực    |
| `name`        | VARCHAR(255) | Tên khu vực   |
| `description` | TEXT         | Mô tả         |
| `manager_id`  | INT FK→users | Người quản lý |

---

### `dryers` — Máy sấy

| Cột          | Kiểu                       | Mô tả                |
| ------------ | -------------------------- | -------------------- |
| `id`         | INT PK AUTO                | ID máy sấy           |
| `name`       | VARCHAR(255)               | Tên máy              |
| `capacity`   | FLOAT                      | Công suất (kg)       |
| `status`     | ENUM('off','on','running') | Trạng thái hoạt động |
| `area_id`    | INT FK→areas               | Khu vực              |
| `manager_id` | INT FK→users               | Người quản lý        |

---

### `device_types` — Loại thiết bị

| Cột           | Kiểu                        | Mô tả             |
| ------------- | --------------------------- | ----------------- |
| `id`          | INT PK AUTO                 | ID loại           |
| `name`        | VARCHAR(255)                | Tên loại          |
| `description` | TEXT                        | Mô tả             |
| `unit`        | VARCHAR(50)                 | Đơn vị đo lường   |
| `max_value`   | FLOAT                       | Giá trị tối đa    |
| `min_value`   | FLOAT                       | Giá trị tối thiểu |
| `category`    | ENUM('sensor','controller') | Phân loại         |

---

### `devices` — Thiết bị vật lý

| Cột            | Kiểu                | Mô tả                                               |
| -------------- | ------------------- | --------------------------------------------------- |
| `id`           | VARCHAR(255) PK     | ID thiết bị (string, ví dụ: `'sensor'`, `'worker'`) |
| `name`         | VARCHAR(255)        | Tên thiết bị                                        |
| `power_status` | FLOAT               | Trạng thái nguồn điện                               |
| `install_date` | DATE                | Ngày lắp đặt                                        |
| `dryer_id`     | INT FK→dryers       | Máy sấy chứa thiết bị                               |
| `type_id`      | INT FK→device_types | Loại thiết bị                                       |

---

### `virtual_devices` — Thiết bị ảo

Thiết bị ảo là abstraction layer (ví dụ: "Temperature", "Fan Speed") được map với thiết bị vật lý thông qua `batch_device_mapping`.

| Cột    | Kiểu         | Mô tả                               |
| ------ | ------------ | ----------------------------------- |
| `id`   | INT PK AUTO  | ID                                  |
| `name` | VARCHAR(255) | Tên (ví dụ: Temperature, Fan Speed) |

---

### `crops` — Nông sản

| Cột           | Kiểu         | Mô tả                    |
| ------------- | ------------ | ------------------------ |
| `id`          | INT PK AUTO  | ID nông sản              |
| `name`        | VARCHAR(255) | Tên (ví dụ: Xoài, Chuối) |
| `description` | TEXT         | Mô tả                    |

---

### `schedules` — Lịch trình sấy

| Cột       | Kiểu         | Mô tả                 |
| --------- | ------------ | --------------------- |
| `id`      | INT PK AUTO  | ID lịch trình         |
| `name`    | VARCHAR(255) | Tên lịch trình        |
| `crop_id` | INT FK→crops | Loại nông sản áp dụng |

---

### `schedule_virtual_devices` — Thiết bị ảo trong lịch trình

Quan hệ nhiều-nhiều giữa lịch trình và thiết bị ảo.

| Cột                 | Kiểu                   | Mô tả       |
| ------------------- | ---------------------- | ----------- |
| `id`                | INT PK AUTO            | ID          |
| `schedule_id`       | INT FK→schedules       | Lịch trình  |
| `virtual_device_id` | INT FK→virtual_devices | Thiết bị ảo |

---

### `stages` — Giai đoạn trong lịch trình

| Cột            | Kiểu             | Mô tả                                  |
| -------------- | ---------------- | -------------------------------------- |
| `id`           | INT PK AUTO      | ID giai đoạn                           |
| `schedule_id`  | INT FK→schedules | Lịch trình                             |
| `name`         | VARCHAR(255)     | Tên giai đoạn                          |
| `start_offset` | INT              | Thời điểm bắt đầu (phút từ lúc mở máy) |

---

### `schedule_actions` — Hành động trong giai đoạn

| Cột                 | Kiểu                   | Mô tả                                    |
| ------------------- | ---------------------- | ---------------------------------------- |
| `id`                | INT PK AUTO            | ID                                       |
| `stage_id`          | INT FK→stages          | Giai đoạn                                |
| `virtual_device_id` | INT FK→virtual_devices | Thiết bị ảo được điều khiển              |
| `value`             | FLOAT                  | Giá trị đặt (nhiệt độ, tốc độ quạt, ...) |

---

### `rules` — Quy tắc tự động hoá

| Cột           | Kiểu         | Mô tả                 |
| ------------- | ------------ | --------------------- |
| `id`          | INT PK AUTO  | ID quy tắc            |
| `name`        | VARCHAR(255) | Tên quy tắc           |
| `description` | TEXT         | Mô tả                 |
| `crop_id`     | INT FK→crops | Loại nông sản áp dụng |

---

### `rule_virtual_devices` — Thiết bị ảo trong quy tắc

| Cột                 | Kiểu                   | Mô tả       |
| ------------------- | ---------------------- | ----------- |
| `id`                | INT PK AUTO            | ID          |
| `rule_id`           | INT FK→rules           | Quy tắc     |
| `virtual_device_id` | INT FK→virtual_devices | Thiết bị ảo |

---

### `value_pairs` — Cặp điều kiện–hành động

Mỗi `value_pair` thuộc một rule, gồm một tập `conditions` (AND logic) và một tập `rule_actions`.

| Cột       | Kiểu         | Mô tả   |
| --------- | ------------ | ------- |
| `id`      | INT PK AUTO  | ID      |
| `rule_id` | INT FK→rules | Quy tắc |

---

### `conditions` — Điều kiện

| Cột                 | Kiểu                            | Mô tả                    |
| ------------------- | ------------------------------- | ------------------------ |
| `id`                | INT PK AUTO                     | ID                       |
| `value_pair_id`     | INT FK→value_pairs              | Cặp giá trị              |
| `virtual_device_id` | INT FK→virtual_devices          | Thiết bị ảo cần kiểm tra |
| `operator`          | ENUM('>', '<', '=', '>=', '<=') | Toán tử so sánh          |
| `compare_value`     | FLOAT                           | Giá trị ngưỡng           |

---

### `rule_actions` — Hành động khi điều kiện thoả

| Cột                 | Kiểu                   | Mô tả                       |
| ------------------- | ---------------------- | --------------------------- |
| `id`                | INT PK AUTO            | ID                          |
| `value_pair_id`     | INT FK→value_pairs     | Cặp giá trị                 |
| `virtual_device_id` | INT FK→virtual_devices | Thiết bị ảo được điều khiển |
| `value`             | FLOAT                  | Giá trị điều khiển          |

---

### `batches` — Mẻ sấy

| Cột                | Kiểu          | Mô tả                        |
| ------------------ | ------------- | ---------------------------- |
| `id`               | INT PK AUTO   | ID mẻ                        |
| `input_weight`     | FLOAT         | Trọng lượng đầu vào (kg)     |
| `output_weight`    | FLOAT         | Trọng lượng đầu ra (kg)      |
| `start_time`       | DATETIME      | Thời điểm bắt đầu            |
| `end_time`         | DATETIME      | Thời điểm kết thúc           |
| `rating`           | INT           | Đánh giá chất lượng          |
| `runtime`          | INT NULL      | Thời gian chạy tối đa (giây) |
| `schedule_enabled` | BOOLEAN       | Đã bật schedule queue?       |
| `rule_enabled`     | BOOLEAN       | Đã bật rule engine?          |
| `dryer_id`         | INT FK→dryers | Máy sấy                      |
| `crop_id`          | INT FK→crops  | Loại nông sản                |

> Mô hình mới: không còn `schedule_id` / `rule_id` trực tiếp. Schedule và rule được quản lý qua `batch_schedule_queue` và `batch_rule_set`.

---

### `local_schedules` — Lịch trình cục bộ (per-dryer)

Instance per-dryer của global schedule, kèm mapping thiết bị ảo → thiết bị thực.

| Cột           | Kiểu             | Mô tả                 |
| ------------- | ---------------- | --------------------- |
| `id`          | INT PK AUTO      | ID                    |
| `dryer_id`    | INT FK→dryers    | Máy sấy               |
| `schedule_id` | INT FK→schedules | Schedule gốc (mẫu)    |
| `name`        | VARCHAR(255)     | Tên do người dùng đặt |
| `created_at`  | DATETIME         | Thời điểm tạo         |

---

### `local_schedule_device_mapping` — Mapping thiết bị ảo lịch trình cục bộ

| Cột                          | Kiểu                            | Mô tả                      |
| ---------------------------- | ------------------------------- | -------------------------- |
| `local_schedule_id`          | INT FK→local_schedules          | Lịch trình cục bộ          |
| `schedule_virtual_device_id` | INT FK→schedule_virtual_devices | Thiết bị ảo trong schedule |
| `device_id`                  | VARCHAR(255) FK→devices         | Thiết bị vật lý            |

> PK: (`local_schedule_id`, `schedule_virtual_device_id`)

---

### `local_rules` — Quy tắc cục bộ (per-dryer)

Instance per-dryer của global rule, kèm mapping thiết bị ảo → thiết bị thực.

| Cột          | Kiểu          | Mô tả                 |
| ------------ | ------------- | --------------------- |
| `id`         | INT PK AUTO   | ID                    |
| `dryer_id`   | INT FK→dryers | Máy sấy               |
| `rule_id`    | INT FK→rules  | Rule gốc (mẫu)        |
| `name`       | VARCHAR(255)  | Tên do người dùng đặt |
| `created_at` | DATETIME      | Thời điểm tạo         |

---

### `local_rule_device_mapping` — Mapping thiết bị ảo quy tắc cục bộ

| Cột                      | Kiểu                        | Mô tả                  |
| ------------------------ | --------------------------- | ---------------------- |
| `local_rule_id`          | INT FK→local_rules          | Quy tắc cục bộ         |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | Thiết bị ảo trong rule |
| `device_id`              | VARCHAR(255) FK→devices     | Thiết bị vật lý        |

> PK: (`local_rule_id`, `rule_virtual_device_id`)

---

### `batch_schedule_queue` — Hàng đợi lịch trình trong mẻ sấy

Các local schedule được chạy tuần tự theo `queue_order` trong một mẻ.

| Cột                 | Kiểu                                                                | Mô tả                 |
| ------------------- | ------------------------------------------------------------------- | --------------------- |
| `id`                | INT PK AUTO                                                         | ID                    |
| `batch_id`          | INT FK→batches                                                      | Mẻ sấy                |
| `local_schedule_id` | INT FK→local_schedules                                              | Lịch trình cục bộ     |
| `queue_order`       | INT                                                                 | Thứ tự trong hàng đợi |
| `status`            | ENUM('pending','running','completed','cancelled') DEFAULT 'pending' | Trạng thái            |
| `started_at`        | DATETIME NULL                                                       | Thời điểm bắt đầu     |
| `completed_at`      | DATETIME NULL                                                       | Thời điểm hoàn thành  |

---

### `batch_rule_set` — Tập quy tắc trong mẻ sấy

Các local rule được đánh giá đồng thời (polling mỗi 3 giây) trong một mẻ.

| Cột              | Kiểu                 | Mô tả           |
| ---------------- | -------------------- | --------------- |
| `id`             | INT PK AUTO          | ID              |
| `batch_id`       | INT FK→batches       | Mẻ sấy          |
| `local_rule_id`  | INT FK→local_rules   | Quy tắc cục bộ  |
| `priority_order` | INT                  | Thứ tự ưu tiên  |
| `active`         | BOOLEAN DEFAULT TRUE | Đang hoạt động? |

> UNIQUE: (`batch_id`, `local_rule_id`)

---

### `batch_schedule_device_mapping` — Mapping mẻ sấy–lịch trình–thiết bị

| Cột                          | Kiểu                            | Mô tả                      |
| ---------------------------- | ------------------------------- | -------------------------- |
| `batch_id`                   | INT FK→batches                  | Mẻ sấy                     |
| `schedule_id`                | INT FK→schedules                | Schedule gốc               |
| `schedule_virtual_device_id` | INT FK→schedule_virtual_devices | Thiết bị ảo trong schedule |
| `device_id`                  | VARCHAR(255) FK→devices         | Thiết bị vật lý            |

> PK: (`batch_id`, `schedule_id`, `schedule_virtual_device_id`, `device_id`)

---

### `batch_rule_device_mapping` — Mapping mẻ sấy–quy tắc–thiết bị

| Cột                      | Kiểu                        | Mô tả                  |
| ------------------------ | --------------------------- | ---------------------- |
| `batch_id`               | INT FK→batches              | Mẻ sấy                 |
| `rule_id`                | INT FK→rules                | Rule gốc               |
| `rule_virtual_device_id` | INT FK→rule_virtual_devices | Thiết bị ảo trong rule |
| `device_id`              | VARCHAR(255) FK→devices     | Thiết bị vật lý        |

> PK: (`batch_id`, `rule_id`, `rule_virtual_device_id`, `device_id`)

---

### `sensor_logs` — Log cảm biến

| Cột         | Kiểu                    | Mô tả            |
| ----------- | ----------------------- | ---------------- |
| `id`        | INT PK AUTO             | ID               |
| `timestamp` | DATETIME                | Thời điểm ghi    |
| `device_id` | VARCHAR(255) FK→devices | Thiết bị ghi log |
| `value`     | FLOAT                   | Giá trị đo được  |

---

### `event_types` — Loại sự kiện

| Cột    | Kiểu                                                           | Mô tả        |
| ------ | -------------------------------------------------------------- | ------------ |
| `id`   | INT PK AUTO                                                    | ID           |
| `name` | ENUM('device_control','device_change','policy_change','alert') | Loại sự kiện |

---

### `severity_levels` — Mức độ nghiêm trọng

| Cột     | Kiểu                           | Mô tả  |
| ------- | ------------------------------ | ------ |
| `id`    | INT PK AUTO                    | ID     |
| `level` | ENUM('info','warning','error') | Mức độ |

---

### `system_logs` — Log hệ thống

| Cột             | Kiểu                   | Mô tả                |
| --------------- | ---------------------- | -------------------- |
| `id`            | INT PK AUTO            | ID                   |
| `timestamp`     | DATETIME               | Thời điểm ghi        |
| `user_id`       | INT FK→users           | Người dùng liên quan |
| `dryer_id`      | INT FK→dryers          | Máy sấy liên quan    |
| `event_type_id` | INT FK→event_types     | Loại sự kiện         |
| `severity_id`   | INT FK→severity_levels | Mức độ               |
| `description`   | TEXT                   | Mô tả sự kiện        |

---

### `alerts` — Cảnh báo

| Cột             | Kiểu                                                 | Mô tả                    |
| --------------- | ---------------------------------------------------- | ------------------------ |
| `id`            | INT PK AUTO                                          | ID                       |
| `name`          | VARCHAR(255)                                         | Tên cảnh báo             |
| `description`   | TEXT                                                 | Mô tả                    |
| `severity_id`   | INT FK→severity_levels                               | Mức độ nghiêm trọng      |
| `event_type_id` | INT FK→event_types                                   | Loại sự kiện             |
| `crop_id`       | INT FK→crops                                         | Nông sản liên quan       |
| `rule_id`       | INT FK→rules                                         | Quy tắc sinh ra cảnh báo |
| `batch_id`      | INT FK→batches                                       | Mẻ sấy liên quan         |
| `dryer_id`      | INT FK→dryers                                        | Máy sấy liên quan        |
| `status`        | ENUM('active','resolved','ignored') DEFAULT 'active' | Trạng thái               |
| `triggered_at`  | DATETIME                                             | Thời điểm kích hoạt      |
| `resolved_at`   | DATETIME                                             | Thời điểm giải quyết     |

---

## Dữ liệu mẫu (seeds.sql)

| Bảng               | Dữ liệu                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `users`            | 1 admin (`admin@test.com`), 1 staff (`staff@test.com`)                                 |
| `areas`            | Khu A (sấy trái cây)                                                                   |
| `dryers`           | Máy sấy 1, sức chứa 100kg, khu A                                                       |
| `device_types`     | Temperature Sensor, Fan Controller, Humidity Sensor, Fan Controller 2, Door Controller |
| `devices`          | `'sensor'` (Temp Sensor 1), `'worker'` (Fan 1)                                         |
| `crops`            | Xoài, Chuối                                                                            |
| `schedules`        | Lịch trình xoài                                                                        |
| `virtual_devices`  | Temperature, Fan Speed                                                                 |
| `stages`           | Giai đoạn 1 (offset 0), Giai đoạn 2 (offset 10)                                        |
| `schedule_actions` | Nhiệt độ 60°C + bật quạt (giai đoạn 1); Nhiệt độ 50°C + tắt quạt (giai đoạn 2)         |
| `rules`            | Rule nhiệt độ cao (threshold > 70°C cho Xoài)                                          |
| `conditions`       | Nhiệt độ > 70                                                                          |
| `local_schedules`  | Lịch trình xoài – Máy 1 (mapping Temperature → sensor, Fan Speed → worker)             |
| `local_rules`      | Rule nhiệt – Máy 1 (mapping Temperature → sensor, Fan Speed → worker)                  |
| `conditions`       | Nhiệt độ > 70                                                                          |
| `rule_actions`     | Bật quạt max khi nhiệt độ vượt ngưỡng                                                  |
| `event_types`      | device_control, device_change, policy_change, alert                                    |
| `severity_levels`  | info, warning, error                                                                   |

---

## Stored Procedures & Functions

### Procedures

#### `create_batch(p_dryer_id, p_crop_id, p_schedule_id, p_rule_id, p_input_weight)`

Tạo mẻ sấy mới. Insert vào `batches` với `start_time = NOW()`.

#### `finish_batch(p_batch_id, p_output_weight, p_rating)`

Kết thúc mẻ sấy. Update `output_weight`, `rating`, `end_time = NOW()`.

#### `insert_sensor_log(p_device_id VARCHAR(255), p_value FLOAT)`

Ghi log cảm biến vào `sensor_logs`.

#### `create_alert(p_name, p_description, p_severity_id, p_event_type_id, p_crop_id, p_rule_id, p_batch_id, p_dryer_id)`

Tạo cảnh báo mới với `status = 'active'` và `triggered_at = NOW()`.

#### `resolve_alert(p_alert_id)`

Đánh dấu cảnh báo là `'resolved'` và set `resolved_at = NOW()`.

#### `insert_system_log(p_user_id, p_dryer_id, p_event_type_id, p_severity_id, p_description)`

Ghi log hệ thống vào `system_logs`.

#### `check_and_create_alert(p_device_id VARCHAR(255), p_value FLOAT, p_batch_id INT)`

Kiểm tra toàn bộ `conditions`. Nếu giá trị `p_value` vi phạm bất kỳ điều kiện nào (dùng cursor), tự động gọi `create_alert` với mức độ `warning`.

---

### Functions

#### `calc_efficiency(p_batch_id) → FLOAT`

Tính hiệu suất mẻ sấy: `(output_weight / input_weight) * 100`. Trả về `0` nếu `input_weight = 0`.

#### `check_condition(p_value, p_operator, p_compare) → BOOLEAN`

Kiểm tra điều kiện đơn lẻ với toán tử `>`, `<`, `=`, `>=`, `<=`.

---

## Thứ tự chạy các file

```
1. tables.sql   — Tạo database và tất cả bảng
2. seeds.sql    — Chèn dữ liệu mẫu
3. procedures.sql — Tạo stored procedures và functions
```

Để reset database: chạy `reset.sql` (drop database DADN), sau đó chạy lại từ bước 1.
