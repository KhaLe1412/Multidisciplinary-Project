# DrierSystem — Hệ thống quản lý máy sấy nông sản

## Giới thiệu

**DrierSystem** là hệ thống IoT quản lý và điều khiển máy sấy nông sản, được phát triển cho đồ án đa ngành (DADN). Hệ thống cho phép giám sát cảm biến theo thời gian thực, điều khiển thiết bị từ xa qua Adafruit IO, và tự động hoá quy trình sấy thông qua lịch trình và quy tắc.

---

## Tính năng chính

### Giám sát & Điều khiển

- **Đọc cảm biến thời gian thực** — nhiệt độ, độ ẩm, chuyển động (polling 5 giây)
- **Điều khiển thiết bị** — quạt, cửa, LCD, bộ gia nhiệt (gửi lệnh qua Adafruit IO)
- **Biểu đồ sparkline** — hiển thị 10 điểm gần nhất cho mỗi cảm biến
- **Log hệ thống** — ghi lại mọi thao tác điều khiển, thay đổi thiết bị, cảnh báo

### Quản lý mẻ sấy (Batch)

- **Mô hình thống nhất** — mỗi mẻ kết hợp 3 lớp điều khiển chạy đồng thời:
  - **Manual** — điều khiển trực tiếp thiết bị bất kỳ lúc nào
  - **Schedule queue** — hàng đợi lịch trình tuần tự (thêm/xóa động)
  - **Rule set** — tập quy tắc đánh giá song song mỗi 3 giây (bật/tắt động)
- **Runtime tùy chọn** — có thể đặt thời gian hoặc chạy vô thời hạn
- **Đánh giá mẻ sấy** — chấm điểm chất lượng + ghi trọng lượng đầu ra khi kết thúc

### Tự động hoá

- **Lịch trình (Schedule)** — gồm nhiều giai đoạn (stage), mỗi giai đoạn thiết lập giá trị cho thiết bị ảo theo thời gian (`start_offset`)
- **Quy tắc (Rule)** — gồm các cặp điều kiện–hành động (value pairs), đánh giá theo logic AND
- **Thiết bị ảo (Virtual Device)** — lớp trừu tượng (vd: "Temperature", "Fan Speed"), được ánh xạ sang thiết bị thực qua device mapping
- **Local Schedule / Local Rule** — instance per-dryer, cho phép tái sử dụng schedule/rule toàn cục với mapping thiết bị riêng cho từng máy

### Quản lý hệ thống

- **Xác thực JWT** — đăng nhập bằng email/mật khẩu, token có hiệu lực 24h
- **Phân quyền** — admin, staff, viewer
- **CRUD đầy đủ** — quản lý khu vực, máy sấy, thiết bị, nông sản, lịch trình, quy tắc
- **Cảnh báo** — hệ thống alert với mức độ (info/warning/error)

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Frontend (Nginx :80)                        │
│   React 18 + TypeScript + Vite + TailwindCSS            │
│   ├── /          → SPA (single page app)                │
│   └── /api/*     → reverse proxy                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Backend (FastAPI :8000)                     │
│   Python 3.12 + uvicorn                                 │
│   ├── REST API (auth, CRUD, batch management)           │
│   ├── Background threads (schedule/rule engines)        │
│   └── Adafruit IO integration (sensor/actuator)         │
└────────┬─────────────────────────────┬──────────────────┘
         │                             │
┌────────▼────────┐        ┌───────────▼──────────────────┐
│  MySQL 8.0      │        │  Adafruit IO (MQTT/REST)     │
│  Database DADN  │        │  ├── Sensor feeds (read)     │
│  27 tables      │        │  └── Actuator feeds (write)  │
└─────────────────┘        └──────────────────────────────┘
```

---

## Công nghệ sử dụng

| Thành phần        | Công nghệ                                                            |
| ----------------- | -------------------------------------------------------------------- |
| **Frontend**      | React 18, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons      |
| **Backend**       | Python 3.12, FastAPI, uvicorn, mysql-connector-python, PyJWT, bcrypt |
| **Database**      | MySQL 8.0, UTF-8 (utf8mb4_unicode_ci)                                |
| **IoT Platform**  | Adafruit IO (REST API)                                               |
| **Deployment**    | Docker Compose (3 services)                                          |
| **Reverse Proxy** | Nginx (SPA routing + API proxy)                                      |

---

## Cấu trúc thư mục

```
DrierSystem/
├── docker-compose.yml          # Orchestration 3 services
├── README.md                   # Hướng dẫn chạy dự án
├── PROJECT.md                  # Mô tả dự án (file này)
│
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── Dockerfile              # Python 3.12 image
│   ├── requirements.txt        # Python dependencies
│   ├── API.md                  # API reference đầy đủ
│   └── src/
│       ├── auth.py             # JWT authentication
│       ├── db.py               # MySQL connection pool
│       ├── device_manager.py   # Adafruit IO integration
│       ├── model/
│       │   └── schemas.py      # Pydantic request models
│       └── api/                # Route modules
│           ├── analytics/      # Thống kê
│           ├── areas/          # Khu vực
│           ├── auth/           # Đăng nhập
│           ├── batches/        # Mẻ sấy (unified engine)
│           ├── device_types/   # Loại thiết bị
│           ├── dryers/         # Máy sấy + local schedules/rules
│           ├── logs/           # System logs
│           ├── policy/         # Schedules, rules, stages, ...
│           ├── sensor/         # Sensor/actuator feeds
│           └── users/          # Quản lý người dùng
│
├── database/
│   ├── tables.sql              # Schema 27 bảng
│   ├── seeds.sql               # Dữ liệu mẫu
│   ├── procedures.sql          # Stored procedures
│   ├── init.sh                 # Docker entrypoint script
│   └── README.md               # Database documentation
│
└── frontend/
    ├── Dockerfile              # Multi-stage build (Node → Nginx)
    ├── nginx.conf              # Reverse proxy config
    ├── package.json            # Node dependencies
    ├── vite.config.ts          # Vite config
    └── src/
        └── app/
            ├── App.tsx         # Root component + routing
            ├── api/            # API client modules
            ├── components/     # UI components
            │   ├── DrierControl.tsx   # Trang điều khiển máy sấy chính
            │   ├── DeviceManagement.tsx
            │   ├── PolicyPage.tsx
            │   ├── Statistics.tsx
            │   └── ...
            ├── context/        # React context (global state)
            └── data/           # Type definitions + mock data
```

---

## Mô hình dữ liệu

### Sơ đồ quan hệ (tóm tắt)

```
users ──┬── areas ── dryers ──┬── devices
        │                     ├── batches ──┬── batch_schedule_queue
        │                     │             └── batch_rule_set
        │                     ├── local_schedules ── device_mapping
        │                     └── local_rules ── device_mapping
        └── dryers

crops ──┬── schedules ── stages ── schedule_actions
        ├── rules ── value_pairs ──┬── conditions
        │                          └── rule_actions
        └── batches

virtual_devices ── schedule_virtual_devices
               └── rule_virtual_devices
```

### Các bảng chính

| Nhóm           | Bảng                                                                                                              | Mô tả                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Người dùng** | `users`                                                                                                           | Tài khoản (admin/staff/viewer)        |
| **Hạ tầng**    | `areas`, `dryers`, `devices`, `device_types`                                                                      | Khu vực, máy sấy, thiết bị            |
| **Nông sản**   | `crops`                                                                                                           | Loại nông sản (xoài, chuối, ...)      |
| **Lịch trình** | `schedules`, `stages`, `schedule_actions`, `schedule_virtual_devices`                                             | Template lịch trình toàn cục          |
| **Quy tắc**    | `rules`, `value_pairs`, `conditions`, `rule_actions`, `rule_virtual_devices`                                      | Template quy tắc toàn cục             |
| **Cục bộ**     | `local_schedules`, `local_schedule_device_mapping`, `local_rules`, `local_rule_device_mapping`                    | Instance per-dryer + mapping thiết bị |
| **Mẻ sấy**     | `batches`, `batch_schedule_queue`, `batch_rule_set`, `batch_schedule_device_mapping`, `batch_rule_device_mapping` | Vận hành mẻ sấy                       |
| **Logging**    | `sensor_logs`, `system_logs`, `event_types`, `severity_levels`                                                    | Ghi log cảm biến và hệ thống          |
| **Cảnh báo**   | `alerts`                                                                                                          | Hệ thống cảnh báo                     |
| **Trừu tượng** | `virtual_devices`                                                                                                 | Thiết bị ảo (abstraction layer)       |

---

## Luồng hoạt động chính

### 1. Bắt đầu mẻ sấy

```
Người dùng chọn máy sấy → Chọn nông sản (tùy chọn) → Nhập trọng lượng (tùy chọn)
→ Đặt thời gian chạy (tùy chọn) → Bấm "Bắt đầu sấy"
→ POST /api/batches/start
→ Backend tạo batch, đặt dryer status = "running", spawn main thread
```

### 2. Trong lúc mẻ đang chạy

```
┌─────────────────────────────────────────────────────┐
│                    Main Thread                       │
│   Chờ runtime timeout hoặc stop signal              │
├─────────────────────────────────────────────────────┤
│  Manual Control      │  Luôn khả dụng              │
│  (người dùng gửi     │  POST /api/device/{id}?val  │
│   lệnh trực tiếp)    │                             │
├───────────────────────┼─────────────────────────────┤
│  Schedule Thread      │  Chạy tuần tự local        │
│  (tùy chọn)          │  schedules trong queue       │
│                       │  theo start_offset          │
├───────────────────────┼─────────────────────────────┤
│  Rule Thread          │  Polling mỗi 3s, đánh giá  │
│  (tùy chọn)          │  tất cả rules đồng thời     │
│                       │  (conditions → actions)     │
└───────────────────────┴─────────────────────────────┘
```

### 3. Kết thúc mẻ sấy

```
Người dùng bấm "Dừng" → Đánh giá chất lượng + nhập trọng lượng đầu ra
→ PUT /api/batches/{id}/end
→ Backend dừng tất cả thread, tắt controller về 0, cập nhật DB
```

---

## API Overview

Tổng cộng **~60+ endpoint** REST. Chi tiết đầy đủ tại [backend/API.md](backend/API.md).

| Nhóm             | Prefix                            | Số endpoint | Mô tả                              |
| ---------------- | --------------------------------- | ----------- | ---------------------------------- |
| Auth             | `/api/auth`                       | 1           | Đăng nhập JWT                      |
| Users            | `/api/users`                      | 2           | Hồ sơ cá nhân                      |
| Areas            | `/api/areas`                      | 4           | CRUD khu vực                       |
| Device Types     | `/api/device-types`               | 4           | CRUD loại thiết bị                 |
| Dryers           | `/api/dryers`                     | 5           | CRUD máy sấy                       |
| Devices          | `/api/dryers/.../devices`         | 4           | CRUD thiết bị                      |
| Local Schedules  | `/api/dryers/.../local-schedules` | 5           | CRUD lịch trình cục bộ             |
| Local Rules      | `/api/dryers/.../local-rules`     | 5           | CRUD quy tắc cục bộ                |
| Sensor Feed      | `/api/device`                     | 3           | Đọc/ghi sensor + log               |
| Crops            | `/api/crops`                      | 4           | CRUD nông sản                      |
| Schedules        | `/api/schedules`                  | 7           | CRUD lịch trình + virtual devices  |
| Stages           | `/api/schedules/.../stages`       | 4           | CRUD giai đoạn                     |
| Schedule Actions | `/api/stages/.../actions`         | 4           | CRUD hành động lịch trình          |
| Rules            | `/api/rules`                      | 7           | CRUD quy tắc + virtual devices     |
| Value Pairs      | `/api/rules/.../value-pairs`      | 3           | CRUD cặp điều kiện–hành động       |
| Conditions       | `/api/value-pairs/.../conditions` | 4           | CRUD điều kiện                     |
| Rule Actions     | `/api/value-pairs/.../actions`    | 4           | CRUD hành động quy tắc             |
| Batches          | `/api/batches`                    | 10          | Mẻ sấy + schedule queue + rule set |
| Logs             | `/api/logs`                       | 2           | System logs                        |
| Virtual Devices  | `/api/virtual-devices`            | 4           | CRUD thiết bị ảo                   |

---

## Yêu cầu hệ thống

- **Docker Desktop** >= 4.x (bao gồm Docker Compose)
- **Adafruit IO account** — cần `ADAFRUIT_USERNAME` và `ADAFRUIT_KEY`

### Chạy nhanh

```bash
# 1. Clone repo
git clone <repo-url> && cd DrierSystem

# 2. Tạo file .env
cp .env.example .env
# Điền ADAFRUIT_USERNAME và ADAFRUIT_KEY

# 3. Khởi động
docker-compose up -d --build

# 4. Truy cập
# Frontend:  http://localhost
# API docs:  http://localhost/api/docs
# MySQL:     localhost:3307 (root/rootpassword)
```

Xem hướng dẫn chi tiết tại [README.md](README.md).

---

## Tài liệu tham khảo

| Tài liệu          | Đường dẫn                                                                | Mô tả                                       |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Hướng dẫn chạy    | [README.md](README.md)                                                   | Setup Docker, biến môi trường, troubleshoot |
| API Reference     | [backend/API.md](backend/API.md)                                         | Tất cả endpoint REST với request/response   |
| Database Schema   | [database/README.md](database/README.md)                                 | Mô tả 27 bảng + quan hệ + dữ liệu mẫu       |
| Frontend Overview | [frontend/docs/Frontend-Overview.md](frontend/docs/Frontend-Overview.md) | Kiến trúc frontend                          |
| Components Guide  | [frontend/docs/Components-Guide.md](frontend/docs/Components-Guide.md)   | Hướng dẫn component                         |
| UI/UX Guide       | [frontend/docs/UI-UX-Guide.md](frontend/docs/UI-UX-Guide.md)             | Thiết kế giao diện                          |
