import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import type { Dryer, DryerStatus } from "../data/mockData";
import { apiFetchConnectedDevices } from "../api/controlApi";
import {
  apiCreateArea,
  apiUpdateArea,
  apiDeleteArea,
  apiCreateDeviceType,
  apiUpdateDeviceType,
  apiDeleteDeviceType,
  apiCreateDryer,
  apiUpdateDryer,
  apiDeleteDryer,
  apiCreateDevice,
  apiUpdateDevice,
  apiDeleteDevice,
  apiFetchUsers,
} from "../api/deviceManagementApi";
import type { SystemUser } from "../api/deviceManagementApi";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  Building2,
  Cpu,
  Wrench,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Thermometer,
  Droplets,
  Wind,
  Monitor,
  Flame,
  MapPin,
  ShieldAlert,
  Activity,
  Save,
  Package,
  Power,
  AlertTriangle,
} from "lucide-react";

const deviceIcon: Record<string, any> = {
  "DT-TEMP": Thermometer,
  "DT-HUM": Droplets,
  "DT-MOTION": Activity,
  "DT-FAN": Wind,
  "DT-DOOR": MapPin,
  "DT-LCD": Monitor,
  "DT-HEATER": Flame,
};

const deviceColor: Record<string, string> = {
  "DT-TEMP": "text-orange-500 bg-orange-50",
  "DT-HUM": "text-blue-500 bg-blue-50",
  "DT-MOTION": "text-violet-500 bg-violet-50",
  "DT-FAN": "text-cyan-500 bg-cyan-50",
  "DT-DOOR": "text-emerald-500 bg-emerald-50",
  "DT-LCD": "text-slate-500 bg-slate-100",
  "DT-HEATER": "text-red-500 bg-red-50",
};

const statusConfig: Record<
  DryerStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  off: {
    label: "Tắt",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
  on: {
    label: "Bật",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  running: {
    label: "Đang hoạt động",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
};

function StatusBadge({ status }: { status: DryerStatus }) {
  const cfg = statusConfig[status] || statusConfig.off;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.text}`}
      style={{ fontWeight: 600 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="text-xs text-slate-500 block mb-1"
        style={{ fontWeight: 600 }}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  );
}

export function DeviceManagement() {
  const {
    areas,
    setAreas,
    deviceTypes,
    setDeviceTypes,
    dryers,
    setDryers,
    currentUser,
  } = useApp();

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  useEffect(() => {
    apiFetchUsers()
      .then(setSystemUsers)
      .catch(() => {});
  }, []);
  const activeUsers = systemUsers.filter(
    (u) => u.status === "active" && u.role !== "viewer",
  );
  const getUserName = (id?: number) =>
    systemUsers.find((u) => u.id === id)?.full_name;
  const [activeTab, setActiveTab] = useState<
    "areas" | "deviceTypes" | "dryers"
  >("areas");
  const [search, setSearch] = useState("");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedDryers, setExpandedDryers] = useState<Set<string>>(new Set());
  const [connectedDeviceIds, setConnectedDeviceIds] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    apiFetchConnectedDevices()
      .then(setConnectedDeviceIds)
      .catch(() => {});
  }, []);

  // Area management state
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [areaForm, setAreaForm] = useState({
    id: "",
    name: "",
    description: "",
    managerId: "",
  });
  const [editAreaId, setEditAreaId] = useState<string | null>(null);
  const [editAreaForm, setEditAreaForm] = useState({
    id: "",
    name: "",
    description: "",
    managerId: "",
  });

  // Device type management state
  const [addDeviceTypeOpen, setAddDeviceTypeOpen] = useState(false);
  const [deviceTypeForm, setDeviceTypeForm] = useState({
    id: "",
    name: "",
    description: "",
    unit: "",
    unitNA: false,
    category: "sensor" as "sensor" | "controller",
    valueType: "number" as "number" | "boolean" | "text",
    minValue: "",
    maxValue: "",
    rangeNA: false,
  });
  const [editDeviceTypeId, setEditDeviceTypeId] = useState<string | null>(null);
  const [editDeviceTypeForm, setEditDeviceTypeForm] = useState({
    id: "",
    name: "",
    description: "",
    unit: "",
    unitNA: false,
    category: "sensor" as "sensor" | "controller",
    valueType: "number" as "number" | "boolean" | "text",
    minValue: "",
    maxValue: "",
    rangeNA: false,
  });

  // Device management state
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    id: "",
    name: "",
    deviceTypeId: "",
    power: "",
  });
  const [currentDryerForDevice, setCurrentDryerForDevice] = useState("");
  const [editDeviceId, setEditDeviceId] = useState<string | null>(null);
  const [editDeviceForm, setEditDeviceForm] = useState({
    id: "",
    name: "",
    deviceTypeId: "",
    installDate: "",
    power: "",
  });
  const [editDeviceDryerId, setEditDeviceDryerId] = useState<string | null>(
    null,
  );

  // Dryer management state
  const [editDryerId, setEditDryerId] = useState<string | null>(null);
  const [editDryerForm, setEditDryerForm] = useState({
    id: "",
    name: "",
    areaId: "",
    managerId: "",
    capacity: "",
  });

  // Add dryer from area state
  const [addDryerFromAreaOpen, setAddDryerFromAreaOpen] = useState(false);
  const [addDryerFromAreaId, setAddDryerFromAreaId] = useState<string | null>(
    null,
  );
  const [addDryerFromAreaForm, setAddDryerFromAreaForm] = useState({
    id: "",
    name: "",
    managerId: "",
    capacity: "",
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };
  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, open: false }));

  // Warning dialog state (for condition-based delete blocks)
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  const showWarning = (title: string, message: string) => {
    setWarningDialog({ open: true, title, message });
  };
  const closeWarning = () =>
    setWarningDialog((prev) => ({ ...prev, open: false }));

  const isAdmin = currentUser?.role === "admin";
  const p = currentUser?.permissions;
  const canManage = isAdmin || p?.devices;

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <ShieldAlert size={48} className="mx-auto mb-4 text-slate-300" />
          <h2
            className="text-xl text-slate-600 mb-2"
            style={{ fontWeight: 600 }}
          >
            Không có quyền truy cập
          </h2>
          <p className="text-slate-400 text-sm">
            Bạn không có quyền quản lý thiết bị.
          </p>
        </div>
      </div>
    );
  }

  // ===== AREA CRUD =====
  const addArea = async () => {
    if (!areaForm.name.trim()) return;
    try {
      const created = await apiCreateArea({
        name: areaForm.name,
        description: areaForm.description,
        manager_id: areaForm.managerId ? parseInt(areaForm.managerId) : null,
      });
      setAreas((prev) => [...prev, created]);
      setAreaForm({ id: "", name: "", description: "", managerId: "" });
      setAddAreaOpen(false);
    } catch {
      showWarning("Lỗi", "Không thể tạo khu vực. Vui lòng thử lại!");
    }
  };

  const saveEditArea = async (oldId: string) => {
    if (!editAreaForm.name) {
      showWarning("Thiếu thông tin", "Vui lòng nhập tên khu vực!");
      return;
    }
    try {
      const updated = await apiUpdateArea(oldId, {
        name: editAreaForm.name,
        description: editAreaForm.description,
        manager_id: editAreaForm.managerId
          ? parseInt(editAreaForm.managerId)
          : null,
      });
      setAreas((prev) => prev.map((a) => (a.id === oldId ? updated : a)));
      setEditAreaId(null);
    } catch {
      showWarning("Lỗi", "Không thể cập nhật khu vực. Vui lòng thử lại!");
    }
  };

  const deleteArea = (areaId: string) => {
    const dryersInArea = dryers.filter((d) => d.areaId === areaId);
    if (dryersInArea.length > 0) {
      showWarning(
        "Không thể xóa khu vực",
        "Không thể xóa khu vực này vì còn máy sấy bên trong!",
      );
      return;
    }
    showConfirm(
      "Xóa khu vực",
      "Bạn có chắc chắn muốn xóa khu vực này? Thao tác này không thể hoàn tác.",
      async () => {
        try {
          await apiDeleteArea(areaId);
          setAreas((prev) => prev.filter((a) => a.id !== areaId));
          closeConfirm();
        } catch (e: any) {
          closeConfirm();
          showWarning("Lỗi", e.message || "Không thể xóa khu vực");
        }
      },
    );
  };

  // ===== DEVICE TYPE CRUD =====
  const addDeviceType = async () => {
    if (!deviceTypeForm.name.trim()) return;
    try {
      const created = await apiCreateDeviceType({
        name: deviceTypeForm.name,
        description: deviceTypeForm.description,
        unit: deviceTypeForm.unitNA ? null : deviceTypeForm.unit || null,
        min_value:
          !deviceTypeForm.rangeNA && deviceTypeForm.minValue
            ? parseFloat(deviceTypeForm.minValue)
            : null,
        max_value:
          !deviceTypeForm.rangeNA && deviceTypeForm.maxValue
            ? parseFloat(deviceTypeForm.maxValue)
            : null,
        category: deviceTypeForm.category,
      });
      setDeviceTypes((prev) => [
        ...prev,
        { ...created, valueType: deviceTypeForm.valueType },
      ]);
      setDeviceTypeForm({
        id: "",
        name: "",
        description: "",
        unit: "",
        unitNA: false,
        category: "sensor",
        valueType: "number",
        minValue: "",
        maxValue: "",
        rangeNA: false,
      });
      setAddDeviceTypeOpen(false);
    } catch {
      showWarning("Lỗi", "Không thể tạo loại thiết bị. Vui lòng thử lại!");
    }
  };

  const saveEditDeviceType = async (oldId: string) => {
    if (!editDeviceTypeForm.name) {
      showWarning("Thiếu thông tin", "Vui lòng nhập tên loại thiết bị!");
      return;
    }
    try {
      const updated = await apiUpdateDeviceType(oldId, {
        name: editDeviceTypeForm.name,
        description: editDeviceTypeForm.description,
        unit: editDeviceTypeForm.unitNA
          ? null
          : editDeviceTypeForm.unit || null,
        min_value:
          !editDeviceTypeForm.rangeNA && editDeviceTypeForm.minValue
            ? parseFloat(editDeviceTypeForm.minValue)
            : null,
        max_value:
          !editDeviceTypeForm.rangeNA && editDeviceTypeForm.maxValue
            ? parseFloat(editDeviceTypeForm.maxValue)
            : null,
        category: editDeviceTypeForm.category,
      });
      setDeviceTypes((prev) =>
        prev.map((dt) =>
          dt.id === oldId
            ? { ...updated, valueType: editDeviceTypeForm.valueType }
            : dt,
        ),
      );
      setEditDeviceTypeId(null);
    } catch {
      showWarning("Lỗi", "Không thể cập nhật loại thiết bị. Vui lòng thử lại!");
    }
  };

  const deleteDeviceType = (deviceTypeId: string) => {
    const devicesUsingType = dryers.some((dryer) =>
      dryer.devices.some((device) => device.deviceTypeId === deviceTypeId),
    );
    if (devicesUsingType) {
      showWarning(
        "Không thể xóa loại thiết bị",
        "Không thể xóa loại thiết bị này vì đang được sử dụng!",
      );
      return;
    }
    showConfirm(
      "Xóa loại thiết bị",
      "Bạn có chắc chắn muốn xóa loại thiết bị này? Thao tác này không thể hoàn tác.",
      async () => {
        try {
          await apiDeleteDeviceType(deviceTypeId);
          setDeviceTypes((prev) => prev.filter((dt) => dt.id !== deviceTypeId));
          closeConfirm();
        } catch (e: any) {
          closeConfirm();
          showWarning("Lỗi", e.message || "Không thể xóa loại thiết bị");
        }
      },
    );
  };

  // ===== DEVICE CRUD =====
  const addDevice = async () => {
    if (!deviceForm.name.trim() || !deviceForm.deviceTypeId) {
      showWarning(
        "Thiếu thông tin",
        "Vui lòng nhập tên thiết bị và chọn loại thiết bị!",
      );
      return;
    }
    const dryerId = currentDryerForDevice;
    const dryer = dryers.find((d) => d.id === dryerId);
    if (!dryer) return;
    const deviceId =
      deviceForm.id.trim() || `${dryerId}-${String(Date.now()).slice(-6)}`;
    try {
      const created = await apiCreateDevice(dryerId, {
        id: deviceId,
        name: deviceForm.name,
        type_id: parseInt(deviceForm.deviceTypeId) || 0,
        power_status: null,
      });
      setDryers((prev) =>
        prev.map((d) =>
          d.id === dryerId
            ? {
                ...d,
                devices: [
                  ...d.devices,
                  {
                    ...created,
                    power: deviceForm.power
                      ? parseFloat(deviceForm.power)
                      : undefined,
                  },
                ],
              }
            : d,
        ),
      );
      setDeviceForm({ id: "", name: "", deviceTypeId: "", power: "" });
      setAddDeviceOpen(false);
    } catch (e: any) {
      showWarning(
        "Lỗi",
        e.message || "Không thể thêm thiết bị. Vui lòng thử lại!",
      );
    }
  };

  const saveEditDevice = async (dryerId: string, oldDeviceId: string) => {
    if (!editDeviceForm.name || !editDeviceForm.deviceTypeId) {
      showWarning("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    try {
      const updated = await apiUpdateDevice(dryerId, oldDeviceId, {
        name: editDeviceForm.name,
        type_id: parseInt(editDeviceForm.deviceTypeId) || 0,
        install_date: editDeviceForm.installDate || null,
      });
      setDryers((prev) =>
        prev.map((d) =>
          d.id === dryerId
            ? {
                ...d,
                devices: d.devices.map((device) =>
                  device.id === oldDeviceId
                    ? {
                        ...updated,
                        power: editDeviceForm.power
                          ? parseFloat(editDeviceForm.power)
                          : undefined,
                      }
                    : device,
                ),
              }
            : d,
        ),
      );
      setEditDeviceId(null);
      setEditDeviceDryerId(null);
    } catch {
      showWarning("Lỗi", "Không thể cập nhật thiết bị. Vui lòng thử lại!");
    }
  };

  const deleteDevice = (
    dryerId: string,
    deviceId: string,
    deviceName: string,
  ) => {
    showConfirm(
      "Xóa thiết bị",
      `Bạn có chắc chắn muốn xóa thiết bị "${deviceName}"?`,
      async () => {
        try {
          await apiDeleteDevice(dryerId, deviceId);
          setDryers((prev) =>
            prev.map((d) =>
              d.id === dryerId
                ? {
                    ...d,
                    devices: d.devices.filter(
                      (device) => device.id !== deviceId,
                    ),
                  }
                : d,
            ),
          );
          closeConfirm();
        } catch (e: any) {
          closeConfirm();
          showWarning("Lỗi", e.message || "Không thể xóa thiết bị");
        }
      },
    );
  };

  // ===== DRYER CRUD =====
  const saveEditDryer = async (oldId: string) => {
    if (!editDryerForm.name || !editDryerForm.areaId) {
      showWarning("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    try {
      const updated = await apiUpdateDryer(oldId, {
        name: editDryerForm.name,
        area_id: parseInt(editDryerForm.areaId),
        capacity: editDryerForm.capacity
          ? parseFloat(editDryerForm.capacity)
          : null,
        manager_id: editDryerForm.managerId
          ? parseInt(editDryerForm.managerId)
          : null,
      });
      setDryers((prev) =>
        prev.map((d) =>
          d.id === oldId
            ? {
                ...updated,
                devices: d.devices,
              }
            : d,
        ),
      );
      setEditDryerId(null);
    } catch {
      showWarning("Lỗi", "Không thể cập nhật máy sấy. Vui lòng thử lại!");
    }
  };

  const deleteDryer = (dryerId: string, dryerName: string) => {
    showConfirm(
      "Xóa máy sấy",
      `Bạn có chắc chắn muốn xóa máy sấy "${dryerName}" và tất cả thiết bị bên trong?`,
      async () => {
        try {
          await apiDeleteDryer(dryerId);
          setDryers((prev) => prev.filter((d) => d.id !== dryerId));
          closeConfirm();
        } catch (e: any) {
          closeConfirm();
          showWarning("Lỗi", e.message || "Không thể xóa máy sấy");
        }
      },
    );
  };

  // Navigate from area dryer card to dryer tab
  const navigateToDryer = (dryerId: string) => {
    setActiveTab("dryers");
    setSearch("");
    setExpandedDryers(new Set([dryerId]));
  };

  const addDryerFromArea = async () => {
    if (!addDryerFromAreaId || !addDryerFromAreaForm.name.trim()) {
      showWarning("Thiếu thông tin", "Vui lòng nhập tên máy sấy!");
      return;
    }
    try {
      const created = await apiCreateDryer({
        name: addDryerFromAreaForm.name,
        area_id: parseInt(addDryerFromAreaId),
        capacity: addDryerFromAreaForm.capacity
          ? parseFloat(addDryerFromAreaForm.capacity)
          : null,
        manager_id: addDryerFromAreaForm.managerId
          ? parseInt(addDryerFromAreaForm.managerId)
          : null,
        status: "off",
      });
      setDryers((prev) => [...prev, created]);
      setAddDryerFromAreaForm({
        id: "",
        name: "",
        managerId: "",
        capacity: "",
      });
      setAddDryerFromAreaId(null);
      setAddDryerFromAreaOpen(false);
    } catch (e: any) {
      showWarning(
        "Lỗi",
        e.message || "Không thể tạo máy sấy. Vui lòng thử lại!",
      );
    }
  };

  // ===== FILTERING =====
  const q = search.toLowerCase();
  const filteredAreas = areas.filter(
    (area) =>
      area.id.toLowerCase().includes(q) ||
      area.name.toLowerCase().includes(q) ||
      area.description.toLowerCase().includes(q) ||
      getUserName(area.managerId)?.toLowerCase().includes(q),
  );
  const filteredDeviceTypes = deviceTypes.filter(
    (dt) =>
      dt.id.toLowerCase().includes(q) ||
      dt.name.toLowerCase().includes(q) ||
      dt.description.toLowerCase().includes(q),
  );
  const filteredDryers = dryers.filter(
    (d) =>
      d.id.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      getUserName(d.managerId)?.toLowerCase().includes(q) ||
      areas
        .find((a) => a.id === d.areaId)
        ?.name.toLowerCase()
        .includes(q),
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-slate-900" style={{ fontWeight: 700 }}>
              Quản lý khu vực và thiết bị
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý khu vực, loại thiết bị và máy sấy
            </p>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder={
                activeTab === "areas"
                  ? "Tìm theo ID, tên khu vực..."
                  : activeTab === "deviceTypes"
                    ? "Tìm theo ID, tên loại thiết bị..."
                    : "Tìm theo ID, tên máy sấy..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-lg">
          {[
            {
              key: "areas" as const,
              icon: Building2,
              label: `Quản lý khu vực (${areas.length})`,
            },
            {
              key: "deviceTypes" as const,
              icon: Package,
              label: `Loại thiết bị (${deviceTypes.length})`,
            },
            {
              key: "dryers" as const,
              icon: Cpu,
              label: `Máy sấy và thiết bị (${dryers.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm transition-all ${activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
            >
              <tab.icon size={16} className="inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ==================== AREA TAB ==================== */}
        {activeTab === "areas" && (
          <div className="p-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-lg text-slate-900"
                    style={{ fontWeight: 700 }}
                  >
                    Quản lý khu vực
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tạo và quản lý các khu vực chứa máy sấy
                  </p>
                </div>
                <button
                  onClick={() => setAddAreaOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Plus size={16} /> Thêm khu vực
                </button>
              </div>

              <div className="space-y-4">
                {filteredAreas.map((area) => {
                  const areaDryers = dryers.filter((d) => d.areaId === area.id);
                  const isExpanded = expandedAreas.has(area.id);

                  return (
                    <div
                      key={area.id}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* Clickable area header */}
                      <div
                        className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => {
                          if (editAreaId === area.id) return;
                          const s = new Set(expandedAreas);
                          if (isExpanded) s.delete(area.id);
                          else s.add(area.id);
                          setExpandedAreas(s);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-1">
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </span>
                          <MapPin size={20} className="text-slate-600" />
                          <div>
                            {editAreaId === area.id ? (
                              <div
                                className="grid grid-cols-2 gap-3 w-96"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EditField
                                  label="ID khu vực"
                                  value={editAreaForm.id}
                                  onChange={(v) =>
                                    setEditAreaForm((p) => ({ ...p, id: v }))
                                  }
                                  required
                                />
                                <EditField
                                  label="Tên khu vực"
                                  value={editAreaForm.name}
                                  onChange={(v) =>
                                    setEditAreaForm((p) => ({ ...p, name: v }))
                                  }
                                  required
                                />
                                <EditField
                                  label="Mô tả"
                                  value={editAreaForm.description}
                                  onChange={(v) =>
                                    setEditAreaForm((p) => ({
                                      ...p,
                                      description: v,
                                    }))
                                  }
                                />
                                <div>
                                  <label
                                    className="text-xs text-slate-500 block mb-1"
                                    style={{ fontWeight: 600 }}
                                  >
                                    Người quản lý
                                  </label>
                                  <select
                                    value={editAreaForm.managerId}
                                    onChange={(e) =>
                                      setEditAreaForm((p) => ({
                                        ...p,
                                        managerId: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  >
                                    <option value="">-- Chưa chọn --</option>
                                    {activeUsers.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} (
                                        {u.role === "admin"
                                          ? "Quản trị"
                                          : "Vận hành"}
                                        )
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h3 className="font-semibold text-slate-900">
                                  {area.name}
                                </h3>
                                <p className="text-sm text-slate-500">
                                  Mã: {area.id} | Quản lý:{" "}
                                  {area.manager ||
                                    getUserName(area.managerId) ||
                                    "Chưa gán"}
                                </p>
                                {area.description && (
                                  <p className="text-sm text-slate-600 mt-1">
                                    {area.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {areaDryers.length} máy sấy
                          </span>
                          {editAreaId === area.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEditArea(area.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditAreaId(null)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditAreaId(area.id);
                                  setEditAreaForm({
                                    id: area.id,
                                    name: area.name,
                                    description: area.description,
                                    managerId: area.managerId?.toString() || "",
                                  });
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => deleteArea(area.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dryer cards inside area - click navigates to dryer tab */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                              Máy sấy trong khu vực
                            </h4>
                            {(isAdmin || p?.devices) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddDryerFromAreaId(area.id);
                                  setAddDryerFromAreaOpen(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-emerald-700 transition-colors"
                                style={{ fontWeight: 600 }}
                              >
                                <Plus size={14} /> Thêm máy sấy
                              </button>
                            )}
                          </div>
                          {areaDryers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {areaDryers.map((dryer) => (
                                <div
                                  key={dryer.id}
                                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                                  onClick={() => navigateToDryer(dryer.id)}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Cpu size={16} className="text-blue-600" />
                                    <span className="font-medium text-slate-900 text-sm">
                                      {dryer.name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 space-y-1">
                                    <p>Mã: {dryer.id}</p>
                                    <p>
                                      Vận hành:{" "}
                                      {getUserName(dryer.managerId) || "N/A"}
                                    </p>
                                    <p>
                                      Thiết bị: {dryer.devices?.length || 0}
                                    </p>
                                    <StatusBadge status={dryer.status} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-3">
                              Chưa có máy sấy nào trong khu vực này
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredAreas.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <MapPin size={32} className="mx-auto mb-3 text-slate-300" />
                  <p>
                    {search
                      ? "Không tìm thấy khu vực phù hợp"
                      : "Chưa có khu vực nào được tạo"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== DEVICE TYPE TAB ==================== */}
        {activeTab === "deviceTypes" && (
          <div className="p-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-lg text-slate-900"
                    style={{ fontWeight: 700 }}
                  >
                    Quản lý loại thiết bị
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Định nghĩa các loại thiết bị có thể dùng trong máy sấy
                  </p>
                </div>
                <button
                  onClick={() => setAddDeviceTypeOpen(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Plus size={16} /> Thêm loại thiết bị
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeviceTypes.map((deviceType) => {
                  const IconComponent = deviceIcon[deviceType.id] || Package;
                  const colorClass =
                    deviceColor[deviceType.id] || "text-slate-500 bg-slate-100";
                  const devicesUsingType = dryers.reduce(
                    (count, dryer) =>
                      count +
                      (dryer.devices?.filter(
                        (device) => device.deviceTypeId === deviceType.id,
                      ).length || 0),
                    0,
                  );

                  return (
                    <div
                      key={deviceType.id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {editDeviceTypeId === deviceType.id ? (
                        <div className="space-y-3">
                          <EditField
                            label="ID loại thiết bị"
                            value={editDeviceTypeForm.id}
                            onChange={(v) =>
                              setEditDeviceTypeForm((p) => ({ ...p, id: v }))
                            }
                            required
                          />
                          <EditField
                            label="Tên loại thiết bị"
                            value={editDeviceTypeForm.name}
                            onChange={(v) =>
                              setEditDeviceTypeForm((p) => ({ ...p, name: v }))
                            }
                            required
                          />
                          <EditField
                            label="Mô tả"
                            value={editDeviceTypeForm.description}
                            onChange={(v) =>
                              setEditDeviceTypeForm((p) => ({
                                ...p,
                                description: v,
                              }))
                            }
                          />
                          {/* Unit with N/A checkbox */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className="text-xs text-slate-500"
                                style={{ fontWeight: 600 }}
                              >
                                Đơn vị đo lường
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editDeviceTypeForm.unitNA}
                                  onChange={(e) =>
                                    setEditDeviceTypeForm((p) => ({
                                      ...p,
                                      unitNA: e.target.checked,
                                      unit: e.target.checked ? "" : p.unit,
                                    }))
                                  }
                                  className="rounded border-slate-300"
                                />
                                Không xác định
                              </label>
                            </div>
                            {!editDeviceTypeForm.unitNA && (
                              <input
                                type="text"
                                value={editDeviceTypeForm.unit}
                                onChange={(e) =>
                                  setEditDeviceTypeForm((p) => ({
                                    ...p,
                                    unit: e.target.value,
                                  }))
                                }
                                placeholder="VD: °C, %, RPM"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            )}
                          </div>
                          <div>
                            <label
                              className="text-xs text-slate-500 block mb-1"
                              style={{ fontWeight: 600 }}
                            >
                              Danh mục <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={editDeviceTypeForm.category}
                              onChange={(e) =>
                                setEditDeviceTypeForm((p) => ({
                                  ...p,
                                  category: e.target.value as any,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="sensor">Cảm biến</option>
                              <option value="controller">
                                Thiết bị điều khiển
                              </option>
                            </select>
                          </div>
                          <div>
                            <label
                              className="text-xs text-slate-500 block mb-1"
                              style={{ fontWeight: 600 }}
                            >
                              Kiểu giá trị{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={editDeviceTypeForm.valueType}
                              onChange={(e) =>
                                setEditDeviceTypeForm((p) => ({
                                  ...p,
                                  valueType: e.target.value as any,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="number">Số (Number)</option>
                              <option value="boolean">
                                Boolean (Tắt / Bật)
                              </option>
                              <option value="text">Văn bản (Text)</option>
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className="text-xs text-slate-500"
                                style={{ fontWeight: 600 }}
                              >
                                Phạm vi giá trị
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editDeviceTypeForm.rangeNA}
                                  onChange={(e) =>
                                    setEditDeviceTypeForm((p) => ({
                                      ...p,
                                      rangeNA: e.target.checked,
                                      minValue: "",
                                      maxValue: "",
                                    }))
                                  }
                                  className="rounded border-slate-300"
                                />
                                Không xác định
                              </label>
                            </div>
                            {!editDeviceTypeForm.rangeNA && (
                              <div className="grid grid-cols-2 gap-2">
                                <EditField
                                  label="Min"
                                  value={editDeviceTypeForm.minValue}
                                  onChange={(v) =>
                                    setEditDeviceTypeForm((p) => ({
                                      ...p,
                                      minValue: v,
                                    }))
                                  }
                                  type="number"
                                />
                                <EditField
                                  label="Max"
                                  value={editDeviceTypeForm.maxValue}
                                  onChange={(v) =>
                                    setEditDeviceTypeForm((p) => ({
                                      ...p,
                                      maxValue: v,
                                    }))
                                  }
                                  type="number"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditDeviceType(deviceType.id)}
                              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-green-700"
                            >
                              <Save size={16} /> Lưu
                            </button>
                            <button
                              onClick={() => setEditDeviceTypeId(null)}
                              className="flex-1 py-2 bg-slate-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-slate-700"
                            >
                              <X size={16} /> Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                              <IconComponent size={20} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">
                                {deviceType.name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                Mã: {deviceType.id}
                              </p>
                            </div>
                          </div>
                          {deviceType.description && (
                            <p className="text-sm text-slate-600 mb-3">
                              {deviceType.description}
                            </p>
                          )}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Danh mục:</span>
                              <span className="text-slate-700">
                                {deviceType.category === "sensor"
                                  ? "Cảm biến"
                                  : "Thiết bị điều khiển"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Kiểu giá trị:
                              </span>
                              <span className="text-slate-700">
                                {deviceType.valueType === "boolean"
                                  ? "Boolean (Tắt / Bật)"
                                  : deviceType.valueType === "text"
                                    ? "Văn bản (Text)"
                                    : "Số (Number)"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Đơn vị đo lường:
                              </span>
                              <span className="text-slate-700">
                                {deviceType.unit || "Không xác định"}
                              </span>
                            </div>
                            {deviceType.valueRange ? (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Phạm vi:</span>
                                <span className="text-slate-700">
                                  {deviceType.valueRange.min} -{" "}
                                  {deviceType.valueRange.max}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Phạm vi:</span>
                                <span className="text-slate-400 italic">
                                  Không xác định
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Đang dùng:</span>
                              <span className="text-slate-700">
                                {devicesUsingType} thiết bị
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                setEditDeviceTypeId(deviceType.id);
                                setEditDeviceTypeForm({
                                  id: deviceType.id,
                                  name: deviceType.name,
                                  description: deviceType.description,
                                  unit:
                                    deviceType.unit === "N/A"
                                      ? ""
                                      : deviceType.unit || "",
                                  unitNA: deviceType.unit === "N/A",
                                  category: deviceType.category,
                                  valueType: deviceType.valueType || "number",
                                  minValue:
                                    deviceType.valueRange?.min?.toString() ||
                                    "",
                                  maxValue:
                                    deviceType.valueRange?.max?.toString() ||
                                    "",
                                  rangeNA: !deviceType.valueRange,
                                });
                              }}
                              className="flex-1 py-2 text-blue-600 border border-blue-200 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-50"
                            >
                              <Edit3 size={16} /> Sửa
                            </button>
                            <button
                              onClick={() => deleteDeviceType(deviceType.id)}
                              className="flex-1 py-2 text-red-600 border border-red-200 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-red-50"
                            >
                              <Trash2 size={16} /> Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredDeviceTypes.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Package size={32} className="mx-auto mb-3 text-slate-300" />
                  <p>
                    {search
                      ? "Không tìm thấy loại thiết bị phù hợp"
                      : "Chưa có loại thiết bị nào được tạo"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== DRYERS TAB ==================== */}
        {activeTab === "dryers" && (
          <div className="p-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-lg text-slate-900"
                    style={{ fontWeight: 700 }}
                  >
                    Máy sấy và thiết bị
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Quản lý thông tin máy sấy và thiết bị bên trong
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredDryers.map((dryer) => {
                  const area = areas.find((a) => a.id === dryer.areaId);
                  const isExpanded = expandedDryers.has(dryer.id);

                  return (
                    <div
                      key={dryer.id}
                      className="border rounded-lg overflow-hidden border-slate-200"
                    >
                      {/* Clickable dryer header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100"
                        onClick={() => {
                          if (editDryerId === dryer.id) return;
                          const s = new Set(expandedDryers);
                          if (isExpanded) s.delete(dryer.id);
                          else s.add(dryer.id);
                          setExpandedDryers(s);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-1">
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </span>
                          <Cpu size={20} className="text-blue-600" />
                          <div>
                            {editDryerId === dryer.id ? (
                              <div
                                className="grid grid-cols-2 gap-3 w-[500px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EditField
                                  label="ID máy sấy"
                                  value={editDryerForm.id}
                                  onChange={(v) =>
                                    setEditDryerForm((p) => ({ ...p, id: v }))
                                  }
                                  required
                                />
                                <EditField
                                  label="Tên máy sấy"
                                  value={editDryerForm.name}
                                  onChange={(v) =>
                                    setEditDryerForm((p) => ({ ...p, name: v }))
                                  }
                                  required
                                />
                                <div>
                                  <label
                                    className="text-xs text-slate-500 block mb-1"
                                    style={{ fontWeight: 600 }}
                                  >
                                    Khu vực{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={editDryerForm.areaId}
                                    onChange={(e) =>
                                      setEditDryerForm((p) => ({
                                        ...p,
                                        areaId: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  >
                                    <option value="">Chọn khu vực</option>
                                    {areas.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label
                                    className="text-xs text-slate-500 block mb-1"
                                    style={{ fontWeight: 600 }}
                                  >
                                    Người vận hành
                                  </label>
                                  <select
                                    value={editDryerForm.managerId}
                                    onChange={(e) =>
                                      setEditDryerForm((p) => ({
                                        ...p,
                                        managerId: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  >
                                    <option value="">-- Chưa chọn --</option>
                                    {activeUsers.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} (
                                        {u.role === "admin"
                                          ? "Quản trị"
                                          : "Vận hành"}
                                        )
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <EditField
                                  label="Sức chứa (kg)"
                                  value={editDryerForm.capacity}
                                  onChange={(v) =>
                                    setEditDryerForm((p) => ({
                                      ...p,
                                      capacity: v,
                                    }))
                                  }
                                  type="number"
                                />
                              </div>
                            ) : (
                              <div>
                                <h3 className="font-semibold text-slate-900">
                                  {dryer.name}
                                </h3>
                                <div className="text-sm text-slate-500 flex items-center gap-4 flex-wrap">
                                  <span>Mã: {dryer.id}</span>
                                  <span>Khu vực: {area?.name || "N/A"}</span>
                                  {dryer.operator && (
                                    <span>
                                      Vận hành:{" "}
                                      {getUserName(dryer.managerId) ||
                                        dryer.operator}
                                    </span>
                                  )}
                                  <StatusBadge status={dryer.status} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {dryer.devices?.length || 0} thiết bị
                          </span>
                          {editDryerId === dryer.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEditDryer(dryer.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditDryerId(null)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditDryerId(dryer.id);
                                  setEditDryerForm({
                                    id: dryer.id,
                                    name: dryer.name,
                                    areaId: dryer.areaId,
                                    managerId:
                                      dryer.managerId?.toString() || "",
                                    capacity: dryer.capacity?.toString() || "",
                                  });
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  deleteDryer(dryer.id, dryer.name)
                                }
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                title="Xóa máy sấy"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentDryerForDevice(dryer.id);
                                  setAddDeviceOpen(true);
                                }}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-emerald-700"
                              >
                                <Plus size={14} /> Thêm TB
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded devices */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-100">
                          {dryer.devices && dryer.devices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {dryer.devices.map((device) => {
                                const deviceType = deviceTypes.find(
                                  (dt) => dt.id === device.deviceTypeId,
                                );
                                const IconComponent = deviceType
                                  ? deviceIcon[deviceType.id] || Package
                                  : Package;
                                const colorClass = device.deviceTypeId
                                  ? deviceColor[device.deviceTypeId] ||
                                    "text-slate-500 bg-slate-100"
                                  : "text-slate-500 bg-slate-100";

                                return (
                                  <div
                                    key={device.id}
                                    className="border border-slate-200 rounded-lg p-3"
                                  >
                                    {editDeviceId === device.id &&
                                    editDeviceDryerId === dryer.id ? (
                                      <div className="space-y-3">
                                        <EditField
                                          label="ID thiết bị"
                                          value={editDeviceForm.id}
                                          onChange={(v) =>
                                            setEditDeviceForm((p) => ({
                                              ...p,
                                              id: v,
                                            }))
                                          }
                                          required
                                        />
                                        <EditField
                                          label="Tên thiết bị"
                                          value={editDeviceForm.name}
                                          onChange={(v) =>
                                            setEditDeviceForm((p) => ({
                                              ...p,
                                              name: v,
                                            }))
                                          }
                                          required
                                        />
                                        <div>
                                          <label
                                            className="text-xs text-slate-500 block mb-1"
                                            style={{ fontWeight: 600 }}
                                          >
                                            Loại thiết bị{" "}
                                            <span className="text-red-500">
                                              *
                                            </span>
                                          </label>
                                          <select
                                            value={editDeviceForm.deviceTypeId}
                                            onChange={(e) => {
                                              const typeId = e.target.value;
                                              const selectedType =
                                                deviceTypes.find(
                                                  (dt) => dt.id === typeId,
                                                );
                                              const targetDryer = dryers.find(
                                                (d) =>
                                                  d.id === editDeviceDryerId,
                                              );
                                              const existingCount = typeId
                                                ? (targetDryer?.devices.filter(
                                                    (dev) =>
                                                      dev.deviceTypeId ===
                                                        typeId &&
                                                      dev.id !== editDeviceId,
                                                  ).length ?? 0)
                                                : 0;
                                              setEditDeviceForm((p) => ({
                                                ...p,
                                                deviceTypeId: typeId,
                                                name: selectedType
                                                  ? `${selectedType.name} ${existingCount + 1}`
                                                  : p.name,
                                              }));
                                            }}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                          >
                                            <option value="">
                                              Chọn loại thiết bị
                                            </option>
                                            {deviceTypes.map((dt) => (
                                              <option key={dt.id} value={dt.id}>
                                                {dt.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <EditField
                                          label="Ngày lắp đặt"
                                          value={editDeviceForm.installDate}
                                          onChange={(v) =>
                                            setEditDeviceForm((p) => ({
                                              ...p,
                                              installDate: v,
                                            }))
                                          }
                                          type="date"
                                        />
                                        <EditField
                                          label="Công suất (W)"
                                          value={editDeviceForm.power}
                                          onChange={(v) =>
                                            setEditDeviceForm((p) => ({
                                              ...p,
                                              power: v,
                                            }))
                                          }
                                          type="number"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              saveEditDevice(
                                                dryer.id,
                                                device.id,
                                              )
                                            }
                                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-green-700"
                                          >
                                            <Save size={16} /> Lưu
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditDeviceId(null);
                                              setEditDeviceDryerId(null);
                                            }}
                                            className="flex-1 py-2 bg-slate-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-slate-700"
                                          >
                                            <X size={16} /> Hủy
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-center gap-3 mb-3">
                                          <div
                                            className={`p-2 rounded-lg ${colorClass}`}
                                          >
                                            <IconComponent size={20} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-slate-900 text-sm truncate">
                                              {device.name}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                              Mã: {device.id}
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            {connectedDeviceIds.has(
                                              device.id,
                                            ) && (
                                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold whitespace-nowrap">
                                                Đã kết nối
                                              </span>
                                            )}
                                            <span
                                              className={`w-2 h-2 rounded-full ${device.status ? "bg-green-500" : "bg-slate-400"}`}
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">
                                              Loại:
                                            </span>
                                            <span className="text-slate-700">
                                              {deviceType?.name || "N/A"}
                                            </span>
                                          </div>
                                          {device.installDate && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">
                                                Lắp đặt:
                                              </span>
                                              <span className="text-slate-700">
                                                {device.installDate}
                                              </span>
                                            </div>
                                          )}
                                          {device.power && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">
                                                Công suất:
                                              </span>
                                              <span className="text-slate-700">
                                                {device.power}W
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                          <button
                                            onClick={() => {
                                              setEditDeviceId(device.id);
                                              setEditDeviceDryerId(dryer.id);
                                              setEditDeviceForm({
                                                id: device.id,
                                                name: device.name,
                                                deviceTypeId:
                                                  device.deviceTypeId,
                                                installDate:
                                                  device.installDate || "",
                                                power:
                                                  device.power?.toString() ||
                                                  "",
                                              });
                                            }}
                                            className="flex-1 py-1.5 text-blue-600 border border-blue-200 rounded text-xs flex items-center justify-center gap-1 hover:bg-blue-50"
                                          >
                                            <Edit3 size={12} /> Sửa
                                          </button>
                                          <button
                                            onClick={() =>
                                              deleteDevice(
                                                dryer.id,
                                                device.id,
                                                device.name,
                                              )
                                            }
                                            className="flex-1 py-1.5 border border-red-200 rounded text-xs flex items-center justify-center gap-1 text-red-600 hover:bg-red-50"
                                            title="Xóa thiết bị"
                                          >
                                            <Trash2 size={12} /> Xóa
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-slate-500">
                              <Wrench
                                size={24}
                                className="mx-auto mb-2 text-slate-300"
                              />
                              <p className="text-sm">
                                Chưa có thiết bị nào trong máy sấy này
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredDryers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Cpu size={32} className="mx-auto mb-3 text-slate-300" />
                  <p>
                    {search
                      ? "Không tìm thấy máy sấy phù hợp"
                      : "Chưa có máy sấy nào"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Modal: Add Area */}
      {addAreaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Thêm khu vực mới
              </h3>
              <button
                onClick={() => setAddAreaOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <EditField
                label="ID khu vực (tùy chọn)"
                value={areaForm.id}
                onChange={(v) => setAreaForm((p) => ({ ...p, id: v }))}
                placeholder="Tự động tạo nếu để trống"
              />
              <EditField
                label="Tên khu vực"
                value={areaForm.name}
                onChange={(v) => setAreaForm((p) => ({ ...p, name: v }))}
                placeholder="Nhập tên khu vực"
                required
              />
              <EditField
                label="Mô tả"
                value={areaForm.description}
                onChange={(v) => setAreaForm((p) => ({ ...p, description: v }))}
                placeholder="Mô tả chi tiết về khu vực"
              />
              <div>
                <label
                  className="text-xs text-slate-500 block mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Người quản lý
                </label>
                <select
                  value={areaForm.managerId}
                  onChange={(e) =>
                    setAreaForm((p) => ({ ...p, managerId: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chưa chọn --</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (
                      {u.role === "admin" ? "Quản trị" : "Vận hành"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddAreaOpen(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={addArea}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Thêm khu vực
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Device Type */}
      {addDeviceTypeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Thêm loại thiết bị mới
              </h3>
              <button
                onClick={() => setAddDeviceTypeOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <EditField
                label="ID loại thiết bị (tùy chọn)"
                value={deviceTypeForm.id}
                onChange={(v) => setDeviceTypeForm((p) => ({ ...p, id: v }))}
                placeholder="Tự động tạo nếu để trống"
              />
              <EditField
                label="Tên loại thiết bị"
                value={deviceTypeForm.name}
                onChange={(v) => setDeviceTypeForm((p) => ({ ...p, name: v }))}
                placeholder="VD: Cảm biến nhiệt độ"
                required
              />
              <EditField
                label="Mô tả"
                value={deviceTypeForm.description}
                onChange={(v) =>
                  setDeviceTypeForm((p) => ({ ...p, description: v }))
                }
                placeholder="Mô tả chức năng của loại thiết bị"
              />
              {/* Unit with N/A option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Đơn vị đo lường
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deviceTypeForm.unitNA}
                      onChange={(e) =>
                        setDeviceTypeForm((p) => ({
                          ...p,
                          unitNA: e.target.checked,
                          unit: "",
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    Không xác định
                  </label>
                </div>
                {!deviceTypeForm.unitNA && (
                  <input
                    type="text"
                    value={deviceTypeForm.unit}
                    onChange={(e) =>
                      setDeviceTypeForm((p) => ({ ...p, unit: e.target.value }))
                    }
                    placeholder="VD: °C, %, RPM"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                )}
              </div>
              <div>
                <label
                  className="text-xs text-slate-500 block mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={deviceTypeForm.category}
                  onChange={(e) =>
                    setDeviceTypeForm((p) => ({
                      ...p,
                      category: e.target.value as any,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="sensor">Cảm biến</option>
                  <option value="controller">Thiết bị điều khiển</option>
                </select>
              </div>
              <div>
                <label
                  className="text-xs text-slate-500 block mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Kiểu giá trị <span className="text-red-500">*</span>
                </label>
                <select
                  value={deviceTypeForm.valueType}
                  onChange={(e) =>
                    setDeviceTypeForm((p) => ({
                      ...p,
                      valueType: e.target.value as any,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="number">Số (Number)</option>
                  <option value="boolean">Boolean (Tắt / Bật)</option>
                  <option value="text">Văn bản (Text)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Phạm vi giá trị
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deviceTypeForm.rangeNA}
                      onChange={(e) =>
                        setDeviceTypeForm((p) => ({
                          ...p,
                          rangeNA: e.target.checked,
                          minValue: "",
                          maxValue: "",
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    Không xác định
                  </label>
                </div>
                {!deviceTypeForm.rangeNA && (
                  <div className="grid grid-cols-2 gap-3">
                    <EditField
                      label="Giá trị tối thiểu"
                      value={deviceTypeForm.minValue}
                      onChange={(v) =>
                        setDeviceTypeForm((p) => ({ ...p, minValue: v }))
                      }
                      type="number"
                      placeholder="0"
                    />
                    <EditField
                      label="Giá trị tối đa"
                      value={deviceTypeForm.maxValue}
                      onChange={(v) =>
                        setDeviceTypeForm((p) => ({ ...p, maxValue: v }))
                      }
                      type="number"
                      placeholder="100"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddDeviceTypeOpen(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={addDeviceType}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Thêm loại thiết bị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Device */}
      {addDeviceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Thêm thiết bị
              </h3>
              <button
                onClick={() => setAddDeviceOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Thêm vào máy sấy:{" "}
              <span className="font-semibold text-slate-700">
                {dryers.find((d) => d.id === currentDryerForDevice)?.name}
              </span>
            </p>
            <div className="space-y-4">
              <EditField
                label="ID thiết bị (tùy chọn)"
                value={deviceForm.id}
                onChange={(v) => setDeviceForm((p) => ({ ...p, id: v }))}
                placeholder="Tự động tạo nếu để trống"
              />
              <EditField
                label="Tên thiết bị"
                value={deviceForm.name}
                onChange={(v) => setDeviceForm((p) => ({ ...p, name: v }))}
                placeholder="Nhập tên thiết bị"
                required
              />
              <div>
                <label
                  className="text-xs text-slate-500 block mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Loại thiết bị <span className="text-red-500">*</span>
                </label>
                <select
                  value={deviceForm.deviceTypeId}
                  onChange={(e) => {
                    const typeId = e.target.value;
                    const selectedType = deviceTypes.find(
                      (dt) => dt.id === typeId,
                    );
                    const targetDryer = dryers.find(
                      (d) => d.id === currentDryerForDevice,
                    );
                    const existingCount = typeId
                      ? (targetDryer?.devices.filter(
                          (dev) => dev.deviceTypeId === typeId,
                        ).length ?? 0)
                      : 0;
                    setDeviceForm((p) => ({
                      ...p,
                      deviceTypeId: typeId,
                      name: selectedType
                        ? `${selectedType.name} ${existingCount + 1}`
                        : p.name,
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn loại thiết bị</option>
                  {deviceTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>
              <EditField
                label="Công suất (W)"
                value={deviceForm.power}
                onChange={(v) => setDeviceForm((p) => ({ ...p, power: v }))}
                type="number"
                placeholder="Công suất tiêu thụ"
              />
              <p className="text-xs text-slate-400 italic">
                * Ngày lắp đặt sẽ tự động ghi nhận là ngày hôm nay
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddDeviceOpen(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={addDevice}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Thêm thiết bị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Dryer from Area */}
      {addDryerFromAreaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Thêm máy sấy vào khu vực
              </h3>
              <button
                onClick={() => setAddDryerFromAreaOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <EditField
                label="ID máy sấy (tùy chọn)"
                value={addDryerFromAreaForm.id}
                onChange={(v) =>
                  setAddDryerFromAreaForm((p) => ({ ...p, id: v }))
                }
                placeholder="Tự động tạo nếu để trống"
              />
              <EditField
                label="Tên máy sấy"
                value={addDryerFromAreaForm.name}
                onChange={(v) =>
                  setAddDryerFromAreaForm((p) => ({ ...p, name: v }))
                }
                placeholder="Nhập tên máy sấy"
                required
              />
              <div>
                <label
                  className="text-xs text-slate-500 block mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Người vận hành
                </label>
                <select
                  value={addDryerFromAreaForm.managerId}
                  onChange={(e) =>
                    setAddDryerFromAreaForm((p) => ({
                      ...p,
                      managerId: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chưa chọn --</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (
                      {u.role === "admin" ? "Quản trị" : "Vận hành"})
                    </option>
                  ))}
                </select>
              </div>
              <EditField
                label="Sức chứa (kg)"
                value={addDryerFromAreaForm.capacity}
                onChange={(v) =>
                  setAddDryerFromAreaForm((p) => ({ ...p, capacity: v }))
                }
                placeholder="VD: 500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddDryerFromAreaOpen(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={addDryerFromArea}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Thêm máy sấy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Xóa"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Warning Dialog (condition-based delete blocks) */}
      {warningDialog.open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={closeWarning}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <h3
                className="text-lg text-slate-900 mb-2"
                style={{ fontWeight: 700 }}
              >
                {warningDialog.title}
              </h3>
              <p className="text-sm text-slate-500">{warningDialog.message}</p>
            </div>
            <div className="border-t border-slate-100">
              <button
                onClick={closeWarning}
                className="w-full py-3.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                style={{ fontWeight: 600 }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
