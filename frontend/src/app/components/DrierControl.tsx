import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import {
  fetchDryerSensors,
  sendActuatorCommand,
  type SensorReading,
} from "../api/controlApi";
import {
  Device,
  Dryer,
  DryerMode,
  DryerStatus,
  DeviceBinding,
  DryerLogEntry,
  PolicyObject,
  generateSensorData,
  buildActionsDesc,
  formatOffsetSeconds,
} from "../data/mockData";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Wind,
  Monitor,
  Flame,
  Power,
  Play,
  StopCircle,
  Check,
  AlertTriangle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  DoorClosed,
  Star,
  Cpu,
  Wrench as _Wrench,
} from "lucide-react";

/* â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const deviceIcon: Record<string, any> = {
  "DT-TEMP": Thermometer,
  "DT-HUM": Droplets,
  "DT-MOTION": Activity,
  "DT-FAN": Wind,
  "DT-DOOR": DoorOpen,
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
const modeLabels: Record<DryerMode, string> = {
  manual: "Thủ công",
  threshold: "Theo ngưỡng",
  schedule: "Theo lịch",
};
const modeColors: Record<
  DryerMode,
  { bg: string; text: string; active: string }
> = {
  manual: { bg: "#f1f5f9", text: "#475569", active: "#3b82f6" },
  threshold: { bg: "#faf5ff", text: "#7c3aed", active: "#7c3aed" },
  schedule: { bg: "#eff6ff", text: "#2563eb", active: "#2563eb" },
};
const SENSORS_PER_PAGE = 3;

/* â”€â”€â”€ SparkLine Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SparkLineChart({
  data,
  dataKey,
  color,
  label,
  height = 140,
}: {
  data: { time: string; temp: number; humidity: number }[];
  dataKey: "temp" | "humidity";
  color: string;
  label: string;
  height?: number;
}) {
  const W = 480,
    H = height,
    PL = 36,
    PR = 8,
    PT = 8,
    PB = 20;
  const vals = data.map((d) => d[dataKey]);
  const mn = Math.min(...vals),
    mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const xStep = (W - PL - PR) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: PL + i * xStep,
    y: PT + (1 - (d[dataKey] - mn) / rng) * (H - PT - PB),
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3">
      <p className="text-xs text-slate-500 mb-1 font-semibold">{label}</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PT + f * (H - PT - PB);
          const v = Math.round(mx - f * rng);
          return (
            <g key={f}>
              <line
                x1={PL}
                x2={W - PR}
                y1={y}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={PL - 4}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="#94a3b8"
              >
                {v}
              </text>
            </g>
          );
        })}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={color}
            opacity={i === pts.length - 1 ? 1 : 0.3}
          />
        ))}
        {data
          .filter(
            (_, i) =>
              i % Math.max(Math.floor(data.length / 6), 1) === 0 ||
              i === data.length - 1,
          )
          .map((d) => {
            const idx = data.indexOf(d);
            return (
              <text
                key={idx}
                x={PL + idx * xStep}
                y={H - 2}
                textAnchor="middle"
                fontSize={8}
                fill="#94a3b8"
              >
                {d.time}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

/* â”€â”€â”€ Rating Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function RatingModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (rating: number, outputWeight: number) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverR, setHoverR] = useState(0);
  const [outputWeight, setOutputWeight] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[380px] shadow-2xl">
        <h3 className="text-lg text-slate-900 mb-4 font-bold">
          Đánh giá mẻ sấy
        </h3>
        <div className="mb-4">
          <label className="text-sm text-slate-600 block mb-2 font-medium">
            Khối lượng đầu ra (kg)
          </label>
          <input
            type="number"
            value={outputWeight}
            onChange={(e) => setOutputWeight(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập khối lượng sau sấy"
            min={0}
          />
        </div>
        <div className="mb-6">
          <label className="text-sm text-slate-600 block mb-2 font-medium">
            Xếp hạng chất lượng
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHoverR(s)}
                onMouseLeave={() => setHoverR(0)}
                onClick={() => setRating(s)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={
                    s <= (hoverR || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-300"
                  }
                />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              if (rating > 0) onSubmit(rating, parseFloat(outputWeight) || 0);
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm text-white font-semibold ${
              rating > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-slate-300 cursor-not-allowed"
            }`}
            disabled={rating === 0}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Actuator Value Display (threshold / schedule read-only) â”€â”€ */
function ActuatorValueCard({
  device,
  dtName,
  unit,
}: {
  device: Device;
  dtName: string;
  unit: string;
}) {
  const Icon = deviceIcon[device.deviceTypeId] || Cpu;
  const cls = deviceColor[device.deviceTypeId] || "text-slate-500 bg-slate-100";
  const isBoolean = unit === "boolean";
  const isText = unit === "text";
  let display: string;
  if (isBoolean) display = device.open ? "Mở" : "Đóng";
  else if (isText) display = device.message || "—";
  else {
    const v =
      device.speed !== undefined
        ? device.speed
        : device.temperature !== undefined
          ? device.temperature
          : (device.value ?? 0);
    display = `${v}${unit}`;
  }
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}
        >
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-800 truncate font-semibold">
            {device.name}
          </p>
          <p className="text-xs text-slate-400">{device.id}</p>
        </div>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
            device.status
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {device.status ? "Bật" : "Tắt"}
        </span>
      </div>
      <div className="text-center py-2 rounded-lg bg-slate-50">
        <p
          className={`text-lg text-slate-900 font-bold ${isText ? "!text-sm" : ""}`}
        >
          {display}
        </p>
        <p className="text-xs text-slate-400">{dtName}</p>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Manual Actuator Control Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ManualActuatorCard({
  device,
  dtName,
  unit,
  valueRange,
  disabled,
  onUpdate,
}: {
  device: Device;
  dtName: string;
  unit: string;
  valueRange?: { min: number; max: number };
  disabled: boolean;
  onUpdate: (updates: Partial<Device>, description: string) => void;
}) {
  const Icon = deviceIcon[device.deviceTypeId] || Cpu;
  const cls = deviceColor[device.deviceTypeId] || "text-slate-500 bg-slate-100";
  const isBoolean = unit === "boolean";
  const isText = unit === "text";

  const currentVal =
    device.speed !== undefined
      ? device.speed
      : device.temperature !== undefined
        ? device.temperature
        : (device.value ?? valueRange?.min ?? 0);
  const [localSlider, setLocalSlider] = useState(currentVal);
  const [localInput, setLocalInput] = useState(String(currentVal));

  useEffect(() => {
    setLocalSlider(currentVal);
    setLocalInput(String(currentVal));
  }, [currentVal]);

  const commitRange = (val: number) => {
    const clamped = Math.max(
      valueRange?.min ?? 0,
      Math.min(valueRange?.max ?? 100, val),
    );
    const updates: Partial<Device> =
      device.speed !== undefined
        ? { speed: clamped }
        : device.temperature !== undefined
          ? { temperature: clamped }
          : { value: clamped };
    onUpdate(updates, `${dtName} â†’ ${clamped}${unit}`);
  };

  const pct =
    valueRange && valueRange.max > valueRange.min
      ? ((localSlider - valueRange.min) / (valueRange.max - valueRange.min)) *
        100
      : 0;

  return (
    <div
      className={`bg-white rounded-xl border p-4 ${disabled ? "border-slate-100 opacity-60" : "border-slate-200"}`}
    >
      {/* header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${cls}`}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 truncate font-semibold">
            {device.name}
          </p>
          <p className="text-xs text-slate-400">{device.id}</p>
        </div>
        <button
          disabled={disabled}
          onClick={() =>
            onUpdate(
              { status: !device.status },
              `${dtName} ${device.status ? "Tắt" : "Bật"}`,
            )
          }
          className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
            device.status
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {device.status ? "Bật" : "Tắt"}
        </button>
      </div>

      {/* boolean control */}
      {isBoolean && (
        <div className="flex items-center gap-3 py-3">
          <span className="text-xs text-slate-500 font-medium">{dtName}</span>
          <button
            disabled={disabled}
            onClick={() =>
              onUpdate(
                { status: !device.status },
                `${dtName} ${device.status ? "Tắt" : "Bật"}`,
              )
            }
            className={`ml-auto flex items-center gap-2.5 px-6 py-3 rounded-xl text-base font-bold transition-all shadow-md active:scale-95 ${
              device.status
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-slate-200"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <Power size={20} />
            {device.status ? "Đang bật" : "Đang tắt"}
          </button>
        </div>
      )}

      {/* text control (LCD) */}
      {isText && (
        <div className="py-2">
          <span className="text-xs text-slate-500 block mb-1">{dtName}</span>
          <input
            type="text"
            defaultValue={device.message || ""}
            onBlur={(e) => {
              if (e.target.value)
                onUpdate(
                  { message: e.target.value },
                  `${dtName} → "${e.target.value}"`,
                );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            disabled={disabled}
            placeholder="Nhập nội dung LCD..."
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* range slider + input */}
      {!isBoolean && !isText && valueRange && (
        <div className="py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{dtName}</span>
            <span className="text-sm text-slate-900 font-bold">
              {localSlider}
              {unit}
            </span>
          </div>
          <input
            type="range"
            min={valueRange.min}
            max={valueRange.max}
            value={localSlider}
            onChange={(e) => {
              setLocalSlider(parseInt(e.target.value));
              setLocalInput(e.target.value);
            }}
            onMouseUp={() => commitRange(localSlider)}
            onTouchEnd={() => commitRange(localSlider)}
            disabled={disabled}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            style={
              disabled
                ? undefined
                : {
                    background: `linear-gradient(to right, #3b82f6 ${pct}%, #e2e8f0 ${pct}%)`,
                  }
            }
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={valueRange.min}
              max={valueRange.max}
              value={localInput}
              onChange={(e) => {
                setLocalInput(e.target.value);
                setLocalSlider(parseInt(e.target.value) || valueRange.min);
              }}
              onBlur={() => commitRange(parseInt(localInput) || valueRange.min)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  commitRange(parseInt(localInput) || valueRange.min);
              }}
              disabled={disabled}
              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-slate-400">{unit}</span>
            <div className="flex-1 flex justify-between text-xs text-slate-400">
              <span>{valueRange.min}</span>
              <span>{valueRange.max}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€ Countdown Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CountdownTimer({
  startedAt,
  runSeconds,
}: {
  startedAt: string;
  runSeconds: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const remaining = Math.max(runSeconds - elapsed, 0);
  const pct = runSeconds > 0 ? Math.min(elapsed / runSeconds, 1) * 100 : 0;
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-blue-500" />
          <span className="text-xs text-slate-500 font-semibold">
            Thời gian chạy
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {fmt(elapsed)} / {fmt(runSeconds)}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-slate-400">Đã chạy: {fmt(elapsed)}</span>
        <span className="text-xs text-blue-600 font-semibold">
          Còn lại: {fmt(remaining)}
        </span>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Log Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LogTable({
  logs,
  compact,
}: {
  logs: DryerLogEntry[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? logs : logs.slice(0, compact ? 4 : 5);
  if (logs.length === 0)
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        Chưa có nhật ký hoạt động nào. Các hoạt động của máy sấy sẽ được ghi lại
        ở đây.
      </div>
    );
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="py-2 px-3 text-left font-semibold">Thời gian</th>
              {!compact && (
                <th className="py-2 px-3 text-left font-semibold">
                  Người dùng
                </th>
              )}
              <th className="py-2 px-3 text-left font-semibold">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((log, i) => (
              <tr
                key={i}
                className="border-b border-slate-50 hover:bg-slate-50"
              >
                <td className="py-1.5 px-3 text-slate-500 whitespace-nowrap">
                  {new Date(log.time).toLocaleTimeString("vi-VN")}
                </td>
                {!compact && (
                  <td className="py-1.5 px-3 text-slate-600">{log.user}</td>
                )}
                <td className="py-1.5 px-3 text-slate-700">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length > (compact ? 4 : 5) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-b-lg"
        >
          {expanded ? "Thu gọn" : `Xem tất cả (${logs.length})`}
        </button>
      )}
    </div>
  );
}

/* â”€â”€â”€ Object Binding Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ObjectBindingEditor({
  objects,
  bindings,
  setBindings,
  dryerDevices,
  deviceTypes,
}: {
  objects: PolicyObject[];
  bindings: DeviceBinding[];
  setBindings: (b: DeviceBinding[]) => void;
  dryerDevices: Device[];
  deviceTypes: { id: string; name: string }[];
}) {
  const usedDeviceIds = new Set(bindings.map((b) => b.deviceId));

  return (
    <div>
      <label className="text-xs text-slate-500 block mb-2 font-semibold">
        Gán thiết bị cho đối tượng
      </label>
      <div className="space-y-2">
        {objects.map((obj) => {
          const dt = deviceTypes.find((t) => t.id === obj.deviceTypeId);
          const matching = dryerDevices.filter(
            (d) => d.deviceTypeId === obj.deviceTypeId,
          );
          const bound = bindings.find((b) => b.objectId === obj.id);
          return (
            <div
              key={obj.id}
              className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5"
            >
              <div className="flex items-center gap-2 w-44 flex-shrink-0">
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                  {obj.id}
                </span>
                <span className="text-xs text-slate-700 truncate font-medium">
                  {obj.label}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">
                ({dt?.name})
              </span>
              <select
                value={bound?.deviceId || ""}
                onChange={(e) => {
                  const next = bindings.filter((b) => b.objectId !== obj.id);
                  if (e.target.value)
                    next.push({ objectId: obj.id, deviceId: e.target.value });
                  setBindings(next);
                }}
                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn thiết bị</option>
                {matching.map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                    disabled={
                      usedDeviceIds.has(d.id) && bound?.deviceId !== d.id
                    }
                  >
                    {d.name} ({d.id})
                    {usedDeviceIds.has(d.id) && bound?.deviceId !== d.id
                      ? " — đã dùng"
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function DrierControl() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    dryers,
    setDryers,
    schedules,
    fruits,
    areas,
    alertRules,
    deviceTypes,
    currentUser,
    addLog,
    addBatchRecord,
  } = useApp();

  const dryer = dryers.find((d) => d.id === id);
  const area = dryer ? areas.find((a) => a.id === dryer.areaId) : null;
  const [sensorData] = useState(() => generateSensorData(12));

  const isActive = dryer?.status === "active";
  const isInactive = dryer?.status === "inactive";

  /* ── API: sensor polling ── */
  const POLL_INTERVAL_MS = 5000;
  const [sensorReadings, setSensorReadings] = useState<
    Map<string, SensorReading>
  >(new Map());
  const [apiStatus, setApiStatus] = useState<"idle" | "ok" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!dryer || isInactive) return;

    const poll = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        // Lấy tất cả thiết bị cảm biến của máy sấy
        const sensorDevices = dryer.devices.filter(
          (d) =>
            deviceTypes.find((t) => t.id === d.deviceTypeId)?.category ===
            "sensor",
        );
        // Fetch song song từng device_id
        const results: SensorReading[][] = await Promise.all(
          sensorDevices.map((dev) =>
            fetchDryerSensors(dev.id, ctrl.signal).catch(
              (): SensorReading[] => [],
            ),
          ),
        );
        const allReadings = results.flat();
        setSensorReadings(new Map(allReadings.map((r) => [r.device_id, r])));
        setApiStatus("ok");
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError")
          setApiStatus("error");
      }
    };

    poll();
    const iv = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      clearInterval(iv);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryer?.id, isInactive]);

  /* ── API: send actuator command (manual mode) ── */
  const sendActuator = useCallback(
    async (
      deviceId: string,
      command: Parameters<typeof sendActuatorCommand>[1],
    ) => {
      try {
        await sendActuatorCommand(deviceId, command);
      } catch {
        // lỗi ghi log nhưng không chặn UI
        console.error(`[actuator] Gửi lệnh thất bại – device ${deviceId}`);
      }
    },
    [],
  );

  /* â”€â”€ manual mode state â”€â”€ */
  const [manualFruitId, setManualFruitId] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [manualRunMin, setManualRunMin] = useState("");

  /* â”€â”€ threshold mode state â”€â”€ */
  const [selAlertRuleId, setSelAlertRuleId] = useState("");
  const [threshFruitId, setThreshFruitId] = useState("");
  const [threshWeight, setThreshWeight] = useState("");
  const [threshRunMin, setThreshRunMin] = useState("");
  const [threshBindings, setThreshBindings] = useState<DeviceBinding[]>([]);

  /* â”€â”€ schedule mode state â”€â”€ */
  const [selScheduleId, setSelScheduleId] = useState("");
  const [schedFruitId, setSchedFruitId] = useState("");
  const [schedWeight, setSchedWeight] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedBindings, setSchedBindings] = useState<DeviceBinding[]>([]);

  /* â”€â”€ rating modal â”€â”€ */
  const [showRating, setShowRating] = useState(false);

  /* â”€â”€ sensor paging & chart collapse â”€â”€ */
  const [sensorPage, setSensorPage] = useState(0);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  const [chartIdx, setChartIdx] = useState(0);

  /* auto-set fruit */
  useEffect(() => {
    const rule = alertRules.find((r) => r.id === selAlertRuleId);
    if (rule) setThreshFruitId(rule.fruitId);
  }, [selAlertRuleId, alertRules]);

  useEffect(() => {
    const sch = schedules.find((s) => s.id === selScheduleId);
    if (sch) setSchedFruitId(sch.fruitId);
  }, [selScheduleId, schedules]);

  /* â”€â”€ helpers â”€â”€ */
  const updateDryer = useCallback(
    (fn: (d: Dryer) => Dryer) =>
      setDryers((prev) => prev.map((d) => (d.id === id ? fn(d) : d))),
    [id, setDryers],
  );

  const updateDevice = useCallback(
    (deviceId: string, updates: Partial<Device>, description?: string) => {
      updateDryer((d) => ({
        ...d,
        devices: d.devices.map((dev) =>
          dev.id === deviceId ? { ...dev, ...updates } : dev,
        ),
        ...(description
          ? {
              dryerLogs: [
                {
                  time: new Date().toISOString(),
                  user: currentUser?.name || "Há»‡ thá»‘ng",
                  description,
                },
                ...(d.dryerLogs || []),
              ],
            }
          : {}),
      }));
    },
    [updateDryer, currentUser],
  );

  /**
   * updateDevice dành riêng cho chế độ thủ công:
   * cập nhật local state VÀ gửi lệnh lên server cùng lúc.
   */
  const updateDeviceManual = useCallback(
    (deviceId: string, updates: Partial<Device>, description?: string) => {
      updateDevice(deviceId, updates, description);
      sendActuator(deviceId, {
        status: updates.status,
        value: updates.value,
        speed: updates.speed,
        temperature: updates.temperature,
        open: updates.open,
        message: updates.message,
      });
    },
    [updateDevice, sendActuator],
  );

  const addDryerLog = useCallback(
    (description: string) =>
      updateDryer((d) => ({
        ...d,
        dryerLogs: [
          {
            time: new Date().toISOString(),
            user: currentUser?.name || "Há»‡ thá»‘ng",
            description,
          },
          ...(d.dryerLogs || []),
        ],
      })),
    [updateDryer, currentUser],
  );

  const setMode = (mode: DryerMode) => {
    if (!dryer || isActive) return;
    if (isInactive) {
      updateDryer((d) => ({ ...d, status: "on" as DryerStatus, mode }));
      addDryerLog(`Bật máy và chuyển chế độ sang ${modeLabels[mode]}`);
      return;
    }
    updateDryer((d) => ({ ...d, mode }));
    addDryerLog(`Chuyển chế độ sang ${modeLabels[mode]}`);
  };

  /* â”€â”€ start batch â”€â”€ */
  const startBatch = () => {
    if (!dryer || isActive) return;

    if (dryer.mode === "manual") {
      if (!manualFruitId || !manualWeight || !manualRunMin) return;
      const fruitName = fruits.find((f) => f.id === manualFruitId)?.name || "";
      updateDryer((d) => ({
        ...d,
        status: "active",
        activeBatch: {
          fruitId: manualFruitId,
          inputWeight: parseFloat(manualWeight),
          runSeconds: parseFloat(manualRunMin) * 60,
          startedAt: new Date().toISOString(),
          mode: "manual",
        },
        dryerLogs: [
          {
            time: new Date().toISOString(),
            user: currentUser?.name || "",
            description: `Bắt đầu mẻ sấy (Thủ công) — ${fruitName}, ${manualWeight}kg`,
          },
          ...(d.dryerLogs || []),
        ],
      }));
    } else if (dryer.mode === "threshold") {
      if (!selAlertRuleId || !threshWeight || !threshRunMin) return;
      const rule = alertRules.find((r) => r.id === selAlertRuleId);
      const fruitName = fruits.find((f) => f.id === threshFruitId)?.name || "";
      updateDryer((d) => ({
        ...d,
        status: "active",
        activeBatch: {
          fruitId: threshFruitId,
          inputWeight: parseFloat(threshWeight),
          runSeconds: parseFloat(threshRunMin) * 60,
          startedAt: new Date().toISOString(),
          mode: "threshold",
          alertRuleId: selAlertRuleId,
          deviceBindings: threshBindings,
        },
        dryerLogs: [
          {
            time: new Date().toISOString(),
            user: currentUser?.name || "",
            description: `Bắt đầu mẻ sấy (Theo ngưỡng — ${rule?.name}) — ${fruitName}, ${threshWeight}kg`,
          },
          ...(d.dryerLogs || []),
        ],
      }));
    } else if (dryer.mode === "schedule") {
      if (!selScheduleId || !schedWeight || !schedStart) return;
      const sch = schedules.find((s) => s.id === selScheduleId);
      const fruitName = fruits.find((f) => f.id === schedFruitId)?.name || "";
      updateDryer((d) => ({
        ...d,
        status: "active",
        activeBatch: {
          fruitId: schedFruitId,
          inputWeight: parseFloat(schedWeight),
          runSeconds: 0,
          startedAt: new Date().toISOString(),
          mode: "schedule",
          scheduleId: selScheduleId,
          scheduleStartTime: schedStart,
          deviceBindings: schedBindings,
        },
        dryerLogs: [
          {
            time: new Date().toISOString(),
            user: currentUser?.name || "",
            description: `Bắt đầu mẻ sấy (Theo lịch — ${sch?.name}) — ${fruitName}, ${schedWeight}kg`,
          },
          ...(d.dryerLogs || []),
        ],
      }));
    }

    addLog({
      eventType: "device_control",
      time: new Date().toISOString(),
      user: currentUser?.name || "",
      description: `Bắt đầu mẻ sấy trên ${dryer.name} (${modeLabels[dryer.mode]})`,
      dryerId: dryer.id,
      severity: "info",
    });
  };

  const stopBatch = () => {
    if (dryer && isActive) setShowRating(true);
  };

  const completeBatch = (rating: number, outputWeight: number) => {
    if (!dryer || !dryer.activeBatch) return;
    const batch = dryer.activeBatch;
    const fruit = fruits.find((f) => f.id === batch.fruitId);
    const sch = batch.scheduleId
      ? schedules.find((s) => s.id === batch.scheduleId)
      : null;
    const elapsed = Math.floor(
      (Date.now() - new Date(batch.startedAt).getTime()) / 1000,
    );

    addBatchRecord({
      dryerId: dryer.id,
      dryerName: dryer.name,
      scheduleId: batch.scheduleId || "",
      scheduleName: sch?.name || modeLabels[batch.mode],
      fruitId: batch.fruitId,
      fruitName: fruit?.name || "",
      inputWeight: batch.inputWeight,
      outputWeight,
      rating,
      startTime: batch.startedAt,
      endTime: new Date().toISOString(),
      totalMinutes: Math.round(elapsed / 60),
      energyKwh: Math.round((elapsed / 3600) * 2.5 * 10) / 10,
      completed: true,
    });

    updateDryer((d) => ({
      ...d,
      status: "on",
      activeBatch: undefined,
      dryerLogs: [
        {
          time: new Date().toISOString(),
          user: currentUser?.name || "",
          description: `Kết thúc mẻ sấy — Đánh giá: ${rating}/5, KL đầu ra: ${outputWeight}kg`,
        },
        ...(d.dryerLogs || []),
      ],
    }));

    addLog({
      eventType: "device_control",
      time: new Date().toISOString(),
      user: currentUser?.name || "",
      description: `Kết thúc mẻ sấy trên ${dryer.name} — Đánh giá: ${rating}/5`,
      dryerId: dryer.id,
      severity: "success",
    });
    setShowRating(false);
  };

  /* â”€â”€â”€ Render: not found â”€â”€â”€ */
  if (!dryer) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Cpu size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Không tìm thấy máy sấy</p>
          <button
            onClick={() => navigate("/control")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  /* derived */
  const sensors = dryer.devices.filter(
    (d) =>
      deviceTypes.find((t) => t.id === d.deviceTypeId)?.category === "sensor",
  );
  const actuators = dryer.devices.filter(
    (d) =>
      deviceTypes.find((t) => t.id === d.deviceTypeId)?.category === "actuator",
  );
  const batchFruit = dryer.activeBatch
    ? fruits.find((f) => f.id === dryer.activeBatch!.fruitId)
    : null;
  const mc = modeColors[dryer.mode];

  const totalSensorPages = Math.ceil(sensors.length / SENSORS_PER_PAGE);
  const pagedSensors = sensors.slice(
    sensorPage * SENSORS_PER_PAGE,
    (sensorPage + 1) * SENSORS_PER_PAGE,
  );
  const chartOpts = [
    { key: "temp" as const, color: "#f97316", label: "Nhiá»‡t Ä‘á»™ (Â°C)" },
    { key: "humidity" as const, color: "#3b82f6", label: "Äá»™ áº©m (%)" },
  ];

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div className="min-h-full bg-slate-50">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/control")}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl text-slate-900 font-bold">{dryer.name}</h1>
              <span className="text-xs text-slate-400">{dryer.id}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                  dryer.status === "active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : dryer.status === "on"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {dryer.status === "active"
                  ? "Đang hoạt động"
                  : dryer.status === "on"
                    ? "Bật"
                    : "Tắt"}
              </span>
              {isActive && batchFruit && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-semibold">
                  {batchFruit.name}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {area?.name}
              {dryer.operator ? ` · Vận hành: ${dryer.operator}` : ""} ·{" "}
              {dryer.devices.length} thiết bị
            </p>
          </div>
          <span
            className="text-xs px-3 py-1 rounded-full border font-semibold"
            style={{
              background: mc.bg,
              color: mc.text,
              borderColor: mc.active,
            }}
          >
            {modeLabels[dryer.mode]}
          </span>
        </div>
      </div>

      {/* Banners */}
      {isInactive && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <Power size={16} className="text-slate-500" />
          <p className="text-sm text-slate-600 font-medium">
            Máy đang tắt. Chọn chế độ để bật máy.
          </p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* â”€â”€ Mode Selector (only when NOT active & NOT maintenance) â”€â”€ */}
        {!isActive && (
          <div className="flex gap-2 bg-white rounded-xl border border-slate-100 p-1.5">
            {(["manual", "threshold", "schedule"] as const).map((m) => {
              const c = modeColors[m];
              const active = dryer.mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? "text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  style={{
                    background: active ? c.active : "transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {modeLabels[m]}
                </button>
              );
            })}
          </div>
        )}

        {/* â”€â”€ Batch Config (below mode selector, above sensors) â”€â”€ */}
        {dryer.mode === "manual" && !isActive && (
          <BatchConfigManual
            fruits={fruits}
            fruitId={manualFruitId}
            setFruitId={setManualFruitId}
            weight={manualWeight}
            setWeight={setManualWeight}
            runMin={manualRunMin}
            setRunMin={setManualRunMin}
            onStart={startBatch}
            disabled={false}
          />
        )}

        {dryer.mode === "threshold" && !isActive && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm text-slate-700 font-bold">
              Cấu hình chế độ theo ngưỡng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Quy tắc cảnh báo <span className="text-red-500">*</span>
                </label>
                <select
                  value={selAlertRuleId}
                  onChange={(e) => setSelAlertRuleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">Chọn quy tắc</option>
                  {alertRules
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Nông sản
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    fruits.find((f) => f.id === threshFruitId)?.name ||
                    "Tự động theo quy tắc"
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                />
              </div>
            </div>

            {selAlertRuleId &&
              (() => {
                const rule = alertRules.find((r) => r.id === selAlertRuleId);
                return rule && (rule.objects ?? []).length > 0 ? (
                  <ObjectBindingEditor
                    objects={rule.objects ?? []}
                    bindings={threshBindings}
                    setBindings={setThreshBindings}
                    dryerDevices={dryer.devices}
                    deviceTypes={deviceTypes}
                  />
                ) : null;
              })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Khối lượng (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={threshWeight}
                  onChange={(e) => setThreshWeight(e.target.value)}
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Thời gian (phút) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={threshRunMin}
                  onChange={(e) => setThreshRunMin(e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
              </div>
            </div>
            <button
              onClick={startBatch}
              disabled={!selAlertRuleId || !threshWeight || !threshRunMin}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                selAlertRuleId && threshWeight && threshRunMin
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Play size={16} /> Bắt đầu sấy theo ngưỡng
            </button>
          </div>
        )}

        {dryer.mode === "schedule" && !isActive && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm text-slate-700 font-bold">
              Cấu hình chế độ theo lịch
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Lịch trình <span className="text-red-500">*</span>
                </label>
                <select
                  value={selScheduleId}
                  onChange={(e) => setSelScheduleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn lịch trình</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Nông sản
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    fruits.find((f) => f.id === schedFruitId)?.name ||
                    "Tự động theo lịch trình"
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                />
              </div>
            </div>

            {selScheduleId &&
              (() => {
                const sch = schedules.find((s) => s.id === selScheduleId);
                return sch && (sch.objects ?? []).length > 0 ? (
                  <ObjectBindingEditor
                    objects={sch.objects ?? []}
                    bindings={schedBindings}
                    setBindings={setSchedBindings}
                    dryerDevices={dryer.devices}
                    deviceTypes={deviceTypes}
                  />
                ) : null;
              })()}

            {selScheduleId &&
              (() => {
                const sch = schedules.find((s) => s.id === selScheduleId);
                return sch ? (
                  <div>
                    <label className="text-xs text-slate-500 block mb-2 font-semibold">
                      Các giai đoạn
                    </label>
                    <div className="space-y-1.5">
                      {sch.phases.map((ph, i) => (
                        <div
                          key={ph.id}
                          className="flex items-center gap-3 bg-blue-50 rounded-lg p-2.5 text-xs"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-blue-700 font-semibold">
                              {ph.name}
                            </p>
                            <p className="text-blue-500">
                              Bắt đầu: +{formatOffsetSeconds(ph.offsetSeconds)}{" "}
                              ·{" "}
                              {buildActionsDesc(
                                ph.actions,
                                sch.objects ?? [],
                                deviceTypes,
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Khối lượng (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={schedWeight}
                  onChange={(e) => setSchedWeight(e.target.value)}
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-semibold">
                  Thời gian bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={schedStart}
                  onChange={(e) => setSchedStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={startBatch}
              disabled={!selScheduleId || !schedWeight || !schedStart}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                selScheduleId && schedWeight && schedStart
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Play size={16} /> Bắt đầu sấy theo lịch
            </button>
          </div>
        )}

        {/* â”€â”€ Active Batch: timer + policy info + stop â”€â”€ */}
        {isActive && dryer.activeBatch && (
          <div className="space-y-3">
            {dryer.activeBatch.runSeconds > 0 && (
              <CountdownTimer
                startedAt={dryer.activeBatch.startedAt}
                runSeconds={dryer.activeBatch.runSeconds}
              />
            )}

            {/* threshold policy */}
            {dryer.activeBatch.alertRuleId &&
              (() => {
                const rule = alertRules.find(
                  (r) => r.id === dryer.activeBatch!.alertRuleId,
                );
                return rule ? (
                  <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-purple-600" />
                      <h3 className="text-sm text-purple-700 font-bold">
                        Quy táº¯c: {rule.name}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {rule.pairs.map((pair) => (
                        <div
                          key={pair.id}
                          className="bg-purple-50 rounded-lg p-3 text-xs"
                        >
                          <p className="text-purple-700 font-semibold">
                            Điều kiện:{" "}
                            {pair.conditions
                              .map((c) => {
                                const obj = (rule.objects ?? []).find(
                                  (o) => o.id === c.objectId,
                                );
                                const dt = obj
                                  ? deviceTypes.find(
                                      (t) => t.id === obj.deviceTypeId,
                                    )
                                  : null;
                                return `${obj?.label || c.objectId} ${c.operator} ${c.value}${dt?.unit || ""}`;
                              })
                              .join(" VÀ ")}
                          </p>
                          <p className="text-purple-600 mt-1">
                            →{" "}
                            {buildActionsDesc(
                              pair.actions,
                              rule.objects ?? [],
                              deviceTypes,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

            {/* schedule timeline */}
            {dryer.activeBatch.scheduleId &&
              (() => {
                const sch = schedules.find(
                  (s) => s.id === dryer.activeBatch!.scheduleId,
                );
                if (!sch) return null;
                const startT = dryer.activeBatch!.scheduleStartTime
                  ? new Date(dryer.activeBatch!.scheduleStartTime).getTime()
                  : new Date(dryer.activeBatch!.startedAt).getTime();
                const now = Date.now();
                const elapsedSec = Math.floor((now - startT) / 1000);
                let currentPhaseIdx = 0;
                for (let i = sch.phases.length - 1; i >= 0; i--) {
                  if (elapsedSec >= sch.phases[i].offsetSeconds) {
                    currentPhaseIdx = i;
                    break;
                  }
                }
                return (
                  <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={16} className="text-blue-600" />
                      <h3 className="text-sm text-blue-700 font-bold">
                        Lịch trình: {sch.name}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {sch.phases.map((ph, i) => {
                        const phaseTime = new Date(
                          startT + ph.offsetSeconds * 1000,
                        );
                        const isCurrent = i === currentPhaseIdx;
                        const isPast = i < currentPhaseIdx;
                        return (
                          <div
                            key={ph.id}
                            className={`flex items-center gap-3 rounded-lg p-2.5 text-xs ${
                              isCurrent
                                ? "bg-blue-100 border border-blue-200"
                                : isPast
                                  ? "bg-green-50 border border-green-100"
                                  : "bg-slate-50 border border-slate-100"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] ${
                                isCurrent
                                  ? "bg-blue-600 text-white"
                                  : isPast
                                    ? "bg-green-500 text-white"
                                    : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {isPast ? <Check size={12} /> : i + 1}
                            </span>
                            <div className="flex-1">
                              <p
                                className={`font-semibold ${
                                  isCurrent
                                    ? "text-blue-800"
                                    : isPast
                                      ? "text-green-700"
                                      : "text-slate-600"
                                }`}
                              >
                                {ph.name}
                              </p>
                              <p
                                className={
                                  isCurrent
                                    ? "text-blue-600"
                                    : isPast
                                      ? "text-green-500"
                                      : "text-slate-400"
                                }
                              >
                                {phaseTime.toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                Â·{" "}
                                {buildActionsDesc(
                                  ph.actions,
                                  sch.objects ?? [],
                                  deviceTypes,
                                )}
                              </p>
                            </div>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                                Đang chạy
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {/* stop button */}
            <button
              onClick={stopBatch}
              className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700"
            >
              <StopCircle size={16} /> Dừng máy sấy
            </button>
          </div>
        )}

        {/* â•â•â• MAIN TWO-COLUMN LAYOUT: Controls LEFT, Sensors RIGHT â•â•â• */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* â”€â”€ LEFT: Actuator Controls / Values â”€â”€ */}
          <div className="lg:w-[400px] flex-shrink-0 space-y-4">
            <h2 className="text-sm text-slate-700 font-bold">
              Thiết bị điều khiển
              {isActive && dryer.mode !== "manual" && (
                <span
                  className="text-xs ml-2 font-normal"
                  style={{
                    color: dryer.mode === "threshold" ? "#7c3aed" : "#2563eb",
                  }}
                >
                  (Tự động theo {dryer.mode === "threshold" ? "ngưỡng" : "lịch"}
                  )
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {dryer.mode === "manual"
                ? actuators.map((dev) => {
                    const dt = deviceTypes.find(
                      (t) => t.id === dev.deviceTypeId,
                    );
                    return (
                      <ManualActuatorCard
                        key={dev.id}
                        device={dev}
                        dtName={dt?.name || ""}
                        unit={dt?.unit || ""}
                        valueRange={dt?.valueRange}
                        disabled={false}
                        onUpdate={(updates, desc) =>
                          updateDeviceManual(dev.id, updates, desc || undefined)
                        }
                      />
                    );
                  })
                : actuators.map((dev) => {
                    const dt = deviceTypes.find(
                      (t) => t.id === dev.deviceTypeId,
                    );
                    return (
                      <ActuatorValueCard
                        key={dev.id}
                        device={dev}
                        dtName={dt?.name || ""}
                        unit={dt?.unit || ""}
                      />
                    );
                  })}
            </div>
          </div>

          {/* â”€â”€ RIGHT: Sensors + Charts + Logs â”€â”€ */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Sensor cards with paging */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm text-slate-700 font-bold">Cảm biến</h2>
                  {/* Trạng thái kết nối API */}
                  {apiStatus === "ok" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                      ● Live
                    </span>
                  )}
                  {apiStatus === "error" && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold"
                      title="Không kết nối được server, đang hiển thị dữ liệu cục bộ"
                    >
                      ● Offline
                    </span>
                  )}
                </div>
                {totalSensorPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSensorPage((p) => Math.max(0, p - 1))}
                      disabled={sensorPage === 0}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} className="text-slate-500" />
                    </button>
                    <span className="text-xs text-slate-400">
                      {sensorPage + 1}/{totalSensorPages}
                    </span>
                    <button
                      onClick={() =>
                        setSensorPage((p) =>
                          Math.min(totalSensorPages - 1, p + 1),
                        )
                      }
                      disabled={sensorPage >= totalSensorPages - 1}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} className="text-slate-500" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pagedSensors.map((dev) => {
                  const dt = deviceTypes.find((t) => t.id === dev.deviceTypeId);
                  const Icon = deviceIcon[dev.deviceTypeId] || Cpu;
                  const cls =
                    deviceColor[dev.deviceTypeId] ||
                    "text-slate-500 bg-slate-100";
                  // Ưu tiên giá trị từ API nếu có, fallback về local state
                  const apiReading = sensorReadings.get(dev.id);
                  const liveValue = apiReading?.value ?? dev.value;
                  const liveStatus = apiReading
                    ? apiReading.status
                    : dev.status;
                  const displayVal =
                    liveValue !== undefined && liveValue !== null
                      ? `${apiReading ? parseFloat(String(liveValue)).toFixed(2) : liveValue}${dt?.unit || ""}`
                      : dev.motion !== undefined
                        ? dev.motion
                          ? "Có"
                          : "Không"
                        : "—";
                  return (
                    <div
                      key={dev.id}
                      className="bg-white rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 truncate font-semibold">
                            {dev.name}
                          </p>
                          <p className="text-xs text-slate-400">{dev.id}</p>
                        </div>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                            liveStatus
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {liveStatus ? "Bật" : "Tắt"}
                        </span>
                      </div>
                      <div className="text-center py-2 rounded-lg bg-slate-50">
                        <p className="text-lg text-slate-900 font-bold">
                          {displayVal}
                        </p>
                        <p className="text-xs text-slate-400">{dt?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Charts: collapsible with arrow nav */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm text-slate-700 font-bold">
                  Biểu đồ cảm biến
                </h2>
                <div className="flex items-center gap-2">
                  {chartsCollapsed && (
                    <>
                      <button
                        onClick={() => setChartIdx((i) => Math.max(0, i - 1))}
                        disabled={chartIdx === 0}
                        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronLeft size={16} className="text-slate-500" />
                      </button>
                      <span className="text-xs text-slate-400">
                        {chartOpts[chartIdx].label}
                      </span>
                      <button
                        onClick={() =>
                          setChartIdx((i) =>
                            Math.min(chartOpts.length - 1, i + 1),
                          )
                        }
                        disabled={chartIdx >= chartOpts.length - 1}
                        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronRight size={16} className="text-slate-500" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setChartsCollapsed(!chartsCollapsed)}
                    className="p-1 rounded-lg hover:bg-slate-100"
                  >
                    {chartsCollapsed ? (
                      <ChevronDown size={16} className="text-slate-500" />
                    ) : (
                      <ChevronUp size={16} className="text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {chartsCollapsed ? (
                /* collapsed: single chart + logs side by side */
                <div className="flex gap-4 flex-col md:flex-row">
                  <div className="flex-1">
                    <SparkLineChart
                      data={sensorData}
                      dataKey={chartOpts[chartIdx].key}
                      color={chartOpts[chartIdx].color}
                      label={chartOpts[chartIdx].label}
                    />
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4">
                    <h3 className="text-sm text-slate-700 mb-2 font-bold">
                      Nhật ký hoạt động
                    </h3>
                    <LogTable logs={dryer.dryerLogs || []} compact />
                  </div>
                </div>
              ) : (
                /* expanded: all charts */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chartOpts.map((opt) => (
                    <SparkLineChart
                      key={opt.key}
                      data={sensorData}
                      dataKey={opt.key}
                      color={opt.color}
                      label={opt.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Logs (full, only when charts expanded) */}
            {!chartsCollapsed && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h2 className="text-sm text-slate-700 mb-3 font-bold">
                  Nhật ký hoạt động
                </h2>
                <LogTable logs={dryer.dryerLogs || []} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* â”€â”€ Rating Modal â”€â”€ */}
      {showRating && (
        <RatingModal
          onSubmit={completeBatch}
          onCancel={() => setShowRating(false)}
        />
      )}
    </div>
  );
}

/* â”€â”€â”€ BatchConfigManual (extracted for clarity) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BatchConfigManual({
  fruits,
  fruitId,
  setFruitId,
  weight,
  setWeight,
  runMin,
  setRunMin,
  onStart,
  disabled,
}: {
  fruits: {
    id: string;
    name: string;
    description?: string;
  }[];
  fruitId: string;
  setFruitId: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  runMin: string;
  setRunMin: (v: string) => void;
  onStart: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm text-slate-700 mb-4 font-bold">
        Cấu hình máy sấy
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1 font-semibold">
            Nông sản <span className="text-red-500">*</span>
          </label>
          <select
            value={fruitId}
            onChange={(e) => setFruitId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Chọn nông sản</option>
            {fruits.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {fruitId &&
            (() => {
              const f = fruits.find((fr) => fr.id === fruitId);
              return f?.description ? (
                <div className="mt-2 p-2 rounded-lg bg-blue-50 text-xs text-blue-700">
                  <p>{f.description}</p>
                </div>
              ) : null;
            })()}
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1 font-semibold">
            Khối lượng (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={0}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1 font-semibold">
            Thời gian (phút) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={runMin}
            onChange={(e) => setRunMin(e.target.value)}
            min={1}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={!fruitId || !weight || !runMin || disabled}
        className={`mt-4 w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
          fruitId && weight && runMin && !disabled
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        <Play size={16} /> Bắt đầu sấy
      </button>
    </div>
  );
}
