# DrierSystem — Hướng dẫn chạy dự án

Hệ thống quản lý máy sấy nông sản gồm 3 service chạy cùng nhau qua Docker Compose:

| Service      | Công nghệ             | Port (host)               |
| ------------ | --------------------- | ------------------------- |
| **mysql**    | MySQL 8.0             | `3307` → container `3306` |
| **backend**  | Python 3.12 / FastAPI | `8001` → container `8000` |
| **frontend** | React + Vite → Nginx  | `80`                      |

---

## Kiến trúc hệ thống

```
Browser
  │
  ▼
frontend (Nginx :80)
  ├── /         → static React SPA
  └── /api/*    → proxy → backend (:8000) ← kết nối → MySQL (:3306)
```

Nginx đóng vai trò reverse proxy: mọi request `/api/...` từ browser được chuyển tới container **backend** qua internal Docker network (không cần CORS, không lộ port backend ra ngoài trừ mục đích debug).

---

## Mô tả từng service

### 🗄️ mysql

| Thuộc tính     | Giá trị              |
| -------------- | -------------------- |
| Image          | `mysql:8.0`          |
| Container      | `driersystem-mysql`  |
| Port (host)    | `3307`               |
| Database       | `DADN`               |
| Root password  | `rootpassword`       |
| Charset        | `utf8mb4_unicode_ci` |
| Volume dữ liệu | `mysql_data` (named) |

**Khởi tạo tự động:** Khi volume `mysql_data` trống, Docker entrypoint chạy `database/init.sh` theo thứ tự:

1. `tables.sql` — tạo database DADN và toàn bộ bảng
2. `seeds.sql` — dữ liệu mẫu (users, dryers, event_types, ...)
3. `procedures.sql` — stored procedures & functions

**Healthcheck:** mysqladmin ping mỗi 10s, backend và frontend chỉ khởi động sau khi MySQL healthy.

---

### ⚙️ backend

| Thuộc tính  | Giá trị                       |
| ----------- | ----------------------------- |
| Image       | Build từ `backend/Dockerfile` |
| Container   | `driersystem-backend`         |
| Port (host) | `8001` → container `8000`     |
| Framework   | FastAPI + uvicorn             |
| DB kết nối  | `mysql:3306` (internal)       |

**Biến môi trường:**

| Biến          | Giá trị        |
| ------------- | -------------- |
| `DB_HOST`     | `mysql`        |
| `DB_PORT`     | `3306`         |
| `DB_NAME`     | `DADN`         |
| `DB_USER`     | `root`         |
| `DB_PASSWORD` | `rootpassword` |

**Phụ thuộc:** Khởi động sau khi `mysql` healthy.

---

### 🌐 frontend

| Thuộc tính    | Giá trị                           |
| ------------- | --------------------------------- |
| Image         | Build từ `frontend/Dockerfile`    |
| Container     | `driersystem-frontend`            |
| Port (host)   | `80`                              |
| Build stage 1 | Node 20-alpine → `npm run build`  |
| Build stage 2 | Nginx alpine phục vụ static files |

**Build argument:**

| ARG                | Giá trị Docker | Mô tả                                       |
| ------------------ | -------------- | ------------------------------------------- |
| `VITE_GATEWAY_URL` | `""`           | URL rỗng → dùng URL tương đối → nginx proxy |

> Khi chạy local dev (`npm run dev`), biến này không được set → tự động fallback về `http://localhost:8001`.

**Nginx reverse proxy:** Mọi request `/api/*` được proxy tới `http://backend:8000/api/`. SPA routing được xử lý bởi `try_files`.

**Phụ thuộc:** Khởi động sau khi `backend` started.

---

## Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) >= 4.x
- Docker Compose (tích hợp sẵn trong Docker Desktop)

---

## Chạy toàn bộ hệ thống

```bash
docker-compose up -d --build
```

Lần đầu chạy Docker sẽ:

1. Pull image `mysql:8.0`, `node:20-alpine`, `nginx:alpine`, `python:3.12-slim`
2. Build image backend và frontend
3. Khởi động MySQL, tự động load SQL files qua `init.sh`
4. Chờ MySQL healthy → khởi động backend → khởi động frontend

---

## Truy cập

| Địa chỉ                    | Mô tả                                       |
| -------------------------- | ------------------------------------------- |
| http://localhost           | Frontend (React SPA)                        |
| http://localhost/api/docs  | Backend API docs (qua nginx proxy)          |
| http://localhost:8001/docs | Backend API docs (trực tiếp, dùng để debug) |
| `localhost:3307`           | MySQL (kết nối từ host bằng MySQL client)   |

---

## Kiểm tra trạng thái

```bash
# Xem tất cả container
docker-compose ps

# Xem log từng service
docker-compose logs mysql
docker-compose logs backend
docker-compose logs frontend

# Xem log realtime
docker-compose logs -f backend
```

---

## Load file SQL vào database

### Tự động (Docker — mặc định)

Khi chạy `docker-compose up`, MySQL tự động thực thi các file trong thư mục `database/` theo thứ tự bảng chữ cái. Thứ tự hiện tại:

| Thứ tự | File             | Mục đích                                   |
| ------ | ---------------- | ------------------------------------------ |
| 1      | `tables.sql`     | Tạo database `DADN` và tất cả bảng         |
| 2      | `seeds.sql`      | Dữ liệu mẫu tối thiểu (users, dryers, ...) |
| 3      | `procedures.sql` | Stored procedures & functions              |

> Để thêm file mới vào luồng tự động, đặt file trong `database/` và thêm lệnh load vào `database/init.sh`.

---

### Thủ công — qua Docker container đang chạy

```bash
# Load một file SQL bất kỳ vào container đang chạy
Get-Content database\<ten_file>.sql | docker exec -i driersystem-mysql mysql -u root -prootpassword DADN
```

**Ví dụ — Reset và load lại từ đầu:**

```bash
Get-Content database\reset.sql     | docker exec -i driersystem-mysql mysql -u root -prootpassword
Get-Content database\tables.sql    | docker exec -i driersystem-mysql mysql -u root -prootpassword
Get-Content database\seeds.sql     | docker exec -i driersystem-mysql mysql -u root -prootpassword DADN
Get-Content database\procedures.sql | docker exec -i driersystem-mysql mysql -u root -prootpassword DADN
```

**Ví dụ — Load dữ liệu kiểm thử analytics (sau seeds.sql):**

```bash
Get-Content database\analytics_test_data.sql | docker exec -i driersystem-mysql mysql -u root -prootpassword DADN
```

---

### Thủ công — qua MySQL client cài trên máy host

Yêu cầu: `mysql` client đã cài, container đang chạy (port `3307` được map ra host).

```bash
# Load từng file theo thứ tự
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword           < database/tables.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/seeds.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/procedures.sql

# Load dữ liệu kiểm thử analytics
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/analytics_test_data.sql
```

# Xem tất cả container

docker-compose ps

# Xem log từng service

docker-compose logs mysql
docker-compose logs backend
docker-compose logs frontend

# Xem log realtime

docker-compose logs -f backend

````

---

## Load file SQL vào database

### Tự động (Docker — mặc định)

Khi chạy `docker-compose up`, MySQL tự động thực thi các file trong thư mục `database/` theo thứ tự bảng chữ cái. Thứ tự hiện tại:

| Thứ tự | File             | Mục đích                                   |
| ------ | ---------------- | ------------------------------------------ |
| 1      | `tables.sql`     | Tạo database `DADN` và tất cả bảng         |
| 2      | `seeds.sql`      | Dữ liệu mẫu tối thiểu (users, dryers, ...) |
| 3      | `procedures.sql` | Stored procedures & functions              |

> Để thêm file mới vào luồng tự động, đặt file trong `database/` với tên có prefix đảm bảo đúng thứ tự (ví dụ `04_analytics_test_data.sql`).

---

### Thủ công — qua Docker container đang chạy

```bash
# Load một file SQL bất kỳ vào container đang chạy
docker exec -i driersystem-mysql mysql -u root -prootpassword DADN \
  < database/<ten_file>.sql
````

**Ví dụ — Reset và load lại từ đầu:**

```bash
docker exec -i driersystem-mysql mysql -u root -prootpassword < database/reset.sql
docker exec -i driersystem-mysql mysql -u root -prootpassword < database/tables.sql
docker exec -i driersystem-mysql mysql -u root -prootpassword DADN < database/seeds.sql
docker exec -i driersystem-mysql mysql -u root -prootpassword DADN < database/procedures.sql
```

**Ví dụ — Load dữ liệu kiểm thử analytics (sau seeds.sql):**

```bash
docker exec -i driersystem-mysql mysql -u root -prootpassword DADN \
  < database/analytics_test_data.sql
```

---

### Thủ công — qua MySQL client cài trên máy host

Yêu cầu: `mysql` client đã cài, container đang chạy (port `3307` được map ra host).

```bash
# Load từng file theo thứ tự
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword           < database/tables.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/seeds.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/procedures.sql

# Load dữ liệu kiểm thử analytics
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN      < database/analytics_test_data.sql
```

---

### Load dữ liệu kiểm thử cho `pytest` (backend local)

`test_analytics.py` kết nối thẳng vào DB thật (không mock). Trước khi chạy test, cần load đúng thứ tự:

```bash
# Bước 1 — Reset sạch (nếu cần)
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword < database/reset.sql

# Bước 2 — Tạo lại schema và dữ liệu nền
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword      < database/tables.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN < database/seeds.sql
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN < database/procedures.sql

# Bước 3 — Load dữ liệu kiểm thử analytics
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword DADN < database/analytics_test_data.sql

# Bước 4 — Chạy test
cd backend
pytest test_analytics.py -v
```

---

## Kết nối MySQL thủ công

```bash
# Vào MySQL client bên trong container
docker exec -it driersystem-mysql mysql -u root -prootpassword DADN
```

Các lệnh hay dùng khi đã vào MySQL:

```sql
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM sensor_logs ORDER BY timestamp DESC LIMIT 10;
SHOW PROCEDURE STATUS WHERE Db = 'DADN';
```

---

## Dừng hệ thống

```bash
# Dừng nhưng giữ lại dữ liệu
docker-compose down

# Dừng và xoá toàn bộ dữ liệu (reset sạch)
docker-compose down -v
```

---

## Chạy lại sau khi sửa code

```bash
# Build lại và restart service cụ thể
docker-compose up -d --build backend
docker-compose up -d --build frontend

# Hoặc build lại tất cả
docker-compose up -d --build
```

---

## Biến môi trường

Các giá trị mặc định trong `docker-compose.yml`:

| Biến                  | Giá trị        | Mô tả                               |
| --------------------- | -------------- | ----------------------------------- |
| `DB_HOST`             | `mysql`        | Hostname của MySQL container        |
| `DB_PORT`             | `3306`         | Port MySQL bên trong Docker network |
| `DB_NAME`             | `DADN`         | Tên database                        |
| `DB_USER`             | `root`         | Username                            |
| `DB_PASSWORD`         | `rootpassword` | Mật khẩu root                       |
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | Mật khẩu khởi tạo MySQL             |

Để thay đổi, chỉnh sửa trực tiếp trong `docker-compose.yml` trước khi chạy.

---

## Cấu trúc dự án

```
DrierSystem/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── main.py           # FastAPI app chính
│   ├── test_main.py      # FastAPI app dùng để kiểm thử
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
└── database/
    ├── tables.sql        # Tạo bảng (chạy đầu tiên)
    ├── seeds.sql         # Dữ liệu mẫu (chạy thứ hai)
    ├── procedures.sql    # Stored procedures (chạy thứ ba)
    ├── reset.sql         # Drop database để reset
    └── README.md         # Mô tả chi tiết database
```

---

## Xử lý lỗi thường gặp

**Port 3306 bị chiếm (MySQL local đang chạy):**

> Đã cấu hình host port là `3307` để tránh xung đột. Nếu `3307` cũng bị chiếm, đổi trong `docker-compose.yml`:
>
> ```yaml
> ports:
>   - "3308:3306"
> ```

**Container mysql không healthy sau 30 giây:**

```bash
docker-compose logs mysql
```

**Reset database về trạng thái ban đầu:**

```bash
docker-compose down -v
docker-compose up -d --build mysql
```
