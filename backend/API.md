# API Reference — test_main.py

Base URL: `http://localhost:8001`

> **Authentication**: Tất cả endpoint (trừ `/api/auth/login`) yêu cầu header `Authorization: Bearer <token>`.  
> Token nhận được từ `/api/auth/login`, có hiệu lực 24h (mặc định, cấu hình qua `JWT_EXPIRE_MINUTES`).

---

## Auth

### POST `/api/auth/login`

Đăng nhập và nhận JWT Bearer token.

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `{ "email": str *, "password": str * }`                                                                                |
| **Output 200**  | `{ "access_token": str, "token_type": "bearer", "user": { "id": int, "full_name": str, "email": str, "role": str } }`  |
| **Output 401**  | `{ "detail": "Email hoặc mật khẩu không đúng" }` — Luôn trả về thông báo này dù sai email hay sai mật khẩu (OWASP A07) |

---

## Users (cần auth)

### GET `/api/users/me`

Lấy thông tin tài khoản của người dùng hiện tại (từ token).

|                |                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Output 200** | `{ "id": int, "full_name": str, "email": str, "phone": str, "role": str, "status": str }` |

---

### PUT `/api/users/me`

Cập nhật thông tin hồ sơ cá nhân.

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `{ "full_name": str, "email": str, "phone": str, "current_password": str, "new_password": str }` (tất cả đều tùy chọn) |
| **Output 200**  | `{ "id": int, "full_name": str, "email": str, "phone": str }`                                                          |
| **Output 400**  | `{ "detail": "Mật khẩu hiện tại không đúng" }` — khi `new_password` được cung cấp nhưng `current_password` sai         |

---

## Sensor Feed

### GET `/api/device/{feed_id}`

Lấy giá trị mới nhất của một feed từ `sensor_logs`.

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Path param** | `feed_id: str` — tên feed (vd: `sensor`)                    |
| **Output 200** | `{ "feed_id": str, "value": float, "timestamp": datetime }` |
| **Output 404** | `{ "detail": "No data for feed <feed_id>" }`                |

---

### POST `/api/device/{feed_id}`

Gửi giá trị lên Adafruit IO và ghi vào `sensor_logs`.

|                 |                                                             |
| --------------- | ----------------------------------------------------------- |
| **Path param**  | `feed_id: str`                                              |
| **Body (JSON)** | `{ "value": float }`                                        |
| **Output 200**  | `{ "feed_id": str, "value": float, "timestamp": datetime }` |

---

### GET `/api/device/{feed_id}/logs`

Lấy tối đa 10 bản ghi gần nhất của device từ `sensor_logs` (mới nhất trước).

|                        |                                                                 |
| ---------------------- | --------------------------------------------------------------- |
| **Path param**         | `feed_id: str`                                                  |
| **Output 200**         | `[ { "feed_id": str, "value": float, "timestamp": datetime } ]` |
| **Output 200 (empty)** | `[]` (nếu chưa có dữ liệu)                                      |

---

## Areas

### GET `/api/areas`

Lấy danh sách tất cả khu vực.

|                |                                                                         |
| -------------- | ----------------------------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "description": str, "manager_id": int } ]` |

---

### POST `/api/areas`

Tạo khu vực mới.

|                 |                                                                     |
| --------------- | ------------------------------------------------------------------- |
| **Body (JSON)** | `{ "name": str *, "description": str, "manager_id": int }`          |
| **Output 201**  | `{ "id": int, "name": str, "description": str, "manager_id": int }` |

> `*` bắt buộc

---

### PUT `/api/areas/{area_id}`

Cập nhật thông tin khu vực (partial update).

|                 |                                                                       |
| --------------- | --------------------------------------------------------------------- |
| **Path param**  | `area_id: int`                                                        |
| **Body (JSON)** | Bất kỳ fields nào: `name`, `description`, `manager_id` (đều tùy chọn) |
| **Output 200**  | Row area sau khi cập nhật                                             |
| **Output 404**  | `{ "detail": "Area not found" }`                                      |

---

### DELETE `/api/areas/{area_id}`

Xoá khu vực.

|                |                                                           |
| -------------- | --------------------------------------------------------- |
| **Path param** | `area_id: int`                                            |
| **Output 204** | No content                                                |
| **Output 404** | `{ "detail": "Area not found" }`                          |
| **Output 400** | `{ "detail": "Cannot delete area with existing dryers" }` |

---

## Device Types

### GET `/api/device-types`

Lấy danh sách tất cả loại thiết bị.

|                |                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "description": str, "unit": str, "max_value": float, "min_value": float, "category": str } ]` |

---

### POST `/api/device-types`

Tạo loại thiết bị mới.

|                 |                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `{ "name": str *, "description": str, "unit": str, "max_value": float, "min_value": float, "category": str }` (default `category = "sensor"`) |
| **Output 201**  | `{ "id": int, ...body }`                                                                                                                      |

---

### PUT `/api/device-types/{type_id}`

Cập nhật loại thiết bị (partial update).

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Path param**  | `type_id: int`                                   |
| **Body (JSON)** | Bất kỳ fields nào trong body POST (đều tùy chọn) |
| **Output 200**  | Row device_type sau khi cập nhật                 |
| **Output 404**  | `{ "detail": "Device type not found" }`          |

---

### DELETE `/api/device-types/{type_id}`

Xoá loại thiết bị.

|                |                                                            |
| -------------- | ---------------------------------------------------------- |
| **Path param** | `type_id: int`                                             |
| **Output 204** | No content                                                 |
| **Output 404** | `{ "detail": "Device type not found" }`                    |
| **Output 400** | `{ "detail": "Cannot delete type with existing devices" }` |

---

## Dryers

### GET `/api/dryers`

Lấy danh sách tất cả máy sấy kèm danh sách thiết bị bên trong.

|                |                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "area_id": int, "capacity": float, "manager_id": int, "status": str, "devices": [ {...} ] } ]` |

---

### GET `/api/dryers/{dryer_id}`

Lấy thông tin một máy sấy kèm danh sách thiết bị bên trong.

|                |                                                         |
| -------------- | ------------------------------------------------------- |
| **Path param** | `dryer_id: int`                                         |
| **Output 200** | `{ "id": int, "name": str, ..., "devices": [ {...} ] }` |
| **Output 404** | `{ "detail": "Dryer not found" }`                       |

---

### POST `/api/dryers`

Tạo máy sấy mới.

|                 |                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `{ "name": str *, "area_id": int *, "capacity": float, "manager_id": int, "status": str }` (default `status = "off"`) |
| **Output 201**  | `{ "id": int, ...body }`                                                                                              |
| **Output 404**  | `{ "detail": "Area not found" }`                                                                                      |

---

### PUT `/api/dryers/{dryer_id}`

Cập nhật thông tin máy sấy (partial update).

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Path param**  | `dryer_id: int`                                  |
| **Body (JSON)** | Bất kỳ fields nào trong body POST (đều tùy chọn) |
| **Output 200**  | Row dryer sau khi cập nhật                       |
| **Output 404**  | `{ "detail": "Dryer not found" }`                |

---

### DELETE `/api/dryers/{dryer_id}`

Xoá máy sấy và toàn bộ thiết bị thuộc nó.

|                |                                   |
| -------------- | --------------------------------- |
| **Path param** | `dryer_id: int`                   |
| **Output 204** | No content                        |
| **Output 404** | `{ "detail": "Dryer not found" }` |

---

## Devices (dưới Dryer)

### GET `/api/dryers/{dryer_id}/devices`

Lấy danh sách thiết bị trong một máy sấy.

|                |                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| **Path param** | `dryer_id: int`                                                                                             |
| **Output 200** | `[ { "id": str, "name": str, "type_id": int, "power_status": str, "install_date": str, "dryer_id": int } ]` |

---

### POST `/api/dryers/{dryer_id}/devices`

Thêm thiết bị vào máy sấy.

|                 |                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Path param**  | `dryer_id: int`                                                                                                                   |
| **Body (JSON)** | `{ "id": str *, "name": str *, "type_id": int, "power_status": str }`                                                             |
| **Output 201**  | `{ "dryer_id": int, "install_date": str (tự động = ngày hiện tại), "id": str, "name": str, "type_id": int, "power_status": str }` |
| **Output 404**  | `{ "detail": "Dryer not found" }`                                                                                                 |
| **Output 409**  | `{ "detail": "Device ID da ton tai" }`                                                                                            |

---

### PUT `/api/dryers/{dryer_id}/devices/{device_id}`

Cập nhật thông tin thiết bị (partial update).

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Path params** | `dryer_id: int`, `device_id: str`                |
| **Body (JSON)** | Bất kỳ fields nào trong body POST (đều tùy chọn) |
| **Output 200**  | Row device sau khi cập nhật                      |
| **Output 404**  | `{ "detail": "Device not found" }`               |

---

### DELETE `/api/dryers/{dryer_id}/devices/{device_id}`

Xoá thiết bị khỏi máy sấy.

|                 |                                    |
| --------------- | ---------------------------------- |
| **Path params** | `dryer_id: int`, `device_id: str`  |
| **Output 204**  | No content                         |
| **Output 404**  | `{ "detail": "Device not found" }` |

---

## Crops

### GET `/api/crops`

Lấy danh sách tất cả nông sản.

|                |                                                      |
| -------------- | ---------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "description": str } ]` |

---

### GET `/api/crops/{crop_id}`

|                |                                                  |
| -------------- | ------------------------------------------------ |
| **Path param** | `crop_id: int`                                   |
| **Output 200** | `{ "id": int, "name": str, "description": str }` |
| **Output 404** | `{ "detail": "Crop not found" }`                 |

---

### POST `/api/crops`

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Body (JSON)** | `{ "name": str *, "description": str }`          |
| **Output 201**  | `{ "id": int, "name": str, "description": str }` |

---

### PUT `/api/crops/{crop_id}`

|                 |                                          |
| --------------- | ---------------------------------------- |
| **Path param**  | `crop_id: int`                           |
| **Body (JSON)** | Bất kỳ fields nào: `name`, `description` |
| **Output 200**  | Row crop sau khi cập nhật                |
| **Output 404**  | `{ "detail": "Crop not found" }`         |

---

### DELETE `/api/crops/{crop_id}`

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **Path param** | `crop_id: int`                                                         |
| **Output 204** | No content                                                             |
| **Output 404** | `{ "detail": "Crop not found" }`                                       |
| **Output 409** | `{ "detail": "Crop đang được dùng bởi schedule/rule, không thể xoá" }` |

---

## Virtual Devices

### GET `/api/virtual-devices`

|                |                                  |
| -------------- | -------------------------------- |
| **Output 200** | `[ { "id": int, "name": str } ]` |

---

### GET `/api/virtual-devices/{vd_id}`

|                |                                            |
| -------------- | ------------------------------------------ |
| **Path param** | `vd_id: int`                               |
| **Output 200** | `{ "id": int, "name": str }`               |
| **Output 404** | `{ "detail": "Virtual device not found" }` |

---

### POST `/api/virtual-devices`

|                 |                              |
| --------------- | ---------------------------- |
| **Body (JSON)** | `{ "name": str * }`          |
| **Output 201**  | `{ "id": int, "name": str }` |

---

### PUT `/api/virtual-devices/{vd_id}`

|                 |                                            |
| --------------- | ------------------------------------------ |
| **Path param**  | `vd_id: int`                               |
| **Body (JSON)** | `{ "name": str }`                          |
| **Output 200**  | Row virtual_device sau khi cập nhật        |
| **Output 404**  | `{ "detail": "Virtual device not found" }` |

---

### DELETE `/api/virtual-devices/{vd_id}`

|                |                                            |
| -------------- | ------------------------------------------ |
| **Path param** | `vd_id: int`                               |
| **Output 204** | No content                                 |
| **Output 404** | `{ "detail": "Virtual device not found" }` |

---

## Schedules

### GET `/api/schedules`

Lấy danh sách schedule, mỗi item kèm `virtual_devices[]` và `stage_count`.

|                |                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "crop_id": int, "virtual_devices": [...], "stage_count": int } ]` |

---

### GET `/api/schedules/{schedule_id}`

Lấy đầy đủ thông tin schedule kèm `virtual_devices[]` và `stages[]` (mỗi stage có `actions[]`).

|                |                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| **Path param** | `schedule_id: int`                                                                                              |
| **Output 200** | `{ "id": int, "name": str, "crop_id": int, "virtual_devices": [...], "stages": [ { ..., "actions": [...] } ] }` |
| **Output 404** | `{ "detail": "Schedule not found" }`                                                                            |

---

### POST `/api/schedules`

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Body (JSON)** | `{ "name": str *, "crop_id": int *, "virtual_device_ids": [int] }` |
| **Output 201**  | Đối tượng schedule đầy đủ (như GET detail)                         |
| **Output 404**  | `{ "detail": "Crop not found" }`                                   |

---

### PUT `/api/schedules/{schedule_id}`

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Path param**  | `schedule_id: int`                               |
| **Body (JSON)** | `{ "name": str, "crop_id": int }` (đều tùy chọn) |
| **Output 200**  | Đối tượng schedule đầy đủ sau khi cập nhật       |
| **Output 404**  | `{ "detail": "Schedule not found" }`             |

---

### DELETE `/api/schedules/{schedule_id}`

Xoá cascade: schedule_actions → stages → schedule_virtual_devices → schedule.

|                |                                      |
| -------------- | ------------------------------------ |
| **Path param** | `schedule_id: int`                   |
| **Output 204** | No content                           |
| **Output 404** | `{ "detail": "Schedule not found" }` |

---

### GET `/api/schedules/{schedule_id}/virtual-devices`

|                |                                  |
| -------------- | -------------------------------- |
| **Path param** | `schedule_id: int`               |
| **Output 200** | `[ { "id": int, "name": str } ]` |

---

### POST `/api/schedules/{schedule_id}/virtual-devices/{vd_id}`

Gắn virtual device vào schedule.

|                 |                                                               |
| --------------- | ------------------------------------------------------------- |
| **Path params** | `schedule_id: int`, `vd_id: int`                              |
| **Output 201**  | `{ "schedule_id": int, "virtual_device_id": int }`            |
| **Output 404**  | Schedule hoặc virtual device không tồn tại                    |
| **Output 409**  | `{ "detail": "Virtual device đã được gắn vào schedule này" }` |

---

### DELETE `/api/schedules/{schedule_id}/virtual-devices/{vd_id}`

|                 |                                          |
| --------------- | ---------------------------------------- |
| **Path params** | `schedule_id: int`, `vd_id: int`         |
| **Output 204**  | No content                               |
| **Output 404**  | `{ "detail": "Liên kết không tồn tại" }` |

---

## Stages

### GET `/api/schedules/{schedule_id}/stages`

|                |                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------- |
| **Path param** | `schedule_id: int`                                                                          |
| **Output 200** | `[ { "id": int, "name": str, "start_offset": int, "schedule_id": int, "actions": [...] } ]` |

---

### GET `/api/stages/{stage_id}`

|                |                                                                     |
| -------------- | ------------------------------------------------------------------- |
| **Path param** | `stage_id: int`                                                     |
| **Output 200** | `{ "id": int, "name": str, "start_offset": int, "actions": [...] }` |
| **Output 404** | `{ "detail": "Stage not found" }`                                   |

---

### POST `/api/schedules/{schedule_id}/stages`

|                 |                                                      |
| --------------- | ---------------------------------------------------- |
| **Path param**  | `schedule_id: int`                                   |
| **Body (JSON)** | `{ "name": str *, "start_offset": int }` (default 0) |
| **Output 201**  | Stage vừa tạo kèm `actions: []`                      |
| **Output 404**  | `{ "detail": "Schedule not found" }`                 |

---

### PUT `/api/stages/{stage_id}`

|                 |                                                       |
| --------------- | ----------------------------------------------------- |
| **Path param**  | `stage_id: int`                                       |
| **Body (JSON)** | `{ "name": str, "start_offset": int }` (đều tùy chọn) |
| **Output 200**  | Stage sau khi cập nhật kèm actions                    |
| **Output 404**  | `{ "detail": "Stage not found" }`                     |

---

### DELETE `/api/stages/{stage_id}`

Xoá cascade: schedule_actions → stage.

|                |                                   |
| -------------- | --------------------------------- |
| **Path param** | `stage_id: int`                   |
| **Output 204** | No content                        |
| **Output 404** | `{ "detail": "Stage not found" }` |

---

## Schedule Actions

### GET `/api/stages/{stage_id}/actions`

|                |                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Path param** | `stage_id: int`                                                                                            |
| **Output 200** | `[ { "id": int, "stage_id": int, "virtual_device_id": int, "value": float, "virtual_device_name": str } ]` |

---

### POST `/api/stages/{stage_id}/actions`

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Path param**  | `stage_id: int`                                    |
| **Body (JSON)** | `{ "virtual_device_id": int *, "value": float * }` |
| **Output 201**  | Action vừa tạo kèm `virtual_device_name`           |
| **Output 404**  | Stage hoặc virtual device không tồn tại            |

---

### PUT `/api/schedule-actions/{action_id}`

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Path param**  | `action_id: int`                                          |
| **Body (JSON)** | `{ "virtual_device_id": int, "value": float }` (tùy chọn) |
| **Output 200**  | Action sau khi cập nhật                                   |
| **Output 404**  | `{ "detail": "Schedule action not found" }`               |

---

### DELETE `/api/schedule-actions/{action_id}`

|                |                                             |
| -------------- | ------------------------------------------- |
| **Path param** | `action_id: int`                            |
| **Output 204** | No content                                  |
| **Output 404** | `{ "detail": "Schedule action not found" }` |

---

## Rules

### GET `/api/rules`

Lấy danh sách rule, mỗi item kèm `virtual_devices[]` và `value_pair_count`.

|                |                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Output 200** | `[ { "id": int, "name": str, "description": str, "crop_id": int, "virtual_devices": [...], "value_pair_count": int } ]` |

---

### GET `/api/rules/{rule_id}`

Lấy đầy đủ rule kèm `virtual_devices[]` và `value_pairs[]` (mỗi pair có `conditions[]` và `actions[]`).

|                |                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **Path param** | `rule_id: int`                                                                                               |
| **Output 200** | `{ ..., "virtual_devices": [...], "value_pairs": [ { "id": int, "conditions": [...], "actions": [...] } ] }` |
| **Output 404** | `{ "detail": "Rule not found" }`                                                                             |

---

### POST `/api/rules`

|                 |                                                                                        |
| --------------- | -------------------------------------------------------------------------------------- |
| **Body (JSON)** | `{ "name": str *, "description": str, "crop_id": int *, "virtual_device_ids": [int] }` |
| **Output 201**  | Đối tượng rule đầy đủ                                                                  |
| **Output 404**  | `{ "detail": "Crop not found" }`                                                       |

---

### PUT `/api/rules/{rule_id}`

|                 |                                                                  |
| --------------- | ---------------------------------------------------------------- |
| **Path param**  | `rule_id: int`                                                   |
| **Body (JSON)** | `{ "name": str, "description": str, "crop_id": int }` (tùy chọn) |
| **Output 200**  | Rule đầy đủ sau khi cập nhật                                     |
| **Output 404**  | `{ "detail": "Rule not found" }`                                 |

---

### DELETE `/api/rules/{rule_id}`

Xoá cascade: conditions → rule_actions → value_pairs → rule_virtual_devices → rule.

|                |                                  |
| -------------- | -------------------------------- |
| **Path param** | `rule_id: int`                   |
| **Output 204** | No content                       |
| **Output 404** | `{ "detail": "Rule not found" }` |

---

### GET `/api/rules/{rule_id}/virtual-devices`

|                |                                  |
| -------------- | -------------------------------- |
| **Path param** | `rule_id: int`                   |
| **Output 200** | `[ { "id": int, "name": str } ]` |

---

### POST `/api/rules/{rule_id}/virtual-devices/{vd_id}`

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Path params** | `rule_id: int`, `vd_id: int`                              |
| **Output 201**  | `{ "rule_id": int, "virtual_device_id": int }`            |
| **Output 409**  | `{ "detail": "Virtual device đã được gắn vào rule này" }` |

---

### DELETE `/api/rules/{rule_id}/virtual-devices/{vd_id}`

|                 |                                          |
| --------------- | ---------------------------------------- |
| **Path params** | `rule_id: int`, `vd_id: int`             |
| **Output 204**  | No content                               |
| **Output 404**  | `{ "detail": "Liên kết không tồn tại" }` |

---

## Value Pairs

### GET `/api/rules/{rule_id}/value-pairs`

|                |                                                                            |
| -------------- | -------------------------------------------------------------------------- |
| **Path param** | `rule_id: int`                                                             |
| **Output 200** | `[ { "id": int, "rule_id": int, "conditions": [...], "actions": [...] } ]` |

---

### GET `/api/value-pairs/{pair_id}`

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **Path param** | `pair_id: int`                                                         |
| **Output 200** | `{ "id": int, "rule_id": int, "conditions": [...], "actions": [...] }` |
| **Output 404** | `{ "detail": "Value pair not found" }`                                 |

---

### POST `/api/rules/{rule_id}/value-pairs`

Tạo value pair rỗng (không có body).

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Path param** | `rule_id: int`                                                   |
| **Output 201** | `{ "id": int, "rule_id": int, "conditions": [], "actions": [] }` |
| **Output 404** | `{ "detail": "Rule not found" }`                                 |

---

### DELETE `/api/value-pairs/{pair_id}`

Xoá cascade: conditions → rule_actions → value_pair.

|                |                                        |
| -------------- | -------------------------------------- |
| **Path param** | `pair_id: int`                         |
| **Output 204** | No content                             |
| **Output 404** | `{ "detail": "Value pair not found" }` |

---

## Conditions

### GET `/api/value-pairs/{pair_id}/conditions`

|                |                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Path param** | `pair_id: int`                                                                                                                           |
| **Output 200** | `[ { "id": int, "value_pair_id": int, "operator": str, "compare_value": float, "virtual_device_id": int, "virtual_device_name": str } ]` |

---

### POST `/api/value-pairs/{pair_id}/conditions`

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Path param**  | `pair_id: int`                                                                |
| **Body (JSON)** | `{ "operator": str *, "compare_value": float *, "virtual_device_id": int * }` |
| **Output 201**  | Condition vừa tạo kèm `virtual_device_name`                                   |
| **Output 422**  | `{ "detail": "Operator không hợp lệ. Phải là một trong: {>, <, =, >=, <=}" }` |

---

### PUT `/api/conditions/{condition_id}`

|                 |                                                                                    |
| --------------- | ---------------------------------------------------------------------------------- |
| **Path param**  | `condition_id: int`                                                                |
| **Body (JSON)** | `{ "operator": str, "compare_value": float, "virtual_device_id": int }` (tùy chọn) |
| **Output 200**  | Condition sau khi cập nhật                                                         |
| **Output 404**  | `{ "detail": "Condition not found" }`                                              |

---

### DELETE `/api/conditions/{condition_id}`

|                |                                       |
| -------------- | ------------------------------------- |
| **Path param** | `condition_id: int`                   |
| **Output 204** | No content                            |
| **Output 404** | `{ "detail": "Condition not found" }` |

---

## Rule Actions

### GET `/api/value-pairs/{pair_id}/actions`

|                |                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| **Path param** | `pair_id: int`                                                                                                  |
| **Output 200** | `[ { "id": int, "value_pair_id": int, "virtual_device_id": int, "value": float, "virtual_device_name": str } ]` |

---

### POST `/api/value-pairs/{pair_id}/actions`

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Path param**  | `pair_id: int`                                     |
| **Body (JSON)** | `{ "virtual_device_id": int *, "value": float * }` |
| **Output 201**  | Rule action vừa tạo kèm `virtual_device_name`      |
| **Output 404**  | Value pair hoặc virtual device không tồn tại       |

---

### PUT `/api/rule-actions/{action_id}`

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Path param**  | `action_id: int`                                          |
| **Body (JSON)** | `{ "virtual_device_id": int, "value": float }` (tùy chọn) |
| **Output 200**  | Rule action sau khi cập nhật                              |
| **Output 404**  | `{ "detail": "Rule action not found" }`                   |

---

### DELETE `/api/rule-actions/{action_id}`

|                |                                         |
| -------------- | --------------------------------------- |
| **Path param** | `action_id: int`                        |
| **Output 204** | No content                              |
| **Output 404** | `{ "detail": "Rule action not found" }` |

---

## Batches

### POST `/api/batches/manual`

Khởi tạo và chạy mẻ sấy thủ công. Mẻ chạy trong thread nền, trả về ngay lập tức.

|                 |                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Body (JSON)** | `{ "dryer_id": int *, "crop_id": int?, "input_weight": float?, "runtime": int * }`                                       |
| **Output 201**  | `{ "id": int, "dryer_id": int, "crop_id": int\|null, "input_weight": float\|null, "runtime": int, "status": "running" }` |
| **Output 404**  | `{ "detail": "Dryer not found" }`                                                                                        |
| **Output 409**  | `{ "detail": "Dryer đang có mẻ chạy" }`                                                                                  |

> `*` bắt buộc. `runtime` tính bằng giây.

---

### POST `/api/batches/rule`

Khởi tạo mẻ sấy theo rule (ngưỡng cảm biến). Backend tự động map virtual device → thiết bị thực và poll rule mỗi 5 giây.

|                 |                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `BatchStartManual + { "rule_id": int *, "mappings": [ { "rule_virtual_device_id": int, "device_id": str } ] * }`                         |
| **Output 201**  | `{ "id": int, "dryer_id": int, "crop_id": int\|null, "rule_id": int, "input_weight": float\|null, "runtime": int, "status": "running" }` |
| **Output 404**  | Dryer hoặc rule không tồn tại                                                                                                            |
| **Output 409**  | `{ "detail": "Dryer đang có mẻ chạy" }`                                                                                                  |

---

### POST `/api/batches/schedule`

Khởi tạo mẻ sấy theo lịch (schedule). Backend lần lượt chạy các stage theo `start_offset`.

|                 |                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Body (JSON)** | `BatchStartManual + { "schedule_id": int *, "mappings": [ { "schedule_virtual_device_id": int, "device_id": str } ] * }`                     |
| **Output 201**  | `{ "id": int, "dryer_id": int, "crop_id": int\|null, "schedule_id": int, "input_weight": float\|null, "runtime": int, "status": "running" }` |
| **Output 404**  | Dryer hoặc schedule không tồn tại                                                                                                            |
| **Output 409**  | `{ "detail": "Dryer đang có mẻ chạy" }`                                                                                                      |

---

### PUT `/api/batches/{batch_id}/end`

Kết thúc mẻ sấy đang chạy: cập nhật DB, dừng thread nền, tắt tất cả controller về 0.

|                 |                                                  |
| --------------- | ------------------------------------------------ |
| **Path param**  | `batch_id: int`                                  |
| **Body (JSON)** | `{ "output_weight": float?, "rating": int? }`    |
| **Output 200**  | `{ "id": int, "status": "ended" }`               |
| **Output 404**  | `{ "detail": "Batch not found or not running" }` |

---

## Logs (cần auth)

Mỗi bản ghi log trả về có cấu trúc:

```json
{
  "id": int,
  "timestamp": "2026-01-01T08:00:00",
  "event_type": str,
  "severity": "info" | "warning" | "error",
  "user": str,
  "user_id": int | null,
  "dryer_id": int | null,
  "description": str
}
```

### GET `/api/logs`

Lấy toàn bộ system_logs (mới nhất trước).

|                |                  |
| -------------- | ---------------- |
| **Output 200** | `[ { ...log } ]` |

---

### GET `/api/logs/dryer/{dryer_id}`

Lấy system_logs của một máy sấy cụ thể (mới nhất trước).

|                |                  |
| -------------- | ---------------- |
| **Path param** | `dryer_id: int`  |
| **Output 200** | `[ { ...log } ]` |
