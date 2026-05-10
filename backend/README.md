# Backend — DrierSystem

## Giới thiệu

Backend của DrierSystem là một **REST API** được xây dựng bằng **Python 3.12** và **FastAPI**, chạy trên **uvicorn**. Đây là lớp xử lý nghiệp vụ trung tâm của hệ thống: tiếp nhận yêu cầu từ frontend, điều phối dữ liệu với MySQL, và tương tác trực tiếp với nền tảng IoT Adafruit IO qua giao thức MQTT.

---

## Công nghệ sử dụng

| Thư viện / Công cụ          | Phiên bản    | Mục đích                                  |
| --------------------------- | ------------ | ----------------------------------------- |
| `fastapi`                   | ≥ 0.115      | Framework REST API hiệu năng cao          |
| `uvicorn[standard]`         | ≥ 0.30       | ASGI server chạy ứng dụng                 |
| `mysql-connector-python`    | ≥ 9.0        | Kết nối và truy vấn MySQL 8.0             |
| `python-dotenv`             | ≥ 1.0        | Tải biến môi trường từ file `.env`        |
| `pydantic`                  | ≥ 2.0        | Validation và serialization request body  |
| `python-jose[cryptography]` | ≥ 3.3        | Tạo và xác thực JWT (thuật toán HS256)    |
| `bcrypt`                    | ≥ 4.0        | Băm và xác thực mật khẩu                  |
| `Adafruit-IO`               | ≥ 2.7        | REST client tương tác với Adafruit IO     |
| `paho-mqtt`                 | ≥ 1.6        | MQTT client nhận feed theo thời gian thực |
| `pytest` + `httpx`          | ≥ 8.0 / 0.27 | Framework kiểm thử tự động                |

---

## Cấu trúc thư mục

```
backend/
├── main.py                  # Entry point: khởi tạo FastAPI app, đăng ký routers
├── client.py                # Lớp bọc (wrapper) Adafruit IO MQTT/REST client
├── coreiot_client.py        # Client thay thế cho nền tảng CoreIoT (dự phòng)
├── Dockerfile               # Build image Python 3.12-slim
├── requirements.txt         # Danh sách dependencies
├── conftest.py              # Cấu hình pytest (fixtures dùng chung)
├── test_analytics.py        # Kiểm thử module analytics
├── test_batches.py          # Kiểm thử module quản lý mẻ sấy
├── API.md                   # Tài liệu API đầy đủ (endpoint, request, response)
└── src/
    ├── auth.py              # Xác thực JWT + bcrypt
    ├── db.py                # Kết nối MySQL, các hàm DB helper dùng chung
    ├── device_manager.py    # Quản lý MQTT clients động theo Adafruit IO
    └── api/
        ├── auth/router.py           # Đăng nhập, đổi mật khẩu, profile
        ├── sensor/router.py         # Đọc/ghi giá trị thiết bị, kết nối MQTT
        ├── areas/router.py          # CRUD khu vực
        ├── device_types/router.py   # CRUD loại thiết bị
        ├── dryers/router.py         # CRUD máy sấy và thiết bị trong máy
        ├── users/router.py          # CRUD người dùng (admin)
        ├── policy/router.py         # CRUD nông sản, lịch trình, quy tắc
        ├── batches/router.py        # Quản lý mẻ sấy và engine tự động hoá
        ├── logs/router.py           # Truy vấn system logs, event types
        └── analytics/router.py      # Báo cáo thống kê sản xuất
    └── model/
        └── schemas.py               # Pydantic schemas cho toàn bộ request body
```

---

## Kiến trúc và luồng xử lý

### Khởi động ứng dụng (`main.py`)

- Tải biến môi trường từ `.env` trước mọi thao tác.
- Khởi tạo `FastAPI` app với CORS middleware (cho phép mọi origin — phù hợp môi trường dev, cần thu hẹp trong production).
- Đăng ký 10 routers. Tất cả routers (trừ `auth_router`) đều yêu cầu Bearer token hợp lệ thông qua dependency `get_current_user`.

### Xác thực (`src/auth.py`)

- **Đăng nhập**: nhận `email` + `password` → kiểm tra DB → so sánh bcrypt hash → trả về JWT.
- **JWT**: payload chứa `sub` (user_id), thời hạn mặc định **24 giờ** (cấu hình qua `JWT_EXPIRE_MINUTES`).
- **Bảo mật**: mọi lỗi xác thực đều trả về HTTP 401 với thông điệp chung, không tiết lộ nguyên nhân cụ thể (tuân thủ OWASP A07 — Information Disclosure).
- **Phân quyền**: `role` của user (`admin`, `staff`, `viewer`) được nhúng vào context và kiểm tra tại từng endpoint.

### Kết nối cơ sở dữ liệu (`src/db.py`)

- Mỗi request mở một kết nối MySQL riêng (stateless connection per-request) thông qua `get_db()`.
- Các tham số kết nối lấy từ biến môi trường: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Cung cấp các hàm helper dùng chung:
  - `insert_sensor_log(device_id, value)` — gọi stored procedure để ghi dữ liệu cảm biến.
  - `write_system_log(event_code, severity, description, ...)` — ghi nhật ký hệ thống cho mọi thao tác quan trọng.
  - `get_list_devices(type)` — lấy danh sách thiết bị theo loại (sensor/controller).
  - `get_device_name(device_id)` — tra tên thiết bị theo ID.

### Quản lý thiết bị IoT (`src/device_manager.py`)

- **MQTT Client động**: mỗi thiết bị trong DB được ánh xạ sang một Adafruit IO MQTT client riêng. Khi có feed mới (cảm biến gửi giá trị lên), callback `_on_feed_message` được gọi và ghi vào `sensor_logs`.
- **Đồng bộ tự động**: một background thread chạy mỗi 60 giây, so sánh danh sách thiết bị trong DB với danh sách clients hiện tại, tự động thêm/xóa client khi có thay đổi.
- **Gửi lệnh**: `set_device_value(feed_id, value)` gửi lệnh lên Adafruit IO REST API, đồng thời cập nhật `sensor_logs`.
- **Endpoint thủ công**: `POST /api/sensor/refresh-clients` kích hoạt đồng bộ ngay lập tức mà không cần chờ interval 60 giây.

---

## Các module API

### `auth` — Xác thực

| Endpoint                    | Phương thức | Mô tả                              |
| --------------------------- | ----------- | ---------------------------------- |
| `/api/auth/login`           | POST        | Đăng nhập, nhận JWT                |
| `/api/auth/profile`         | GET/PUT     | Xem và cập nhật hồ sơ cá nhân      |
| `/api/auth/change-password` | PUT         | Đổi mật khẩu (yêu cầu mật khẩu cũ) |

### `sensor` — Đọc/ghi thiết bị

| Endpoint                        | Phương thức | Mô tả                                 |
| ------------------------------- | ----------- | ------------------------------------- |
| `/api/device/{feed_id}`         | GET         | Lấy giá trị mới nhất từ `sensor_logs` |
| `/api/device/{feed_id}/logs`    | GET         | Lấy 10 log gần nhất của thiết bị      |
| `/api/device/{feed_id}`         | POST        | Gửi lệnh lên Adafruit IO, ghi log     |
| `/api/sensor/connected-devices` | GET         | Danh sách thiết bị đang kết nối MQTT  |
| `/api/sensor/refresh-clients`   | POST        | Đồng bộ lại MQTT clients theo DB      |

### `areas` — Khu vực

CRUD đầy đủ cho bảng `areas`. Mỗi khu vực có tên, mô tả và người quản lý.

### `device_types` — Loại thiết bị

CRUD đầy đủ cho `device_types`. Mỗi loại có đơn vị đo (`unit`), giá trị tối đa/tối thiểu, và phân loại `sensor` hoặc `controller`.

### `dryers` — Máy sấy và thiết bị

- CRUD máy sấy: tên, công suất, trạng thái (`off/on/running`), khu vực, người quản lý.
- CRUD thiết bị gắn vào máy sấy: ID feed Adafruit, loại thiết bị, công suất tiêu thụ.
- CRUD local schedules và local rules gắn với từng máy sấy.

### `users` — Quản lý người dùng (admin)

CRUD người dùng: tạo tài khoản, cập nhật thông tin, vô hiệu hoá (`status: disabled`), đặt lại mật khẩu. Chỉ admin truy cập được.

### `policy` — Chính sách tự động hoá

Module lớn nhất, quản lý toàn bộ cấu trúc điều khiển tự động:

- **Nông sản (`crops`)**: danh sách mặt hàng sấy (xoài, chuối, v.v.).
- **Lịch trình (`schedules`)**: tập hợp các giai đoạn (`stages`) chạy tuần tự. Mỗi giai đoạn có `start_offset` (phút) và tập hành động (`schedule_actions`) đặt giá trị cho thiết bị ảo.
- **Thiết bị ảo lịch trình (`schedule_virtual_devices`)**: lớp trừu tượng (vd: "Fan Speed") được ánh xạ sang thiết bị thực khi tạo local schedule.
- **Quy tắc (`rules`)**: tập các cặp giá trị (`value_pairs`). Mỗi cặp gồm điều kiện (`conditions`, logic AND) và hành động (`rule_actions`).
- **Thiết bị ảo quy tắc (`rule_virtual_devices`)**: tương tự schedule, là lớp trừu tượng cho rule.

### `batches` — Quản lý mẻ sấy (module phức tạp nhất)

Triển khai một **engine điều khiển đa luồng** cho mỗi mẻ sấy đang hoạt động:

```
Mẻ sấy (batch)
├── Main thread      → đếm runtime, lắng nghe lệnh stop
├── Schedule thread  → chạy lần lượt local schedules trong hàng đợi
│     └── Mỗi schedule: thực thi giai đoạn đúng thời điểm start_offset
└── Rule thread      → polling mỗi 3 giây, đánh giá tất cả active local rules
      └── Mỗi rule: đọc sensor mới nhất, so điều kiện (AND), gửi lệnh nếu khớp
```

**Các endpoint chính:**

| Endpoint                                        | Mô tả                                               |
| ----------------------------------------------- | --------------------------------------------------- |
| `POST /api/batches/start`                       | Khởi động mẻ sấy, tạo threads                       |
| `POST /api/batches/{id}/stop`                   | Dừng mẻ sấy, tắt toàn bộ thiết bị controller        |
| `POST /api/batches/{id}/end`                    | Kết thúc và đánh giá mẻ (ghi output_weight, rating) |
| `GET /api/batches/{id}/schedules`               | Xem hàng đợi lịch trình hiện tại                    |
| `POST /api/batches/{id}/schedules`              | Thêm lịch trình vào hàng đợi (động, khi đang chạy)  |
| `DELETE /api/batches/{id}/schedules/{entry_id}` | Xóa lịch trình khỏi hàng đợi                        |
| `PUT /api/batches/{id}/schedules/toggle`        | Bật/tắt toàn bộ schedule engine                     |
| `GET /api/batches/{id}/rules`                   | Xem tập quy tắc hiện tại                            |
| `POST /api/batches/{id}/rules`                  | Thêm quy tắc vào tập (động)                         |
| `DELETE /api/batches/{id}/rules/{entry_id}`     | Xóa quy tắc                                         |
| `PUT /api/batches/{id}/rules/toggle`            | Bật/tắt toàn bộ rule engine                         |

**`ActiveBatchState`** (dataclass): lưu toàn bộ trạng thái chia sẻ giữa các threads của một mẻ sấy (queue, rule set, stop event, lock). Truy cập thread-safe qua `threading.Lock`.

### `logs` — Nhật ký hệ thống

- `GET /api/logs` — lấy 100 log gần nhất với join đầy đủ (event type, severity, tên người dùng).
- `GET /api/logs/event-types` — danh sách loại sự kiện.
- `GET /api/logs/dryer/{dryer_id}` — log theo máy sấy cụ thể.

### `analytics` — Thống kê sản xuất

Các báo cáo tổng hợp từ bảng `batches`:

- **Overview**: tổng số mẻ, tổng thời gian chạy, tổng khối lượng vào/ra, ước tính tiêu thụ điện (kWh), sản xuất theo ngày, thống kê theo nông sản, phân phối đánh giá.
- **Dryer stats**: hiệu suất từng máy sấy (số mẻ, tổng giờ, khối lượng xử lý).
- **Sensor stats**: trung bình/min/max giá trị cảm biến trong khoảng thời gian.
- Hỗ trợ lọc theo `from_date`, `to_date`, `dryer_id`.

---

## Biến môi trường

Tất cả cấu hình được truyền qua biến môi trường (file `.env` tại thư mục `backend/` hoặc qua `docker-compose.yml`):

| Biến                 | Mô tả                     | Giá trị mặc định                  |
| -------------------- | ------------------------- | --------------------------------- |
| `DB_HOST`            | Host MySQL                | `localhost`                       |
| `DB_PORT`            | Port MySQL                | `3307`                            |
| `DB_USER`            | User MySQL                | `root`                            |
| `DB_PASSWORD`        | Mật khẩu MySQL            | `rootpassword`                    |
| `DB_NAME`            | Tên database              | `DADN`                            |
| `JWT_SECRET`         | Khóa bí mật ký JWT        | `dev-secret-change-in-production` |
| `JWT_EXPIRE_MINUTES` | Thời hạn token (phút)     | `1440` (24 giờ)                   |
| `ADAFRUIT_USERNAME`  | Tên tài khoản Adafruit IO | _(bắt buộc)_                      |
| `ADAFRUIT_KEY`       | API key Adafruit IO       | _(bắt buộc)_                      |

> **Lưu ý bảo mật**: `JWT_SECRET` và `ADAFRUIT_KEY` phải được thay thế bằng giá trị thực trong môi trường production. Không commit `.env` lên source control.

---

## Triển khai với Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- Image nhẹ (`python:3.12-slim`), không bao gồm các công cụ build không cần thiết.
- Port 8000 được expose, Nginx ở frontend proxy ngược `/api/*` về đây.
- Trong `docker-compose.yml`, backend chờ MySQL healthy trước khi khởi động.

## Chạy local (không Docker)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Kiểm thử

```bash
cd backend
pytest test_analytics.py test_batches.py -v
```

- `conftest.py` định nghĩa fixtures dùng chung (test client, mock DB).
- `test_analytics.py`: kiểm thử các endpoint thống kê với dữ liệu mẫu.
- `test_batches.py`: kiểm thử luồng khởi động/dừng mẻ, thêm/xóa lịch trình và quy tắc động.

---

## Tài liệu API

Xem chi tiết tất cả endpoint, request body và response schema tại [API.md](API.md).

FastAPI cũng tự sinh Swagger UI tại `http://localhost:8000/docs` khi chạy ở chế độ development.
