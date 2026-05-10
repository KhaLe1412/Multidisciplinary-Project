# Frontend — DrierSystem

## Giới thiệu

Frontend của DrierSystem là một **Single Page Application (SPA)** được xây dựng bằng **React 18** và **TypeScript**, đóng gói bằng **Vite**, và phục vụ qua **Nginx**. Giao diện cung cấp đầy đủ các chức năng giám sát, điều khiển, quản lý và thống kê cho hệ thống máy sấy nông sản IoT.

---

## Công nghệ sử dụng

| Thư viện / Công cụ                      | Phiên bản       | Mục đích                                               |
| --------------------------------------- | --------------- | ------------------------------------------------------ |
| `react`                                 | 18.3.1          | UI library cốt lõi                                     |
| `typescript`                            | ^6.0.3          | Type safety cho toàn bộ codebase                       |
| `vite`                                  | 6.3.5           | Bundler và dev server siêu nhanh                       |
| `tailwindcss`                           | 4.1.12          | Utility-first CSS framework                            |
| `react-router`                          | 7.13.0          | Client-side routing                                    |
| `recharts`                              | 2.15.2          | Biểu đồ thống kê (line, bar, pie chart)                |
| `lucide-react`                          | 0.487.0         | Bộ icon nhất quán (500+ icons)                         |
| `@radix-ui/*`                           | nhiều phiên bản | Primitive UI components (dialog, select, accordion...) |
| `@mui/material`                         | 7.3.5           | Material UI components bổ sung                         |
| `react-dnd` + `react-dnd-html5-backend` | 16.0.1          | Drag & Drop sắp xếp hàng đợi lịch trình                |
| `react-hook-form`                       | 7.55.0          | Quản lý form và validation                             |
| `motion`                                | 12.23.24        | Animation và transition                                |
| `sonner`                                | 2.0.3           | Toast notifications                                    |
| `date-fns`                              | 3.6.0           | Xử lý và format ngày tháng                             |
| `nginx`                                 | latest          | Phục vụ SPA + reverse proxy tới backend                |

---

## Cấu trúc thư mục

```
frontend/
├── Dockerfile               # Build Vite → copy dist vào Nginx image
├── nginx.conf               # Cấu hình Nginx: SPA routing + API proxy
├── index.html               # HTML shell (entry point Vite)
├── package.json             # Dependencies và scripts
├── vite.config.ts           # Cấu hình Vite
├── tsconfig.json            # Cấu hình TypeScript
├── postcss.config.mjs       # PostCSS cho TailwindCSS
├── docs/                    # Tài liệu kỹ thuật chi tiết
│   ├── API-Endpoints.md     # Mô tả các API call frontend thực hiện
│   ├── Components-Guide.md  # Hướng dẫn sử dụng components
│   ├── Data-Models.md       # Định nghĩa kiểu dữ liệu
│   ├── Frontend-Overview.md # Tổng quan kiến trúc frontend
│   └── UI-UX-Guide.md       # Hướng dẫn thiết kế giao diện
├── guidelines/              # Quy ước code
│   ├── Guidelines.md
│   └── Detailled-Guidelines.md
└── src/
    ├── main.tsx             # Bootstrap React app vào #root
    ├── vite-env.d.ts        # Type declarations cho Vite env vars
    ├── app/
    │   ├── App.tsx          # Root component: ErrorBoundary + AppProvider + Router
    │   ├── routes.ts        # Định nghĩa toàn bộ routes
    │   ├── api/             # Tầng giao tiếp với backend
    │   │   ├── apiClient.ts         # Fetch wrapper, quản lý auth token
    │   │   ├── authApi.ts           # Login, profile
    │   │   ├── controlApi.ts        # Sensor, actuator, batch management
    │   │   ├── deviceManagementApi.ts # Areas, dryers, devices, device types
    │   │   ├── policyApi.ts         # Crops, schedules, rules
    │   │   ├── logsApi.ts           # System logs
    │   │   └── analyticsApi.ts      # Thống kê sản xuất
    │   ├── components/      # Tất cả các trang và UI components
    │   │   ├── Layout.tsx           # Shell layout: sidebar + header + outlet
    │   │   ├── Login.tsx            # Trang đăng nhập
    │   │   ├── Control.tsx          # Danh sách máy sấy (trang chủ)
    │   │   ├── DrierControl.tsx     # Điều khiển chi tiết 1 máy sấy
    │   │   ├── DeviceManagement.tsx # Quản lý khu vực, máy, thiết bị
    │   │   ├── PolicyPage.tsx       # Quản lý nông sản, lịch trình, quy tắc
    │   │   ├── Statistics.tsx       # Trang thống kê và biểu đồ
    │   │   ├── LogsPage.tsx         # Nhật ký hệ thống
    │   │   ├── UsersPage.tsx        # Quản lý người dùng (admin)
    │   │   ├── ProfilePage.tsx      # Hồ sơ cá nhân
    │   │   ├── AlertsPage.tsx       # Trang cảnh báo
    │   │   ├── SchedulePage.tsx     # Xem lịch trình
    │   │   ├── NotificationPanel.tsx # Panel thông báo
    │   │   ├── ConfirmDialog.tsx    # Dialog xác nhận hành động nguy hiểm
    │   │   ├── ErrorBoundary.tsx    # Error boundary bắt crash per-route
    │   │   └── dryer/               # Sub-components cho màn hình DrierControl
    │   │       ├── ActiveBatchPanel.tsx    # Panel hiển thị mẻ đang chạy
    │   │       ├── BatchConfigDnD.tsx      # Cấu hình hàng đợi lịch trình (DnD)
    │   │       ├── LocalScheduleManager.tsx # Quản lý local schedules của máy
    │   │       └── LocalRuleManager.tsx    # Quản lý local rules của máy
    │   ├── context/
    │   │   └── AppContext.tsx        # Global state: auth, dryers, areas, logs...
    │   └── data/
    │       └── mockData.ts          # Type definitions + dữ liệu mẫu ban đầu
    └── styles/
        ├── index.css        # Global styles
        ├── fonts.css        # Import Google Fonts
        ├── tailwind.css     # Tailwind directives
        └── theme.css        # CSS variables cho theme (màu sắc, border-radius)
```

---

## Kiến trúc ứng dụng

### Routing (`routes.ts`)

React Router v7 với cấu trúc nested routes:

```
/login                 → Login (public)
/                      → redirect → /control
/control               → Control (danh sách máy sấy)
/control/:id           → DrierControl (điều khiển 1 máy)
/devices               → DeviceManagement
/policy                → PolicyPage
/statistics            → Statistics
/logs                  → LogsPage
/users                 → UsersPage (admin only)
/profile               → ProfilePage
*                      → redirect → /login
```

Mỗi route được bọc bởi `withErrorBoundary` để cô lập lỗi, tránh crash toàn bộ ứng dụng khi chuyển trang nhanh.

### Global State (`AppContext.tsx`)

`AppProvider` cung cấp toàn bộ state dùng chung thông qua React Context:

- **Xác thực**: `isAuthenticated`, `currentUser`, `login()`, `logout()`.
- **Dữ liệu từ API**: `dryers`, `areas`, `deviceTypes`, `schedules`, `fruits`, `systemLogs`.
- **Thông báo**: `notifications`, `notificationOpen`.
- **Quản lý mẻ sấy**: `batchRecords`, `addBatchRecord()`.
- **Quản lý người dùng**: `users`, `updateCurrentUser()`.

Khi người dùng đăng nhập thành công, AppContext tự động fetch dữ liệu ban đầu (danh sách máy sấy, khu vực, loại thiết bị, lịch trình, quy tắc, logs) để populate toàn bộ giao diện.

### Tầng API (`src/app/api/`)

Tất cả giao tiếp với backend đi qua `apiClient.ts` — một wrapper dùng `fetch` với:

- Tự động đính kèm Bearer token vào header `Authorization`.
- `setAuthToken()` / `clearAuthToken()` / `getAuthToken()` để quản lý vòng đời token.
- Base URL cấu hình qua biến môi trường `VITE_GATEWAY_URL` (để trống khi deploy qua Nginx proxy).

---

## Các trang (Pages)

### `Control` — Tổng quan máy sấy

- Hiển thị danh sách tất cả máy sấy theo dạng card grid.
- Mỗi card hiển thị: tên máy, trạng thái (`off/on/running`), khu vực, thông tin mẻ đang chạy.
- Click vào card → điều hướng tới `/control/:id`.

### `DrierControl` — Điều khiển máy sấy chi tiết

Trang phức tạp nhất, tập hợp nhiều panels:

1. **Sensor Panel**: polling 5 giây, hiển thị giá trị cảm biến hiện tại kèm sparkline (10 điểm gần nhất) dùng Recharts.
2. **Actuator Panel**: nút bật/tắt và slider điều chỉnh giá trị cho từng thiết bị controller. Gửi lệnh trực tiếp qua `POST /api/device/{feed_id}`.
3. **ActiveBatchPanel**: hiển thị trạng thái mẻ đang chạy (runtime countdown, trạng thái schedule/rule engine).
4. **BatchConfigDnD**: cấu hình hàng đợi lịch trình trước khi bắt đầu mẻ. Dùng `react-dnd` để kéo thả sắp xếp thứ tự local schedules.
5. **LocalScheduleManager**: xem, tạo, xóa local schedules cho máy — liên kết thiết bị ảo của schedule với thiết bị thực của máy.
6. **LocalRuleManager**: tương tự cho local rules.

### `DeviceManagement` — Quản lý thiết bị

- Tab "Khu vực": CRUD khu vực (`areas`), hiển thị danh sách máy sấy trong từng khu vực.
- Tab "Máy sấy": CRUD máy sấy, thêm/xóa thiết bị gắn vào máy.
- Tab "Loại thiết bị": CRUD loại thiết bị (sensor/controller), cấu hình unit và range giá trị.

### `PolicyPage` — Chính sách tự động hoá

- Tab "Nông sản": CRUD danh mục nông sản.
- Tab "Lịch trình": CRUD lịch trình — tạo thiết bị ảo, thêm giai đoạn với `start_offset`, định nghĩa hành động cho từng giai đoạn.
- Tab "Quy tắc": CRUD quy tắc — tạo thiết bị ảo, thêm value pairs với điều kiện (toán tử so sánh) và hành động tương ứng.

### `Statistics` — Thống kê sản xuất

Kết nối với `/api/analytics`, hiển thị:

- **Cards tổng quan**: tổng số mẻ, tổng giờ hoạt động, tổng kg xử lý, ước tính kWh tiêu thụ.
- **Biểu đồ sản xuất theo ngày**: LineChart/BarChart (Recharts) cho khối lượng vào/ra theo ngày.
- **Thống kê theo nông sản**: PieChart phân bổ số mẻ theo loại nông sản.
- **Phân phối đánh giá**: BarChart đánh giá chất lượng mẻ sấy (1–5 sao).
- **Hiệu suất từng máy**: bảng so sánh số mẻ, giờ chạy, tổng khối lượng.
- Bộ lọc: theo khoảng ngày, theo máy sấy cụ thể.

### `LogsPage` — Nhật ký hệ thống

- Hiển thị bảng log với cột: thời gian, loại sự kiện, mức độ nghiêm trọng, người thực hiện, mô tả.
- Lọc theo loại sự kiện, mức độ, và từ khoá tìm kiếm.
- Badge màu theo severity: `info` (xanh), `warning` (vàng), `error` (đỏ).

### `UsersPage` — Quản lý người dùng

- Chỉ admin truy cập.
- Danh sách người dùng với role badge và trạng thái active/disabled.
- Tạo tài khoản mới, cập nhật thông tin, đặt lại mật khẩu, vô hiệu hoá tài khoản.

### `ProfilePage` — Hồ sơ cá nhân

- Xem và sửa thông tin cá nhân (họ tên, email, số điện thoại).
- Đổi mật khẩu (yêu cầu nhập mật khẩu hiện tại).

---

## Cấu hình Nginx (`nginx.conf`)

```nginx
# Proxy API calls tới backend — tránh CORS, ẩn port backend
location /api/ {
    proxy_pass http://backend:8000/api/;
}

# SPA routing — mọi route trả về index.html để React Router xử lý
location / {
    try_files $uri $uri/ /index.html;
}

# Cache lâu dài cho static assets (Vite đã hash tên file)
location ~* \.(js|css|png|jpg|...)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Nginx đóng vai trò:

1. **Static file server** cho bundle React đã build.
2. **Reverse proxy** chuyển tiếp `/api/*` tới `backend:8000` — frontend không cần biết địa chỉ backend, tránh vấn đề CORS trong môi trường production.
3. **Bật gzip** cho CSS, JS, JSON để giảm dung lượng tải.

---

## Triển khai với Docker

```dockerfile
# Stage 1: Build với Vite
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GATEWAY_URL
RUN npm run build

# Stage 2: Phục vụ với Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- Multi-stage build: stage 1 build bundle, stage 2 chỉ copy `dist/` vào Nginx image — image cuối rất nhỏ.
- `VITE_GATEWAY_URL` được truyền vào lúc build: để trống khi deploy qua Nginx proxy (URL tương đối), hoặc đặt URL cụ thể khi gọi API trực tiếp.

## Chạy local (không Docker)

```bash
cd frontend
npm install
npm run dev       # Dev server tại http://localhost:5173
npm run build     # Build production bundle vào dist/
```

---

## Biến môi trường

| Biến               | Mô tả                    | Giá trị                                         |
| ------------------ | ------------------------ | ----------------------------------------------- |
| `VITE_GATEWAY_URL` | Base URL của backend API | `""` (Nginx proxy) hoặc `http://localhost:8000` |

---

## Tài liệu kỹ thuật

Chi tiết về từng thành phần được mô tả trong thư mục [docs/](docs/):

- [Frontend-Overview.md](docs/Frontend-Overview.md) — Kiến trúc tổng quan
- [Components-Guide.md](docs/Components-Guide.md) — Hướng dẫn từng component
- [API-Endpoints.md](docs/API-Endpoints.md) — Các API call thực hiện từ frontend
- [Data-Models.md](docs/Data-Models.md) — Kiểu dữ liệu TypeScript
- [UI-UX-Guide.md](docs/UI-UX-Guide.md) — Nguyên tắc thiết kế giao diện
