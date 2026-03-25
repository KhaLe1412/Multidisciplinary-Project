# Data Models & API Documentation

## 📊 Core Data Models

### 🏭 Dryer (Máy sấy)

```typescript
type DryerStatus = 'inactive' | 'on' | 'active';
type DryerMode = 'manual' | 'threshold' | 'schedule';

interface Dryer {
  id: string;                    // Mã máy sấy (VD: "DRY-001")
  name: string;                  // Tên hiển thị
  status: DryerStatus;           // inactive | on | active
  areaId: string;                // ID khu vực
  operator?: string;             // Người vận hành (tên từ UserAccount, chọn từ danh sách nhân viên admin/operator)
  mode: DryerMode;               // Chế độ hoạt động
  devices: Device[];             // Danh sách thiết bị
  activeBatch?: ActiveBatch;     // Lô đang chạy (nếu có)
  dryerLogs?: DryerLogEntry[];   // Nhật ký hoạt động riêng
  capacity?: number;             // Dung tích (kg)
  createdAt?: string;            // Ngày tạo
}

// DryerStatus:
// 'inactive' - Máy tắt hoàn toàn
// 'on'       - Máy bật, chưa chạy lô
// 'active'   - Máy đang hoạt động với lô sản phẩm

// Ví dụ:
const dryer: Dryer = {
  id: 'DRY-001',
  name: 'Máy sấy A1',
  status: 'active',
  areaId: 'AREA-001',
  operator: 'Nguyễn Văn An',
  mode: 'manual',
  devices: [...],
  capacity: 200,
  createdAt: '2025-01-15'
};
```

---

### 🔌 Device (Thiết bị)

```typescript
interface Device {
  id: string; // Mã thiết bị (VD: "DRY001-TMP")
  name: string; // Tên thiết bị
  deviceTypeId: string; // ID loại thiết bị (reference to DeviceType)
  status: boolean; // Trạng thái online/offline
  value?: number; // Giá trị hiện tại
  speed?: number; // Tốc độ (cho fan)
  message?: string; // Thông điệp (cho LCD)
  temperature?: number; // Nhiệt độ (cho heater)
  open?: boolean; // Trạng thái mở/đóng (cho door)
  motion?: boolean; // Phát hiện chuyển động
  installDate?: string; // Ngày lắp đặt
  power?: number; // Công suất (watts)
}

type DeviceType =
  | "temperature"
  | "humidity"
  | "motion"
  | "fan"
  | "door"
  | "lcd"
  | "heater";

// Ví dụ:
const temperatureSensor: Device = {
  id: "DRY001-TMP",
  name: "Cảm biến nhiệt độ số 1",
  deviceTypeId: "DT-TEMP",
  status: true,
  value: 65,
  installDate: "2025-01-10",
  power: 2,
};

const fan: Device = {
  id: "DRY001-FAN",
  name: "Quạt gió chính",
  deviceTypeId: "DT-FAN",
  status: true,
  speed: 75,
  installDate: "2025-01-15",
  power: 150,
};
```

---

### 🏢 Area Models

```typescript
interface Area {
  id: string; // VD: "AREA-001", "AREA-002"
  name: string; // VD: "Khu vực sấy trái cây"
  description: string; // Mô tả chức năng khu vực
  manager?: string; // Tgười quản lý (tên từ UserAccount, chọn từ danh sách admin/operator)
  createdAt: string; // Ngày tạo
}

// Ví dụ:
const area: Area = {
  id: "AREA-001",
  name: "Khu vực sấy trái cây",
  description: "Khu vực chuyên sấy các loại trái cây như xoài, mít, dứa",
  manager: "Nguyễn Văn An",
  createdAt: "2025-01-15",
};
```

---

### 🔧 Device Type Models

```typescript
interface DeviceType {
  id: string; // VD: "DT-TEMP", "DT-HUM"
  name: string; // VD: "Cảm biến nhiệt độ"
  description: string; // Mô tả chức năng thiết bị
  unit: string; // Đơn vị đo (°C, %, rpm)
  valueRange?: {
    // Tập giá trị cho phép
    min: number;
    max: number;
  };
  category: "sensor" | "actuator" | "display"; // Phân loại thiết bị
  createdAt: string; // Ngày tạo
}

// Ví dụ:
const deviceTypes: DeviceType[] = [
  {
    id: "DT-TEMP",
    name: "Cảm biến nhiệt độ",
    description: "Đo nhiệt độ môi trường trong buồng sấy",
    unit: "°C",
    valueRange: { min: 0, max: 120 },
    category: "sensor",
    createdAt: "2025-01-10",
  },
  {
    id: "DT-FAN",
    name: "Quạt gió",
    description: "Điều khiển luồng khí trong buồng sấy",
    unit: "%",
    valueRange: { min: 0, max: 100 },
    category: "actuator",
    createdAt: "2025-01-10",
  },
  {
    id: "DT-LCD",
    name: "Màn hình LCD",
    description: "Hiển thị thông tin trạng thái",
    unit: "text",
    category: "display",
    createdAt: "2025-01-10",
  },
];
```

---

### 📅 Schedule Models

```typescript
// Đối tượng thiết bị ảo - dùng chung trong các pha
interface PolicyObject {
  id: string; // VD: "OBJ-1"
  deviceTypeId: string; // VD: "DT-HEATER"
  label: string; // VD: "Máy gia nhiệt 1"
}

// Hành động áp dụng cho PolicyObject
interface PolicyAction {
  objectId: string; // references PolicyObject.id
  value: number | string; // số (cho range/boolean), string (cho LCD)
}

interface SchedulePhase {
  id: string; // VD: "P1", "P2"
  name: string; // Tên giai đoạn
  offsetSeconds: number; // Offset so với đầu lịch (giây)
  actions: PolicyAction[]; // Các hành động thực hiện
}

interface Schedule {
  id: string; // VD: "SCH-001"
  name: string; // Tên lịch trình
  fruitId: string; // ID loại sản phẩm
  objects: PolicyObject[]; // Thiết bị ảo dùng trong lịch
  phases: SchedulePhase[]; // Các giai đoạn
  createdAt: string; // Ngày tạo
}
```

---

### 🚨 Alert Models

```typescript
type AlertOperator = ">" | "<" | "=" | ">=" | "<=";

interface AlertCondition {
  objectId: string; // references PolicyObject.id
  operator: AlertOperator;
  value: number;
}

interface AlertConditionActionPair {
  id: string;
  conditions: AlertCondition[]; // AND connected
  actions: PolicyAction[];
}

interface AlertRule {
  id: string; // VD: "ALR-001"
  name: string; // Tên quy tắc
  description?: string; // Mô tả
  fruitId: string; // ID loại sản phẩm
  objects: PolicyObject[]; // Thiết bị ảo dùng trong quy tắc
  pairs: AlertConditionActionPair[]; // Cặp [điều kiện] → [hành động]
  createdAt: string; // Ngày tạo
  active: boolean; // Trạng thái hoạt động
}

interface SystemAlertEntry {
  id: string; // VD: "ALERT-12345"
  dryerId: string; // ID máy sấy
  dryerName: string; // Tên máy sấy
  ruleName?: string; // Tên quy tắc
  sensorType: "temperature" | "humidity"; // Loại cảm biến
  direction: "above_max" | "below_min"; // Hướng vi phạm
  value: number; // Giá trị hiện tại
  threshold: number; // Ngưỡng
  time: string; // Thời gian xảy ra
  resolved: boolean; // Đã giải quyết
  actionTaken?: string; // Hành động đã thực hiện
}
```

---

### 🍎 Product Models

```typescript
interface Fruit {
  id: string; // VD: "FRT-001"
  name: string; // VD: "Xoài"
  recommendedTempMin: number; // Nhiệt độ min (°C)
  recommendedTempMax: number; // Nhiệt độ max (°C)
  recommendedHumidityMin: number; // Độ ẩm min (%)
  recommendedHumidityMax: number; // Độ ẩm max (%)
  description?: string; // Mô tả đặc điểm
  createdAt: string; // Ngày tạo
}

// Ví dụ các sản phẩm:
const fruits: Fruit[] = [
  {
    id: "FRT-001",
    name: "Xoài",
    recommendedTempMin: 55,
    recommendedTempMax: 70,
    recommendedHumidityMin: 20,
    recommendedHumidityMax: 40,
    description: "Sấy ở nhiệt độ vừa phải, cần kiểm soát độ ẩm tốt.",
    createdAt: "2026-01-10",
  },
  // ... các loại khác
];
```

---

### 📊 Batch & Records

```typescript
interface BatchRecord {
  id: string; // VD: "B123456"
  dryerId: string; // ID máy sấy
  dryerName: string; // Tên máy sấy
  scheduleId: string; // ID lịch trình
  scheduleName: string; // Tên lịch trình
  fruitId: string; // ID sản phẩm
  fruitName: string; // Tên sản phẩm
  inputWeight: number; // Khối lượng đầu vào (kg)
  outputWeight?: number; // Khối lượng đầu ra (kg)
  rating?: number; // Đánh giá chất lượng (1-5)
  startTime: string; // Thời gian bắt đầu
  endTime?: string; // Thời gian kết thúc
  totalMinutes?: number; // Tổng thời gian (phút)
  energyKwh?: number; // Điện năng tiêu thụ (kWh)
  completed: boolean; // Đã hoàn thành
}
```

---

### 👤 User Models

```typescript
interface UserAccount {
  id: string; // VD: "USER-001"
  name: string; // Họ tên
  email: string; // Email đăng nhập
  password: string; // Mật khẩu (hash)
  phone?: string; // Số điện thoại
  department?: string; // Phòng ban
  role: "admin" | "operator" | "viewer"; // Vai trò
  avatar: string; // URL avatar
  permissions: UserPermissions; // Quyền hạn
  active: boolean; // Trạng thái hoạt động
  createdAt: string; // Ngày tạo
  lastLogin?: string; // Lần đăng nhập cuối
}

interface UserPermissions {
  control: boolean; // Quyền điều khiển
  controlDryers: string[] | "all"; // Máy sấy được phép điều khiển
  devices: boolean; // Quyền quản lý thiết bị
  deviceDryers: string[] | "all"; // Máy sấy được phép quản lý thiết bị
  schedule: boolean; // Quyền lập lịch
  alerts: boolean; // Quyền xem cảnh báo
  statistics: boolean; // Quyền xem thống kê
  logs: boolean; // Quyền xem nhật ký
}
```

---

### 📝 Logging Models

```typescript
interface SystemLog {
  id: string; // VD: "LOG-12345"
  eventType: LogEventType; // Loại sự kiện
  time: string; // Thời gian
  user: string; // Người thực hiện
  description: string; // Mô tả chi tiết
  dryerId?: string; // ID máy sấy liên quan
  severity: LogSeverity; // Mức độ nghiêm trọng
}

type LogEventType =
  | "login"
  | "logout"
  | "device_control"
  | "device_management"
  | "policy_management"
  | "alert"
  | "profile_change";

type LogSeverity = "info" | "warning" | "error" | "success";
```

---

## 🔄 State Management

### AppContext Structure

```typescript
interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateCurrentUser: (updates: Partial<UserAccount>) => void;

  // Core data
  dryers: Dryer[];
  setDryers: React.Dispatch<React.SetStateAction<Dryer[]>>;
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  deviceTypes: DeviceTypeModel[];
  setDeviceTypes: React.Dispatch<React.SetStateAction<DeviceTypeModel[]>>;
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  fruits: Fruit[];
  setFruits: React.Dispatch<React.SetStateAction<Fruit[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;

  // Alerts & Logs
  alertRules: AlertRule[];
  setAlertRules: React.Dispatch<React.SetStateAction<AlertRule[]>>;
  systemAlerts: SystemAlertEntry[];
  setSystemAlerts: React.Dispatch<React.SetStateAction<SystemAlertEntry[]>>;
  systemLogs: SystemLog[];
  setSystemLogs: React.Dispatch<React.SetStateAction<SystemLog[]>>;

  // Batch records
  batchRecords: BatchRecord[];
  setBatchRecords: React.Dispatch<React.SetStateAction<BatchRecord[]>>;
  addBatchRecord: (record: Omit<BatchRecord, "id">) => string;

  // Notifications
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  notificationOpen: boolean;
  setNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Helpers
  addLog: (log: Omit<SystemLog, "id">) => void;
}
```

---

## 🔗 Data Relationships

```
Area (1) → (*) Dryer
            ↓
        (*) Device ← DeviceType (1)
        (*) BatchRecord
            ↑
Schedule → Fruit ←→ BatchRecord
    ↓
SchedulePhase

AlertRule → (*) SystemAlert → Dryer

User → (*) SystemLog
User → (*) Notification
```

---

## 📡 Mock API Patterns

### CRUD Operations

```typescript
// Create
const addDryer = (dryer: Omit<Dryer, "id">) => {
  const id = `DRY-${String(Date.now()).slice(-3)}`;
  setDryers((prev) => [{ ...dryer, id }, ...prev]);
  return id;
};

// Read
const getDryer = (id: string) => dryers.find((d) => d.id === id);

// Update
const updateDryer = (id: string, updates: Partial<Dryer>) => {
  setDryers((prev) =>
    prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
  );
};

// Delete
const deleteDryer = (id: string) => {
  setDryers((prev) => prev.filter((d) => d.id !== id));
};
```

### Real-time Updates

```typescript
// Cập nhật device value theo thời gian thực
useEffect(() => {
  const interval = setInterval(() => {
    setDryers((prev) =>
      prev.map((dryer) => ({
        ...dryer,
        devices: dryer.devices.map((device) => {
          if (device.type === "temperature") {
            return { ...device, value: Math.round(45 + Math.random() * 20) };
          }
          if (device.type === "humidity") {
            return { ...device, value: Math.round(30 + Math.random() * 30) };
          }
          return device;
        }),
      })),
    );
  }, 5000);

  return () => clearInterval(interval);
}, []);
```
