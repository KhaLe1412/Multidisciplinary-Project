// ======== DEVICE TYPE ========
export interface DeviceTypeModel {
  id: string;
  name: string;
  description: string;
  unit: string;
  valueRange?: {
    min: number;
    max: number;
  };
  category: "sensor" | "controller";
  valueType?: "number" | "boolean" | "text";
  createdAt: string;
}

export type DeviceType =
  | "temperature"
  | "humidity"
  | "motion"
  | "fan"
  | "door"
  | "lcd"
  | "heater";
export type DryerMode = "manual" | "threshold" | "schedule";
export type DryerStatus = "off" | "on" | "running";

export interface Device {
  id: string;
  name: string;
  deviceTypeId: string; // Reference to DeviceTypeModel
  status: boolean;
  value?: number;
  speed?: number;
  message?: string;
  temperature?: number;
  open?: boolean;
  motion?: boolean;
  installDate?: string;
  power?: number; // watts
}

export interface Threshold {
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
}

// ======== POLICY OBJECT (virtual device slot used by Schedule & Alert) ========
export interface PolicyObject {
  id: string; // e.g. "OBJ-1"
  deviceTypeId: string; // e.g. "DT-HEATER"
  label: string; // e.g. "Máy gia nhiệt 1"
}

// ======== POLICY ACTION (shared by Schedule & Alert) ========
export interface PolicyAction {
  objectId: string; // references PolicyObject.id
  value: number | string; // number for range/boolean, string for text (LCD)
}

// Legacy phase action (used by SchedulePage simplifed editor)
export interface PhaseAction {
  dryerOn?: boolean;
  fanSpeed?: number;
  doorOpen?: boolean;
  heaterOff?: boolean;
  heaterTemp?: number;
}

// ======== SCHEDULE ========
export interface SchedulePhase {
  id: string;
  name: string;
  offsetSeconds: number; // offset from schedule start in seconds
  actions: PolicyAction[];
  // Legacy simplified fields (used by SchedulePage)
  duration?: number;
  startActions?: PhaseAction;
  endActions?: PhaseAction;
}

export interface Schedule {
  id: string;
  name: string;
  fruitId: string;
  objects: PolicyObject[]; // virtual device slots reusable across phases
  phases: SchedulePhase[];
  createdAt: string;
}

// ======== ALERT RULE ========
export type AlertOperator = ">" | "<" | "=" | ">=" | "<=";

export interface AlertCondition {
  objectId: string; // references PolicyObject.id
  operator: AlertOperator;
  value: number;
}

export interface AlertConditionActionPair {
  id: string;
  name?: string;
  conditions: AlertCondition[]; // AND connected
  actions: PolicyAction[];
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  fruitId: string;
  objects: PolicyObject[]; // virtual device slots
  pairs: AlertConditionActionPair[];
  createdAt: string;
  active: boolean;
}

// ======== FRUIT ========
export interface Fruit {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  recommendedTempMin?: number;
  recommendedTempMax?: number;
  recommendedHumidityMin?: number;
  recommendedHumidityMax?: number;
}

// ======== AREA ========
export interface Area {
  id: string;
  name: string;
  description: string;
  manager?: string;
  managerId?: number;
  createdAt: string;
}

// ======== DRYER ========
// objectId → actual device id mapping for threshold/schedule modes
export interface DeviceBinding {
  objectId: string; // references PolicyObject.id
  deviceId: string; // actual device in dryer
}

export interface ActiveBatch {
  fruitId: string;
  inputWeight: number;
  runSeconds: number; // total duration
  startedAt: string; // ISO
  mode: DryerMode;
  alertRuleId?: string;
  scheduleId?: string;
  scheduleStartTime?: string; // for schedule mode offset calc
  deviceBindings?: DeviceBinding[];
}

export interface DryerLogEntry {
  time: string;
  user: string;
  description: string;
}

export interface Dryer {
  id: string;
  name: string;
  status: DryerStatus;
  areaId: string;
  operator?: string;
  managerId?: number;
  mode: DryerMode;
  devices: Device[];
  activeBatch?: ActiveBatch;
  dryerLogs?: DryerLogEntry[];
  capacity?: number; // kg
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  manager: string;
  floorId: string;
}

export interface Floor {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  type: "warning" | "info" | "error" | "success";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface SystemAlertEntry {
  id: string;
  dryerId: string;
  dryerName: string;
  ruleName?: string;
  sensorType: "temperature" | "humidity";
  direction: "above_max" | "below_min";
  value: number;
  threshold: number;
  time: string;
  resolved: boolean;
  actionTaken?: string;
}

export type LogEventType =
  | "login"
  | "logout"
  | "device_control"
  | "device_management"
  | "policy_management"
  | "alert"
  | "profile_change"
  | "batch_start"
  | "batch_end"
  | "dryer_change"
  | string;
export type LogSeverity = "info" | "warning" | "error" | "success";

export interface SystemLog {
  id: string;
  eventType: LogEventType;
  time: string;
  user: string;
  description: string;
  dryerId?: string;
  severity: LogSeverity | string;
}

// ======== BATCH RECORDS ========
export interface BatchRecord {
  id: string;
  dryerId: string;
  dryerName: string;
  scheduleId: string;
  scheduleName: string;
  fruitId: string;
  fruitName: string;
  inputWeight: number; // kg
  outputWeight?: number; // kg
  rating?: number; // 1-5
  startTime: string;
  endTime?: string;
  totalMinutes?: number;
  energyKwh?: number;
  completed: boolean;
}

// ======== USER ACCOUNTS ========
export interface UserPermissions {
  control: boolean;
  controlDryers: string[] | "all";
  devices: boolean;
  deviceDryers: string[] | "all";
  policy: boolean;
  statistics: boolean;
  logs: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "admin" | "operator" | "viewer";
  avatar: string;
  permissions: UserPermissions;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

// ======== INITIAL DATA ========

export const initialDeviceTypes: DeviceTypeModel[] = [
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
    id: "DT-HUM",
    name: "Cảm biến độ ẩm",
    description: "Đo độ ẩm không khí trong buồng sấy",
    unit: "%",
    valueRange: { min: 0, max: 100 },
    category: "sensor",
    createdAt: "2025-01-10",
  },
  {
    id: "DT-MOTION",
    name: "Cảm biến chuyển động",
    description: "Phát hiện sự di chuyển trong khu vực",
    unit: "boolean",
    category: "sensor",
    createdAt: "2025-01-12",
  },
  {
    id: "DT-FAN",
    name: "Quạt gió",
    description: "Điều khiển luồng khí trong buồng sấy",
    unit: "%",
    valueRange: { min: 0, max: 100 },
    category: "controller",
    createdAt: "2025-01-10",
  },
  {
    id: "DT-DOOR",
    name: "Cửa điều khiển",
    description: "Điều khiển việc mở/đóng cửa buồng sấy",
    unit: "boolean",
    category: "controller",
    createdAt: "2025-01-15",
  },
  {
    id: "DT-LCD",
    name: "Màn hình LCD",
    description: "Hiển thị thông tin trạng thái và thông báo",
    unit: "text",
    category: "controller",
    createdAt: "2025-01-20",
  },
  {
    id: "DT-HEATER",
    name: "Máy gia nhiệt",
    description: "Gia nhiệt cho buồng sấy đển nhiệt độ mong muốn",
    unit: "°C",
    valueRange: { min: 20, max: 100 },
    category: "controller",
    createdAt: "2025-01-15",
  },
  {
    id: "DT-FAN-BINARY",
    name: "Quạt gió (bật/tắt)",
    description: "Điều khiển quạt gió bật hoặc tắt",
    unit: "boolean",
    category: "controller",
    createdAt: "2025-01-10",
  },
];

const makeDevices = (prefix: string): Device[] => [
  {
    id: `${prefix}-TMP`,
    name: "Cảm biến nhiệt độ",
    deviceTypeId: "DT-TEMP",
    status: true,
    value: Math.round(45 + Math.random() * 20),
    installDate: "2025-01-10",
    power: 2,
  },
  {
    id: `${prefix}-HUM`,
    name: "Cảm biến độ ẩm",
    deviceTypeId: "DT-HUM",
    status: true,
    value: Math.round(30 + Math.random() * 30),
    installDate: "2025-01-10",
    power: 2,
  },
  {
    id: `${prefix}-MOT`,
    name: "Cảm biến chuyển động",
    deviceTypeId: "DT-MOTION",
    status: true,
    motion: Math.random() > 0.6,
    installDate: "2025-01-12",
    power: 1,
  },
  {
    id: `${prefix}-FAN`,
    name: "Quạt gió",
    deviceTypeId: "DT-FAN",
    status: true,
    speed: Math.round(40 + Math.random() * 50),
    installDate: "2025-01-15",
    power: 150,
  },
  {
    id: `${prefix}-DOR`,
    name: "Cửa điều khiển",
    deviceTypeId: "DT-DOOR",
    status: true,
    open: false,
    installDate: "2025-01-15",
    power: 80,
  },
  {
    id: `${prefix}-LCD`,
    name: "Màn hình LCD",
    deviceTypeId: "DT-LCD",
    status: true,
    message: "Đang sấy...",
    installDate: "2025-01-20",
    power: 10,
  },
  {
    id: `${prefix}-HTR`,
    name: "Máy gia nhiệt",
    deviceTypeId: "DT-HEATER",
    status: true,
    temperature: Math.round(55 + Math.random() * 15),
    installDate: "2025-01-15",
    power: 3000,
  },
];

export const initialAreas: Area[] = [
  {
    id: "AREA-001",
    name: "Khu vực sấy trái cây",
    description: "Khu vực chuyên sấy các loại trái cây như xoài, mít, dứa",
    manager: "Nguyễn Văn An",
    createdAt: "2025-01-15",
  },
  {
    id: "AREA-002",
    name: "Khu vực sấy rau củ quả",
    description: "Khu vực sấy các loại rau củ và quả tươi",
    manager: "Trần Thị Bình",
    createdAt: "2025-01-20",
  },
  {
    id: "AREA-003",
    name: "Khu vực sấy dược liệu",
    description: "Khu vực sấy các loại thảo dược và gia vị",
    manager: "Lê Hoàng Cường",
    createdAt: "2025-02-01",
  },
  {
    id: "AREA-004",
    name: "Khu vực sấy ngũ cốc",
    description: "Khu vực sấy các loại hạt và ngũ cốc",
    manager: "Phạm Minh Đức",
    createdAt: "2025-02-15",
  },
  {
    id: "AREA-005",
    name: "Khu vực sấy hải sản",
    description: "Khu vực sấy các loại hải sản và thủy sản",
    manager: "Hoàng Thị Em",
    createdAt: "2025-03-01",
  },
  {
    id: "AREA-006",
    name: "Khu vực thử nghiệm",
    description: "Khu vực dành cho thử nghiệm và nghiên cứu sản phẩm mới",
    manager: "Vũ Văn Phong",
    createdAt: "2025-03-15",
  },
];

export const initialDryers: Dryer[] = [
  {
    id: "DRY-001",
    name: "Máy sấy A1",
    status: "running",
    areaId: "AREA-001",
    operator: "Nguyễn Văn An",
    mode: "manual",
    devices: makeDevices("DRY001"),
    activeBatch: {
      fruitId: "FRT-001",
      inputWeight: 150,
      runSeconds: 10800,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      mode: "manual",
    },
    capacity: 200,
    createdAt: "2025-01-15",
  },
  {
    id: "DRY-002",
    name: "Máy sấy A2",
    status: "running",
    areaId: "AREA-001",
    operator: "Trần Thị Bình",
    mode: "threshold",
    devices: makeDevices("DRY002"),
    activeBatch: {
      fruitId: "FRT-001",
      inputWeight: 120,
      runSeconds: 14400,
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      mode: "threshold",
      alertRuleId: "ALR-001",
      deviceBindings: [
        { objectId: "O1", deviceId: "DRY002-TMP" },
        { objectId: "O2", deviceId: "DRY002-HUM" },
        { objectId: "O3", deviceId: "DRY002-FAN" },
        { objectId: "O4", deviceId: "DRY002-HTR" },
      ],
    },
    capacity: 180,
    createdAt: "2025-01-15",
  },
  {
    id: "DRY-003",
    name: "Máy sấy B1",
    status: "off",
    areaId: "AREA-002",
    mode: "manual",
    devices: makeDevices("DRY003"),
    capacity: 220,
    createdAt: "2025-02-01",
  },
  {
    id: "DRY-004",
    name: "Máy sấy B2",
    status: "running",
    areaId: "AREA-002",
    operator: "Lê Hoàng Cường",
    mode: "schedule",
    devices: makeDevices("DRY004"),
    activeBatch: {
      fruitId: "FRT-002",
      inputWeight: 180,
      runSeconds: 11700,
      startedAt: new Date(Date.now() - 5400000).toISOString(),
      mode: "schedule",
      scheduleId: "SCH-002",
      scheduleStartTime: new Date(Date.now() - 5400000).toISOString(),
      deviceBindings: [
        { objectId: "O1", deviceId: "DRY004-FAN" },
        { objectId: "O2", deviceId: "DRY004-DOR" },
        { objectId: "O3", deviceId: "DRY004-HTR" },
      ],
    },
    capacity: 200,
    createdAt: "2025-02-01",
  },
  {
    id: "DRY-005",
    name: "Máy sấy C1",
    status: "off",
    areaId: "AREA-003",
    mode: "manual",
    devices: makeDevices("DRY005"),
    capacity: 150,
    createdAt: "2025-02-15",
  },
  {
    id: "DRY-006",
    name: "Máy sấy D1",
    status: "running",
    areaId: "AREA-004",
    operator: "Phạm Minh Đức",
    mode: "threshold",
    devices: makeDevices("DRY006"),
    activeBatch: {
      fruitId: "FRT-006",
      inputWeight: 200,
      runSeconds: 21600,
      startedAt: new Date(Date.now() - 10800000).toISOString(),
      mode: "threshold",
      alertRuleId: "ALR-002",
      deviceBindings: [
        { objectId: "O1", deviceId: "DRY006-TMP" },
        { objectId: "O2", deviceId: "DRY006-HUM" },
        { objectId: "O3", deviceId: "DRY006-FAN" },
        { objectId: "O4", deviceId: "DRY006-HTR" },
        { objectId: "O5", deviceId: "DRY006-DOR" },
      ],
    },
    capacity: 250,
    createdAt: "2025-03-01",
  },
  {
    id: "DRY-007",
    name: "Máy sấy D2",
    status: "off",
    areaId: "AREA-004",
    mode: "manual",
    devices: makeDevices("DRY007"),
    capacity: 250,
    createdAt: "2025-03-01",
  },
  {
    id: "DRY-008",
    name: "Máy sấy E1",
    status: "on",
    areaId: "AREA-005",
    operator: "Hoàng Thị Em",
    mode: "schedule",
    devices: makeDevices("DRY008"),
    capacity: 180,
    createdAt: "2025-03-15",
  },
  {
    id: "DRY-009",
    name: "Máy sấy F1",
    status: "off",
    areaId: "AREA-006",
    mode: "manual",
    devices: makeDevices("DRY009"),
    capacity: 100,
    createdAt: "2025-04-01",
  },
];

export const initialFruits: Fruit[] = [
  {
    id: "FRT-001",
    name: "Xoài",
    description:
      "Sấy ở nhiệt độ vừa phải, cần kiểm soát độ ẩm tốt để giữ màu vàng đặc trưng.",
    createdAt: "2026-01-10",
  },
  {
    id: "FRT-002",
    name: "Mít",
    description:
      "Cần sấy từ từ để tránh cháy bề mặt, giữ được hương thơm tự nhiên.",
    createdAt: "2026-01-10",
  },
  {
    id: "FRT-003",
    name: "Dứa",
    description:
      "Có hàm lượng axit cao, cần nhiệt độ ổn định để không bị biến màu.",
    createdAt: "2026-01-12",
  },
  {
    id: "FRT-004",
    name: "Chuối",
    description: "Nhiệt độ thấp hơn, thời gian sấy dài hơn để giữ độ ngọt.",
    createdAt: "2026-01-12",
  },
  {
    id: "FRT-005",
    name: "Thanh long",
    description: "Sấy nhanh ở nhiệt độ cao để giữ màu đỏ tươi.",
    createdAt: "2026-01-15",
  },
  {
    id: "FRT-006",
    name: "Gừng",
    description: "Cần sấy khô hoàn toàn để bảo quản được lâu dài.",
    createdAt: "2026-01-15",
  },
  {
    id: "FRT-007",
    name: "Nghệ",
    description: "Tương tự gừng, cần kiểm soát nhiệt độ để giữ curcumin.",
    createdAt: "2026-01-20",
  },
  {
    id: "FRT-008",
    name: "Nhãn",
    description: "Nhiệt độ cao hơn để tách vỏ và cùi dễ dàng.",
    createdAt: "2026-02-01",
  },
];

export const initialSchedules: Schedule[] = [
  {
    id: "SCH-001",
    name: "Lịch sấy xoài chuẩn",
    fruitId: "FRT-001",
    createdAt: "2026-02-10T10:00",
    objects: [
      { id: "O1", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O2", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
      { id: "O3", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
    ],
    phases: [
      {
        id: "P1",
        name: "Làm nóng sơ bộ",
        offsetSeconds: 0,
        actions: [
          { objectId: "O1", value: 30 },
          { objectId: "O2", value: 0 },
          { objectId: "O3", value: 45 },
        ],
      },
      {
        id: "P2",
        name: "Sấy chính",
        offsetSeconds: 1800,
        actions: [
          { objectId: "O1", value: 70 },
          { objectId: "O3", value: 65 },
        ],
      },
      {
        id: "P3",
        name: "Hoàn thiện",
        offsetSeconds: 7200,
        actions: [
          { objectId: "O1", value: 80 },
          { objectId: "O3", value: 70 },
        ],
      },
      {
        id: "P4",
        name: "Kết thúc",
        offsetSeconds: 9900,
        actions: [
          { objectId: "O1", value: 0 },
          { objectId: "O3", value: 20 },
          { objectId: "O2", value: 1 },
        ],
      },
    ],
  },
  {
    id: "SCH-002",
    name: "Lịch sấy mít",
    fruitId: "FRT-002",
    createdAt: "2026-02-12T14:30",
    objects: [
      { id: "O1", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O2", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
      { id: "O3", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
    ],
    phases: [
      {
        id: "P1",
        name: "Khởi động",
        offsetSeconds: 0,
        actions: [
          { objectId: "O1", value: 25 },
          { objectId: "O2", value: 0 },
          { objectId: "O3", value: 40 },
        ],
      },
      {
        id: "P2",
        name: "Sấy nhiệt thấp",
        offsetSeconds: 1800,
        actions: [
          { objectId: "O1", value: 50 },
          { objectId: "O3", value: 55 },
        ],
      },
      {
        id: "P3",
        name: "Sấy nhiệt cao",
        offsetSeconds: 5400,
        actions: [
          { objectId: "O1", value: 70 },
          { objectId: "O3", value: 62 },
        ],
      },
      {
        id: "P4",
        name: "Hạ nhiệt",
        offsetSeconds: 9900,
        actions: [
          { objectId: "O1", value: 100 },
          { objectId: "O3", value: 20 },
        ],
      },
      {
        id: "P5",
        name: "Kết thúc",
        offsetSeconds: 11700,
        actions: [
          { objectId: "O1", value: 0 },
          { objectId: "O2", value: 1 },
        ],
      },
    ],
  },
  {
    id: "SCH-003",
    name: "Lịch sấy dứa",
    fruitId: "FRT-003",
    createdAt: "2026-02-15T09:00",
    objects: [
      { id: "O1", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O2", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
      { id: "O3", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
    ],
    phases: [
      {
        id: "P1",
        name: "Khởi động",
        offsetSeconds: 0,
        actions: [
          { objectId: "O1", value: 40 },
          { objectId: "O2", value: 48 },
        ],
      },
      {
        id: "P2",
        name: "Sấy chính",
        offsetSeconds: 1200,
        actions: [
          { objectId: "O1", value: 65 },
          { objectId: "O2", value: 60 },
        ],
      },
      {
        id: "P3",
        name: "Kết thúc",
        offsetSeconds: 6000,
        actions: [
          { objectId: "O1", value: 80 },
          { objectId: "O2", value: 68 },
        ],
      },
      {
        id: "P4",
        name: "Tắt máy",
        offsetSeconds: 8400,
        actions: [
          { objectId: "O1", value: 0 },
          { objectId: "O2", value: 20 },
          { objectId: "O3", value: 1 },
        ],
      },
    ],
  },
  {
    id: "SCH-004",
    name: "Lịch sấy chuối",
    fruitId: "FRT-004",
    createdAt: "2026-02-18T11:00",
    objects: [
      { id: "O1", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O2", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
      { id: "O3", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
    ],
    phases: [
      {
        id: "P1",
        name: "Làm nóng",
        offsetSeconds: 0,
        actions: [
          { objectId: "O1", value: 30 },
          { objectId: "O2", value: 45 },
        ],
      },
      {
        id: "P2",
        name: "Sấy chậm",
        offsetSeconds: 1500,
        actions: [
          { objectId: "O1", value: 50 },
          { objectId: "O2", value: 55 },
        ],
      },
      {
        id: "P3",
        name: "Sấy nhanh",
        offsetSeconds: 5700,
        actions: [
          { objectId: "O1", value: 75 },
          { objectId: "O2", value: 62 },
        ],
      },
      {
        id: "P4",
        name: "Kết thúc",
        offsetSeconds: 8700,
        actions: [
          { objectId: "O1", value: 0 },
          { objectId: "O2", value: 20 },
          { objectId: "O3", value: 1 },
        ],
      },
    ],
  },
];

export const initialNotifications: Notification[] = [
  {
    id: "N1",
    type: "error",
    title: "Cảnh báo nhiệt độ",
    message: "Máy sấy DRY-001 vượt ngưỡng nhiệt độ tối đa (75°C)",
    time: "5 phút trước",
    read: false,
  },
  {
    id: "N2",
    type: "warning",
    title: "Độ ẩm thấp",
    message: "Máy sấy DRY-006 có độ ẩm dưới ngưỡng tối thiểu (8%)",
    time: "12 phút trước",
    read: false,
  },
  {
    id: "N3",
    type: "success",
    title: "Hoàn tất mẻ sấy",
    message: "Máy sấy DRY-004 đã hoàn thành lịch sấy xoài",
    time: "1 giờ trước",
    read: false,
  },
  {
    id: "N4",
    type: "info",
    title: "Bảo trì định kỳ",
    message: "Máy sấy DRY-007 cần bảo trì theo lịch định kỳ",
    time: "2 giờ trước",
    read: true,
  },
  {
    id: "N5",
    type: "success",
    title: "Hoàn tất mẻ sấy",
    message: "Máy sấy DRY-008 đã hoàn thành lịch sấy mít",
    time: "3 giờ trước",
    read: true,
  },
  {
    id: "N6",
    type: "warning",
    title: "Quạt bất thường",
    message: "Máy sấy DRY-002 - Quạt có dấu hiệu rung lắc",
    time: "5 giờ trước",
    read: true,
  },
];

export const initialAlertRules: AlertRule[] = [
  {
    id: "ALR-001",
    name: "Ngưỡng chuẩn sấy xoài",
    description: "Ngưỡng giới hạn an toàn cho sấy xoài",
    fruitId: "FRT-001",
    objects: [
      { id: "O1", deviceTypeId: "DT-TEMP", label: "Cảm biến nhiệt 1" },
      { id: "O2", deviceTypeId: "DT-HUM", label: "Cảm biến ẩm 1" },
      { id: "O3", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O4", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
    ],
    pairs: [
      {
        id: "AP1",
        conditions: [{ objectId: "O1", operator: ">", value: 75 }],
        actions: [
          { objectId: "O3", value: 100 },
          { objectId: "O4", value: 20 },
        ],
      },
      {
        id: "AP2",
        conditions: [{ objectId: "O1", operator: "<", value: 35 }],
        actions: [{ objectId: "O4", value: 55 }],
      },
      {
        id: "AP3",
        conditions: [{ objectId: "O2", operator: ">", value: 65 }],
        actions: [{ objectId: "O3", value: 80 }],
      },
      {
        id: "AP4",
        conditions: [{ objectId: "O2", operator: "<", value: 15 }],
        actions: [{ objectId: "O4", value: 60 }],
      },
    ],
    createdAt: "2026-01-15T09:00",
    active: true,
  },
  {
    id: "ALR-002",
    name: "Ngưỡng chuẩn sấy gừng",
    description: "Ngưỡng giới hạn cho sấy gừng và dược liệu",
    fruitId: "FRT-006",
    objects: [
      { id: "O1", deviceTypeId: "DT-TEMP", label: "Cảm biến nhiệt 1" },
      { id: "O2", deviceTypeId: "DT-HUM", label: "Cảm biến ẩm 1" },
      { id: "O3", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O4", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
      { id: "O5", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
    ],
    pairs: [
      {
        id: "AP1",
        conditions: [{ objectId: "O1", operator: ">", value: 85 }],
        actions: [
          { objectId: "O3", value: 100 },
          { objectId: "O4", value: 20 },
        ],
      },
      {
        id: "AP2",
        conditions: [{ objectId: "O1", operator: "<", value: 40 }],
        actions: [{ objectId: "O3", value: 20 }],
      },
      {
        id: "AP3",
        conditions: [{ objectId: "O2", operator: ">", value: 45 }],
        actions: [
          { objectId: "O3", value: 100 },
          { objectId: "O5", value: 1 },
        ],
      },
    ],
    createdAt: "2026-01-20T14:00",
    active: true,
  },
  {
    id: "ALR-003",
    name: "Ngưỡng an toàn tổng quát",
    description: "Ngưỡng giới hạn áp dụng chung, dùng cho dứa",
    fruitId: "FRT-003",
    objects: [
      { id: "O1", deviceTypeId: "DT-TEMP", label: "Cảm biến nhiệt 1" },
      { id: "O2", deviceTypeId: "DT-HUM", label: "Cảm biến ẩm 1" },
      { id: "O3", deviceTypeId: "DT-FAN", label: "Quạt gió 1" },
      { id: "O4", deviceTypeId: "DT-DOOR", label: "Cửa 1" },
      { id: "O5", deviceTypeId: "DT-HEATER", label: "Máy gia nhiệt 1" },
    ],
    pairs: [
      {
        id: "AP1",
        conditions: [{ objectId: "O1", operator: ">", value: 90 }],
        actions: [
          { objectId: "O3", value: 100 },
          { objectId: "O4", value: 1 },
          { objectId: "O5", value: 20 },
        ],
      },
      {
        id: "AP2",
        conditions: [
          { objectId: "O1", operator: "<", value: 30 },
          { objectId: "O2", operator: "<", value: 5 },
        ],
        actions: [
          { objectId: "O5", value: 50 },
          { objectId: "O3", value: 0 },
        ],
      },
      {
        id: "AP3",
        conditions: [{ objectId: "O2", operator: ">", value: 80 }],
        actions: [
          { objectId: "O3", value: 100 },
          { objectId: "O4", value: 1 },
        ],
      },
    ],
    createdAt: "2026-02-01T08:00",
    active: true,
  },
];

export const initialSystemAlerts: SystemAlertEntry[] = [
  {
    id: "SA-001",
    dryerId: "DRY-001",
    dryerName: "Máy sấy A1",
    ruleName: "Ngưỡng chuẩn sấy trái cây",
    sensorType: "temperature",
    direction: "above_max",
    value: 76,
    threshold: 75,
    time: "2026-03-07T08:05:00",
    resolved: false,
    actionTaken: "Tăng quạt 100%, tắt máy gia nhiệt",
  },
  {
    id: "SA-002",
    dryerId: "DRY-006",
    dryerName: "Máy sấy D1",
    ruleName: "Ngưỡng chuẩn sấy hải sản",
    sensorType: "humidity",
    direction: "below_min",
    value: 7,
    threshold: 8,
    time: "2026-03-07T07:52:00",
    resolved: false,
    actionTaken: "Giảm quạt về 20%",
  },
  {
    id: "SA-003",
    dryerId: "DRY-002",
    dryerName: "Máy sấy A2",
    ruleName: "Ngưỡng chuẩn sấy trái cây",
    sensorType: "temperature",
    direction: "above_max",
    value: 78,
    threshold: 75,
    time: "2026-03-06T15:30:00",
    resolved: true,
    actionTaken: "Tăng quạt 100%, tắt máy gia nhiệt",
  },
  {
    id: "SA-004",
    dryerId: "DRY-004",
    dryerName: "Máy sấy B2",
    ruleName: "Ngưỡng chuẩn sấy hải sản",
    sensorType: "humidity",
    direction: "below_min",
    value: 6,
    threshold: 8,
    time: "2026-03-06T12:10:00",
    resolved: true,
    actionTaken: "Tắt máy sấy khẩn cấp",
  },
];

export const initialSystemLogs: SystemLog[] = [
  {
    id: "LOG-001",
    eventType: "login",
    time: "2026-03-07T07:30:00",
    user: "Nguyễn Văn Quản Trị",
    description: "Đăng nhập hệ thống thành công",
    severity: "info",
  },
  {
    id: "LOG-002",
    eventType: "device_control",
    time: "2026-03-07T07:45:00",
    user: "Nguyễn Văn An",
    description: "Bật máy sấy DRY-001, chế độ thủ công",
    dryerId: "DRY-001",
    severity: "info",
  },
  {
    id: "LOG-003",
    eventType: "device_control",
    time: "2026-03-07T07:48:00",
    user: "Nguyễn Văn An",
    description: "Chỉnh tốc độ quạt DRY-001 → 75%",
    dryerId: "DRY-001",
    severity: "info",
  },
  {
    id: "LOG-004",
    eventType: "alert",
    time: "2026-03-07T08:05:00",
    user: "Hệ thống",
    description:
      "Cảnh báo: DRY-001 vi phạm quy tắc ngưỡng — nhiệt độ vượt tối đa (76°C > 75°C)",
    dryerId: "DRY-001",
    severity: "error",
  },
  {
    id: "LOG-005",
    eventType: "device_control",
    time: "2026-03-07T08:05:10",
    user: "Hệ thống",
    description:
      "Thực hiện hành động tự động: Tăng quạt 100%, tắt máy gia nhiệt trên DRY-001",
    dryerId: "DRY-001",
    severity: "warning",
  },
  {
    id: "LOG-006",
    eventType: "device_control",
    time: "2026-03-07T06:30:00",
    user: "Hệ thống",
    description:
      "Bắt đầu mẻ sấy theo lịch SCH-001 (Lịch sấy xoài) trên DRY-008",
    dryerId: "DRY-008",
    severity: "info",
  },
  {
    id: "LOG-007",
    eventType: "policy_management",
    time: "2026-03-07T08:15:00",
    user: "Nguyễn Văn Quản Trị",
    description: "Cập nhật quy tắc cảnh báo ALR-001",
    severity: "info",
  },
  {
    id: "LOG-008",
    eventType: "device_control",
    time: "2026-03-06T16:30:00",
    user: "Nguyễn Văn An",
    description: "Tắt khẩn cấp tất cả thiết bị trên DRY-001",
    dryerId: "DRY-001",
    severity: "error",
  },
  {
    id: "LOG-009",
    eventType: "logout",
    time: "2026-03-06T17:30:00",
    user: "Nguyễn Văn An",
    description: "Đăng xuất khỏi hệ thống",
    severity: "info",
  },
];

// Mock batch records for statistics
export const initialBatchRecords: BatchRecord[] = [
  {
    id: "B001",
    dryerId: "DRY-001",
    dryerName: "Máy sấy A1",
    scheduleId: "SCH-001",
    scheduleName: "Lịch sấy xoài chuẩn",
    fruitId: "FRT-001",
    fruitName: "Xoài",
    inputWeight: 120,
    outputWeight: 42,
    rating: 5,
    startTime: "2026-03-01T08:00",
    endTime: "2026-03-01T10:45",
    totalMinutes: 165,
    energyKwh: 8.2,
    completed: true,
  },
  {
    id: "B002",
    dryerId: "DRY-002",
    dryerName: "Máy sấy A2",
    scheduleId: "SCH-002",
    scheduleName: "Lịch sấy mít",
    fruitId: "FRT-002",
    fruitName: "Mít",
    inputWeight: 100,
    outputWeight: 32,
    rating: 4,
    startTime: "2026-03-01T09:00",
    endTime: "2026-03-01T12:15",
    totalMinutes: 195,
    energyKwh: 9.5,
    completed: true,
  },
  {
    id: "B003",
    dryerId: "DRY-004",
    dryerName: "Máy sấy B2",
    scheduleId: "SCH-003",
    scheduleName: "Lịch sấy dứa",
    fruitId: "FRT-003",
    fruitName: "Dứa",
    inputWeight: 90,
    outputWeight: 27,
    rating: 4,
    startTime: "2026-03-02T07:00",
    endTime: "2026-03-02T09:20",
    totalMinutes: 140,
    energyKwh: 7.0,
    completed: true,
  },
  {
    id: "B004",
    dryerId: "DRY-008",
    dryerName: "Máy sấy E1",
    scheduleId: "SCH-004",
    scheduleName: "Lịch sấy chuối",
    fruitId: "FRT-004",
    fruitName: "Chuối",
    inputWeight: 150,
    outputWeight: 48,
    rating: 5,
    startTime: "2026-03-02T06:00",
    endTime: "2026-03-02T08:25",
    totalMinutes: 145,
    energyKwh: 7.2,
    completed: true,
  },
  {
    id: "B005",
    dryerId: "DRY-001",
    dryerName: "Máy sấy A1",
    scheduleId: "SCH-001",
    scheduleName: "Lịch sấy xoài chuẩn",
    fruitId: "FRT-001",
    fruitName: "Xoài",
    inputWeight: 130,
    outputWeight: 44,
    rating: 5,
    startTime: "2026-03-03T08:00",
    endTime: "2026-03-03T10:45",
    totalMinutes: 165,
    energyKwh: 8.4,
    completed: true,
  },
  {
    id: "B006",
    dryerId: "DRY-006",
    dryerName: "Máy sấy D1",
    scheduleId: "SCH-002",
    scheduleName: "Lịch sấy mít",
    fruitId: "FRT-002",
    fruitName: "Mít",
    inputWeight: 110,
    outputWeight: 31,
    rating: 3,
    startTime: "2026-03-03T09:00",
    endTime: "2026-03-03T12:20",
    totalMinutes: 200,
    energyKwh: 10.1,
    completed: true,
  },
  {
    id: "B007",
    dryerId: "DRY-002",
    dryerName: "Máy sấy A2",
    scheduleId: "SCH-003",
    scheduleName: "Lịch sấy dứa",
    fruitId: "FRT-003",
    fruitName: "Dứa",
    inputWeight: 80,
    outputWeight: 22,
    rating: 4,
    startTime: "2026-03-04T07:30",
    endTime: "2026-03-04T09:50",
    totalMinutes: 140,
    energyKwh: 7.1,
    completed: true,
  },
  {
    id: "B008",
    dryerId: "DRY-004",
    dryerName: "Máy sấy B2",
    scheduleId: "SCH-001",
    scheduleName: "Lịch sấy xoài chuẩn",
    fruitId: "FRT-001",
    fruitName: "Xoài",
    inputWeight: 115,
    outputWeight: 40,
    rating: 4,
    startTime: "2026-03-04T08:00",
    endTime: "2026-03-04T10:45",
    totalMinutes: 165,
    energyKwh: 8.0,
    completed: true,
  },
  {
    id: "B009",
    dryerId: "DRY-008",
    dryerName: "Máy sấy E1",
    scheduleId: "SCH-002",
    scheduleName: "Lịch sấy mít",
    fruitId: "FRT-002",
    fruitName: "Mít",
    inputWeight: 95,
    outputWeight: 29,
    rating: 5,
    startTime: "2026-03-05T06:30",
    endTime: "2026-03-05T09:45",
    totalMinutes: 195,
    energyKwh: 9.6,
    completed: true,
  },
  {
    id: "B010",
    dryerId: "DRY-001",
    dryerName: "Máy sấy A1",
    scheduleId: "SCH-004",
    scheduleName: "Lịch sấy chuối",
    fruitId: "FRT-004",
    fruitName: "Chuối",
    inputWeight: 140,
    outputWeight: 45,
    rating: 4,
    startTime: "2026-03-05T08:00",
    endTime: "2026-03-05T10:25",
    totalMinutes: 145,
    energyKwh: 7.3,
    completed: true,
  },
  {
    id: "B011",
    dryerId: "DRY-006",
    dryerName: "Máy sấy D1",
    scheduleId: "SCH-001",
    scheduleName: "Lịch sấy xoài chuẩn",
    fruitId: "FRT-001",
    fruitName: "Xoài",
    inputWeight: 125,
    outputWeight: 43,
    rating: 5,
    startTime: "2026-03-06T07:00",
    endTime: "2026-03-06T09:45",
    totalMinutes: 165,
    energyKwh: 8.3,
    completed: true,
  },
  {
    id: "B012",
    dryerId: "DRY-002",
    dryerName: "Máy sấy A2",
    scheduleId: "SCH-004",
    scheduleName: "Lịch sấy chuối",
    fruitId: "FRT-004",
    fruitName: "Chuối",
    inputWeight: 160,
    outputWeight: 52,
    rating: 5,
    startTime: "2026-03-06T09:00",
    endTime: "2026-03-06T11:25",
    totalMinutes: 145,
    energyKwh: 7.5,
    completed: true,
  },
];

export const initialUsers: UserAccount[] = [
  {
    id: "U001",
    name: "Nguyễn Văn Quản Trị",
    email: "admin@factory.vn",
    password: "Admin@123",
    phone: "0901234567",
    role: "admin",
    avatar: "QT",
    permissions: {
      control: true,
      controlDryers: "all",
      devices: true,
      deviceDryers: "all",
      policy: true,
      statistics: true,
      logs: true,
    },
    active: true,
    createdAt: "2025-01-01T00:00:00",
    lastLogin: "2026-03-07T07:30:00",
  },
  {
    id: "U002",
    name: "Nguyễn Văn An",
    email: "nva@factory.vn",
    password: "Op@123",
    phone: "0912345678",
    role: "operator",
    avatar: "NA",
    permissions: {
      control: true,
      controlDryers: ["DRY-001", "DRY-002"],
      devices: false,
      deviceDryers: [],
      policy: false,
      statistics: false,
      logs: false,
    },
    active: true,
    createdAt: "2025-03-15T00:00:00",
    lastLogin: "2026-03-07T08:00:00",
  },
  {
    id: "U003",
    name: "Trần Thị Bình",
    email: "ttb@factory.vn",
    password: "Op@123",
    phone: "0923456789",
    role: "operator",
    avatar: "TB",
    permissions: {
      control: true,
      controlDryers: ["DRY-004", "DRY-008"],
      devices: false,
      deviceDryers: [],
      policy: true,
      statistics: false,
      logs: false,
    },
    active: true,
    createdAt: "2025-03-20T00:00:00",
    lastLogin: "2026-03-07T06:00:00",
  },
  {
    id: "U004",
    name: "Phạm Minh Đức",
    email: "pmd@factory.vn",
    password: "Op@123",
    phone: "0934567890",
    role: "operator",
    avatar: "MD",
    permissions: {
      control: true,
      controlDryers: ["DRY-006", "DRY-007"],
      devices: true,
      deviceDryers: ["DRY-006", "DRY-007"],
      policy: false,
      statistics: true,
      logs: true,
    },
    active: true,
    createdAt: "2025-04-10T00:00:00",
    lastLogin: "2026-03-07T07:00:00",
  },
  {
    id: "U005",
    name: "Lê Thị Viewer",
    email: "viewer@factory.vn",
    password: "View@123",
    phone: "0945678901",
    role: "viewer",
    avatar: "LV",
    permissions: {
      control: false,
      controlDryers: [],
      devices: false,
      deviceDryers: [],
      policy: false,
      statistics: true,
      logs: false,
    },
    active: true,
    createdAt: "2025-06-01T00:00:00",
    lastLogin: "2026-03-05T10:00:00",
  },
  {
    id: "U006",
    name: "Hoàng Thị Em",
    email: "hte@factory.vn",
    password: "Op@123",
    phone: "0956789012",
    role: "operator",
    avatar: "HE",
    permissions: {
      control: true,
      controlDryers: ["DRY-008"],
      devices: false,
      deviceDryers: [],
      policy: true,
      statistics: false,
      logs: false,
    },
    active: false,
    createdAt: "2025-05-15T00:00:00",
    lastLogin: "2026-03-01T09:00:00",
  },
];

export function generateSensorData(hours = 12) {
  const data = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    const hh = time.getHours().toString().padStart(2, "0");
    const mm = time.getMinutes().toString().padStart(2, "0");
    data.push({
      time: `${hh}:${mm}`,
      temp: Math.round(50 + Math.sin(i * 0.4) * 10 + Math.random() * 5),
      humidity: Math.round(35 + Math.cos(i * 0.3) * 8 + Math.random() * 4),
    });
  }
  return data;
}

export function buildActionDesc(
  action: PolicyAction,
  objects: PolicyObject[],
  deviceTypes: DeviceTypeModel[],
): string {
  const obj = objects.find((o) => o.id === action.objectId);
  if (!obj) return `${action.objectId}: ${action.value}`;
  const dt = deviceTypes.find((d) => d.id === obj.deviceTypeId);
  if (!dt) return `${obj.label}: ${action.value}`;
  if (dt.unit === "text") return `${obj.label}: "${action.value}"`;
  if (dt.unit === "boolean")
    return `${obj.label}: ${action.value ? "Bật" : "Tắt"}`;
  return `${obj.label} ${action.value}${dt.unit}`;
}

export function buildPhaseActionDesc(action?: PhaseAction): string {
  if (!action) return "Không thay đổi";
  const parts: string[] = [];
  if (action.dryerOn === true) parts.push("Bật máy");
  if (action.dryerOn === false) parts.push("Tắt máy");
  if (action.fanSpeed !== undefined) parts.push(`Quạt ${action.fanSpeed}%`);
  if (action.doorOpen === true) parts.push("Mở cửa");
  if (action.doorOpen === false) parts.push("Đóng cửa");
  if (action.heaterOff) parts.push("Tắt gia nhiệt");
  if (action.heaterTemp !== undefined && !action.heaterOff)
    parts.push(`Gia nhiệt ${action.heaterTemp}°C`);
  return parts.join(" · ") || "Không thay đổi";
}

export function buildActionsDesc(
  actions: PolicyAction[],
  objects: PolicyObject[],
  deviceTypes: DeviceTypeModel[],
): string {
  return (
    actions.map((a) => buildActionDesc(a, objects, deviceTypes)).join(" · ") ||
    "Không có hành động"
  );
}

export function formatOffsetSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}ph`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h${m}ph` : `${h}h`;
}
