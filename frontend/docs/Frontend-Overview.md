# Tài liệu Frontend - Hệ thống Quản lý Máy Sấy

## 📋 Tổng quan

Đây là ứng dụng web frontend cho hệ thống quản lý máy sấy công nghiệp, được xây dựng với React + TypeScript + Vite. Ứng dụng cung cấp giao diện quản lý toàn diện cho việc điều khiển và giám sát hệ thống máy sấy.

## 🛠️ Stack công nghệ

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI, Radix UI
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: React Context API
- **Icons**: Lucide React

## 📁 Cấu trúc dự án

```
src/
├── main.tsx                    # Entry point
├── app/
│   ├── App.tsx                 # Root component với routing
│   ├── routes.ts               # Định nghĩa routes
│   ├── context/
│   │   └── AppContext.tsx      # Global state management
│   ├── data/
│   │   └── mockData.ts         # Mock data và type definitions
│   └── components/             # React components
├── styles/                     # CSS files
└── docs/                       # Tài liệu
```

## 🔐 Hệ thống Authentication & Authorization

### Roles

- **Admin**: Quyền truy cập tất cả các chức năng
- **Operator**: Điều khiển máy sấy, xem thống kê
- **Viewer**: Chỉ xem thông tin

### Permissions

- `control`: Điều khiển máy sấy
- `devices`: Quản lý thiết bị
- `schedule`: Lập lịch trình
- `alerts`: Xem cảnh báo
- `statistics`: Xem thống kê
- `logs`: Xem nhật ký hệ thống

## 🏗️ Cấu trúc tổ chức

### Organizational Structure

- **Area (Khu vực)**: Đơn vị tổ chức chứa các máy sấy
  - Mỗi khu vực có tên, mô tả và người quản lý
  - Người quản lý được chọn từ danh sách nhân viên hệ thống (admin/operator)
  - Trực tiếp thêm máy sấy mới vào khu vực

### Dryer Management

- **3 chế độ hoạt động**:
  - `manual`: Điều khiển thủ công
  - `threshold`: Tự động theo ngưỡng nhiệt độ/độ ẩm (AlertRule)
  - `schedule`: Tự động theo lịch trình đã lập
- **3 trạng thái**:
  - `inactive`: Không hoạt động
  - `on`: Đang bật nhưng chưa chạy lô sản phẩm
  - `active`: Đang hoạt động với lô sản phẩm

## 📊 Data Models chính

### Dryer (Máy sấy)

```typescript
type DryerStatus = "inactive" | "on" | "active";
type DryerMode = "manual" | "threshold" | "schedule";

interface Dryer {
  id: string;
  name: string;
  status: DryerStatus; // inactive | on | active
  areaId: string; // ID khu vực chứa máy
  operator?: string; // Người vận hành (chọn từ danh sách nhân viên)
  mode: DryerMode;
  devices: Device[];
  activeBatch?: ActiveBatch; // Lô đang chạy
  capacity?: number; // kg
  createdAt?: string;
}
```

### Device (Thiết bị)

```typescript
interface Device {
  id: string;
  name: string;
  type:
    | "temperature"
    | "humidity"
    | "motion"
    | "fan"
    | "door"
    | "lcd"
    | "heater";
  status: boolean;
  value?: number;
  // ... các thuộc tính khác
}
```

### Schedule (Lịch trình)

```typescript
interface Schedule {
  id: string;
  name: string;
  fruitId: string;
  phases: SchedulePhase[];
}
```

### AlertRule (Quy tắc cảnh báo)

```typescript
interface AlertRule {
  id: string;
  name: string;
  temperature: AlertRuleSensorConfig;
  humidity: AlertRuleSensorConfig;
  active: boolean;
}
```

## 📱 Các trang chính

1. **Login** (`/login`) - Đăng nhập hệ thống
2. **Control** (`/control`) - Trang điều khiển tổng quan
3. **DrierControl** (`/control/:id`) - Chi tiết máy sấy cụ thể
4. **DeviceManagement** (`/devices`) - Quản lý thiết bị
5. **SchedulePage** (`/schedule`) - Lập lịch trình sấy
6. **Statistics** (`/statistics`) - Thống kê và báo cáo
7. **AlertsPage** (`/alerts`) - Quản lý cảnh báo
8. **LogsPage** (`/logs`) - Nhật ký hệ thống
9. **UsersPage** (`/users`) - Quản lý người dùng (Admin)
10. **ProfilePage** (`/profile`) - Thông tin cá nhân

## 🎨 Design System

### Theme Colors

- Primary: Gradient blue (#3b82f6 → #1d4ed8)
- Sidebar: Dark gradient (#0c1a2e → #0f2a4a)
- Success: Green (#22c55e)
- Warning: Orange (#f59e0b)
- Error: Red (#ef4444)

### Component Library

- Sử dụng UI components từ `./components/ui/`
- Tích hợp với Radix UI cho accessibility
- Custom styling với Tailwind CSS

## 🔧 Tính năng chính

### 1. Điều khiển máy sấy

- **Real-time monitoring**: Theo dõi trạng thái thiết bị
- **Manual control**: Điều khiển thủ công từng thiết bị
- **Batch tracking**: Theo dõi lô sản phẩm
- **3 trạng thái**: `inactive`, `on`, `active` (không có bảo trì)

### 2. Quản lý thiết bị & khu vực

- **Area management**: Thêm/sửa/xóa khu vực
- **Add dryer from area**: Thêm máy sấy trực tiếp từ trong khu vực
- **Auto device naming**: Khi chọn loại thiết bị, tên tự động điền theo loại và số thứ tự
- **User-select manager/operator**: Người quản lý khu vực và người vận hành máy được chọn từ danh sách nhân viên hệ thống
- **Device type management**: Quản lý các loại thiết bị (cảm biến, cơ cấu chấp hành)

### 3. Quản lý lịch trình

- **Multi-phase scheduling**: Lịch nhiều giai đoạn với offset giây
- **Policy Objects**: Thiết bị ảo dùng chung giữa các pha
- **Fruit-specific profiles**: Cấu hình riêng cho từng loại sản phẩm

### 4. Hệ thống cảnh báo

- **Condition-Action pairs**: Điều kiện AND → hành động
- **Threshold monitoring**: Giám sát ngưỡng an toàn
- **Active alerts history**: Lịch sử cảnh báo đã xảy ra

### 5. Thống kê & báo cáo

- **Performance metrics**: Hiệu suất máy sấy
- **Energy consumption**: Tiêu thụ điện năng
- **Batch analytics**: Phân tích lô sản phẩm

### 6. Quản lý người dùng

- **Role-based access**: Phân quyền theo vai trò (admin / operator / viewer)
- **Activity logging**: Ghi log hoạt động
- **User profiles**: Quản lý thông tin cá nhân

## 🚀 Development

### Scripts

```bash
npm run dev     # Chạy development server
npm run build   # Build production
```

### Environment

- **Development**: `vite dev`
- **Production**: `vite build`
- **Port**: Default 5173

## 🔄 State Management

Sử dụng React Context API để quản lý state toàn cục:

- **AppContext**: Chứa toàn bộ application state
- **Mock data**: Data khởi tạo từ `mockData.ts`, cập nhật qua setState
- **Real-time updates**: Cập nhật state theo thời gian thực

### Context chính (AppContext)

```typescript
// Authentication
(isAuthenticated, currentUser, login, logout, updateCurrentUser);

// Dữ liệu cốt lõi
(dryers, setDryers); // Máy sấy
(areas, setAreas); // Khu vực
(deviceTypes, setDeviceTypes); // Loại thiết bị
(schedules, setSchedules); // Lịch trình
(fruits, setFruits); // Loại sản phẩm
(users, setUsers); // Người dùng hệ thống
(alertRules, setAlertRules); // Quy tắc cảnh báo
(systemAlerts, setSystemAlerts); // Cảnh báo đã xảy ra
(systemLogs, setSystemLogs); // Nhật ký hệ thống
(batchRecords, setBatchRecords); // Hồ sơ lô sản phẩm
(notifications, setNotifications); // Thông báo

// Helpers
addLog(log); // Thêm log
addBatchRecord(record); // Thêm hồ sơ lô
```

## 📝 Conventions

### File naming

- **Components**: PascalCase (VD: `DrierControl.tsx`)
- **Utilities**: camelCase
- **Constants**: UPPER_CASE

### Code style

- TypeScript strict mode
- ESLint + Prettier
- Functional components với hooks

## 🔮 Tính năng mở rộng

1. **WebSocket integration**: Real-time data từ IoT devices
2. **Advanced analytics**: Machine learning cho optimization
3. **Mobile app**: React Native app
4. **API integration**: Kết nối backend thực tế
5. **Export/Import**: Xuất nhập cấu hình
6. **Multi-tenant**: Hỗ trợ nhiều nhà máy
