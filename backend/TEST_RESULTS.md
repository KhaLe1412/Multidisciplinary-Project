# Kết Quả Kiểm Thử — Mẻ Sấy (Batch Drying Engine)

> **Tổng kết:** 30/30 test PASSED — thời gian chạy ≈ 54 giây

---

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Cài Đặt & Chạy Test](#cài-đặt--chạy-test)
3. [Chiến Lược Mock & Dữ Liệu Cảm Biến](#chiến-lược-mock--dữ-liệu-cảm-biến)
4. [Kết Quả Chi Tiết](#kết-quả-chi-tiết)
   - [1. Vòng Đời Mẻ Sấy](#1-vòng-đời-mẻ-sấy-testbatchlifecycle)
   - [2. Điều Khiển Thủ Công](#2-điều-khiển-thủ-công-testmanualcontrol)
   - [3. Hàng Đợi Lịch Sấy](#3-hàng-đợi-lịch-sấy-testschedulequeue)
   - [4. Bộ Máy Ngưỡng (Rule Engine)](#4-bộ-máy-ngưỡng-rule-engine-testruleengine)
   - [5. Kết Hợp Lịch và Ngưỡng](#5-kết-hợp-lịch-và-ngưỡng-testcombinedscheduleaandrule)
5. [Kiến Trúc Test](#kiến-trúc-test)
6. [Các Vấn Đề Đã Giải Quyết](#các-vấn-đề-đã-giải-quyết)

---

## Tổng Quan

Bộ test kiểm tra toàn bộ luồng hoạt động của module mẻ sấy (`/api/batches/*`)
thông qua **FastAPI TestClient**, chạy trực tiếp trên cơ sở dữ liệu MySQL thật
(localhost:3307, database `DADN`). Không cần kết nối Adafruit IO thật — tất cả
I/O thiết bị đều được mock.

| Nhóm test             | Số test | Kết quả      |
| --------------------- | ------- | ------------ |
| Vòng đời mẻ sấy       | 9       | ✅ 9/9       |
| Điều khiển thủ công   | 4       | ✅ 4/4       |
| Hàng đợi lịch sấy     | 7       | ✅ 7/7       |
| Bộ máy ngưỡng         | 9       | ✅ 9/9       |
| Kết hợp lịch + ngưỡng | 1       | ✅ 1/1       |
| **Tổng cộng**         | **30**  | **✅ 30/30** |

---

## Cài Đặt & Chạy Test

```bash
# Yêu cầu: MySQL đang chạy, đã load tables.sql + seeds.sql
cd backend
pytest test_batches.py -v
```

Thêm tuỳ chọn:

```bash
# Chỉ chạy một nhóm
pytest test_batches.py::TestRuleEngine -v

# Xem stdout (log từ background thread)
pytest test_batches.py -v -s
```

---

## Chiến Lược Mock & Dữ Liệu Cảm Biến

### Mock Adafruit IO (`conftest.py`)

Toàn bộ giao tiếp MQTT với Adafruit IO bị vô hiệu hoá bằng cách
thay `Adafruit_IO.MQTTClient` bằng một stub không làm gì:

```python
class _FakeMQTTClient:
    def __init__(self, *a, **kw): pass
    def connect(self): pass
    def loop_background(self): pass
    ...
```

### Mock `device_manager` (fixture `device_calls`)

Fixture `device_calls` (function-scoped) thực hiện:

1. **Ghi lại lệnh gọi** — `set_device_value(feed_id, value)` được thay bằng hàm
   `_fake_set` ghi `(feed_id, value)` vào list `calls`.
2. **Cập nhật DB** — `_fake_set` đồng thời ghi vào `sensor_logs` qua
   `insert_sensor_log()`, để `get_latest_db_value()` trả về giá trị đúng.
3. **Luôn đăng ký** — `is_registered(feed_id)` bị mock trả về `True`.
4. **Reset giá trị CTRL trước mỗi test** — ghi `CTRL_ID = 0.0` vào
   `sensor_logs` để tránh tối ưu hoá "bỏ qua nếu giá trị không đổi" của
   rule engine làm mất lệnh gọi kỳ vọng.

### Tự Tạo Dữ Liệu Cảm Biến

Không dùng dữ liệu cảm biến từ thiết bị thật. Mỗi test tự inject giá trị nhiệt
độ trực tiếp vào bảng `sensor_logs` thông qua stored procedure `insert_sensor_log`:

```python
# Ví dụ: giả lập nhiệt độ 55°C để kích hoạt rule (ngưỡng > 40°C)
insert_sensor_log("ts-sensor-temp-001", 55.0)
```

### Hằng Số Thời Gian

| Hằng số         | Giá trị | Ý nghĩa                                        |
| --------------- | ------- | ---------------------------------------------- |
| `POLL_INTERVAL` | 3 s     | Chu kỳ poll của rule worker                    |
| `POLL`          | 3 s     | Alias trong test                               |
| `MARGIN`        | 1.5 s   | Thêm vào timeout để bù jitter                  |
| Stage B offset  | 2 s     | `start_offset` của stage B trong lịch sấy test |

---

## Kết Quả Chi Tiết

### 1. Vòng Đời Mẻ Sấy (`TestBatchLifecycle`)

Kiểm tra các trạng thái cơ bản của một mẻ sấy từ lúc bắt đầu đến khi kết thúc.

| Test                                          | Mục đích                                                                                       | Kết quả |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| `test_start_returns_201_with_id`              | `POST /api/batches/start` trả về HTTP 201 và body có `id`, `status="running"`, `dryer_id` đúng | ✅ PASS |
| `test_batch_persisted_in_db`                  | Sau khi start, bản ghi xuất hiện trong bảng `batches` với `end_time = NULL`                    | ✅ PASS |
| `test_end_returns_ended_status`               | `PUT /api/batches/{id}/end` trả về `status="ended"`                                            | ✅ PASS |
| `test_end_records_output_weight_and_rating`   | Truyền `output_weight=42.5, rating=5` → DB lưu đúng hai trường và ghi `end_time`               | ✅ PASS |
| `test_duplicate_batch_on_same_dryer_rejected` | Start thứ hai trên cùng máy sấy khi đang có mẻ → HTTP 409                                      | ✅ PASS |
| `test_end_already_ended_batch_is_rejected`    | Kết thúc một mẻ đã ended → HTTP 400                                                            | ✅ PASS |
| `test_auto_stops_after_runtime`               | Mẻ có `runtime=2` tự xoá khỏi `_active_batches` sau khi hết thời gian                          | ✅ PASS |
| `test_start_batch_with_crop_and_weight`       | Truyền `crop_id` và `input_weight=75.0` → response phản ánh đúng                               | ✅ PASS |
| `test_start_batch_invalid_dryer_returns_404`  | `dryer_id=999999` không tồn tại → HTTP 404                                                     | ✅ PASS |

---

### 2. Điều Khiển Thủ Công (`TestManualControl`)

Kiểm tra khả năng điều chỉnh trực tiếp thiết bị điều khiển trong và ngoài mẻ sấy.

| Test                                             | Mục đích                                                                                                 | Kết quả |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------- |
| `test_set_controller_value_during_batch`         | `POST /api/device/{id}?value=75.0` trong khi mẻ đang chạy → `set_device_value` được gọi với đúng tham số | ✅ PASS |
| `test_manual_set_multiple_values`                | Gọi liên tiếp với `0.0`, `50.0`, `100.0` → tất cả xuất hiện trong `device_calls`                         | ✅ PASS |
| `test_manual_control_works_without_active_batch` | Endpoint hoạt động bình thường dù không có mẻ nào đang chạy                                              | ✅ PASS |
| `test_sensor_log_updated_after_manual_set`       | Sau khi set `CTRL_ID=88.0`, `get_latest_db_value(CTRL_ID)` trả về `88.0`                                 | ✅ PASS |

---

### 3. Hàng Đợi Lịch Sấy (`TestScheduleQueue`)

Kiểm tra việc đính kèm lịch sấy vào mẻ và thực thi tuần tự các giai đoạn (stage).

Lịch test được cấu hình:

- **Stage A** (`start_offset=0`): đặt quạt → 80%
- **Stage B** (`start_offset=2s`): đặt quạt → 40%

| Test                                       | Mục đích                                                                        | Kết quả |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ------- |
| `test_add_schedule_returns_added_count`    | `POST /api/batches/{id}/schedules` trả về `added=1` và `batch_id` đúng          | ✅ PASS |
| `test_schedule_queue_visible_in_get`       | `GET /api/batches/{id}/schedules` trả về entry vừa thêm                         | ✅ PASS |
| `test_schedule_stage_a_fires_immediately`  | Stage A (`offset=0`) kích hoạt trong vòng 6 s sau khi thêm lịch                 | ✅ PASS |
| `test_schedule_stage_b_fires_after_offset` | Stage B (`offset=2s`) kích hoạt trong vòng 8 s                                  | ✅ PASS |
| `test_schedule_stages_fire_in_order`       | Trong `device_calls`, giá trị `80.0` luôn xuất hiện trước `40.0`                | ✅ PASS |
| `test_remove_pending_schedule_entry`       | Xoá entry `pending` qua `DELETE` → trạng thái trong DB chuyển thành `cancelled` | ✅ PASS |
| `test_clear_all_schedules`                 | Xoá tất cả entry → `GET` trả về danh sách rỗng                                  | ✅ PASS |

---

### 4. Bộ Máy Ngưỡng — Rule Engine (`TestRuleEngine`)

Kiểm tra việc đính kèm ngưỡng (rule) vào mẻ và tự động kích hoạt khi cảm biến
vượt ngưỡng.

Rule test được cấu hình:

- **Điều kiện**: nhiệt độ (`ts-sensor-temp-001`) > 40°C
- **Hành động**: đặt quạt (`ts-ctrl-fan-001`) = 1.0

| Test                                               | Mục đích                                                                                         | Kết quả |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| `test_add_rule_returns_added_count`                | `POST /api/batches/{id}/rules` trả về `added=1`                                                  | ✅ PASS |
| `test_rule_set_visible_in_get`                     | `GET /api/batches/{id}/rules` hiển thị rule vừa thêm                                             | ✅ PASS |
| `test_rule_fires_when_temperature_above_threshold` | Inject 55°C → rule kích hoạt `CTRL_ID=1.0` trong vòng `POLL + MARGIN`                            | ✅ PASS |
| `test_rule_does_not_fire_below_threshold`          | Inject 25°C (dưới ngưỡng 40°C) → không có lệnh gọi nào sau 2 chu kỳ poll                         | ✅ PASS |
| `test_rule_fires_on_mid_batch_sensor_change`       | Bắt đầu với 20°C (lạnh), sau đó tăng lên 65°C giữa chừng → rule mới kích hoạt                    | ✅ PASS |
| `test_toggle_rule_off_prevents_firing`             | Tắt rule (`enabled=False`) → dù nhiệt độ 70°C, quạt không được kích hoạt                         | ✅ PASS |
| `test_toggle_rule_back_on_fires_again`             | Tắt rule rồi bật lại → rule kích hoạt lại trong chu kỳ tiếp theo (timeout = `POLL*3 + MARGIN*2`) | ✅ PASS |
| `test_remove_rule_from_set`                        | Xoá rule qua `DELETE` → rule không còn trong danh sách                                           | ✅ PASS |
| `test_duplicate_rule_not_added_twice`              | Thêm cùng một rule hai lần → chỉ xuất hiện một lần trong rule set                                | ✅ PASS |

---

### 5. Kết Hợp Lịch và Ngưỡng (`TestCombinedScheduleAndRule`)

Kiểm tra hai thread (schedule worker và rule worker) hoạt động song song trong
cùng một mẻ sấy mà không can thiệp lẫn nhau.

| Test                                       | Mục đích                                                                                                                   | Kết quả |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| `test_schedule_and_rule_run_in_same_batch` | Lịch và ngưỡng cùng active: Stage A (fan=80), Stage B (fan=40) và Rule (fan=1 tại 60°C) đều xuất hiện trong `device_calls` | ✅ PASS |

---

## Kiến Trúc Test

```
backend/
├── conftest.py          # Mock Adafruit_IO.MQTTClient, set env vars
└── test_batches.py      # 30 integration tests
    │
    ├── _preclean()              # Xoá dữ liệu test còn sót từ run trước
    ├── fixture: _db_test_data   # Tạo toàn bộ dữ liệu test (scope=module)
    │     ├── device_types (ts-type-sensor, ts-type-ctrl)
    │     ├── areas (ts-area)
    │     ├── dryers (ts-dryer)
    │     ├── devices (ts-sensor-temp-001, ts-ctrl-fan-001)
    │     ├── crops (ts-crop)
    │     ├── schedules → stages → schedule_actions
    │     ├── local_schedules → local_schedule_device_mapping
    │     ├── rules → rule_virtual_devices → value_pairs
    │     │   → conditions + rule_actions
    │     └── local_rules → local_rule_device_mapping
    │
    ├── fixture: device_calls    # Mock set_device_value + is_registered (scope=function)
    ├── fixture: _auto_end_batch # Dọn mẻ bị rò rỉ sau mỗi test (autouse=True)
    │
    ├── TestBatchLifecycle       (9 tests)
    ├── TestManualControl        (4 tests)
    ├── TestScheduleQueue        (7 tests)
    ├── TestRuleEngine           (9 tests)
    └── TestCombinedScheduleAndRule (1 test)
```

### Luồng Dữ Liệu Cảm Biến

```
test injects value
      │
      ▼
insert_sensor_log(SENSOR_ID, 55.0)   ← gọi stored procedure MySQL
      │
      ▼
sensor_logs table
      │
      ▼
rule worker: get_latest_db_value(SENSOR_ID) → 55.0
      │
      ▼
_check_conditions: 55.0 > 40 → True
      │
      ▼
_fake_set(CTRL_ID, 1.0)   ← mock set_device_value
      │
      ├──► calls.append((CTRL_ID, 1.0))   ← test assertion target
      └──► insert_sensor_log(CTRL_ID, 1.0) ← feedback cho poll tiếp theo
```

---

## Các Vấn Đề Đã Giải Quyết

### 1. Không có bảng `virtual_devices`

**Vấn đề:** Schema giả định bảng `virtual_devices` không tồn tại.  
**Giải pháp:** Dùng trực tiếp `schedule_virtual_devices(schedule_id, name, device_type_id)`
và `rule_virtual_devices(rule_id, name, device_type_id)`.

### 2. Rule engine bỏ qua hành động khi giá trị không thay đổi

**Vấn đề:** Rule worker có tối ưu hoá:

```python
if float(action["value"]) != last_val:
    device_manager.set_device_value(...)
```

Nếu `CTRL_ID` đã có giá trị `1.0` từ test trước, rule sẽ không kích hoạt.  
**Giải pháp:** Fixture `device_calls` ghi `CTRL_ID=0.0` trước mỗi test.
`SENSOR_ID` **không** bị reset vì sẽ gây xung đột timestamp `DATETIME(1s)` với giá trị hot được inject ngay sau đó.

### 3. Mẻ bị rò rỉ giữa các test

**Vấn đề:** Test thất bại trước khi gọi `_end()` → mẻ vẫn active → test tiếp theo nhận 409.  
**Giải pháp:** Fixture `_auto_end_batch` (autouse=True) force-end tất cả mẻ còn sót của dryer test sau mỗi test.

### 4. FK `system_logs → dryers` ngăn xoá dryer trong teardown

**Vấn đề:** `system_logs.dryer_id` có FK constraint → không thể xoá dryer.  
**Giải pháp:** Xoá `system_logs WHERE dryer_id = %s` trước khi xoá dryer.

### 5. Dữ liệu test còn sót từ run trước bị lỗi

**Vấn đề:** Teardown thất bại (do FK) để lại orphaned data → run kế tiếp nhận `Duplicate entry`.  
**Giải pháp:** Hàm `_preclean()` chạy đầu tiên trong `_db_test_data` để dọn sạch idempotent.

### 6. Toggle rule worker cần thêm thời gian

**Vấn đề:** Sau khi tắt/bật rule, cần chờ: worker cũ thoát (1×POLL) + worker mới poll lần đầu (1×POLL).  
**Giải pháp:** Timeout = `POLL*3 + MARGIN*2` ≈ 12 s.
