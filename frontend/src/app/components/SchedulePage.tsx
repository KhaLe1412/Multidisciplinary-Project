import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Schedule,
  SchedulePhase,
  PhaseAction,
  Fruit,
  buildPhaseActionDesc,
} from "../data/mockData";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  CalendarDays,
  Clock,
  Thermometer,
  Droplets,
  ChevronDown,
  ChevronUp,
  Leaf,
  ShieldAlert,
  Wind,
  Flame,
  DoorOpen,
  Power,
  Info,
  Play,
  ChevronRight,
} from "lucide-react";

let phaseIdCounter = 200;

// ──────── Phase Action Editor ────────
function PhaseActionEditor({
  action,
  onChange,
  label,
  colorClass,
}: {
  action: PhaseAction;
  onChange: (a: PhaseAction) => void;
  label: string;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2.5 ${colorClass}`}>
      <p className="text-xs text-slate-700 mb-1" style={{ fontWeight: 600 }}>
        {label}
      </p>
      {/* Dryer on/off */}
      <div className="flex items-center gap-2 flex-wrap">
        <Power size={12} className="text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
          Máy sấy
        </span>
        {[
          { label: "Bật", v: true, c: "bg-green-500" },
          { label: "Tắt", v: false, c: "bg-red-500" },
          { label: "Giữ nguyên", v: undefined, c: "bg-slate-400" },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange({ ...action, dryerOn: opt.v })}
            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${action.dryerOn === opt.v ? `${opt.c} text-white` : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}
            style={{ fontWeight: action.dryerOn === opt.v ? 600 : 400 }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {/* Fan speed */}
      <div className="flex items-center gap-2">
        <Wind size={12} className="text-cyan-500 flex-shrink-0" />
        <span className="text-xs text-slate-500 w-20 flex-shrink-0">Quạt</span>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...action,
              fanSpeed: action.fanSpeed !== undefined ? undefined : 70,
            })
          }
          className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${action.fanSpeed !== undefined ? "bg-cyan-500" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${action.fanSpeed !== undefined ? "left-4" : "left-0.5"}`}
          />
        </button>
        {action.fanSpeed !== undefined ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="range"
              min={0}
              max={100}
              value={action.fanSpeed}
              onChange={(e) =>
                onChange({ ...action, fanSpeed: +e.target.value })
              }
              className="flex-1 h-1 accent-cyan-500"
            />
            <span
              className="text-xs text-cyan-600 w-8 text-right flex-shrink-0"
              style={{ fontWeight: 600 }}
            >
              {action.fanSpeed}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Giữ nguyên</span>
        )}
      </div>
      {/* Door */}
      <div className="flex items-center gap-2 flex-wrap">
        <DoorOpen size={12} className="text-emerald-500 flex-shrink-0" />
        <span className="text-xs text-slate-500 w-20 flex-shrink-0">Cửa</span>
        {[
          { label: "Mở", v: true, c: "bg-emerald-500" },
          { label: "Đóng", v: false, c: "bg-slate-600" },
          { label: "Giữ nguyên", v: undefined, c: "bg-slate-400" },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange({ ...action, doorOpen: opt.v })}
            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${action.doorOpen === opt.v ? `${opt.c} text-white` : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}
            style={{ fontWeight: action.doorOpen === opt.v ? 600 : 400 }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {/* Heater */}
      <div className="flex items-center gap-2">
        <Flame size={12} className="text-red-500 flex-shrink-0" />
        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
          Gia nhiệt
        </span>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...action,
              heaterOff: !action.heaterOff,
              heaterTemp: action.heaterOff ? action.heaterTemp : undefined,
            })
          }
          className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${action.heaterOff ? "bg-red-500" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${action.heaterOff ? "left-4" : "left-0.5"}`}
          />
        </button>
        {action.heaterOff ? (
          <span className="text-xs text-red-500">Tắt gia nhiệt</span>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...action,
                  heaterTemp: action.heaterTemp !== undefined ? undefined : 60,
                })
              }
              className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${action.heaterTemp !== undefined ? "bg-orange-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${action.heaterTemp !== undefined ? "left-4" : "left-0.5"}`}
              />
            </button>
            {action.heaterTemp !== undefined ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={action.heaterTemp}
                  onChange={(e) =>
                    onChange({ ...action, heaterTemp: +e.target.value })
                  }
                  className="flex-1 h-1 accent-orange-500"
                />
                <span
                  className="text-xs text-orange-600 w-10 text-right flex-shrink-0"
                  style={{ fontWeight: 600 }}
                >
                  {action.heaterTemp}°C
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Giữ nguyên</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────── Phase Action Summary (read-only) ────────
function ActionBadge({ action }: { action: PhaseAction }) {
  const parts: { label: string; color: string; bg: string }[] = [];
  if (action.dryerOn === true)
    parts.push({ label: "Bật máy", color: "#16a34a", bg: "#f0fdf4" });
  if (action.dryerOn === false)
    parts.push({ label: "Tắt máy", color: "#dc2626", bg: "#fef2f2" });
  if (action.fanSpeed !== undefined)
    parts.push({
      label: `Quạt ${action.fanSpeed}%`,
      color: "#0891b2",
      bg: "#ecfeff",
    });
  if (action.doorOpen === true)
    parts.push({ label: "Mở cửa", color: "#059669", bg: "#f0fdf4" });
  if (action.doorOpen === false)
    parts.push({ label: "Đóng cửa", color: "#475569", bg: "#f1f5f9" });
  if (action.heaterOff)
    parts.push({ label: "Tắt gia nhiệt", color: "#dc2626", bg: "#fef2f2" });
  if (action.heaterTemp !== undefined && !action.heaterOff)
    parts.push({
      label: `Gia nhiệt ${action.heaterTemp}°C`,
      color: "#ea580c",
      bg: "#fff7ed",
    });
  if (parts.length === 0)
    return (
      <span className="text-xs text-slate-400 italic">Không thay đổi</span>
    );
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p, i) => (
        <span
          key={i}
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ color: p.color, background: p.bg, fontWeight: 500 }}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

// ──────── Phase Row (editable) ────────
function PhaseRow({
  phase,
  index,
  onUpdate,
  onDelete,
  editable,
}: {
  phase: SchedulePhase;
  index: number;
  onUpdate: (id: string, updated: SchedulePhase) => void;
  onDelete: (id: string) => void;
  editable: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalDur = phase.duration;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${expanded ? "bg-blue-50 border-b border-blue-100" : "bg-white hover:bg-slate-50"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0"
          style={{
            background: `hsl(${200 + index * 40}, 70%, 50%)`,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {editable ? (
            <input
              type="text"
              value={phase.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdate(phase.id, { ...phase, name: e.target.value })
              }
              className="text-sm text-slate-800 bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-500 w-full max-w-48"
              style={{ fontWeight: 600 }}
            />
          ) : (
            <p className="text-sm text-slate-800" style={{ fontWeight: 600 }}>
              {phase.name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={10} /> {totalDur} phút
            </span>
            <span className="text-xs text-blue-600">
              ▶ {buildPhaseActionDesc(phase.startActions)}
            </span>
            {phase.endActions && (
              <span className="text-xs text-orange-600">
                ⏹ {buildPhaseActionDesc(phase.endActions)}
              </span>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {editable && (
            <button
              onClick={() => onDelete(phase.id)}
              className="text-slate-300 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-white space-y-4">
          {/* Duration */}
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-slate-400 flex-shrink-0" />
            <span
              className="text-xs text-slate-600 flex-shrink-0"
              style={{ fontWeight: 600 }}
            >
              Thời lượng giai đoạn:
            </span>
            {editable ? (
              <input
                type="number"
                min={1}
                value={phase.duration}
                onChange={(e) =>
                  onUpdate(phase.id, { ...phase, duration: +e.target.value })
                }
                className="w-20 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span
                className="text-sm text-slate-700"
                style={{ fontWeight: 600 }}
              >
                {phase.duration} phút
              </span>
            )}
            <span className="text-xs text-slate-400">phút</span>
          </div>

          {/* Start actions */}
          {editable ? (
            <PhaseActionEditor
              action={phase.startActions ?? {}}
              onChange={(a) =>
                onUpdate(phase.id, { ...phase, startActions: a })
              }
              label="▶ Hành động khi bắt đầu giai đoạn"
              colorClass="bg-green-50 border-green-200"
            />
          ) : (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p
                className="text-xs text-green-700 mb-2"
                style={{ fontWeight: 600 }}
              >
                ▶ Hành động khi bắt đầu giai đoạn
              </p>
              <ActionBadge action={phase.startActions ?? {}} />
            </div>
          )}

          {/* End actions */}
          {(phase.endActions || editable) &&
            (editable ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    ⏹ Hành động khi kết thúc giai đoạn
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(phase.id, {
                        ...phase,
                        endActions: phase.endActions ? undefined : {},
                      })
                    }
                    className={`text-xs px-2 py-0.5 rounded-full transition-all ${phase.endActions ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600"}`}
                    style={{ fontWeight: 500 }}
                  >
                    {phase.endActions ? "✓ Bật" : "+ Thêm"}
                  </button>
                </div>
                {phase.endActions && (
                  <PhaseActionEditor
                    action={phase.endActions}
                    onChange={(a) =>
                      onUpdate(phase.id, { ...phase, endActions: a })
                    }
                    label="⏹ Hành động kết thúc"
                    colorClass="bg-orange-50 border-orange-200"
                  />
                )}
              </div>
            ) : phase.endActions ? (
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <p
                  className="text-xs text-orange-700 mb-2"
                  style={{ fontWeight: 600 }}
                >
                  ⏹ Hành động khi kết thúc giai đoạn
                </p>
                <ActionBadge action={phase.endActions} />
              </div>
            ) : null)}
        </div>
      )}
    </div>
  );
}

// ──────── Fruit Form ────────
function FruitForm({
  form,
  onChange,
}: {
  form: Partial<Fruit>;
  onChange: (f: Partial<Fruit>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            ID *
          </label>
          <input
            type="text"
            value={form.id || ""}
            onChange={(e) => onChange({ ...form, id: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="FRT-001"
          />
        </div>
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            Tên nông sản *
          </label>
          <input
            type="text"
            value={form.name || ""}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Xoài"
          />
        </div>
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            Nhiệt độ min (°C)
          </label>
          <input
            type="number"
            value={form.recommendedTempMin ?? ""}
            onChange={(e) =>
              onChange({ ...form, recommendedTempMin: +e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            Nhiệt độ max (°C)
          </label>
          <input
            type="number"
            value={form.recommendedTempMax ?? ""}
            onChange={(e) =>
              onChange({ ...form, recommendedTempMax: +e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            Độ ẩm min (%)
          </label>
          <input
            type="number"
            value={form.recommendedHumidityMin ?? ""}
            onChange={(e) =>
              onChange({ ...form, recommendedHumidityMin: +e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label
            className="text-xs text-slate-500 block mb-1"
            style={{ fontWeight: 600 }}
          >
            Độ ẩm max (%)
          </label>
          <input
            type="number"
            value={form.recommendedHumidityMax ?? ""}
            onChange={(e) =>
              onChange({ ...form, recommendedHumidityMax: +e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      <div>
        <label
          className="text-xs text-slate-500 block mb-1"
          style={{ fontWeight: 600 }}
        >
          Mô tả
        </label>
        <textarea
          value={form.description || ""}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder="Mô tả đặc điểm sấy..."
        />
      </div>
    </div>
  );
}

const emptyFruit = (): Partial<Fruit> => ({
  id: "",
  name: "",
  recommendedTempMin: 50,
  recommendedTempMax: 70,
  recommendedHumidityMin: 20,
  recommendedHumidityMax: 40,
  description: "",
});
const emptyPhase = (): SchedulePhase => ({
  id: `P${++phaseIdCounter}`,
  name: `Giai đoạn ${phaseIdCounter - 199}`,
  offsetSeconds: 0,
  actions: [],
  duration: 60,
  startActions: {},
  endActions: undefined,
});

// ──────── Main Component ────────
export function SchedulePage() {
  const { schedules, setSchedules, fruits, setFruits, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<"schedules" | "fruits">(
    "schedules",
  );

  // Schedule state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Schedule | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState<Omit<Schedule, "id" | "createdAt">>({
    name: "",
    fruitId: "",
    objects: [],
    phases: [],
  });

  // Fruit state
  const [fruitExpandedId, setFruitExpandedId] = useState<string | null>(null);
  const [fruitEditId, setFruitEditId] = useState<string | null>(null);
  const [fruitEditForm, setFruitEditForm] = useState<Partial<Fruit>>({});
  const [fruitCreateOpen, setFruitCreateOpen] = useState(false);
  const [newFruitForm, setNewFruitForm] =
    useState<Partial<Fruit>>(emptyFruit());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "schedule" | "fruit";
    id: string;
    name: string;
  }>({ open: false, type: "schedule", id: "", name: "" });

  const canEdit =
    currentUser?.role === "admin" || currentUser?.permissions?.policy;

  // ─── Schedule helpers ───
  const startEdit = (s: Schedule) => {
    setEditingId(s.id);
    setEditForm(JSON.parse(JSON.stringify(s)));
    setExpandedId(s.id);
  };

  const saveEdit = () => {
    if (!editForm) return;
    setSchedules((prev) =>
      prev.map((s) => (s.id === editingId ? editForm : s)),
    );
    setEditingId(null);
    setEditForm(null);
  };

  const deleteSchedule = (id: string, name?: string) => {
    setConfirmDialog({ open: true, type: "schedule", id, name: name || id });
  };

  const createSchedule = () => {
    if (!newForm.name || !newForm.fruitId) {
      alert("Vui lòng nhập tên lịch và chọn loại nông sản!");
      return;
    }
    const id = `SCH-${String(schedules.length + 1).padStart(3, "0")}`;
    setSchedules((prev) => [
      ...prev,
      { ...newForm, id, createdAt: new Date().toISOString() },
    ]);
    setNewForm({ name: "", fruitId: "", objects: [], phases: [] });
    setCreateOpen(false);
  };

  const updatePhase = (
    phases: SchedulePhase[],
    id: string,
    updated: SchedulePhase,
  ): SchedulePhase[] => phases.map((p) => (p.id === id ? updated : p));

  const addPhase = (isNew: boolean) => {
    const p = emptyPhase();
    if (isNew) setNewForm((prev) => ({ ...prev, phases: [...prev.phases, p] }));
    else if (editForm)
      setEditForm((prev) =>
        prev ? { ...prev, phases: [...prev.phases, p] } : prev,
      );
  };

  const deletePhase = (phaseId: string, isNew: boolean) => {
    if (isNew)
      setNewForm((prev) => ({
        ...prev,
        phases: prev.phases.filter((p) => p.id !== phaseId),
      }));
    else if (editForm)
      setEditForm((prev) =>
        prev
          ? { ...prev, phases: prev.phases.filter((p) => p.id !== phaseId) }
          : prev,
      );
  };

  // ─── Fruit helpers ───
  const saveFruitEdit = () => {
    setFruits((prev) =>
      prev.map((f) =>
        f.id === fruitEditId ? ({ ...f, ...fruitEditForm } as Fruit) : f,
      ),
    );
    setFruitEditId(null);
    setFruitEditForm({});
  };

  const deleteFruit = (id: string, name?: string) => {
    setConfirmDialog({ open: true, type: "fruit", id, name: name || id });
  };

  const confirmDelete = () => {
    if (confirmDialog.type === "schedule") {
      setSchedules((prev) => prev.filter((s) => s.id !== confirmDialog.id));
    } else {
      setFruits((prev) => prev.filter((f) => f.id !== confirmDialog.id));
    }
    setConfirmDialog({ open: false, type: "schedule", id: "", name: "" });
  };

  const createFruit = () => {
    if (!newFruitForm.id || !newFruitForm.name) {
      alert("Vui lòng nhập ID và tên nông sản!");
      return;
    }
    if (fruits.find((f) => f.id === newFruitForm.id)) {
      alert("ID đã tồn tại!");
      return;
    }
    setFruits((prev) => [
      ...prev,
      { ...newFruitForm, createdAt: new Date().toISOString() } as Fruit,
    ]);
    setNewFruitForm(emptyFruit());
    setFruitCreateOpen(false);
  };

  const totalMinutes = (phases: SchedulePhase[]) =>
    phases.reduce((a, p) => a + (p.duration ?? 0), 0);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-slate-900 mb-1"
            style={{ fontWeight: 700 }}
          >
            Lịch trình & Nông sản
          </h1>
          <p className="text-slate-500 text-sm">
            Quản lý lịch trình sấy và danh mục nông sản
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() =>
              activeTab === "schedules"
                ? setCreateOpen(true)
                : setFruitCreateOpen(true)
            }
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
            style={{
              background:
                activeTab === "schedules"
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
              fontWeight: 600,
            }}
          >
            <Plus size={16} />{" "}
            {activeTab === "schedules" ? "Tạo lịch trình" : "Thêm nông sản"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          {
            key: "schedules",
            label: `Lịch trình (${schedules.length})`,
            icon: CalendarDays,
          },
          { key: "fruits", label: `Nông sản (${fruits.length})`, icon: Leaf },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            style={{ fontWeight: activeTab === t.key ? 600 : 400 }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ===== SCHEDULES TAB ===== */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          {/* Create form */}
          {createOpen && (
            <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base text-slate-900"
                  style={{ fontWeight: 700 }}
                >
                  Tạo lịch trình mới
                </h2>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    className="text-xs text-slate-500 block mb-1"
                    style={{ fontWeight: 600 }}
                  >
                    Tên lịch trình *
                  </label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên lịch trình..."
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-slate-500 block mb-1"
                    style={{ fontWeight: 600 }}
                  >
                    Loại nông sản *
                  </label>
                  <select
                    value={newForm.fruitId}
                    onChange={(e) =>
                      setNewForm((prev) => ({
                        ...prev,
                        fruitId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Chọn nông sản —</option>
                    {fruits.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p
                className="text-xs text-slate-500 mb-3"
                style={{ fontWeight: 600 }}
              >
                GIAI ĐOẠN SẤY ({newForm.phases.length} giai đoạn —{" "}
                {totalMinutes(newForm.phases)} phút)
              </p>
              <div className="space-y-2 mb-3">
                {newForm.phases.map((phase, i) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    index={i}
                    editable
                    onUpdate={(id, updated) =>
                      setNewForm((prev) => ({
                        ...prev,
                        phases: updatePhase(prev.phases, id, updated),
                      }))
                    }
                    onDelete={(id) => deletePhase(id, true)}
                  />
                ))}
              </div>
              <button
                onClick={() => addPhase(true)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all border border-dashed border-blue-300 w-full justify-center mb-4"
                style={{ fontWeight: 500 }}
              >
                <Plus size={13} /> Thêm giai đoạn
              </button>
              <div className="flex gap-2">
                <button
                  onClick={createSchedule}
                  className="px-5 py-2 text-white rounded-lg text-sm hover:opacity-90"
                  style={{ background: "#3b82f6", fontWeight: 600 }}
                >
                  Tạo lịch
                </button>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {schedules.map((sched) => {
            const isExpanded = expandedId === sched.id;
            const isEditing = editingId === sched.id;
            const form = isEditing ? editForm! : sched;
            const fruit = fruits.find((f) => f.id === sched.fruitId);
            const total = totalMinutes(sched.phases);
            return (
              <div
                key={sched.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() =>
                    !isEditing &&
                    setExpandedId((prev) =>
                      prev === sched.id ? null : sched.id,
                    )
                  }
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    }}
                  >
                    <CalendarDays size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm text-slate-900"
                        style={{ fontWeight: 600 }}
                      >
                        {sched.name}
                      </p>
                      {fruit && (
                        <span
                          className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"
                          style={{ fontWeight: 500 }}
                        >
                          <Leaf size={10} /> {fruit.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {total} phút (
                        {Math.floor(total / 60)}h
                        {total % 60 > 0 ? ` ${total % 60}ph` : ""})
                      </span>
                      <span>{sched.phases.length} giai đoạn</span>
                      <span>
                        Tạo:{" "}
                        {new Date(sched.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canEdit && !isEditing && (
                      <>
                        <button
                          onClick={() => startEdit(sched)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => deleteSchedule(sched.id, sched.name)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"
                          style={{ fontWeight: 600 }}
                        >
                          <Check size={12} /> Lưu
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs"
                        >
                          Hủy
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId((prev) =>
                          prev === sched.id ? null : sched.id,
                        )
                      }
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    {isEditing && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label
                            className="text-xs text-slate-500 block mb-1"
                            style={{ fontWeight: 600 }}
                          >
                            Tên lịch trình
                          </label>
                          <input
                            type="text"
                            value={editForm!.name}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev,
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label
                            className="text-xs text-slate-500 block mb-1"
                            style={{ fontWeight: 600 }}
                          >
                            Loại nông sản
                          </label>
                          <select
                            value={editForm!.fruitId}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? { ...prev, fruitId: e.target.value }
                                  : prev,
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            {fruits.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <p
                      className="text-xs text-slate-500 mb-3"
                      style={{ fontWeight: 600 }}
                    >
                      GIAI ĐOẠN SẤY ({form.phases.length} giai đoạn —{" "}
                      {totalMinutes(form.phases)} phút tổng)
                    </p>

                    {/* Timeline visual */}
                    {!isEditing && form.phases.length > 0 && (
                      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                        {form.phases.map((p, i) => {
                          const pct = Math.max(
                            8,
                            Math.round(
                              ((p.duration ?? 0) / totalMinutes(form.phases)) *
                                100,
                            ),
                          );
                          const hue = 200 + i * 40;
                          return (
                            <div
                              key={p.id}
                              className="flex-shrink-0 text-center"
                              style={{ width: `${pct}%`, minWidth: 48 }}
                            >
                              <div
                                className="h-6 rounded-lg flex items-center justify-center text-white text-xs mb-1"
                                style={{
                                  background: `hsl(${hue},60%,50%)`,
                                  fontWeight: 600,
                                }}
                              >
                                {i + 1}
                              </div>
                              <div className="text-xs text-slate-400">
                                {p.duration}ph
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2 mb-3">
                      {form.phases.map((phase, i) => (
                        <PhaseRow
                          key={phase.id}
                          phase={phase}
                          index={i}
                          editable={isEditing}
                          onUpdate={(id, updated) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    phases: updatePhase(
                                      prev.phases,
                                      id,
                                      updated,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          onDelete={(id) => deletePhase(id, false)}
                        />
                      ))}
                    </div>

                    {isEditing && (
                      <button
                        onClick={() => addPhase(false)}
                        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all border border-dashed border-blue-300 w-full justify-center"
                        style={{ fontWeight: 500 }}
                      >
                        <Plus size={13} /> Thêm giai đoạn
                      </button>
                    )}

                    {!isEditing && fruit && (
                      <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                        <p
                          className="text-xs text-green-700 mb-1"
                          style={{ fontWeight: 600 }}
                        >
                          🌱 Thông số khuyến nghị — {fruit.name}
                        </p>
                        <div className="flex gap-4 text-xs text-green-700">
                          <span>
                            🌡 {fruit.recommendedTempMin}–
                            {fruit.recommendedTempMax}°C
                          </span>
                          <span>
                            💧 {fruit.recommendedHumidityMin}–
                            {fruit.recommendedHumidityMax}%
                          </span>
                          {fruit.description && (
                            <span className="text-green-600 italic">
                              {fruit.description}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {schedules.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có lịch trình nào</p>
            </div>
          )}
        </div>
      )}

      {/* ===== FRUITS TAB ===== */}
      {activeTab === "fruits" && (
        <div className="space-y-4">
          {/* Create form */}
          {fruitCreateOpen && (
            <div className="bg-white rounded-xl border border-green-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base text-slate-900"
                  style={{ fontWeight: 700 }}
                >
                  Thêm loại nông sản mới
                </h2>
                <button
                  onClick={() => setFruitCreateOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <FruitForm form={newFruitForm} onChange={setNewFruitForm} />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createFruit}
                  className="px-5 py-2 text-white rounded-lg text-sm hover:opacity-90"
                  style={{ background: "#22c55e", fontWeight: 600 }}
                >
                  Thêm nông sản
                </button>
                <button
                  onClick={() => setFruitCreateOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fruits.map((fruit) => {
              const isEditing = fruitEditId === fruit.id;
              const isExpanded = fruitExpandedId === fruit.id;
              const schedCount = schedules.filter(
                (s) => s.fruitId === fruit.id,
              ).length;
              return (
                <div
                  key={fruit.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:border-green-200 hover:shadow-md transition-all"
                >
                  {isEditing ? (
                    <div className="p-4">
                      <p
                        className="text-sm text-slate-800 mb-3"
                        style={{ fontWeight: 600 }}
                      >
                        Chỉnh sửa nông sản
                      </p>
                      <FruitForm
                        form={fruitEditForm}
                        onChange={setFruitEditForm}
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={saveFruitEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"
                          style={{ fontWeight: 600 }}
                        >
                          <Check size={12} /> Lưu
                        </button>
                        <button
                          onClick={() => setFruitEditId(null)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="p-4"
                        onClick={() =>
                          setFruitExpandedId((prev) =>
                            prev === fruit.id ? null : fruit.id,
                          )
                        }
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                background:
                                  "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                              }}
                            >
                              <Leaf size={20} className="text-green-600" />
                            </div>
                            <div>
                              <p
                                className="text-sm text-slate-900"
                                style={{ fontWeight: 600 }}
                              >
                                {fruit.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                ID: {fruit.id}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                            style={{ fontWeight: 500 }}
                          >
                            {schedCount} lịch
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-orange-50 rounded-lg p-2">
                            <p className="text-orange-500 mb-0.5">
                              🌡 Nhiệt độ
                            </p>
                            <p
                              className="text-orange-700"
                              style={{ fontWeight: 600 }}
                            >
                              {fruit.recommendedTempMin}–
                              {fruit.recommendedTempMax}°C
                            </p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-blue-500 mb-0.5">💧 Độ ẩm</p>
                            <p
                              className="text-blue-700"
                              style={{ fontWeight: 600 }}
                            >
                              {fruit.recommendedHumidityMin}–
                              {fruit.recommendedHumidityMax}%
                            </p>
                          </div>
                        </div>
                        {isExpanded && fruit.description && (
                          <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <p
                              className="text-xs text-slate-500 mb-0.5"
                              style={{ fontWeight: 600 }}
                            >
                              Mô tả
                            </p>
                            <p className="text-xs text-slate-600">
                              {fruit.description}
                            </p>
                          </div>
                        )}
                        {isExpanded && (
                          <p className="text-xs text-slate-400 mt-2">
                            Ngày thêm:{" "}
                            {new Date(fruit.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </p>
                        )}
                      </div>
                      <div className="border-t border-slate-100 px-4 py-2.5 flex gap-2 items-center">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setFruitEditId(fruit.id);
                                setFruitEditForm({ ...fruit });
                              }}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                            >
                              <Edit3 size={11} /> Sửa
                            </button>
                            <button
                              onClick={() => deleteFruit(fruit.id, fruit.name)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                              <Trash2 size={11} /> Xóa
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            setFruitExpandedId((prev) =>
                              prev === fruit.id ? null : fruit.id,
                            )
                          }
                          className="ml-auto text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50"
                        >
                          {isExpanded ? "Thu gọn" : "Chi tiết"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {fruits.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Leaf size={40} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có loại nông sản nào</p>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.type === "schedule"
            ? "Xóa lịch trình"
            : "Xóa loại nông sản"
        }
        message={`Bạn có chắc chắn muốn xóa "${confirmDialog.name}"?`}
        confirmLabel="Xóa"
        onConfirm={confirmDelete}
        onCancel={() =>
          setConfirmDialog({ open: false, type: "schedule", id: "", name: "" })
        }
      />
    </div>
  );
}
