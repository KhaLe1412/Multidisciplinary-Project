# Components Documentation

## 📋 Danh sách Components

### 🏗️ Layout & Navigation

#### Layout.tsx

**Mục đích**: Component layout chính của ứng dụng
**Tính năng**:

- Sidebar navigation với toggle collapse
- User authentication checks
- Permission-based menu rendering
- Notification bell với unread count
- User avatar và logout functionality

**Props**: Không có (sử dụng Context)

**Key Features**:

```typescript
// Navigation items với permission checks
const navItems = [
  {
    to: "/control",
    icon: LayoutDashboard,
    label: "Điều khiển",
    show: p?.control,
  },
  { to: "/devices", icon: Cpu, label: "Thiết bị", show: p?.devices },
  // ...
].filter((item) => isAdmin || item.show);
```

---

### 🔐 Authentication

#### Login.tsx

**Mục đích**: Trang đăng nhập hệ thống
**Tính năng**:

- Email/password authentication
- Form validation
- Error handling
- Auto redirect sau login

**State**:

```typescript
const [credentials, setCredentials] = useState({ email: "", password: "" });
const [error, setError] = useState("");
```

---

### 🎛️ Control & Monitoring

#### Control.tsx

**Mục đích**: Trang điều khiển tổng quan tất cả máy sấy
**Tính năng**:

- Hiển thị danh sách máy sấy theo grid
- Filter theo trạng thái (`inactive` / `on` / `active`), khu vực, chế độ
- Search functionality
- Quick stats per dryer
- Navigate tới chi tiết máy

**Key Components**:

- **DryerCard**: Hiển thị thông tin tóm tắt máy sấy
- **DryerInfoModal**: Popup chi tiết máy sấy
- **Filter controls**: Bộ lọc theo trạng thái, khu vực, chế độ

**Data Flow**:

```typescript
// Filter logic
const filtered = dryers.filter((dryer) => {
  if (statusFilter && dryer.status !== statusFilter) return false;
  if (areaFilter && dryer.areaId !== areaFilter) return false;
  if (modeFilter && dryer.mode !== modeFilter) return false;
  if (
    searchTerm &&
    !dryer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
    return false;
  return true;
});
```

#### DrierControl.tsx

**Mục đích**: Chi tiết điều khiển một máy sấy cụ thể
**Tính năng**:

- Real-time device monitoring
- Manual device control
- Temperature/humidity charts
- 3 chế độ: Manual, Threshold (theo AlertRule), Schedule (theo lịch)
- Status indicators (`inactive` / `on` / `active`)
- Quản lý lô sản phẩm (`activeBatch`)

**Device Types**:

- **Temperature sensor**: Hiển thị nhiệt độ hiện tại
- **Humidity sensor**: Độ ẩm
- **Fan**: Điều khiển tốc độ quạt
- **Heater**: Điều khiển nhiệt độ gia nhiệt
- **Door**: Mở/đóng cửa
- **Motion sensor**: Phát hiện chuyển động
- **LCD**: Hiển thị thông điệp

---

### 🔧 Device Management

#### DeviceManagement.tsx

**Mục đích**: Quản lý khu vực, loại thiết bị và máy sấy trong hệ thống
**Tabs**: `areas` (Khu vực) | `deviceTypes` (Loại thiết bị) | `dryers` (Máy sấy)
**Tính năng**:

- Quản lý khu vực: thêm/sửa/xóa khu vực
- **Thêm máy sấy từ khu vực**: Nút "+ Thêm máy sấy" hiển thị trong panel mở rộng của khu vực
- **Chọn người quản lý/vận hành từ danh sách**: Trường `manager` (khu vực) và `operator` (máy sấy) là dropdown chọn từ nhân viên hệ thống (admin/operator, đang hoạt động)
- **Tự động đặt tên thiết bị**: Khi chọn loại thiết bị cho Device mới, tên tự điền theo dạng `"{Tên loại} {Số TTT}"`
- Xóa máy sấy/thiết bị: luôn bật (không yêu cầu chế độ bảo trì)
- Inline editing cho các trường (click vào pencil icon để sửa từ́ng trường)

**Device Status Indicators**:

- 🟢 **Online**: Hoạt động bình thường
- 🔴 **Offline**: Mất kết nối

---

### 📅 Schedule Management

#### SchedulePage.tsx

**Mục đích**: Quản lý lịch trình sấy tự động
**Tính năng**:

- Tạo/sửa/xóa schedule
- Multi-phase scheduling
- Fruit-specific templates
- Schedule assignment to dryers
- Timeline visualization

**Schedule Structure**:

```typescript
interface SchedulePhase {
  id: string;
  name: string;
  duration: number; // phút
  startActions: PhaseAction;
  endActions?: PhaseAction;
}

interface PhaseAction {
  dryerOn?: boolean;
  fanSpeed?: number; // 0-100%
  doorOpen?: boolean;
  heaterOff?: boolean;
  heaterTemp?: number;
}
```

---

### 📊 Analytics & Statistics

#### Statistics.tsx

**Mục đích**: Thống kê hiệu suất và báo cáo
**Tính năng**:

- Performance metrics
- Energy consumption charts
- Batch completion rates
- Efficiency analysis
- Export reports

**Chart Types**:

- Line charts cho temperature/humidity trends
- Bar charts cho energy usage
- Pie charts cho batch distribution
- Gauge charts cho real-time metrics

---

### ⚠️ Alerts & Monitoring

#### AlertsPage.tsx

**Mục đích**: Quản lý cảnh báo và quy tắc giám sát
**Tính năng**:

- Alert rule configuration
- Active alerts monitoring
- Alert history
- Auto-response actions
- Escalation rules

**Alert Types**:

- **Temperature**: Vượt ngưỡng nhiệt độ
- **Humidity**: Vượt ngưỡng độ ẩm
- **Device failure**: Thiết bị hỏng
- **Emergency stop**: Dừng khẩn cấp

#### NotificationPanel.tsx

**Mục đích**: Panel hiển thị notifications real-time
**Tính năng**:

- Real-time notifications
- Mark as read/unread
- Notification grouping
- Sound alerts
- Desktop notifications

---

### 📜 Logging & Audit

#### LogsPage.tsx

**Mục đích**: Nhật ký hoạt động hệ thống
**Tính năng**:

- System activity logs
- User action tracking
- Error logging
- Audit trail
- Log filtering & search

**Log Types**:

- **Login/Logout**: Đăng nhập/đăng xuất
- **Device control**: Thao tác điều khiển thiết bị
- **Device management**: Quản lý thiết bị/khu vực/máy sấy
- **Policy management**: Thay đổi lịch trình/cảnh báo
- **Alerts triggered**: Cảnh báo kích hoạt
- **Profile change**: Thay đổi thông tin cá nhân

---

### 👥 User Management

#### UsersPage.tsx

**Mục đích**: Quản lý người dùng (Admin only)
**Tính năng**:

- User CRUD operations
- Role assignment
- Permission management
- Active/inactive status
- Password reset

#### ProfilePage.tsx

**Mục đích**: Trang thông tin cá nhân
**Tính năng**:

- Update personal info
- Change password
- View login history
- Notification preferences

---

### 🛠️ Utility Components

#### ErrorBoundary.tsx

**Mục đích**: Xử lý lỗi React components
**Tính năng**:

- Catch JavaScript errors
- Display fallback UI
- Error reporting
- Recovery mechanisms

#### ImageWithFallback.tsx

**Mục đích**: Image component với fallback
**Tính năng**:

- Auto fallback on error
- Loading states
- Lazy loading
- Optimized performance

---

## 🎨 UI Components

### Component Library Structure

```
src/components/ui/
├── button.tsx          # Button variants
├── card.tsx            # Card components
├── dialog.tsx          # Modal dialogs
├── form.tsx            # Form controls
├── input.tsx           # Input fields
├── select.tsx          # Dropdown selects
├── table.tsx           # Data tables
├── tabs.tsx            # Tab navigation
├── chart.tsx           # Chart components
├── badge.tsx           # Status badges
├── alert.tsx           # Alert messages
└── ...                 # Các components khác
```

### Naming Conventions

- **Page components**: `PascalCase` (VD: `DrierControl`)
- **UI components**: `camelCase` trong folder ui/
- **Utility components**: `PascalCase`

### Props Patterns

```typescript
// Standard component props pattern
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

// Event handler pattern
interface ComponentWithHandlers {
  onSubmit?: (data: FormData) => void;
  onChange?: (value: string) => void;
  onError?: (error: Error) => void;
}
```

### State Management Patterns

```typescript
// Local state với useState
const [isOpen, setIsOpen] = useState(false);

// Global state với Context
const { dryers, setDryers, currentUser } = useApp();

// Form state
const [formData, setFormData] = useState<FormType>({
  field1: "",
  field2: 0,
});
```
