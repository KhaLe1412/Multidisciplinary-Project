import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { Dryer } from "../data/mockData";
import {
  Search,
  Cpu,
  MapPin,
  User,
  Power,
  ChevronRight,
  X,
  ShieldAlert,
  Package,
  Activity,
  DoorOpen,
  Monitor,
  Flame,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";

const modeLabel: Record<string, string> = {
  manual: "Thủ công",
  threshold: "Theo ngưỡng",
  schedule: "Theo lịch",
};

const modeColor: Record<string, { bg: string; text: string; border: string }> =
  {
    manual: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
    threshold: { bg: "#faf5ff", text: "#7c3aed", border: "#c4b5fd" },
    schedule: { bg: "#eff6ff", text: "#2563eb", border: "#93c5fd" },
  };

const deviceTypeLabel: Record<string, string> = {
  "DT-TEMP": "Cảm biến nhiệt độ",
  "DT-HUM": "Cảm biến độ ẩm",
  "DT-MOTION": "Cảm biến chuyển động",
  "DT-FAN": "Quạt",
  "DT-DOOR": "Cửa điều khiển",
  "DT-LCD": "Màn hình LCD",
  "DT-HEATER": "Máy gia nhiệt",
};
const deviceTypeColor: Record<string, string> = {
  "DT-TEMP": "text-orange-500 bg-orange-50",
  "DT-HUM": "text-blue-500 bg-blue-50",
  "DT-MOTION": "text-violet-500 bg-violet-50",
  "DT-FAN": "text-cyan-500 bg-cyan-50",
  "DT-DOOR": "text-emerald-500 bg-emerald-50",
  "DT-LCD": "text-slate-500 bg-slate-100",
  "DT-HEATER": "text-red-500 bg-red-50",
};
const deviceTypeIcon: Record<string, any> = {
  "DT-TEMP": Thermometer,
  "DT-HUM": Droplets,
  "DT-MOTION": Activity,
  "DT-FAN": Wind,
  "DT-DOOR": DoorOpen,
  "DT-LCD": Monitor,
  "DT-HEATER": Flame,
};

function DryerInfoModal({
  dryer,
  onClose,
}: {
  dryer: Dryer;
  onClose: () => void;
}) {
  const { areas, deviceTypes, schedules, fruits } = useApp();
  const area = areas.find((a) => a.id === dryer.areaId);
  const fruit = dryer.activeBatch
    ? fruits.find((f) => f.id === dryer.activeBatch!.fruitId)
    : null;
  const schedule = dryer.activeBatch?.scheduleId
    ? schedules.find((s) => s.id === dryer.activeBatch!.scheduleId)
    : null;
  const [tab, setTab] = useState<"info" | "devices">("info");

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[420px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-5 ${dryer.status === "running" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100" : dryer.status === "on" ? "bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100" : "bg-slate-50 border-b border-slate-100"}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${dryer.status === "running" ? "bg-green-100" : dryer.status === "on" ? "bg-blue-100" : "bg-slate-200"}`}
                style={{
                  boxShadow:
                    dryer.status === "running"
                      ? "0 0 0 3px rgba(34,197,94,0.2)"
                      : "none",
                }}
              >
                <Cpu
                  size={22}
                  className={
                    dryer.status === "running"
                      ? "text-green-600"
                      : dryer.status === "on"
                        ? "text-blue-600"
                        : "text-slate-400"
                  }
                />
              </div>
              <div>
                <h3
                  className="text-base text-slate-900"
                  style={{ fontWeight: 700 }}
                >
                  {dryer.name}
                </h3>
                <p className="text-xs text-slate-400">{dryer.id}</p>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${dryer.status === "running" ? "bg-green-100 text-green-700" : dryer.status === "on" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                  style={{ fontWeight: 600 }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${dryer.status === "running" ? "bg-green-500" : dryer.status === "on" ? "bg-blue-500" : "bg-slate-400"}`}
                  />
                  {dryer.status === "running"
                    ? "Đang hoạt động"
                    : dryer.status === "on"
                      ? "Bật"
                      : "Tắt"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-white/80 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-3 bg-white/60 rounded-lg p-0.5">
            {[
              { key: "info", label: "Thông tin" },
              { key: "devices", label: `Thiết bị (${dryer.devices.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex-1 py-1.5 rounded-md text-xs transition-all ${tab === t.key ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                style={{ fontWeight: tab === t.key ? 600 : 400 }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 max-h-80 overflow-y-auto">
          {tab === "info" && (
            <div className="space-y-0">
              {[
                ["Chế độ", modeLabel[dryer.mode]],
                ["Vị trí", area?.name ?? dryer.areaId],
                dryer.operator ? ["Người vận hành", dryer.operator] : null,
                dryer.capacity ? ["Sức chứa", `${dryer.capacity} kg`] : null,
                dryer.createdAt
                  ? [
                      "Ngày tạo",
                      new Date(dryer.createdAt).toLocaleDateString("vi-VN"),
                    ]
                  : null,
                fruit ? ["Nông sản", fruit.name] : null,
                schedule ? ["Lịch trình", schedule.name] : null,
                [
                  "Thiết bị hoạt động",
                  `${dryer.devices.filter((d) => d.status).length}/${dryer.devices.length}`,
                ],
              ]
                .filter(Boolean)
                .map(([k, v]: any) => (
                  <div
                    key={k}
                    className="flex justify-between py-2 border-b border-slate-50 text-sm last:border-0"
                  >
                    <span className="text-slate-400 text-xs">{k}</span>
                    <span
                      className="text-slate-800 text-xs"
                      style={{ fontWeight: 500 }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {tab === "devices" && (
            <div className="space-y-2">
              {dryer.devices.map((dev) => {
                const dt = deviceTypes.find((t) => t.id === dev.deviceTypeId);
                const Icon = deviceTypeIcon[dev.deviceTypeId] || Cpu;
                const colorClass =
                  deviceTypeColor[dev.deviceTypeId] ||
                  "text-slate-500 bg-slate-100";
                return (
                  <div
                    key={dev.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs text-slate-800"
                        style={{ fontWeight: 500 }}
                      >
                        {dev.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span>{dev.id}</span>
                        {dev.installDate && (
                          <span>
                            📅{" "}
                            {new Date(dev.installDate).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        )}
                        {dev.power !== undefined && (
                          <span>⚡ {dev.power}W</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${dev.status ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {dev.status ? "Bật" : "Tắt"}
                      </span>
                      {dev.value !== undefined && (
                        <span className="text-xs text-slate-600">
                          {dev.value}
                          {dt?.unit}
                        </span>
                      )}
                      {dev.speed !== undefined && (
                        <span className="text-xs text-cyan-600">
                          {dev.speed}%
                        </span>
                      )}
                      {dev.temperature !== undefined && (
                        <span className="text-xs text-orange-600">
                          {dev.temperature}°C
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-slate-400 text-center">
            Nhấn giữ để xem thông tin · Nhấn để điều khiển
          </p>
        </div>
      </div>
    </div>
  );
}

export function Control() {
  const { dryers, setDryers, areas, deviceTypes, fruits, currentUser, addLog } =
    useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [longPressInfo, setLongPressInfo] = useState<Dryer | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const p = currentUser?.permissions;
  const isAdmin = currentUser?.role === "admin";

  const onMouseDown = useCallback((dryer: Dryer) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setLongPressInfo(dryer);
    }, 600);
  }, []);

  const onMouseUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleClick = useCallback(
    (dryer: Dryer) => {
      if (longPressTriggered.current) return;
      navigate(`/control/${dryer.id}`);
    },
    [navigate],
  );

  const handleTogglePower = useCallback(
    (e: React.MouseEvent, dryer: Dryer) => {
      e.stopPropagation();
      const newStatus = dryer.status === "off" ? "on" : "off";
      const action = newStatus === "on" ? "Bật" : "Tắt";
      setDryers((prev) =>
        prev.map((d) => (d.id === dryer.id ? { ...d, status: newStatus } : d)),
      );
      addLog({
        eventType: "device_control",
        time: new Date().toISOString(),
        user: currentUser!.name,
        description: `${action} máy sấy ${dryer.name}`,
        dryerId: dryer.id,
        severity: "info",
      });
    },
    [setDryers, addLog, currentUser],
  );

  if (!isAdmin && !p?.control) {
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
            Bạn không có quyền điều khiển máy sấy.
          </p>
        </div>
      </div>
    );
  }

  const allowedDryers =
    isAdmin || p?.controlDryers === "all"
      ? dryers
      : dryers.filter((d) => (p?.controlDryers as string[])?.includes(d.id));

  const filtered = allowedDryers.filter((d) => {
    const area = areas.find((a) => a.id === d.areaId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.id.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      area?.name.toLowerCase().includes(q);
    const matchArea = !filterArea || d.areaId === filterArea;
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchArea && matchStatus;
  });

  const activeCount = allowedDryers.filter(
    (d) => d.status === "running",
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1
          className="text-2xl text-slate-900 mb-1"
          style={{ fontWeight: 700 }}
        >
          Điều khiển máy sấy
        </h1>
        <p className="text-slate-500 text-sm">
          Nhấn để điều khiển ·{" "}
          <span className="italic">Nhấn giữ để xem thông tin chi tiết</span>
        </p>
      </div>

      {/* Stats - inline single line */}
      <div className="flex items-center gap-5 mb-5 bg-white rounded-xl px-5 py-3 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Tổng máy sấy:</span>
          <span className="text-xl text-slate-900" style={{ fontWeight: 700 }}>
            {allowedDryers.length}
          </span>
        </div>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-slate-500">Đang hoạt động:</span>
          <span className="text-xl text-green-600" style={{ fontWeight: 700 }}>
            {activeCount}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm máy sấy..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterArea}
            onChange={(e) => {
              setFilterArea(e.target.value);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả khu vực</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="running">Đang hoạt động</option>
            <option value="on">Bật</option>
            <option value="off">Tắt</option>
          </select>
          {(search || filterArea || filterStatus) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterArea("");
                setFilterStatus("");
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
            >
              <X size={13} /> Xóa lọc
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Hiển thị {filtered.length}/{allowedDryers.length} máy sấy
        </p>
      </div>

      {/* Dryer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((dryer) => {
          const area = areas.find((a) => a.id === dryer.areaId);
          const fruit = dryer.activeBatch
            ? fruits.find((f) => f.id === dryer.activeBatch!.fruitId)
            : null;
          const mc = modeColor[dryer.mode];
          return (
            <div
              key={dryer.id}
              onMouseDown={() => onMouseDown(dryer)}
              onMouseUp={onMouseUp}
              onTouchStart={() => onMouseDown(dryer)}
              onTouchEnd={() => {
                onMouseUp();
              }}
              onClick={() => handleClick(dryer)}
              className="relative bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer select-none group"
              style={{
                userSelect: "none",
                transition:
                  "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 8px 25px rgba(0,0,0,0.10)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  dryer.status === "running"
                    ? "#86efac"
                    : dryer.status === "on"
                      ? "#93c5fd"
                      : "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
                (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                onMouseUp();
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${dryer.status === "running" ? "bg-green-100" : dryer.status === "on" ? "bg-blue-100" : "bg-slate-100"}`}
                      style={{
                        boxShadow:
                          dryer.status === "running"
                            ? "0 0 0 3px rgba(34,197,94,0.15)"
                            : "none",
                      }}
                    >
                      <Cpu
                        size={20}
                        className={
                          dryer.status === "running"
                            ? "text-green-600"
                            : dryer.status === "on"
                              ? "text-blue-600"
                              : "text-slate-400"
                        }
                      />
                    </div>
                    <div>
                      <p
                        className="text-slate-900 text-sm"
                        style={{ fontWeight: 600 }}
                      >
                        {dryer.name}
                      </p>
                      <p className="text-slate-400 text-xs">{dryer.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        dryer.status === "running"
                          ? "bg-green-100 text-green-700"
                          : dryer.status === "on"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dryer.status === "running"
                            ? "bg-green-500"
                            : dryer.status === "on"
                              ? "bg-blue-500"
                              : "bg-slate-400"
                        }`}
                      />
                      {dryer.status === "running"
                        ? "Đang hoạt động"
                        : dryer.status === "on"
                          ? "Bật"
                          : "Tắt"}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        background: mc.bg,
                        color: mc.text,
                        borderColor: mc.border,
                        fontWeight: 500,
                      }}
                    >
                      {modeLabel[dryer.mode]}
                    </span>
                    {dryer.status === "running" && fruit && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700"
                        style={{ fontWeight: 500 }}
                      >
                        <Package size={10} />
                        {fruit.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fruit name badge - moved to header; this block removed */}

                <div className="space-y-1.5 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin
                      size={11}
                      className="text-slate-400 flex-shrink-0"
                    />
                    <span>{area?.name}</span>
                  </div>
                  {dryer.operator && (
                    <div className="flex items-center gap-1.5">
                      <User
                        size={11}
                        className="text-slate-400 flex-shrink-0"
                      />
                      <span>{dryer.operator}</span>
                    </div>
                  )}
                  {dryer.capacity && (
                    <div className="flex items-center gap-1.5">
                      <Package
                        size={11}
                        className="text-slate-400 flex-shrink-0"
                      />
                      <span>Sức chứa: {dryer.capacity} kg</span>
                    </div>
                  )}
                </div>

                {dryer.status === "running" ? (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {(() => {
                      const batch = dryer.activeBatch;
                      const remainSec = batch
                        ? Math.max(
                            0,
                            batch.runSeconds -
                              (Date.now() -
                                new Date(batch.startedAt).getTime()) /
                                1000,
                          )
                        : 0;
                      const remH = Math.floor(remainSec / 3600);
                      const remM = Math.floor((remainSec % 3600) / 60);
                      const remTimeStr = batch
                        ? remH > 0
                          ? `${remH}g ${remM}ph còn lại`
                          : `${remM}ph còn lại`
                        : null;
                      return (
                        <div className="rounded-lg p-2.5 bg-green-50 border border-green-100">
                          <p
                            className="text-xs text-green-600 text-center"
                            style={{ fontWeight: 500 }}
                          >
                            ▶ Đang sấy
                          </p>
                          {remTimeStr && (
                            <p
                              className="text-xs text-green-700 text-center mt-0.5"
                              style={{ fontWeight: 600 }}
                            >
                              ⏱ {remTimeStr}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : dryer.status === "on" ? (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-xs text-blue-600"
                        style={{ fontWeight: 500 }}
                      >
                        ⚡ Sẵn sàng
                      </p>
                      <button
                        onClick={(e) => handleTogglePower(e, dryer)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-500 text-white rounded-lg text-xs hover:bg-slate-600 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        <Power size={11} /> Tắt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-xs text-slate-500"
                        style={{ fontWeight: 500 }}
                      >
                        ⚡ Máy đang tắt
                      </p>
                      <button
                        onClick={(e) => handleTogglePower(e, dryer)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        <Power size={11} /> Bật
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Power size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {dryer.devices.filter((d) => d.status).length}/
                    {dryer.devices.length} thiết bị
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 text-blue-600 text-xs transition-all group-hover:gap-2"
                  style={{ fontWeight: 500 }}
                >
                  {dryer.status === "running"
                    ? "Điều khiển"
                    : dryer.status === "on"
                      ? "Xem"
                      : "Kích hoạt"}{" "}
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* Long-press hint indicator */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-active:opacity-100 transition-opacity rounded-xl"
                style={{
                  background: "rgba(59,130,246,0.05)",
                  border: "2px solid rgba(59,130,246,0.3)",
                }}
              />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Cpu size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Không tìm thấy máy sấy nào</p>
          <p className="text-sm mt-1">Thử thay đổi bộ lọc tìm kiếm</p>
        </div>
      )}

      {longPressInfo && (
        <DryerInfoModal
          dryer={longPressInfo}
          onClose={() => setLongPressInfo(null)}
        />
      )}
    </div>
  );
}
