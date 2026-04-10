# Database Documentation — DADN (DrierSystem)

## Tổng quan

Database **DADN** phục vụ hệ thống quản lý máy sấy nông sản. Gồm các nhóm chức năng:

- Quản lý người dùng, khu vực, máy sấy
- Quản lý thiết bị vật lý và thiết bị ảo (virtual devices)
- Lịch trình sấy và quy tắc tự động hoá
- Theo dõi mẻ sấy, log cảm biến, log hệ thống
- Cảnh báo tự động

---

## Sơ đồ quan hệ (tóm tắt)

```
users ──┬── areas ── dryers ──┬── devices (sensor/controller)
        │                     └── batches
        └── dryers

crops ──┬── schedules ── stages ── schedule_actions
        ├── rules ── value_pairs ──┬── conditions
        │                         └── rule_actions
        └── batches

virtual_devices ── schedule_virtual_devices
               └── rule_virtual_devices
               └── batch_device_mapping

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

| Cột             | Kiểu             | Mô tả                    |
| --------------- | ---------------- | ------------------------ |
| `id`            | INT PK AUTO      | ID mẻ                    |
| `input_weight`  | FLOAT            | Trọng lượng đầu vào (kg) |
| `output_weight` | FLOAT            | Trọng lượng đầu ra (kg)  |
| `start_time`    | DATETIME         | Thời điểm bắt đầu        |
| `end_time`      | DATETIME         | Thời điểm kết thúc       |
| `rating`        | INT              | Đánh giá chất lượng      |
| `dryer_id`      | INT FK→dryers    | Máy sấy                  |
| `crop_id`       | INT FK→crops     | Loại nông sản            |
| `schedule_id`   | INT FK→schedules | Lịch trình áp dụng       |
| `rule_id`       | INT FK→rules     | Quy tắc áp dụng          |

---

### `batch_device_mapping` — Ánh xạ thiết bị ảo → thiết bị thật cho mẻ

Quan hệ 3 ngôi, khoá chính tổng hợp.

| Cột                 | Kiểu                    | Mô tả           |
| ------------------- | ----------------------- | --------------- |
| `batch_id`          | INT FK→batches          | Mẻ sấy          |
| `virtual_device_id` | INT FK→virtual_devices  | Thiết bị ảo     |
| `device_id`         | VARCHAR(255) FK→devices | Thiết bị vật lý |

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
