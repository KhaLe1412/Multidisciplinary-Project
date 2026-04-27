# Tài liệu bảo trì Frontend — Hệ thống điều khiển máy sấy (DryerControl)

> Cập nhật: 19/04/2026

---

## 1. Tổng quan kiến trúc

| Thành phần    | Công nghệ                 | Phiên bản |
| ------------- | ------------------------- | --------- |
| Framework     | React                     | 18.3.1    |
| Ngôn ngữ      | TypeScript                | 6.0.3     |
| Build tool    | Vite                      | 6.3.5     |
| CSS framework | TailwindCSS               | 4.1.12    |
| UI primitives | Radix UI                  | 1.x – 2.x |
| Routing       | React Router              | 7.13.0    |
| Biểu đồ       | Recharts                  | 2.15.2    |
| Kéo thả       | react-dnd + HTML5 backend | 16.0.1    |
| Icons         | lucide-react              | 0.487.0   |
| Form          | react-hook-form           | 7.55.0    |
| Toast         | sonner                    | 2.0.3     |
| Date          | date-fns                  | 3.6.0     |
| Animation     | motion (Framer Motion)    | 12.23.24  |

**Giao tiếp API:** Fetch API + JWT token lưu trong `localStorage`.  
**Base URL:** `http://127.0.0.1:8001` (cấu hình qua biến `VITE_GATEWAY_URL`).

---

## 2. Cấu trúc thư mục

```
frontend/
├── index.html                 # HTML entry point
├── package.json               # Dependencies & scripts
├── vite.config.ts             # Vite config (React + Tailwind plugins, alias @→./src)
├── tsconfig.json              # TypeScript strict mode, ESM, nodenext
├── postcss.config.mjs         # PostCSS config
├── nginx.conf                 # Nginx config (Docker production)
├── Dockerfile                 # Docker build
│
├── docs/                      # Tài liệu thiết kế
│   ├── Frontend-Overview.md
│   ├── Components-Guide.md
│   ├── Data-Models.md
│   ├── API-Endpoints.md
│   └── UI-UX-Guide.md
│
├── guidelines/                # Quy tắc phát triển
│   ├── Guidelines.md
│   └── Detailled-Guidelines.md
│
└── src/
    ├── main.tsx               # Bootstrap: mount <App/> vào DOM
    ├── vite-env.d.ts          # Vite type declarations
    │
    ├── styles/
    │   ├── index.css           # Import tổng hợp: fonts + tailwind + theme
    │   ├── tailwind.css        # Tailwind directives & source scan
    │   ├── theme.css           # CSS variables (light/dark), typography @layer
    │   └── fonts.css           # Font-face (hiện trống)
    │
    └── app/
        ├── App.tsx             # Root: ErrorBoundary → AppProvider → RouterProvider
        ├── routes.ts           # Định nghĩa routes (xem bảng ở mục 4)
        │
        ├── context/
        │   └── AppContext.tsx   # Global state (xem mục 5)
        │
        ├── api/                # Các module gọi API backend (xem mục 6)
        │   ├── apiClient.ts
        │   ├── authApi.ts
        │   ├── controlApi.ts
        │   ├── deviceManagementApi.ts
        │   ├── policyApi.ts
        │   ├── logsApi.ts
        │   └── analyticsApi.ts
        │
        ├── data/
        │   └── mockData.ts     # Type definitions + dữ liệu mẫu (xem mục 7)
        │
        └── components/
            ├── Layout.tsx           # Khung chính: sidebar + header + outlet
            ├── Login.tsx            # Đăng nhập
            ├── ErrorBoundary.tsx    # Bắt lỗi React
            ├── ConfirmDialog.tsx    # Dialog xác nhận
            ├── NotificationPanel.tsx # Panel thông báo
            ├── Control.tsx          # Danh sách máy sấy
            ├── DrierControl.tsx     # Điều khiển chi tiết 1 máy sấy (★ file lớn nhất)
            ├── DeviceManagement.tsx # CRUD khu vực, loại thiết bị, máy sấy, thiết bị
            ├── PolicyPage.tsx       # Quản lý lịch trình & quy tắc cảnh báo
            ├── Statistics.tsx       # Dashboard phân tích
            ├── LogsPage.tsx         # Nhật ký hệ thống
            ├── UsersPage.tsx        # Quản lý người dùng (admin)
            ├── ProfilePage.tsx      # Hồ sơ cá nhân
            ├── AlertsPage.tsx       # Trang cảnh báo
            ├── SchedulePage.tsx     # Trình soạn lịch trình (legacy)
            │
            ├── dryer/                    # Sub-components cho DrierControl
            │   ├── LocalScheduleManager.tsx  # CRUD lịch trình cục bộ
            │   ├── LocalRuleManager.tsx      # CRUD quy tắc cục bộ
            │   ├── BatchConfigDnD.tsx        # Cấu hình mẻ sấy (kéo thả)
            │   └── ActiveBatchPanel.tsx      # Quản lý mẻ sấy đang chạy
            │
            ├── figma/
            │   └── ImageWithFallback.tsx     # Component ảnh có fallback
            │
            └── ui/                   # 46 UI primitives (Radix + Tailwind)
                ├── accordion.tsx
                ├── alert-dialog.tsx
                ├── alert.tsx
                ├── aspect-ratio.tsx
                ├── avatar.tsx
                ├── badge.tsx
                ├── breadcrumb.tsx
                ├── button.tsx
                ├── calendar.tsx
                ├── card.tsx
                ├── carousel.tsx
                ├── chart.tsx
                ├── checkbox.tsx
                ├── collapsible.tsx
                ├── command.tsx
                ├── context-menu.tsx
                ├── dialog.tsx
                ├── drawer.tsx
                ├── dropdown-menu.tsx
                ├── form.tsx
                ├── hover-card.tsx
                ├── input-otp.tsx
                ├── input.tsx
                ├── label.tsx
                ├── menubar.tsx
                ├── navigation-menu.tsx
                ├── pagination.tsx
                ├── popover.tsx
                ├── progress.tsx
                ├── radio-group.tsx
                ├── scroll-area.tsx
                ├── select.tsx
                ├── separator.tsx
                ├── sheet.tsx
                ├── sidebar.tsx
                ├── skeleton.tsx
                ├── slider.tsx
                ├── sonner.tsx
                ├── switch.tsx
                ├── table.tsx
                ├── tabs.tsx
                ├── textarea.tsx
                ├── toggle-group.tsx
                ├── toggle.tsx
                ├── tooltip.tsx
                ├── use-mobile.ts      # Hook phát hiện mobile
                └── utils.ts           # cn() helper (clsx + tailwind-merge)
```

---

## 3. Scripts

| Lệnh            | Mô tả                           |
| --------------- | ------------------------------- |
| `npm run dev`   | Khởi chạy dev server (Vite HMR) |
| `npm run build` | Build production (`dist/`)      |

---

## 4. Routing (`routes.ts`)

| Đường dẫn      | Component             | Mô tả                         |
| -------------- | --------------------- | ----------------------------- |
| `/login`       | `Login`               | Trang đăng nhập               |
| `/`            | redirect → `/control` | Trang chủ                     |
| `/control`     | `Control`             | Danh sách máy sấy             |
| `/control/:id` | `DrierControl`        | Điều khiển chi tiết 1 máy sấy |
| `/devices`     | `DeviceManagement`    | Quản lý thiết bị              |
| `/policy`      | `PolicyPage`          | Quản lý chính sách sấy        |
| `/statistics`  | `Statistics`          | Thống kê & phân tích          |
| `/logs`        | `LogsPage`            | Nhật ký hệ thống              |
| `/users`       | `UsersPage`           | Quản lý người dùng (admin)    |
| `/profile`     | `ProfilePage`         | Hồ sơ cá nhân                 |
| `*`            | redirect → `/login`   | Route không hợp lệ            |

Mỗi trang bọc bởi `withErrorBoundary()` để cô lập lỗi.

---

## 5. Global State (`AppContext.tsx`)

### State được quản lý

| State             | Kiểu                  | Mô tả                     |
| ----------------- | --------------------- | ------------------------- |
| `isAuthenticated` | `boolean`             | Trạng thái đăng nhập      |
| `currentUser`     | `UserAccount \| null` | Người dùng hiện tại       |
| `dryers`          | `Dryer[]`             | Danh sách máy sấy         |
| `areas`           | `Area[]`              | Danh sách khu vực         |
| `deviceTypes`     | `DeviceTypeModel[]`   | Danh sách loại thiết bị   |
| `schedules`       | `Schedule[]`          | Lịch trình sấy (global)   |
| `fruits`          | `Fruit[]`             | Danh sách nông sản        |
| `alertRules`      | `AlertRule[]`         | Quy tắc cảnh báo (global) |
| `notifications`   | `Notification[]`      | Thông báo                 |
| `systemAlerts`    | `SystemAlertEntry[]`  | Cảnh báo hệ thống         |
| `systemLogs`      | `SystemLog[]`         | Nhật ký hệ thống          |
| `batchRecords`    | `BatchRecord[]`       | Lịch sử mẻ sấy            |
| `users`           | `UserAccount[]`       | Danh sách tài khoản       |

### Phương thức chính

| Phương thức                  | Mô tả                                  |
| ---------------------------- | -------------------------------------- |
| `login(email, password)`     | Đăng nhập, lưu JWT, fetch toàn bộ data |
| `logout()`                   | Xóa token, reset state                 |
| `addBatchRecord(record)`     | Thêm bản ghi mẻ sấy                    |
| `addLog(log)`                | Thêm nhật ký                           |
| `updateCurrentUser(updates)` | Cập nhật hồ sơ                         |

### API được gọi khi đăng nhập thành công

```
GET /api/areas          → areas
GET /api/device-types   → deviceTypes
GET /api/dryers         → dryers
GET /api/crops          → fruits
GET /api/schedules      → schedules
GET /api/rules          → alertRules
GET /api/logs           → systemLogs
```

---

## 6. API Modules (`src/app/api/`)

### 6.1. `apiClient.ts` — Quản lý token

| Hàm                   | Mô tả                                    |
| --------------------- | ---------------------------------------- |
| `getAuthToken()`      | Lấy JWT từ localStorage                  |
| `setAuthToken(token)` | Lưu JWT                                  |
| `clearAuthToken()`    | Xóa JWT                                  |
| `getAuthHeaders()`    | Trả về `{ Authorization: "Bearer ..." }` |

### 6.2. `authApi.ts` — Xác thực

| Hàm                         | Method | Endpoint          | Mô tả                                      |
| --------------------------- | ------ | ----------------- | ------------------------------------------ |
| `apiLogin(email, password)` | POST   | `/api/auth/login` | Đăng nhập, trả về `{ access_token, user }` |

### 6.3. `deviceManagementApi.ts` — Quản lý thiết bị

**Khu vực (Areas):**

| Hàm                       | Method | Endpoint          |
| ------------------------- | ------ | ----------------- |
| `apiFetchAreas()`         | GET    | `/api/areas`      |
| `apiCreateArea(body)`     | POST   | `/api/areas`      |
| `apiUpdateArea(id, body)` | PUT    | `/api/areas/{id}` |
| `apiDeleteArea(id)`       | DELETE | `/api/areas/{id}` |

**Loại thiết bị (Device Types):**

| Hàm                             | Method | Endpoint                 |
| ------------------------------- | ------ | ------------------------ |
| `apiFetchDeviceTypes()`         | GET    | `/api/device-types`      |
| `apiCreateDeviceType(body)`     | POST   | `/api/device-types`      |
| `apiUpdateDeviceType(id, body)` | PUT    | `/api/device-types/{id}` |
| `apiDeleteDeviceType(id)`       | DELETE | `/api/device-types/{id}` |

**Máy sấy (Dryers):**

| Hàm                        | Method | Endpoint           |
| -------------------------- | ------ | ------------------ |
| `apiFetchDryers()`         | GET    | `/api/dryers`      |
| `apiCreateDryer(body)`     | POST   | `/api/dryers`      |
| `apiUpdateDryer(id, body)` | PUT    | `/api/dryers/{id}` |
| `apiDeleteDryer(id)`       | DELETE | `/api/dryers/{id}` |

**Thiết bị (Devices — thuộc máy sấy):**

| Hàm                                        | Method | Endpoint                                   |
| ------------------------------------------ | ------ | ------------------------------------------ |
| `apiCreateDevice(dryerId, body)`           | POST   | `/api/dryers/{dryerId}/devices`            |
| `apiUpdateDevice(dryerId, deviceId, body)` | PUT    | `/api/dryers/{dryerId}/devices/{deviceId}` |
| `apiDeleteDevice(dryerId, deviceId)`       | DELETE | `/api/dryers/{dryerId}/devices/{deviceId}` |

### 6.4. `controlApi.ts` — Điều khiển thời gian thực

**Cảm biến:**

| Hàm                         | Method | Endpoint                    | Mô tả                |
| --------------------------- | ------ | --------------------------- | -------------------- |
| `fetchDryerSensors(feedId)` | GET    | `/api/device/{feedId}`      | Đọc giá trị cảm biến |
| `fetchDeviceLogs(feedId)`   | GET    | `/api/device/{feedId}/logs` | Lịch sử giá trị      |

**Điều khiển:**

| Hàm                                    | Method | Endpoint                       | Mô tả               |
| -------------------------------------- | ------ | ------------------------------ | ------------------- |
| `sendActuatorCommand(feedId, command)` | POST   | `/api/device/{feedId}?value=X` | Gửi lệnh điều khiển |

**Mẻ sấy (Batch):**

| Hàm                                                    | Method | Endpoint                | Mô tả           |
| ------------------------------------------------------ | ------ | ----------------------- | --------------- |
| `apiStartBatch(dryerId, cropId, inputWeight, runtime)` | POST   | `/api/batches/start`    | Bắt đầu mẻ sấy  |
| `apiEndBatch(batchId, outputWeight, rating)`           | PUT    | `/api/batches/{id}/end` | Kết thúc mẻ sấy |

**Lịch trình mẻ sấy (Batch Schedules):**

| Hàm                                             | Method | Endpoint                                | Mô tả                             |
| ----------------------------------------------- | ------ | --------------------------------------- | --------------------------------- |
| `apiGetBatchSchedules(batchId)`                 | GET    | `/api/batches/{id}/schedules`           | Lấy hàng đợi + trạng thái enabled |
| `apiAddBatchSchedules(batchId, ids[])`          | POST   | `/api/batches/{id}/schedules`           | Thêm lịch trình vào hàng đợi      |
| `apiRemoveBatchScheduleEntry(batchId, entryId)` | DELETE | `/api/batches/{id}/schedules/{entryId}` | Xóa 1 mục                         |
| `apiClearBatchSchedules(batchId)`               | DELETE | `/api/batches/{id}/schedules`           | Xóa toàn bộ                       |
| `apiToggleBatchSchedules(batchId, enabled)`     | PUT    | `/api/batches/{id}/schedules/toggle`    | Bật/tắt tự động lịch trình        |

**Quy tắc mẻ sấy (Batch Rules):**

| Hàm                                     | Method | Endpoint                           | Mô tả                                |
| --------------------------------------- | ------ | ---------------------------------- | ------------------------------------ |
| `apiGetBatchRules(batchId)`             | GET    | `/api/batches/{id}/rules`          | Lấy tập quy tắc + trạng thái enabled |
| `apiAddBatchRules(batchId, ids[])`      | POST   | `/api/batches/{id}/rules`          | Thêm quy tắc                         |
| `apiRemoveBatchRule(batchId, ruleId)`   | DELETE | `/api/batches/{id}/rules/{ruleId}` | Xóa quy tắc                          |
| `apiToggleBatchRules(batchId, enabled)` | PUT    | `/api/batches/{id}/rules/toggle`   | Bật/tắt quy tắc                      |

**Lịch trình & quy tắc cục bộ (Local — thuộc máy sấy):**

| Hàm                                         | Method | Endpoint                                | Mô tả                        |
| ------------------------------------------- | ------ | --------------------------------------- | ---------------------------- |
| `apiGetLocalSchedules(dryerId)`             | GET    | `/api/dryers/{id}/local-schedules`      | Lấy danh sách                |
| `apiCreateLocalSchedule(dryerId, body)`     | POST   | `/api/dryers/{id}/local-schedules`      | Tạo mới (kèm device mapping) |
| `apiUpdateLocalSchedule(dryerId, id, body)` | PUT    | `/api/dryers/{id}/local-schedules/{id}` | Cập nhật                     |
| `apiDeleteLocalSchedule(dryerId, id)`       | DELETE | `/api/dryers/{id}/local-schedules/{id}` | Xóa                          |
| `apiGetLocalRules(dryerId)`                 | GET    | `/api/dryers/{id}/local-rules`          | Lấy danh sách                |
| `apiCreateLocalRule(dryerId, body)`         | POST   | `/api/dryers/{id}/local-rules`          | Tạo mới (kèm device mapping) |
| `apiUpdateLocalRule(dryerId, id, body)`     | PUT    | `/api/dryers/{id}/local-rules/{id}`     | Cập nhật                     |
| `apiDeleteLocalRule(dryerId, id)`           | DELETE | `/api/dryers/{id}/local-rules/{id}`     | Xóa                          |

**Kiểu dữ liệu trả về quan trọng:**

```typescript
LocalScheduleData {
  id, dryer_id, schedule_id, name, created_at
  schedule_name?, mappings?: { id, schedule_virtual_device_id, device_id }[]
}

LocalRuleData {
  id, dryer_id, rule_id, name, created_at
  rule_name?, mappings?: { id, rule_virtual_device_id, device_id }[]
}

BatchScheduleQueueEntry {
  id, batch_id, local_schedule_id, queue_order, status
  started_at, completed_at, local_schedule_name, schedule_name
}

BatchRuleSetEntry {
  id, batch_id, local_rule_id, priority_order
  local_rule_name, rule_name
}
```

### 6.5. `policyApi.ts` — Chính sách sấy

**Nông sản:**

| Hàm                       | Method | Endpoint          |
| ------------------------- | ------ | ----------------- |
| `apiFetchCrops()`         | GET    | `/api/crops`      |
| `apiCreateCrop(body)`     | POST   | `/api/crops`      |
| `apiUpdateCrop(id, body)` | PUT    | `/api/crops/{id}` |
| `apiDeleteCrop(id)`       | DELETE | `/api/crops/{id}` |

**Lịch trình global:**

| Hàm                     | Method   | Endpoint              |
| ----------------------- | -------- | --------------------- |
| `apiFetchSchedules()`   | GET      | `/api/schedules`      |
| `apiSaveSchedule(body)` | POST/PUT | `/api/schedules`      |
| `apiDeleteSchedule(id)` | DELETE   | `/api/schedules/{id}` |

**Quy tắc cảnh báo global:**

| Hàm                 | Method   | Endpoint          |
| ------------------- | -------- | ----------------- |
| `apiFetchRules()`   | GET      | `/api/rules`      |
| `apiSaveRule(body)` | POST/PUT | `/api/rules`      |
| `apiDeleteRule(id)` | DELETE   | `/api/rules/{id}` |

### 6.6. `logsApi.ts` — Nhật ký

| Hàm                                   | Method | Endpoint                       | Mô tả                  |
| ------------------------------------- | ------ | ------------------------------ | ---------------------- |
| `apiFetchSystemLogs()`                | GET    | `/api/logs`                    | Toàn bộ nhật ký        |
| `apiFetchDryerLogs(dryerId, sinceId)` | GET    | `/api/logs/dryer/{id}?since=X` | Nhật ký theo máy sấy   |
| `apiFetchEventTypes()`                | GET    | `/api/logs/event-types`        | Danh sách loại sự kiện |

### 6.7. `analyticsApi.ts` — Phân tích

| Hàm                                        | Method | Endpoint                              | Mô tả                                  |
| ------------------------------------------ | ------ | ------------------------------------- | -------------------------------------- |
| `apiFetchOverview(from?, to?, dryerId?)`   | GET    | `/api/analytics/overview`             | Tổng quan (summary, daily, crop stats) |
| `apiFetchDryerStats(from?, to?, dryerId?)` | GET    | `/api/analytics/dryers`               | Thống kê theo máy sấy                  |
| `apiFetchBatchSensors(batchId)`            | GET    | `/api/analytics/batches/{id}/sensors` | Dữ liệu cảm biến của mẻ sấy            |

---

## 7. Kiểu dữ liệu chính (`mockData.ts`)

### Thiết bị & Hạ tầng

```typescript
DeviceTypeModel {
  id: string, name: string, description: string, unit: string
  valueRange?: { min: number, max: number }
  category: 'sensor' | 'controller'
  valueType?: 'number' | 'boolean' | 'text'
  createdAt: string
}

Device {
  id: string, name: string, deviceTypeId: string, status: boolean
  value?: number, speed?: number, temperature?: number
  open?: boolean, motion?: boolean, message?: string
  power?: number, installDate?: string
}

Area {
  id: string, name: string, description: string
  manager?: string, managerId?: string, createdAt: string
}

Dryer {
  id: string, name: string, status: 'off' | 'on' | 'running'
  areaId: string, operator?: string, managerId?: string
  mode: 'manual' | 'threshold' | 'schedule'
  devices: Device[], activeBatch?: ActiveBatch
  capacity?: number, createdAt: string
}
```

### Nông sản

```typescript
Fruit {
  id: string, name: string, description?: string, createdAt: string
  recommendedTempMin?: number, recommendedTempMax?: number
  recommendedHumidityMin?: number, recommendedHumidityMax?: number
}
```

### Chính sách sấy

```typescript
// Đối tượng ảo (slot thiết bị trong template)
PolicyObject {
  id: string, deviceTypeId: string, label: string
}

// Hành động gán giá trị cho đối tượng ảo
PolicyAction {
  objectId: string, value: number | string
}

// Lịch trình sấy
Schedule {
  id: string, name: string, fruitId: string, createdAt: string
  objects: PolicyObject[]        // Các slot thiết bị ảo
  phases: SchedulePhase[]        // Các giai đoạn sấy
}

SchedulePhase {
  id: string, name: string, offsetSeconds: number
  actions: PolicyAction[]
  duration?: number
}

// Quy tắc cảnh báo
AlertRule {
  id: string, name: string, description?: string
  fruitId: string, createdAt: string, active: boolean
  objects: PolicyObject[]
  pairs: AlertConditionActionPair[]
}

AlertConditionActionPair {
  id: string, name?: string
  conditions: AlertCondition[]   // AND logic
  actions: PolicyAction[]
}

AlertCondition {
  objectId: string
  operator: '>' | '<' | '=' | '>=' | '<='
  value: number
}
```

### Người dùng & Phân quyền

```typescript
UserAccount {
  id: string, name: string, email: string, password: string
  phone?: string, role: 'admin' | 'operator' | 'viewer'
  avatar: string, permissions: UserPermissions
  active: boolean, createdAt: string, lastLogin?: string
}

UserPermissions {
  control: boolean, controlDryers: string[] | 'all'
  devices: boolean, deviceDryers: string[] | 'all'
  policy: boolean, statistics: boolean, logs: boolean
}
```

### Mẻ sấy

```typescript
ActiveBatch {
  fruitId: string, inputWeight: number
  runSeconds: number, startedAt: string
  mode?: string, scheduleEnabled?: boolean, ruleEnabled?: boolean
}

BatchRecord {
  id: string, dryerId: string, dryerName: string
  fruitId: string, fruitName: string
  inputWeight: number, outputWeight?: number, rating?: number
  startTime: string, endTime?: string, totalMinutes?: number
  completed: boolean
}
```

### Nhật ký & Thông báo

```typescript
SystemLog {
  id: string, eventType: LogEventType, time: string
  user: string, description: string
  dryerId?: string, severity: LogSeverity
}

Notification {
  id: string, type: 'warning' | 'info' | 'error' | 'success'
  title: string, message: string, time: string, read: boolean
}
```

### Hàm tiện ích

| Hàm                            | Mô tả                         |
| ------------------------------ | ----------------------------- |
| `buildPhaseActionDesc(action)` | Mô tả hành động giai đoạn sấy |
| `formatOffsetSeconds(seconds)` | Format giây → `Xh Ym Zs`      |
| `buildActionsDesc(actions[])`  | Ghép mô tả nhiều hành động    |

---

## 8. Components — Chi tiết

### 8.1. `Layout.tsx` — Khung chính

- Sidebar co giãn (220px ↔ 64px) với điều hướng
- Header: chuông thông báo (badge số chưa đọc) + menu user (đăng xuất)
- Điều hướng: Control, Devices, Policy, Statistics, Logs, Users (chỉ admin), Profile
- Logo "DryerControl" + biểu tượng nhà máy

### 8.2. `Login.tsx` — Đăng nhập

- Layout 2 cột: hero bên trái, form bên phải
- Ẩn/hiện mật khẩu, "Quên mật khẩu", nút Google SSO (chỉ UI)

### 8.3. `Control.tsx` — Danh sách máy sấy

- Tìm kiếm theo tên
- Lọc theo trạng thái: `off` / `on` / `running`
- Badge chế độ: `manual` / `threshold` / `schedule`
- Click mở modal chi tiết (tab Info + Devices)

### 8.4. `DrierControl.tsx` — Điều khiển máy sấy ★

**File lớn nhất (~1560 dòng).** Quản lý toàn bộ giao diện điều khiển 1 máy sấy.

**Cấu trúc JSX chính:**

```
┌─────────────────────────────────────────────┐
│ Header: tên máy, trạng thái, chế độ        │
├─────────────────────────────────────────────┤
│ BatchConfigDnD (khi không active)           │
│   → Cấu hình mẻ sấy mới bằng kéo thả      │
├─────────────────────────────────────────────┤
│ LocalScheduleManager + LocalRuleManager     │
│   → CRUD lịch trình/quy tắc cục bộ (grid)  │
│   → Disabled khi đang chạy mẻ sấy          │
├─────────────────────────────────────────────┤
│ ActiveBatchPanel (khi đang active)          │
│   → Quản lý hàng đợi + quy tắc đang chạy  │
├───────────────────┬─────────────────────────┤
│ LEFT: Actuators   │ RIGHT: Sensors          │
│   Điều khiển      │   Biểu đồ sparkline    │
│   (on/off, slider)│   + giá trị thời gian  │
│                   │   thực                  │
├───────────────────┴─────────────────────────┤
│ Device Grid: tất cả thiết bị + giá trị     │
├─────────────────────────────────────────────┤
│ Logs: nhật ký gần đây                       │
├─────────────────────────────────────────────┤
│ Rating Modal (khi hoàn thành mẻ sấy)       │
└─────────────────────────────────────────────┘
```

**State chính:**

| State                                                | Mô tả                             |
| ---------------------------------------------------- | --------------------------------- |
| `sensorData`                                         | Giá trị cảm biến thời gian thực   |
| `sensorHistory`                                      | Lịch sử giá trị (cho sparkline)   |
| `localSchedules`                                     | Lịch trình cục bộ của máy sấy này |
| `localRules`                                         | Quy tắc cục bộ của máy sấy này    |
| `batchScheduleQueue`                                 | Hàng đợi lịch trình mẻ sấy        |
| `batchRuleSet`                                       | Tập quy tắc mẻ sấy                |
| `batchSchedulesEnabled`                              | Bật/tắt tự động lịch trình        |
| `batchRulesEnabled`                                  | Bật/tắt tự động quy tắc           |
| `serverBatchId`                                      | ID mẻ sấy trên server             |
| `showRating`                                         | Hiện modal đánh giá               |
| `batchFruitId, batchWeight, batchRunSec, useRuntime` | Cấu hình mẻ sấy                   |

**Polling (mỗi 3 giây khi active):**

- `fetchDryerSensors(feedId)` cho mỗi thiết bị
- `apiGetBatchSchedules(batchId)` → cập nhật hàng đợi
- `apiGetBatchRules(batchId)` → cập nhật tập quy tắc

### 8.5. `dryer/LocalScheduleManager.tsx` — Quản lý lịch trình cục bộ

**Props:**

```typescript
{
  dryerId: number
  schedules: Schedule[]          // Global schedules (từ AppContext)
  devices: Device[]              // Thiết bị thật trên máy sấy
  deviceTypes: DeviceTypeModel[]
  localSchedules: LocalScheduleData[]
  setLocalSchedules: setter
  disabled: boolean              // true khi đang chạy mẻ sấy
}
```

**Chức năng:**

- **Tạo mới:** Chọn lịch trình global → hiển thị virtual devices → map sang thiết bị thật → đặt tên → lưu
- **Xem chi tiết:** Bấm mở rộng → xem phases + device mapping (tên thiết bị thật)
- **Sửa:** Thay đổi device mapping hoặc tên
- **Xóa:** Có confirm
- Giao diện màu **xanh dương (blue)**

**Sub-components nội bộ:**

- `ScheduleModal` — Modal tạo/sửa với dropdown global schedule + mapping grid
- `ScheduleDetailRow` — Hàng chi tiết mở rộng (phases + mappings)

### 8.6. `dryer/LocalRuleManager.tsx` — Quản lý quy tắc cục bộ

Tương tự LocalScheduleManager nhưng cho quy tắc cảnh báo.  
Giao diện màu **tím (purple)**.

**Sub-components nội bộ:**

- `RuleModal` — Modal tạo/sửa với dropdown global rule + mapping grid
- `RuleDetailRow` — Hàng chi tiết (condition-action pairs + mappings)

### 8.7. `dryer/BatchConfigDnD.tsx` — Cấu hình mẻ sấy (kéo thả)

**Props:**

```typescript
{
  fruits: Fruit[]
  localSchedules: LocalScheduleData[]
  localRules: LocalRuleData[]
  batchFruitId, setBatchFruitId
  batchWeight, setBatchWeight
  batchRunSec, setBatchRunSec
  useRuntime, setUseRuntime
  onStart: (scheduleIds: number[], ruleIds: number[]) => void
}
```

**Chức năng:**

- Form cấu hình: chọn nông sản, nhập khối lượng, giới hạn thời gian
- **Hàng đợi lịch trình (DnD):** Checkbox bật → kéo từ danh sách available → thả vào queue → sắp xếp lại
- **Tập quy tắc (DnD):** Checkbox bật → kéo → thả (mỗi quy tắc chỉ 1 lần) → sắp xếp ưu tiên
- Nút "Bắt đầu sấy" → gọi `onStart(scheduleIds, ruleIds)`

**DnD Types:** `SCHEDULE_ITEM`, `RULE_ITEM`, `QUEUE_ITEM`, `RULESET_ITEM`  
**Bọc bởi:** `<DndProvider backend={HTML5Backend}>`

### 8.8. `dryer/ActiveBatchPanel.tsx` — Panel mẻ sấy đang chạy

**Props:**

```typescript
{
  batchId: number
  batchScheduleQueue: BatchScheduleQueueEntry[]
  batchRuleSet: BatchRuleSetEntry[]
  batchSchedulesEnabled: boolean
  batchRulesEnabled: boolean
  localSchedules: LocalScheduleData[]
  localRules: LocalRuleData[]
  onStop: () => void
  onComplete: () => void
}
```

**Chức năng:**

- **Hàng đợi lịch trình (live):** Xem trạng thái (pending/running/completed), thêm/xóa/xóa hết, bật/tắt toggle
- **Tập quy tắc (live):** Thêm/xóa, bật/tắt toggle
- Nút "Dừng" + "Hoàn thành" mẻ sấy
- **Bọc bởi:** `<DndProvider backend={HTML5Backend}>`

### 8.9. Các component khác

| Component               | Mô tả                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DeviceManagement.tsx`  | CRUD khu vực, loại thiết bị, máy sấy. 3 tab chính. Form edit + confirm delete                                         |
| `PolicyPage.tsx`        | Thiết kế lịch trình sấy (phases + actions) + quy tắc cảnh báo (conditions + actions). 3 tab: Schedules, Fruits, Rules |
| `Statistics.tsx`        | Dashboard: summary cards, daily production chart, crop yield pie, dryer efficiency comparison. Lọc theo ngày          |
| `LogsPage.tsx`          | Bảng nhật ký hệ thống. Lọc: event type, user, severity, dryer, thời gian. Chỉ admin                                   |
| `UsersPage.tsx`         | CRUD tài khoản. Bảng user + role + permissions matrix. Chỉ admin                                                      |
| `ProfilePage.tsx`       | Xem/sửa hồ sơ, đổi mật khẩu, xem quyền                                                                                |
| `NotificationPanel.tsx` | Panel trượt phải. Đánh dấu đã đọc, xóa từng cái                                                                       |
| `ConfirmDialog.tsx`     | Modal xác nhận (danger/warning). Props: `open, title, message, variant, onConfirm, onCancel`                          |
| `ErrorBoundary.tsx`     | Bắt lỗi React, hiện nút refresh. HOC: `withErrorBoundary(Component)`                                                  |

---

## 9. UI Primitives (`components/ui/`)

46 component dựa trên **Radix UI + Tailwind CSS**. Tất cả là wrapper nhẹ, style bằng `class-variance-authority` + `tailwind-merge`.

| Component         | Radix dependency                  | Mô tả                   |
| ----------------- | --------------------------------- | ----------------------- |
| `accordion`       | `@radix-ui/react-accordion`       | Sections thu gọn        |
| `alert-dialog`    | `@radix-ui/react-alert-dialog`    | Dialog xác nhận         |
| `alert`           | —                                 | Banner thông báo        |
| `aspect-ratio`    | `@radix-ui/react-aspect-ratio`    | Tỷ lệ khung hình        |
| `avatar`          | `@radix-ui/react-avatar`          | Ảnh đại diện            |
| `badge`           | —                                 | Nhãn trạng thái         |
| `breadcrumb`      | —                                 | Đường dẫn               |
| `button`          | `@radix-ui/react-slot`            | Nút bấm (nhiều variant) |
| `calendar`        | `react-day-picker`                | Chọn ngày               |
| `card`            | —                                 | Card container          |
| `carousel`        | `embla-carousel-react`            | Carousel ảnh            |
| `chart`           | `recharts`                        | Wrapper biểu đồ         |
| `checkbox`        | `@radix-ui/react-checkbox`        | Hộp chọn                |
| `collapsible`     | `@radix-ui/react-collapsible`     | Thu gọn/mở rộng         |
| `command`         | `cmdk`                            | Command palette         |
| `context-menu`    | `@radix-ui/react-context-menu`    | Menu chuột phải         |
| `dialog`          | `@radix-ui/react-dialog`          | Modal dialog            |
| `drawer`          | `vaul`                            | Drawer kéo từ cạnh      |
| `dropdown-menu`   | `@radix-ui/react-dropdown-menu`   | Menu dropdown           |
| `form`            | `react-hook-form`                 | Wrapper form            |
| `hover-card`      | `@radix-ui/react-hover-card`      | Card khi hover          |
| `input`           | —                                 | Input text              |
| `input-otp`       | `input-otp`                       | Input mã OTP            |
| `label`           | `@radix-ui/react-label`           | Nhãn form               |
| `menubar`         | `@radix-ui/react-menubar`         | Thanh menu              |
| `navigation-menu` | `@radix-ui/react-navigation-menu` | Menu điều hướng         |
| `pagination`      | —                                 | Phân trang              |
| `popover`         | `@radix-ui/react-popover`         | Popover                 |
| `progress`        | `@radix-ui/react-progress`        | Thanh tiến trình        |
| `radio-group`     | `@radix-ui/react-radio-group`     | Radio buttons           |
| `scroll-area`     | `@radix-ui/react-scroll-area`     | Scrollbar tùy chỉnh     |
| `select`          | `@radix-ui/react-select`          | Dropdown select         |
| `separator`       | `@radix-ui/react-separator`       | Đường phân cách         |
| `sheet`           | `@radix-ui/react-dialog`          | Panel trượt             |
| `sidebar`         | —                                 | Sidebar điều hướng      |
| `skeleton`        | —                                 | Loading skeleton        |
| `slider`          | `@radix-ui/react-slider`          | Thanh trượt             |
| `sonner`          | `sonner`                          | Toast notifications     |
| `switch`          | `@radix-ui/react-switch`          | Toggle switch           |
| `table`           | —                                 | Bảng dữ liệu            |
| `tabs`            | `@radix-ui/react-tabs`            | Tab chuyển đổi          |
| `textarea`        | —                                 | Textarea                |
| `toggle`          | `@radix-ui/react-toggle`          | Nút toggle              |
| `toggle-group`    | `@radix-ui/react-toggle-group`    | Nhóm toggle             |
| `tooltip`         | `@radix-ui/react-tooltip`         | Tooltip khi hover       |

**Utilities:**

- `utils.ts` — Hàm `cn()` = `clsx()` + `tailwind-merge()` để merge class names
- `use-mobile.ts` — Hook `useIsMobile()` phát hiện màn hình mobile (<768px)

---

## 10. Luồng dữ liệu chính

### Đăng nhập → Khởi tạo

```
Login.tsx
  → apiLogin(email, password)
  → setAuthToken(token)
  → AppContext: fetch tất cả (areas, deviceTypes, dryers, crops, schedules, rules, logs)
  → Redirect → /control
```

### Điều khiển máy sấy

```
Control.tsx (danh sách) → click → DrierControl.tsx (chi tiết)
  ↓
  Poll 3s: fetchDryerSensors() cho mỗi thiết bị
  ↓
  Actuator: sendActuatorCommand(feedId, { value })
  ↓
  Batch flow:
    1. BatchConfigDnD: chọn nông sản, nhập weight, kéo schedule/rule → "Bắt đầu"
    2. apiStartBatch() → serverBatchId
    3. apiAddBatchSchedules() + apiAddBatchRules()
    4. ActiveBatchPanel: hiện live queue + rules, toggle on/off
    5. apiEndBatch() → Rating Modal → lưu điểm
```

### Chính sách sấy

```
PolicyPage.tsx
  ↓
  Global Schedule: tạo template (phases + virtual devices + actions)
  Global Rule: tạo template (conditions + virtual devices + actions)
  ↓
  DrierControl.tsx → LocalScheduleManager / LocalRuleManager
    → Chọn global template → map virtual devices → thiết bị thật → lưu local instance
```

### Kiến trúc Virtual → Real Device

```
Global Template (PolicyPage)
  PolicyObject { id, deviceTypeId, label }     ← thiết bị ảo (slot)
      ↓ mapping khi tạo local instance
Local Instance (DrierControl)
  mapping { virtual_device_id → real_device_id } ← thiết bị thật trên máy sấy
      ↓ gắn vào batch khi bắt đầu sấy
Batch Runtime (Backend)
  Thực thi schedule/rule với thiết bị thật
```

---

## 11. Quy ước & Lưu ý bảo trì

### Quy ước đặt tên

- **API functions:** `api` + verb + noun — `apiFetchDryers`, `apiCreateArea`, `apiDeleteRule`
- **Components:** PascalCase — `DrierControl`, `LocalScheduleManager`
- **Files:** PascalCase cho components, camelCase cho API/utils
- **CSS:** Tailwind utility classes, không dùng CSS modules

### TypeScript

- `tsconfig.json` bật `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Module resolution: `nodenext` — import cần extension `.js` (Vite xử lý trong dev/build nên không ảnh hưởng runtime)
- Kiểu dữ liệu chính định nghĩa tại `mockData.ts` — nếu thêm trường mới, cập nhật ở đây

### Thêm trang mới

1. Tạo component trong `components/`
2. Bọc bằng `withErrorBoundary()` trong `routes.ts`
3. Thêm route entry
4. Thêm nav item trong `Layout.tsx`
5. Nếu cần data global → thêm state vào `AppContext.tsx`

### Thêm API mới

1. Thêm function vào file API tương ứng (`controlApi.ts`, `policyApi.ts`, v.v.)
2. Sử dụng `getAuthHeaders()` từ `apiClient.ts`
3. Base URL: `${VITE_GATEWAY_URL}/api/...`

### Thêm UI component

- Dùng các primitives có sẵn trong `components/ui/`
- Style bằng Tailwind classes + `cn()` utility
- Radix UI cho accessibility (keyboard nav, screen reader)
