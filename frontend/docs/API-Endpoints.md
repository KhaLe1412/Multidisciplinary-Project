# API Endpoints — Hệ thống Quản lý Máy sấy

> **Base URL:** `https://<host>/api/v1`  
> **Authentication:** Bearer Token (JWT) trong header `Authorization: Bearer <token>`  
> **Content-Type:** `application/json`  
> **Múi giờ:** Tất cả trường thời gian dùng định dạng ISO 8601 UTC (`2025-06-01T08:30:00.000Z`)

---

## Mục lục

1. [Xác thực (Auth)](#1-xác-thực-auth)
2. [Máy sấy (Dryers)](#2-máy-sấy-dryers)
3. [Mẻ sấy (Batches)](#3-mẻ-sấy-batches)
4. [Hồ sơ mẻ sấy (Batch Records)](#4-hồ-sơ-mẻ-sấy-batch-records)
5. [Thiết bị trong máy (Devices)](#5-thiết-bị-trong-máy-devices)
6. [Loại thiết bị (Device Types)](#6-loại-thiết-bị-device-types)
7. [Khu vực (Areas)](#7-khu-vực-areas)
8. [Nông sản (Fruits)](#8-nông-sản-fruits)
9. [Lịch trình (Schedules)](#9-lịch-trình-schedules)
10. [Quy tắc cảnh báo (Alert Rules)](#10-quy-tắc-cảnh-báo-alert-rules)
11. [Cảnh báo hệ thống (System Alerts)](#11-cảnh-báo-hệ-thống-system-alerts)
12. [Nhật ký hệ thống (System Logs)](#12-nhật-ký-hệ-thống-system-logs)
13. [Người dùng (Users)](#13-người-dùng-users)
14. [Hồ sơ cá nhân (Profile)](#14-hồ-sơ-cá-nhân-profile)
15. [Thông báo (Notifications)](#15-thông-báo-notifications)
16. [Thống kê (Statistics)](#16-thống-kê-statistics)

---

## Quy ước chung

### Cấu trúc response thành công

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 50, "page": 1, "limit": 20 }
}
```

### Cấu trúc response lỗi

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy máy sấy"
  }
}
```

### Mã lỗi HTTP hay dùng

| Mã    | Ý nghĩa                      |
| ----- | ---------------------------- |
| `200` | Thành công                   |
| `201` | Tạo mới thành công           |
| `400` | Dữ liệu đầu vào không hợp lệ |
| `401` | Chưa xác thực                |
| `403` | Không có quyền               |
| `404` | Không tìm thấy               |
| `409` | Xung đột dữ liệu             |
| `500` | Lỗi server                   |

---

## 1. Xác thực (Auth)

### 1.1 Đăng nhập

`POST /auth/login`

Xác thực tài khoản và trả về JWT token.

**Input (body):**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Output (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "USR-001",
      "name": "Nguyễn Văn An",
      "email": "admin@example.com",
      "role": "admin",
      "avatar": "A",
      "permissions": {
        "control": true,
        "controlDryers": "all",
        "devices": true,
        "deviceDryers": "all",
        "policy": true,
        "statistics": true,
        "logs": true
      }
    }
  }
}
```

**Lỗi:**

- `401` — Email hoặc mật khẩu sai
- `403` — Tài khoản bị vô hiệu hóa

---

### 1.2 Đăng xuất

`POST /auth/logout`

Vô hiệu hóa token hiện tại trên server.

**Input:** _(không có body)_

**Output (200):**

```json
{ "success": true }
```

---

### 1.3 Lấy thông tin người dùng hiện tại

`GET /auth/me`

**Output (200):** Trả về object `user` như trong đăng nhập.

---

## 2. Máy sấy (Dryers)

### 2.1 Danh sách máy sấy

`GET /dryers`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `areaId` | string | Lọc theo khu vực |
| `status` | `inactive` \| `on` \| `active` | Lọc theo trạng thái |
| `search` | string | Tìm kiếm theo tên hoặc ID |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "DRY-001",
      "name": "Máy sấy A1",
      "status": "active",
      "areaId": "AREA-001",
      "operator": "Nguyễn Văn An",
      "mode": "manual",
      "capacity": 200,
      "createdAt": "2025-01-15T00:00:00.000Z",
      "activeBatch": {
        "fruitId": "FRT-001",
        "inputWeight": 150,
        "runSeconds": 14400,
        "startedAt": "2025-06-01T06:00:00.000Z",
        "mode": "manual"
      },
      "devices": [
        {
          "id": "DRY001-TMP",
          "name": "Cảm biến nhiệt độ",
          "deviceTypeId": "DT-TEMP",
          "status": true,
          "value": 65
        }
      ]
    }
  ]
}
```

---

### 2.2 Tạo máy sấy mới

`POST /dryers` _(Yêu cầu quyền: `admin`)_

**Input (body):**

```json
{
  "name": "Máy sấy B3",
  "areaId": "AREA-002",
  "capacity": 300,
  "operator": "Trần Thị Bình"
}
```

**Output (201):** Trả về object máy sấy vừa tạo với `status: "inactive"`, `mode: "manual"`, `devices: []`.

---

### 2.3 Chi tiết máy sấy

`GET /dryers/:id`

**Output (200):** Trả về object máy sấy đầy đủ, bao gồm `devices`, `activeBatch`, `dryerLogs`.

**Lỗi:** `404` — Không tìm thấy máy sấy.

---

### 2.4 Cập nhật thông tin máy sấy

`PUT /dryers/:id` _(Yêu cầu quyền: `admin`)_

**Input (body):** _(chỉ truyền các trường cần cập nhật)_

```json
{
  "name": "Máy sấy A1 (nâng cấp)",
  "areaId": "AREA-003",
  "capacity": 250,
  "operator": "Lê Văn Cường"
}
```

**Output (200):** Trả về object máy sấy sau khi cập nhật.

---

### 2.5 Xóa máy sấy

`DELETE /dryers/:id` _(Yêu cầu quyền: `admin`)_

**Điều kiện:** Chỉ xóa được khi `status !== "active"`.

**Output (200):**

```json
{ "success": true }
```

**Lỗi:** `409` — Máy đang hoạt động, không thể xóa.

---

### 2.6 Bật / Tắt máy sấy

`PATCH /dryers/:id/power`

**Input (body):**

```json
{ "status": "on" }
```

> Giá trị hợp lệ: `"on"` (bật) hoặc `"inactive"` (tắt). Không thể tắt khi đang `active` (có mẻ đang chạy).

**Output (200):** Trả về `{ "id": "DRY-001", "status": "on" }`.

**Lỗi:** `409` — Máy đang có mẻ sấy, cần kết thúc mẻ trước.

---

### 2.7 Đổi chế độ hoạt động

`PATCH /dryers/:id/mode`

**Input (body):**

```json
{ "mode": "threshold" }
```

> Giá trị hợp lệ: `"manual"`, `"threshold"`, `"schedule"`. Không thể đổi khi đang `active`.

**Output (200):** Trả về `{ "id": "DRY-001", "mode": "threshold" }`.

---

### 2.8 Nhật ký hoạt động của máy sấy

`GET /dryers/:id/logs`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `from` | ISO date | Từ ngày |
| `to` | ISO date | Đến ngày |
| `limit` | number | Số bản ghi (mặc định 50) |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "time": "2025-06-01T07:30:00.000Z",
      "user": "Nguyễn Văn An",
      "description": "Bắt đầu mẻ sấy (Thủ công) — Xoài, 150kg"
    }
  ]
}
```

---

## 3. Mẻ sấy (Batches)

### 3.1 Bắt đầu mẻ sấy — Chế độ thủ công

`POST /dryers/:id/batches/start`

**Yêu cầu:** `dryer.status === "on"`, `dryer.mode === "manual"`.

**Input (body):**

```json
{
  "mode": "manual",
  "fruitId": "FRT-001",
  "inputWeight": 150,
  "runMinutes": 240
}
```

**Output (201):**

```json
{
  "success": true,
  "data": {
    "dryerId": "DRY-001",
    "activeBatch": {
      "fruitId": "FRT-001",
      "inputWeight": 150,
      "runSeconds": 14400,
      "startedAt": "2025-06-01T06:00:00.000Z",
      "mode": "manual"
    }
  }
}
```

---

### 3.2 Bắt đầu mẻ sấy — Chế độ theo ngưỡng

`POST /dryers/:id/batches/start`

**Yêu cầu:** `dryer.mode === "threshold"`.

**Input (body):**

```json
{
  "mode": "threshold",
  "fruitId": "FRT-001",
  "inputWeight": 150,
  "runMinutes": 240,
  "alertRuleId": "ALR-001",
  "deviceBindings": [
    { "objectId": "OBJ-1", "deviceId": "DRY001-TMP" },
    { "objectId": "OBJ-2", "deviceId": "DRY001-FAN" }
  ]
}
```

**Output (201):** Tương tự 3.1, kèm thêm `alertRuleId` và `deviceBindings` trong `activeBatch`.

---

### 3.3 Bắt đầu mẻ sấy — Chế độ theo lịch

`POST /dryers/:id/batches/start`

**Yêu cầu:** `dryer.mode === "schedule"`.

**Input (body):**

```json
{
  "mode": "schedule",
  "fruitId": "FRT-001",
  "inputWeight": 150,
  "scheduleId": "SCH-001",
  "scheduleStartTime": "2025-06-01T06:00:00.000Z",
  "deviceBindings": [{ "objectId": "OBJ-1", "deviceId": "DRY001-HTR" }]
}
```

**Output (201):** Tương tự, kèm `scheduleId`, `scheduleStartTime`, `deviceBindings`.

---

### 3.4 Kết thúc mẻ sấy

`POST /dryers/:id/batches/stop`

**Yêu cầu:** `dryer.status === "active"`.

**Input (body):**

```json
{
  "outputWeight": 120,
  "rating": 4
}
```

> `rating`: 1–5 sao. `outputWeight`: khối lượng sản phẩm sau sấy (kg).

**Hành vi server:**

- Tạo một `BatchRecord` hoàn chỉnh tự động.
- Xóa `activeBatch` khỏi dryer, chuyển `status` về `"on"`.
- Tính `totalMinutes` và `energyKwh` từ thời gian thực tế.

**Output (200):**

```json
{
  "success": true,
  "data": {
    "batchRecordId": "BR-1717228800000",
    "dryer": { "id": "DRY-001", "status": "on", "activeBatch": null }
  }
}
```

---

## 4. Hồ sơ mẻ sấy (Batch Records)

### 4.1 Danh sách hồ sơ mẻ sấy

`GET /batch-records`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `dryerId` | string | Lọc theo máy sấy |
| `fruitId` | string | Lọc theo nông sản |
| `from` | ISO date | Từ ngày bắt đầu |
| `to` | ISO date | Đến ngày bắt đầu |
| `completed` | boolean | Chỉ lấy mẻ đã hoàn thành |
| `page` | number | Trang (mặc định 1) |
| `limit` | number | Số bản ghi mỗi trang (mặc định 20) |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "BR-001",
      "dryerId": "DRY-001",
      "dryerName": "Máy sấy A1",
      "scheduleId": "SCH-001",
      "scheduleName": "Lịch sấy xoài chuẩn",
      "fruitId": "FRT-001",
      "fruitName": "Xoài",
      "inputWeight": 150,
      "outputWeight": 120,
      "rating": 4,
      "startTime": "2025-06-01T06:00:00.000Z",
      "endTime": "2025-06-01T10:00:00.000Z",
      "totalMinutes": 240,
      "energyKwh": 1.5,
      "completed": true
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20 }
}
```

---

### 4.2 Chi tiết hồ sơ mẻ sấy

`GET /batch-records/:id`

**Output (200):** Trả về object `BatchRecord` đầy đủ.

---

## 5. Thiết bị trong máy (Devices)

### 5.1 Danh sách thiết bị của máy

`GET /dryers/:id/devices`

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "DRY001-TMP",
      "name": "Cảm biến nhiệt độ 1",
      "deviceTypeId": "DT-TEMP",
      "status": true,
      "value": 65,
      "installDate": "2025-01-10",
      "power": 2
    },
    {
      "id": "DRY001-FAN",
      "name": "Quạt gió 1",
      "deviceTypeId": "DT-FAN",
      "status": true,
      "speed": 75,
      "installDate": "2025-01-15",
      "power": 150
    }
  ]
}
```

---

### 5.2 Thêm thiết bị vào máy

`POST /dryers/:id/devices` _(Quyền: `devices` + `deviceDryers` bao gồm dryer này)_

**Input (body):**

```json
{
  "name": "Cảm biến nhiệt độ 2",
  "deviceTypeId": "DT-TEMP",
  "installDate": "2025-06-01",
  "power": 2
}
```

**Output (201):** Trả về object `Device` vừa tạo với `id` tự sinh và `status: false`.

---

### 5.3 Cập nhật thiết bị

`PUT /dryers/:id/devices/:deviceId` _(Quyền: `devices`)_

**Input (body):** _(chỉ truyền trường cần đổi)_

```json
{
  "name": "Cảm biến nhiệt độ chính",
  "deviceTypeId": "DT-TEMP",
  "power": 3
}
```

**Output (200):** Trả về object `Device` sau khi cập nhật.

---

### 5.4 Xóa thiết bị

`DELETE /dryers/:id/devices/:deviceId` _(Quyền: `devices`)_

**Điều kiện:** Không thể xóa khi máy đang `active` và thiết bị tham gia `activeBindings`.

**Output (200):** `{ "success": true }`

---

### 5.5 Điều khiển thiết bị (chế độ thủ công)

`PATCH /dryers/:id/devices/:deviceId/control`

**Yêu cầu:** `dryer.mode === "manual"` và người dùng có quyền điều khiển máy này.

**Input (body):** _(truyền các trường muốn thay đổi)_

```json
{
  "status": true,
  "speed": 80
}
```

> Các trường hợp lệ tùy loại thiết bị:
>
> - Cảm biến (DT-TEMP, DT-HUM): chỉ `status`
> - Quạt (DT-FAN): `status`, `speed` (0–100)
> - Cửa (DT-DOOR): `status`, `open` (boolean)
> - Màn hình LCD (DT-LCD): `status`, `message` (string)
> - Máy gia nhiệt (DT-HEATER): `status`, `temperature` (20–100°C)

**Output (200):** Trả về object `Device` sau khi điều khiển.

---

## 6. Loại thiết bị (Device Types)

### 6.1 Danh sách loại thiết bị

`GET /device-types`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `category` | `sensor` \| `actuator` | Lọc theo loại |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "DT-TEMP",
      "name": "Cảm biến nhiệt độ",
      "description": "Đo nhiệt độ môi trường trong buồng sấy",
      "unit": "°C",
      "valueRange": { "min": 0, "max": 120 },
      "category": "sensor",
      "createdAt": "2025-01-10T00:00:00.000Z"
    }
  ]
}
```

---

### 6.2 Tạo loại thiết bị

`POST /device-types` _(Quyền: `admin`)_

**Input (body):**

```json
{
  "name": "Cảm biến CO2",
  "description": "Đo nồng độ CO2 trong buồng sấy",
  "unit": "ppm",
  "valueRange": { "min": 0, "max": 5000 },
  "category": "sensor"
}
```

**Output (201):** Trả về object `DeviceTypeModel` vừa tạo.

---

### 6.3 Cập nhật loại thiết bị

`PUT /device-types/:id` _(Quyền: `admin`)_

**Input (body):** _(trường muốn cập nhật)_

**Output (200):** Trả về object sau cập nhật.

---

### 6.4 Xóa loại thiết bị

`DELETE /device-types/:id` _(Quyền: `admin`)_

**Điều kiện:** Không xóa được nếu còn thiết bị nào đang dùng loại này.

**Output (200):** `{ "success": true }`

---

## 7. Khu vực (Areas)

### 7.1 Danh sách khu vực

`GET /areas`

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "AREA-001",
      "name": "Khu A",
      "description": "Khu sấy trái cây tầng 1",
      "manager": "Nguyễn Văn An",
      "createdAt": "2025-01-05T00:00:00.000Z"
    }
  ]
}
```

---

### 7.2 Tạo khu vực

`POST /areas` _(Quyền: `admin`)_

**Input (body):**

```json
{
  "name": "Khu D",
  "description": "Khu sấy rau củ",
  "manager": "Trần Thị Bình"
}
```

**Output (201):** Trả về object `Area` vừa tạo.

---

### 7.3 Cập nhật khu vực

`PUT /areas/:id` _(Quyền: `admin`)_

**Input (body):** _(trường cần cập nhật)_

**Output (200):** Trả về object sau cập nhật.

---

### 7.4 Xóa khu vực

`DELETE /areas/:id` _(Quyền: `admin`)_

**Điều kiện:** Không xóa được nếu còn máy sấy nào thuộc khu vực này.

**Output (200):** `{ "success": true }`

---

## 8. Nông sản (Fruits)

### 8.1 Danh sách nông sản

`GET /fruits`

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "FRT-001",
      "name": "Xoài",
      "description": "Xoài cát Hòa Lộc",
      "recommendedTempMin": 55,
      "recommendedTempMax": 70,
      "recommendedHumidityMin": 10,
      "recommendedHumidityMax": 20,
      "createdAt": "2025-01-05T00:00:00.000Z"
    }
  ]
}
```

---

### 8.2 Tạo nông sản

`POST /fruits` _(Quyền: `policy`)_

**Input (body):**

```json
{
  "name": "Nhãn",
  "description": "Nhãn lồng Hưng Yên",
  "recommendedTempMin": 50,
  "recommendedTempMax": 65,
  "recommendedHumidityMin": 8,
  "recommendedHumidityMax": 18
}
```

**Output (201):** Trả về object `Fruit` vừa tạo.

---

### 8.3 Cập nhật nông sản

`PUT /fruits/:id` _(Quyền: `policy`)_

**Input (body):** _(trường cần cập nhật)_

**Output (200):** Trả về object sau cập nhật.

---

### 8.4 Xóa nông sản

`DELETE /fruits/:id` _(Quyền: `policy`)_

**Điều kiện:** Không xóa nếu còn lịch trình hoặc quy tắc cảnh báo đang dùng.

**Output (200):** `{ "success": true }`

---

## 9. Lịch trình (Schedules)

### 9.1 Danh sách lịch trình

`GET /schedules`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `fruitId` | string | Lọc theo nông sản |
| `search` | string | Tìm theo tên |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "SCH-001",
      "name": "Lịch sấy xoài chuẩn",
      "fruitId": "FRT-001",
      "createdAt": "2025-01-20T00:00:00.000Z",
      "objects": [
        {
          "id": "OBJ-1",
          "deviceTypeId": "DT-HEATER",
          "label": "Máy gia nhiệt 1"
        }
      ],
      "phases": [
        {
          "id": "PH-1",
          "name": "Giai đoạn 1 – Làm nóng",
          "offsetSeconds": 0,
          "actions": [{ "objectId": "OBJ-1", "value": 65 }]
        }
      ]
    }
  ]
}
```

---

### 9.2 Chi tiết lịch trình

`GET /schedules/:id`

**Output (200):** Trả về object `Schedule` đầy đủ với tất cả `phases` và `objects`.

---

### 9.3 Tạo lịch trình

`POST /schedules` _(Quyền: `policy`)_

**Input (body):**

```json
{
  "name": "Lịch sấy nhãn 8h",
  "fruitId": "FRT-002",
  "objects": [
    { "id": "OBJ-1", "deviceTypeId": "DT-FAN", "label": "Quạt gió 1" },
    { "id": "OBJ-2", "deviceTypeId": "DT-HEATER", "label": "Máy gia nhiệt 1" }
  ],
  "phases": [
    {
      "id": "PH-1",
      "name": "Khởi động",
      "offsetSeconds": 0,
      "actions": [
        { "objectId": "OBJ-1", "value": 60 },
        { "objectId": "OBJ-2", "value": 55 }
      ]
    },
    {
      "id": "PH-2",
      "name": "Ổn định",
      "offsetSeconds": 3600,
      "actions": [{ "objectId": "OBJ-2", "value": 65 }]
    }
  ]
}
```

**Output (201):** Trả về object `Schedule` vừa tạo.

---

### 9.4 Cập nhật lịch trình

`PUT /schedules/:id` _(Quyền: `policy`)_

**Điều kiện:** Không cập nhật nếu có máy đang dùng lịch trình này trong `activeBatch`.

**Input (body):** Tương tự tạo mới (toàn bộ object).

**Output (200):** Trả về object `Schedule` sau cập nhật.

---

### 9.5 Xóa lịch trình

`DELETE /schedules/:id` _(Quyền: `policy`)_

**Output (200):** `{ "success": true }`

---

## 10. Quy tắc cảnh báo (Alert Rules)

### 10.1 Danh sách quy tắc cảnh báo

`GET /alert-rules`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `fruitId` | string | Lọc theo nông sản |
| `active` | boolean | Lọc theo trạng thái kích hoạt |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ALR-001",
      "name": "Cảnh báo nhiệt độ xoài",
      "description": "Kích hoạt quạt khi nhiệt độ vượt ngưỡng",
      "fruitId": "FRT-001",
      "active": true,
      "createdAt": "2025-02-01T00:00:00.000Z",
      "objects": [
        {
          "id": "OBJ-1",
          "deviceTypeId": "DT-TEMP",
          "label": "Cảm biến nhiệt 1"
        },
        { "id": "OBJ-2", "deviceTypeId": "DT-FAN", "label": "Quạt gió 1" }
      ],
      "pairs": [
        {
          "id": "AP-1",
          "conditions": [{ "objectId": "OBJ-1", "operator": ">", "value": 75 }],
          "actions": [{ "objectId": "OBJ-2", "value": 100 }]
        }
      ]
    }
  ]
}
```

---

### 10.2 Chi tiết quy tắc

`GET /alert-rules/:id`

**Output (200):** Trả về object `AlertRule` đầy đủ.

---

### 10.3 Tạo quy tắc cảnh báo

`POST /alert-rules` _(Quyền: `policy`)_

**Input (body):**

```json
{
  "name": "Cảnh báo độ ẩm cao",
  "description": "Tăng tốc độ quạt khi độ ẩm vượt 80%",
  "fruitId": "FRT-001",
  "active": true,
  "objects": [
    { "id": "OBJ-1", "deviceTypeId": "DT-HUM", "label": "Cảm biến độ ẩm 1" },
    { "id": "OBJ-2", "deviceTypeId": "DT-FAN", "label": "Quạt gió 1" }
  ],
  "pairs": [
    {
      "id": "AP-1",
      "conditions": [{ "objectId": "OBJ-1", "operator": ">", "value": 80 }],
      "actions": [{ "objectId": "OBJ-2", "value": 90 }]
    }
  ]
}
```

**Output (201):** Trả về object `AlertRule` vừa tạo.

---

### 10.4 Cập nhật quy tắc

`PUT /alert-rules/:id` _(Quyền: `policy`)_

**Input (body):** Tương tự tạo mới.

**Output (200):** Trả về object `AlertRule` sau cập nhật.

---

### 10.5 Xóa quy tắc

`DELETE /alert-rules/:id` _(Quyền: `policy`)_

**Output (200):** `{ "success": true }`

---

### 10.6 Bật / Tắt quy tắc

`PATCH /alert-rules/:id/active` _(Quyền: `policy`)_

**Input (body):**

```json
{ "active": false }
```

**Output (200):** `{ "id": "ALR-001", "active": false }`

---

## 11. Cảnh báo hệ thống (System Alerts)

### 11.1 Danh sách cảnh báo đã kích hoạt

`GET /system-alerts`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `resolved` | boolean | `true` = đã xử lý, `false` = chưa xử lý |
| `dryerId` | string | Lọc theo máy sấy |
| `from` | ISO date | Từ ngày |
| `to` | ISO date | Đến ngày |
| `page` | number | Trang |
| `limit` | number | Số bản ghi (mặc định 20) |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "SA-001",
      "dryerId": "DRY-001",
      "dryerName": "Máy sấy A1",
      "ruleName": "Cảnh báo nhiệt độ xoài",
      "sensorType": "temperature",
      "direction": "above_max",
      "value": 78.5,
      "threshold": 75,
      "time": "2025-06-01T08:15:00.000Z",
      "resolved": false,
      "actionTaken": null
    }
  ],
  "meta": { "total": 12, "unresolved": 5 }
}
```

---

### 11.2 Đánh dấu cảnh báo đã xử lý

`PATCH /system-alerts/:id/resolve`

**Input (body):**

```json
{ "actionTaken": "Đã giảm nhiệt độ máy gia nhiệt xuống 60°C" }
```

**Output (200):** `{ "id": "SA-001", "resolved": true, "actionTaken": "..." }`

---

## 12. Nhật ký hệ thống (System Logs)

### 12.1 Danh sách nhật ký

`GET /system-logs`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `search` | string | Tìm trong mô tả hoặc tên người dùng |
| `eventType` | string | `login` \| `logout` \| `device_control` \| `device_management` \| `policy_management` \| `alert` \| `profile_change` |
| `user` | string | Tên người dùng chính xác |
| `severity` | string | `info` \| `warning` \| `error` \| `success` |
| `dryerId` | string | Lọc theo máy sấy |
| `from` | ISO date | Từ ngày/giờ |
| `to` | ISO date | Đến ngày/giờ |
| `page` | number | Trang |
| `limit` | number | Số bản ghi (mặc định 50) |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "LOG-001",
      "eventType": "device_control",
      "time": "2025-06-01T06:00:00.000Z",
      "user": "Nguyễn Văn An",
      "description": "Bắt đầu mẻ sấy trên Máy sấy A1 (Thủ công)",
      "dryerId": "DRY-001",
      "severity": "info"
    }
  ],
  "meta": { "total": 350, "page": 1, "limit": 50 }
}
```

---

## 13. Người dùng (Users)

> Tất cả endpoint trong mục này yêu cầu quyền `admin`.

### 13.1 Danh sách người dùng

`GET /users`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `search` | string | Tìm theo tên hoặc email |
| `role` | string | `admin` \| `operator` \| `viewer` |
| `active` | boolean | Lọc theo trạng thái tài khoản |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "USR-001",
      "name": "Nguyễn Văn An",
      "email": "an.nguyen@example.com",
      "phone": "0901234567",
      "role": "admin",
      "avatar": "A",
      "active": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastLogin": "2025-06-01T07:00:00.000Z",
      "permissions": {
        "control": true,
        "controlDryers": "all",
        "devices": true,
        "deviceDryers": "all",
        "policy": true,
        "statistics": true,
        "logs": true
      }
    }
  ]
}
```

> **Lưu ý bảo mật:** Trường `password` không được trả về trong bất kỳ response nào.

---

### 13.2 Tạo người dùng

`POST /users`

**Input (body):**

```json
{
  "name": "Trần Thị Bình",
  "email": "binh.tran@example.com",
  "password": "securePass123",
  "phone": "0987654321",
  "role": "operator",
  "permissions": {
    "control": true,
    "controlDryers": ["DRY-001", "DRY-002"],
    "devices": true,
    "deviceDryers": ["DRY-001", "DRY-002"],
    "policy": false,
    "statistics": true,
    "logs": false
  }
}
```

**Validate:** Email không được trùng; password tối thiểu 6 ký tự.

**Output (201):** Trả về object `UserAccount` (không có `password`).

---

### 13.3 Cập nhật người dùng

`PUT /users/:id`

**Input (body):** _(trường muốn cập nhật, không cần truyền password)_

```json
{
  "name": "Trần Thị Bình (Trưởng ca)",
  "phone": "0987000000",
  "role": "operator",
  "permissions": { ... }
}
```

**Output (200):** Trả về object `UserAccount` sau cập nhật.

---

### 13.4 Xóa người dùng

`DELETE /users/:id`

**Điều kiện:** Không thể xóa chính tài khoản đang đăng nhập.

**Output (200):** `{ "success": true }`

---

### 13.5 Bật / Tắt tài khoản

`PATCH /users/:id/active`

**Input (body):**

```json
{ "active": false }
```

**Output (200):** `{ "id": "USR-002", "active": false }`

---

## 14. Hồ sơ cá nhân (Profile)

### 14.1 Cập nhật tên và số điện thoại

`PATCH /me`

**Input (body):**

```json
{
  "name": "Nguyễn Văn An",
  "phone": "0901111222"
}
```

**Output (200):** Trả về object `UserAccount` sau cập nhật (không có `password`).

---

### 14.2 Đổi mật khẩu

`POST /me/change-password`

**Input (body):**

```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newSecurePass456",
  "confirmPassword": "newSecurePass456"
}
```

**Validate:**

- `currentPassword` phải khớp với mật khẩu hiện tại.
- `newPassword` tối thiểu 6 ký tự.
- `newPassword === confirmPassword`.

**Output (200):**

```json
{ "success": true, "message": "Đổi mật khẩu thành công" }
```

**Lỗi:** `400` — Mật khẩu hiện tại không đúng hoặc không khớp xác nhận.

---

## 15. Thông báo (Notifications)

### 15.1 Danh sách thông báo

`GET /notifications`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `read` | boolean | `false` = chỉ thông báo chưa đọc |
| `type` | string | `warning` \| `info` \| `error` \| `success` |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "NTF-001",
      "type": "warning",
      "title": "Nhiệt độ vượt ngưỡng",
      "message": "Máy sấy A1: nhiệt độ đạt 78°C (ngưỡng 75°C)",
      "time": "2025-06-01T08:15:00.000Z",
      "read": false
    }
  ],
  "meta": { "unread": 3 }
}
```

---

### 15.2 Đánh dấu đã đọc (một thông báo)

`PATCH /notifications/:id/read`

**Output (200):** `{ "id": "NTF-001", "read": true }`

---

### 15.3 Đánh dấu tất cả đã đọc

`POST /notifications/read-all`

**Output (200):** `{ "success": true, "updated": 3 }`

---

## 16. Thống kê (Statistics)

### 16.1 Tổng quan hệ thống

`GET /statistics/overview`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `from` | ISO date | Từ ngày |
| `to` | ISO date | Đến ngày |
| `dryerId` | string | Lọc theo máy sấy |

**Output (200):**

```json
{
  "success": true,
  "data": {
    "totalBatches": 45,
    "completedBatches": 42,
    "totalInputWeight": 6350,
    "totalOutputWeight": 5080,
    "avgRating": 4.1,
    "totalEnergyKwh": 189.5,
    "avgWeightRetention": 79.8,
    "activeDryers": 3,
    "totalDryers": 6
  }
}
```

---

### 16.2 Thống kê theo máy sấy

`GET /statistics/dryer-stats`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `from` | ISO date | Từ ngày |
| `to` | ISO date | Đến ngày |
| `dryerId` | string | Chỉ lấy một máy sấy |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "dryerId": "DRY-001",
      "dryerName": "Máy sấy A1",
      "batchCount": 12,
      "totalInputWeight": 1800,
      "totalOutputWeight": 1440,
      "avgRating": 4.3,
      "totalEnergyKwh": 54.0,
      "avgWeightRetention": 80.0
    }
  ]
}
```

---

### 16.3 Thống kê theo nông sản

`GET /statistics/fruit-stats`

**Query parameters:** `from`, `to`, `fruitId`

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "fruitId": "FRT-001",
      "fruitName": "Xoài",
      "batchCount": 20,
      "avgInputWeight": 148.5,
      "avgOutputWeight": 118.8,
      "avgRating": 4.2,
      "avgWeightRetention": 79.9
    }
  ]
}
```

---

### 16.4 Dữ liệu cảm biến theo mẻ sấy

`GET /statistics/sensor-data`

**Query parameters:**
| Param | Kiểu | Mô tả |
|---|---|---|
| `dryerId` | string | Máy sấy cần lấy dữ liệu |
| `batchRecordId` | string | Lấy dữ liệu của một mẻ cụ thể |
| `from` | ISO date | Từ thời điểm |
| `to` | ISO date | Đến thời điểm |
| `resolution` | `1m` \| `5m` \| `15m` \| `1h` | Độ phân giải thời gian (mặc định `5m`) |

**Output (200):**

```json
{
  "success": true,
  "data": [
    {
      "time": "06:00",
      "temp": 55.2,
      "humidity": 62.1
    },
    {
      "time": "06:05",
      "temp": 58.7,
      "humidity": 58.4
    }
  ]
}
```

---

## Phân quyền tổng hợp

| Endpoint nhóm                            | `admin` | `operator` (có quyền)              | `viewer` |
| ---------------------------------------- | ------- | ---------------------------------- | -------- |
| Auth                                     | ✅      | ✅                                 | ✅       |
| Điều khiển máy (`control`)               | ✅      | ✅ nếu có `permissions.control`    | ❌       |
| Quản lý thiết bị (`devices`)             | ✅      | ✅ nếu có `permissions.devices`    | ❌       |
| Loại thiết bị, Khu vực                   | ✅      | ❌                                 | ❌       |
| Lịch trình, Nông sản, Quy tắc (`policy`) | ✅      | ✅ nếu có `permissions.policy`     | ❌       |
| Thống kê                                 | ✅      | ✅ nếu có `permissions.statistics` | ✅       |
| Nhật ký hệ thống (`logs`)                | ✅      | ✅ nếu có `permissions.logs`       | ❌       |
| Quản lý người dùng                       | ✅      | ❌                                 | ❌       |
| Hồ sơ cá nhân                            | ✅      | ✅                                 | ✅       |
| Thông báo                                | ✅      | ✅                                 | ✅       |

> **`controlDryers` / `deviceDryers`:** Nếu giá trị là `"all"` thì có quyền trên tất cả máy. Nếu là mảng ID thì chỉ áp dụng cho các máy trong danh sách đó.
