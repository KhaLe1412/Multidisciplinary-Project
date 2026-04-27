import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import {
  fetchDryerSensors,
  sendActuatorCommand,
  fetchDeviceLogs,
  apiStartBatch,
  apiEndBatch,
  apiGetBatchSchedules,
  apiAddBatchSchedules,
  apiRemoveBatchScheduleEntry,
  apiClearBatchSchedules,
  apiToggleBatchSchedules,
  apiGetBatchRules,
  apiAddBatchRules,
  apiRemoveBatchRule,
  apiToggleBatchRules,
  apiGetLocalSchedules,
  apiGetLocalRules,
  type SensorReading,
  type LocalScheduleData,
  type LocalRuleData,
  type BatchScheduleQueueEntry as APIBatchScheduleQueueEntry,
  type BatchRuleSetEntry as APIBatchRuleSetEntry,
} from "../api/controlApi";
import { apiFetchDryerLogs } from "../api/logsApi";
import type { SystemLog } from "../data/mockData";
import type {
  Device,
  Dryer,
  DryerStatus,
  DryerLogEntry,
} from "../data/mockData";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Wind,
  Monitor,
  Flame,
  Power,
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
import { LocalScheduleManager } from "./dryer/LocalScheduleManager";
import { LocalRuleManager } from "./dryer/LocalRuleManager";
import { BatchConfigDnD } from "./dryer/BatchConfigDnD";
import { ActiveBatchPanel } from "./dryer/ActiveBatchPanel";

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
const SENSORS_PER_PAGE = 3;
const CHART_COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#eab308",
  "#ef4444",
];
const CHART_COLOR_BY_TYPE: Record<string, string> = {
  "DT-TEMP": "#f97316",
  "DT-HUM": "#3b82f6",
};

/* â”€â”€â”€ SparkLine Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SparkLineChart({
  data,
  color,
  label,
  height = 140,
}: {
  data: { time: string; value: number }[];
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
  const vals = data.map((d) => d.value);
  const mn = Math.min(...vals),
    mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const xStep = (W - PL - PR) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: PL + i * xStep,
    y: PT + (1 - (d.value - mn) / rng) * (H - PT - PB),
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

/* â”€â”€â”€ Manual Actuator Control Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ManualActuatorCard({
  device,
  dtName,
  unit,
  valueRange,
  disabled,
  onUpdate,
  serverValue,
}: {
  device: Device;
  dtName: string;
  unit: string;
  valueRange?: { min: number; max: number };
  disabled: boolean;
  onUpdate: (updates: Partial<Device>, description: string) => void;
  serverValue?: number | null;
}) {
  const Icon = deviceIcon[device.deviceTypeId] || Cpu;
  const cls = deviceColor[device.deviceTypeId] || "text-slate-500 bg-slate-100";
  const isBoolean = unit === "boolean";
  const isText = unit === "text";
  const serverOn =
    serverValue !== null && serverValue !== undefined
      ? serverValue > 0
      : device.status;

  const currentVal =
    device.speed !== undefined
      ? device.speed
      : device.temperature !== undefined
        ? device.temperature
        : (device.value ?? valueRange?.min ?? 0);
  const [localSlider, setLocalSlider] = useState(currentVal);
  const [localInput, setLocalInput] = useState(String(currentVal));
  const isDragging = useRef(false);

  useEffect(() => {
    setLocalSlider(currentVal);
    setLocalInput(String(currentVal));
  }, [currentVal]);

  // Sync slider to live server value when not dragging
  useEffect(() => {
    if (isDragging.current || serverValue == null) return;
    setLocalSlider(serverValue);
    setLocalInput(String(serverValue));
  }, [serverValue]);

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
              { status: !serverOn },
              `${dtName} ${serverOn ? "Tắt" : "Bật"}`,
            )
          }
          className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
            serverOn
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {serverOn ? "Bật" : "Tắt"}
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
                { status: !serverOn },
                `${dtName} ${serverOn ? "Tắt" : "Bật"}`,
              )
            }
            className={`ml-auto flex items-center gap-2.5 px-6 py-3 rounded-xl text-base font-bold transition-all shadow-md active:scale-95 ${
              serverOn
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-slate-200"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <Power size={20} />
            {serverOn ? "Đang bật" : "Đang tắt"}
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
            onMouseDown={() => {
              isDragging.current = true;
            }}
            onTouchStart={() => {
              isDragging.current = true;
            }}
            onMouseUp={() => {
              isDragging.current = false;
              commitRange(localSlider);
            }}
            onTouchEnd={() => {
              isDragging.current = false;
              commitRange(localSlider);
            }}
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
      {serverValue !== null && serverValue !== undefined && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Thực tế (server)</span>
          <span className="text-xs font-semibold text-slate-600">
            {serverValue}
            {unit !== "boolean" && unit !== "text" ? unit : ""}
          </span>
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€ Countdown Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CountdownTimer({
  startedAt,
  runSeconds,
  onComplete,
}: {
  startedAt: string;
  runSeconds: number;
  onComplete?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef(false);
  useEffect(() => {
    completedRef.current = false;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [startedAt, runSeconds]);
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const remaining = Math.max(runSeconds - elapsed, 0);
  useEffect(() => {
    if (remaining === 0 && runSeconds > 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [remaining, runSeconds, onComplete]);
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
const SEVERITY_DESC_CLS: Record<string, string> = {
  info: "text-green-600",
  warning: "text-amber-600 font-medium",
  error: "text-red-500 font-medium",
  success: "text-green-700",
};

function LogTable({
  logs,
  compact,
}: {
  logs: {
    time: string;
    user: string;
    description: string;
    severity?: string;
  }[];
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
                <td
                  className={`py-1.5 px-3 ${SEVERITY_DESC_CLS[log.severity ?? ""] ?? "text-slate-700"}`}
                >
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
    deviceTypes,
    currentUser,
    alertRules,
    addLog,
    addBatchRecord,
  } = useApp();

  const dryer = dryers.find((d) => d.id === id);
  const area = dryer ? areas.find((a) => a.id === dryer.areaId) : null;

  const isActive = dryer?.status === "running";
  const isInactive = dryer?.status === "off";

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

  /* ── API: actuator polling (đọc trạng thái thực tế từ server) ── */
  const [actuatorReadings, setActuatorReadings] = useState<
    Map<string, SensorReading>
  >(new Map());
  const actuatorAbortRef = useRef<AbortController | null>(null);
  const [deviceLogs, setDeviceLogs] = useState<
    Map<string, { value: number; time: string }[]>
  >(new Map());

  useEffect(() => {
    if (!dryer) {
      setActuatorReadings(new Map());
      return;
    }

    const poll = async () => {
      actuatorAbortRef.current?.abort();
      const ctrl = new AbortController();
      actuatorAbortRef.current = ctrl;
      try {
        const actuatorDevices = dryer.devices.filter(
          (d) =>
            deviceTypes.find((t) => t.id === d.deviceTypeId)?.category ===
            "controller",
        );
        const results: SensorReading[][] = await Promise.all(
          actuatorDevices.map((dev) =>
            fetchDryerSensors(dev.id, ctrl.signal).catch(
              (): SensorReading[] => [],
            ),
          ),
        );
        const allReadings = results.flat();
        setActuatorReadings(new Map(allReadings.map((r) => [r.device_id, r])));
      } catch {
        /* ignore AbortError */
      }
    };

    poll();
    const iv = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      clearInterval(iv);
      actuatorAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryer?.id]);

  /* ── API: dryer system log polling ── */
  const [dryerSystemLogs, setDryerSystemLogs] = useState<SystemLog[]>([]);
  const LOG_POLL_MS = 5_000;
  const lastLogIdRef = useRef<number>(0);

  useEffect(() => {
    if (!dryer?.id) return;
    const numericId = parseInt(dryer.id, 10);
    if (isNaN(numericId)) return;

    // Reset khi đổi máy sấy
    setDryerSystemLogs([]);
    lastLogIdRef.current = 0;

    const fetchLogs = async () => {
      try {
        const since = lastLogIdRef.current;
        const logs = await apiFetchDryerLogs(numericId, since);
        if (logs.length === 0) return;

        const maxId = Math.max(...logs.map((l) => Number(l.id)));

        if (since === 0) {
          // Lần đầu: thay toàn bộ (DESC từ server, giữ nguyên thứ tự)
          setDryerSystemLogs(logs);
        } else {
          // Incremental: log mới từ server là ASC → reverse để newest-first, prepend
          const newest = [...logs].reverse();
          setDryerSystemLogs((prev) => [...newest, ...prev]);
        }

        lastLogIdRef.current = maxId;
      } catch {
        // giữ logs cũ nếu fetch thất bại
      }
    };

    fetchLogs();
    const iv = setInterval(fetchLogs, LOG_POLL_MS);
    return () => {
      clearInterval(iv);
      lastLogIdRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryer?.id]);

  /* ── API: log polling for charts (all sensor devices) ── */
  useEffect(() => {
    const chartDevices =
      dryer?.devices.filter(
        (d) =>
          deviceTypes.find((t) => t.id === d.deviceTypeId)?.category ===
          "sensor",
      ) ?? [];
    if (chartDevices.length === 0) return;

    const fetchLogs = async () => {
      const results = await Promise.all(
        chartDevices.map(async (dev) => {
          try {
            const logs = await fetchDeviceLogs(dev.id);
            const entries = [...logs].reverse().map((l) => ({
              value: l.value ?? 0,
              time: new Date(l.timestamp).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }));
            return { id: dev.id, entries };
          } catch {
            return {
              id: dev.id,
              entries: [] as { value: number; time: string }[],
            };
          }
        }),
      );
      setDeviceLogs(new Map(results.map((r) => [r.id, r.entries])));
    };

    fetchLogs();
    const iv = setInterval(fetchLogs, 10_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryer?.id]);

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
  /* unified batch start state */
  const [batchFruitId, setBatchFruitId] = useState("");
  const [batchWeight, setBatchWeight] = useState("");
  const [batchRunSec, setBatchRunSec] = useState("");
  const [useRuntime, setUseRuntime] = useState(false);
  const [serverBatchId, setServerBatchId] = useState<number | null>(null);

  /* local schedules / rules (fetched per dryer) */
  const [localSchedules, setLocalSchedules] = useState<LocalScheduleData[]>([]);
  const [localRules, setLocalRules] = useState<LocalRuleData[]>([]);

  /* active batch automation state */
  const [batchScheduleQueue, setBatchScheduleQueue] = useState<
    APIBatchScheduleQueueEntry[]
  >([]);
  const [batchRuleSet, setBatchRuleSet] = useState<APIBatchRuleSetEntry[]>([]);
  const [batchRulesEnabled, setBatchRulesEnabled] = useState(false);
  const [batchSchedulesEnabled, setBatchSchedulesEnabled] = useState(false);

  const [showRating, setShowRating] = useState(false);

  /* â”€â”€ sensor paging & chart collapse â”€â”€ */
  const [sensorPage, setSensorPage] = useState(0);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  const [chartIdx, setChartIdx] = useState(0);
  const [selectedSensorIds, setSelectedSensorIds] = useState<Set<string>>(
    new Set(),
  );

  /* fetch local schedules / rules when dryer changes */
  useEffect(() => {
    if (!dryer?.id) return;
    apiGetLocalSchedules(dryer.id)
      .then(setLocalSchedules)
      .catch(() => setLocalSchedules([]));
    apiGetLocalRules(dryer.id)
      .then(setLocalRules)
      .catch(() => setLocalRules([]));
  }, [dryer?.id]);

  /* poll batch schedule queue + rule set during active batch */
  useEffect(() => {
    if (!serverBatchId) {
      setBatchScheduleQueue([]);
      setBatchRuleSet([]);
      return;
    }
    const poll = async () => {
      try {
        const [schedData, ruleData] = await Promise.all([
          apiGetBatchSchedules(serverBatchId),
          apiGetBatchRules(serverBatchId),
        ]);
        setBatchScheduleQueue(schedData.schedules);
        setBatchSchedulesEnabled(schedData.enabled);
        setBatchRuleSet(ruleData.rules);
        setBatchRulesEnabled(ruleData.enabled);
      } catch {
        /* ignore */
      }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [serverBatchId]);

  /* reset chart sensor selection when dryer changes */
  useEffect(() => {
    const sensorIds = new Set<string>(
      (dryer?.devices ?? [])
        .filter(
          (d: Device) =>
            deviceTypes.find((t) => t.id === d.deviceTypeId)?.category ===
            "sensor",
        )
        .map((d: Device) => d.id),
    );
    setSelectedSensorIds(sensorIds);
    setChartIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryer?.id]);

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
            user: currentUser?.name || "",
            description,
          },
          ...(d.dryerLogs || []),
        ],
      })),
    [updateDryer, currentUser],
  );

  /* unified start batch */
  const startBatch = async (scheduleIds: number[] = [], ruleIds: number[] = []) => {
    if (!dryer || isActive) return;
    const fruitName = fruits.find((f) => f.id === batchFruitId)?.name || "";
    const weight = parseFloat(batchWeight) || 0;
    const runtime = useRuntime ? parseFloat(batchRunSec) || null : null;

    updateDryer((d) => ({
      ...d,
      status: "running" as DryerStatus,
      activeBatch: {
        fruitId: batchFruitId,
        inputWeight: weight,
        runSeconds: runtime || 0,
        startedAt: new Date().toISOString(),
      },
      dryerLogs: [
        {
          time: new Date().toISOString(),
          user: currentUser?.name || "",
          description: `Bắt đầu mẻ sấy — ${fruitName || "Không chọn nông sản"}, ${weight}kg`,
        },
        ...(d.dryerLogs || []),
      ],
    }));

    try {
      const r = await apiStartBatch(
        dryer.id,
        batchFruitId || null,
        weight || null,
        runtime,
      );
      setServerBatchId(r.id);

      // Add schedules and rules to the newly created batch
      if (scheduleIds.length > 0) {
        await apiAddBatchSchedules(r.id, scheduleIds).catch((err: unknown) =>
          console.error("[batch/addSchedules]", err),
        );
        await apiToggleBatchSchedules(r.id, true).catch((err: unknown) =>
          console.error("[batch/enableSchedules]", err),
        );
      }
      if (ruleIds.length > 0) {
        await apiAddBatchRules(r.id, ruleIds).catch((err: unknown) =>
          console.error("[batch/addRules]", err),
        );
        await apiToggleBatchRules(r.id, true).catch((err: unknown) =>
          console.error("[batch/enableRules]", err),
        );
      }
    } catch (err: unknown) {
      console.error("[batch/start]", err);
    }

    addLog({
      eventType: "device_control",
      time: new Date().toISOString(),
      user: currentUser?.name || "",
      description: `Bắt đầu mẻ sấy trên ${dryer.name}`,
      dryerId: dryer.id,
      severity: "info",
    });
  };

  const stopBatch = () => {
    if (dryer && isActive) setShowRating(true);
  };

  const completeBatch = async (rating: number, outputWeight: number) => {
    if (!dryer || !dryer.activeBatch) return;
    if (serverBatchId !== null) {
      await apiEndBatch(serverBatchId, outputWeight, rating).catch(
        (err: unknown) => console.error("[endBatch]", err),
      );
      setServerBatchId(null);
    }
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
      scheduleName: sch?.name || "Thủ công",
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
      deviceTypes.find((t) => t.id === d.deviceTypeId)?.category ===
      "controller",
  );
  const batchFruit = dryer.activeBatch
    ? fruits.find((f) => f.id === dryer.activeBatch!.fruitId)
    : null;

  const totalSensorPages = Math.ceil(sensors.length / SENSORS_PER_PAGE);
  const pagedSensors = sensors.slice(
    sensorPage * SENSORS_PER_PAGE,
    (sensorPage + 1) * SENSORS_PER_PAGE,
  );
  const chartOpts = sensors.map((dev, i) => ({
    deviceId: dev.id,
    color:
      CHART_COLOR_BY_TYPE[dev.deviceTypeId] ??
      CHART_COLORS[i % CHART_COLORS.length],
    label: dev.name,
  }));
  const safeChartIdx = Math.min(chartIdx, Math.max(0, chartOpts.length - 1));
  const chartData =
    deviceLogs.get(chartOpts[safeChartIdx]?.deviceId ?? "") ?? [];

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
                  dryer.status === "running"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : dryer.status === "on"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {dryer.status === "running"
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
        </div>
      </div>

      {/* Banners */}
      {isInactive && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <Power size={16} className="text-slate-500" />
          <p className="text-sm text-slate-600 font-medium">Máy đang tắt.</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* â”€â”€ Batch Config (below mode selector, above sensors) â”€â”€ */}
        {/* ── Batch Config with DnD ── */}
        {!isActive && (
          <BatchConfigDnD
            fruits={fruits}
            localSchedules={localSchedules}
            localRules={localRules}
            batchFruitId={batchFruitId}
            setBatchFruitId={setBatchFruitId}
            batchWeight={batchWeight}
            setBatchWeight={setBatchWeight}
            batchRunSec={batchRunSec}
            setBatchRunSec={setBatchRunSec}
            useRuntime={useRuntime}
            setUseRuntime={setUseRuntime}
            onStart={startBatch}
          />
        )}

        {/* ── Local Config: Schedules & Rules CRUD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocalScheduleManager
            dryerId={dryer.id}
            schedules={schedules}
            devices={dryer.devices}
            deviceTypes={deviceTypes}
            localSchedules={localSchedules}
            setLocalSchedules={setLocalSchedules}
            disabled={isActive}
          />
          <LocalRuleManager
            dryerId={dryer.id}
            alertRules={alertRules}
            devices={dryer.devices}
            deviceTypes={deviceTypes}
            localRules={localRules}
            setLocalRules={setLocalRules}
            disabled={isActive}
          />
        </div>

        {/* ── Active Batch: timer + automation panel + stop ── */}
        {isActive && dryer.activeBatch && (
          <div className="space-y-3">
            {dryer.activeBatch.runSeconds > 0 && (
              <CountdownTimer
                startedAt={dryer.activeBatch.startedAt}
                runSeconds={dryer.activeBatch.runSeconds}
                onComplete={stopBatch}
              />
            )}

            <ActiveBatchPanel
              batchId={serverBatchId!}
              batchScheduleQueue={batchScheduleQueue}
              batchRuleSet={batchRuleSet}
              batchSchedulesEnabled={batchSchedulesEnabled}
              batchRulesEnabled={batchRulesEnabled}
              localSchedules={localSchedules}
              localRules={localRules}
              onStop={stopBatch}
              onComplete={() => setShowRating(true)}
            />
          </div>
        )}

        {/* MAIN_LAYOUT */}
        {/* â•â•â• MAIN TWO-COLUMN LAYOUT: Controls LEFT, Sensors RIGHT â•â•â• */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* â”€â”€ LEFT: Actuator Controls / Values â”€â”€ */}
          <div className="lg:w-[400px] flex-shrink-0 space-y-4">
            <h2 className="text-sm text-slate-700 font-bold">
              Thiết bị điều khiển
            </h2>
            <div className="space-y-3">
              {actuators.map((dev) => {
                const dt = deviceTypes.find((t) => t.id === dev.deviceTypeId);
                return (
                  <ManualActuatorCard
                    key={dev.id}
                    device={dev}
                    dtName={dt?.name || ""}
                    unit={dt?.unit || ""}
                    valueRange={dt?.valueRange}
                    disabled={false}
                    serverValue={actuatorReadings.get(dev.id)?.value ?? null}
                    onUpdate={(updates, desc) =>
                      updateDeviceManual(dev.id, updates, desc || undefined)
                    }
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
                        {chartOpts[safeChartIdx]?.label}
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
                      data={chartData}
                      color={chartOpts[safeChartIdx]?.color ?? "#64748b"}
                      label={chartOpts[safeChartIdx]?.label ?? ""}
                    />
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4">
                    <h3 className="text-sm text-slate-700 mb-2 font-bold">
                      Nhật ký hoạt động
                    </h3>
                    <LogTable logs={dryerSystemLogs} compact />
                  </div>
                </div>
              ) : (
                /* expanded: all charts */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chartOpts.map((opt) => (
                    <SparkLineChart
                      key={opt.deviceId}
                      data={deviceLogs.get(opt.deviceId) ?? []}
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
                <LogTable logs={dryerSystemLogs} />
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
