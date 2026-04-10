import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Schedule,
  SchedulePhase,
  PolicyAction,
  PolicyObject,
  AlertRule,
  AlertConditionActionPair,
  AlertCondition,
  AlertOperator,
  Fruit,
  DeviceTypeModel,
  buildActionsDesc,
  formatOffsetSeconds,
} from "../data/mockData";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  CalendarDays,
  Leaf,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Clock,
  Zap,
  AlertTriangle,
  Copy,
  Settings2,
  Loader2,
} from "lucide-react";
import {
  apiCreateCrop,
  apiUpdateCrop,
  apiDeleteCrop,
  apiSaveSchedule,
  apiDeleteSchedule,
  apiSaveRule,
  apiDeleteRule,
} from "../api/policyApi";

type Tab = "schedules" | "fruits" | "rules";

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function uid() {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

const operatorLabels: Record<AlertOperator, string> = {
  ">": ">",
  "<": "<",
  "=": "=",
  ">=": ">=",
  "<=": "<=",
};

// â”€â”€â”€ Action Editor (object-based) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionEditor({
  actions,
  onChange,
  objects,
  allDeviceTypes,
}: {
  actions: PolicyAction[];
  onChange: (a: PolicyAction[]) => void;
  objects: PolicyObject[];
  allDeviceTypes: DeviceTypeModel[];
}) {
  const actuatorObjs = objects.filter((o) => {
    const dt = allDeviceTypes.find((t) => t.id === o.deviceTypeId);
    return dt?.category === "controller";
  });

  const add = () => {
    const first = actuatorObjs[0];
    if (!first) return;
    const dt = allDeviceTypes.find((t) => t.id === first.deviceTypeId);
    const defaultVal =
      dt?.unit === "boolean"
        ? 0
        : dt?.unit === "text"
          ? ""
          : (dt?.valueRange?.min ?? 0);
    onChange([...actions, { objectId: first.id, value: defaultVal }]);
  };
  const update = (i: number, a: PolicyAction) => {
    const copy = [...actions];
    copy[i] = a;
    onChange(copy);
  };
  const remove = (i: number) => onChange(actions.filter((_, j) => j !== i));

  return (
    <div className="space-y-1.5">
      {actions.map((a, i) => {
        const obj = objects.find((o) => o.id === a.objectId);
        const dt = obj
          ? allDeviceTypes.find((t) => t.id === obj.deviceTypeId)
          : null;
        return (
          <div key={i} className="flex items-center gap-2">
            <select
              className="border rounded-lg px-2 py-1 text-xs flex-1"
              value={a.objectId}
              onChange={(e) => {
                const nobj = objects.find((o) => o.id === e.target.value);
                const ndt = nobj
                  ? allDeviceTypes.find((t) => t.id === nobj.deviceTypeId)
                  : null;
                const dv =
                  ndt?.unit === "boolean"
                    ? 0
                    : ndt?.unit === "text"
                      ? ""
                      : (ndt?.valueRange?.min ?? 0);
                update(i, { objectId: e.target.value, value: dv });
              }}
            >
              {actuatorObjs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (
                  {allDeviceTypes.find((t) => t.id === o.deviceTypeId)?.name})
                </option>
              ))}
            </select>
            {dt?.unit === "boolean" ? (
              <select
                className="border rounded-lg px-2 py-1 text-xs w-20"
                value={typeof a.value === "number" ? a.value : 0}
                onChange={(e) =>
                  update(i, { ...a, value: Number(e.target.value) })
                }
              >
                <option value={1}>Bật</option>
                <option value={0}>Tắt</option>
              </select>
            ) : dt?.unit === "text" ? (
              <input
                type="text"
                className="border rounded-lg px-2 py-1 text-xs flex-1"
                value={String(a.value)}
                placeholder="Nội dung LCD..."
                onChange={(e) => update(i, { ...a, value: e.target.value })}
              />
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="border rounded-lg px-2 py-1 text-xs w-20"
                  value={typeof a.value === "number" ? a.value : 0}
                  min={dt?.valueRange?.min}
                  max={dt?.valueRange?.max}
                  onChange={(e) =>
                    update(i, { ...a, value: Number(e.target.value) })
                  }
                />
                <span className="text-xs text-slate-400">{dt?.unit}</span>
              </div>
            )}
            <button
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      {actuatorObjs.length > 0 && (
        <button
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus size={12} /> Thêm hành động
        </button>
      )}
    </div>
  );
}

// â”€â”€â”€ Condition Editor (object-based) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ConditionEditor({
  conditions,
  onChange,
  objects,
  allDeviceTypes,
}: {
  conditions: AlertCondition[];
  onChange: (c: AlertCondition[]) => void;
  objects: PolicyObject[];
  allDeviceTypes: DeviceTypeModel[];
}) {
  const measurableObjs = objects.filter((o) => {
    const dt = allDeviceTypes.find((t) => t.id === o.deviceTypeId);
    return dt && dt.unit !== "text" && dt.unit !== "boolean";
  });
  const add = () => {
    const first = measurableObjs[0];
    if (!first) return;
    const dt = allDeviceTypes.find((t) => t.id === first.deviceTypeId);
    onChange([
      ...conditions,
      {
        objectId: first.id,
        operator: ">",
        value: dt?.valueRange?.max ?? 0,
      },
    ]);
  };
  const update = (i: number, c: AlertCondition) => {
    const copy = [...conditions];
    copy[i] = c;
    onChange(copy);
  };
  const remove = (i: number) => onChange(conditions.filter((_, j) => j !== i));

  return (
    <div className="space-y-1.5">
      {conditions.map((c, i) => {
        const obj = objects.find((o) => o.id === c.objectId);
        const dt = obj
          ? allDeviceTypes.find((t) => t.id === obj.deviceTypeId)
          : null;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-xs text-amber-600 font-semibold">AND</span>
            )}
            <select
              className="border rounded-lg px-2 py-1 text-xs flex-1"
              value={c.objectId}
              onChange={(e) => update(i, { ...c, objectId: e.target.value })}
            >
              {measurableObjs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (
                  {allDeviceTypes.find((t) => t.id === o.deviceTypeId)?.name})
                </option>
              ))}
            </select>
            <select
              className="border rounded-lg px-2 py-1 text-xs w-14"
              value={c.operator}
              onChange={(e) =>
                update(i, { ...c, operator: e.target.value as AlertOperator })
              }
            >
              {(Object.keys(operatorLabels) as AlertOperator[]).map((op) => (
                <option key={op} value={op}>
                  {operatorLabels[op]}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="border rounded-lg px-2 py-1 text-xs w-20"
              value={c.value}
              min={dt?.valueRange?.min}
              max={dt?.valueRange?.max}
              onChange={(e) =>
                update(i, { ...c, value: Number(e.target.value) })
              }
            />
            <span className="text-xs text-slate-400">{dt?.unit}</span>
            <button
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      {measurableObjs.length > 0 && (
        <button
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus size={12} /> Thêm điều kiện
        </button>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function PolicyPage() {
  const {
    schedules,
    setSchedules,
    fruits,
    setFruits,
    alertRules,
    setAlertRules,
    deviceTypes,
    addLog,
    currentUser,
  } = useApp();

  const [tab, setTab] = useState<Tab>("schedules");
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const [isSaving, setIsSaving] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });
  const showConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false }));

  // Device type lookups

  // â”€â”€â”€ SCHEDULE STATE â”€â”€â”€â”€
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(
    null,
  );
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const emptySchedule = (): Schedule => ({
    id: "",
    name: "",
    fruitId: fruits[0]?.id || "",
    phases: [],
    objects: [],
    createdAt: new Date().toISOString(),
  });

  const saveSchedule = async () => {
    if (!editingSchedule || !editingSchedule.name.trim()) return;
    setIsSaving(true);
    try {
      const saved = await apiSaveSchedule(editingSchedule);
      setSchedules((prev) =>
        editingSchedule.id
          ? prev.map((s) => (s.id === editingSchedule.id ? saved : s))
          : [...prev, saved],
      );
      addLog({
        eventType: "policy_management",
        time: new Date().toISOString(),
        user: currentUser!.name,
        description: `${editingSchedule.id ? "Cập nhật" : "Tạo"} lịch trình "${editingSchedule.name}"`,
        severity: "info",
      });
      setEditingSchedule(null);
    } catch (e) {
      alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = (s: Schedule) =>
    showConfirm("Xóa lịch trình", `Xóa "${s.name}"?`, async () => {
      try {
        await apiDeleteSchedule(s.id);
        setSchedules((prev) => prev.filter((x) => x.id !== s.id));
        addLog({
          eventType: "policy_management",
          time: new Date().toISOString(),
          user: currentUser!.name,
          description: `Xóa lịch trình "${s.name}"`,
          severity: "warning",
        });
      } catch (e) {
        alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  // Phase helpers
  const addPhase = () => {
    if (!editingSchedule) return;
    const lastOffset =
      editingSchedule.phases.length > 0
        ? editingSchedule.phases[editingSchedule.phases.length - 1]
            .offsetSeconds + 600
        : 0;
    const newPhase: SchedulePhase = {
      id: `P-${uid()}`,
      name: `Giai đoạn ${editingSchedule.phases.length + 1}`,
      offsetSeconds: lastOffset,
      actions: [],
    };
    setEditingSchedule({
      ...editingSchedule,
      phases: [...editingSchedule.phases, newPhase],
    });
  };

  const updatePhase = (idx: number, phase: SchedulePhase) => {
    if (!editingSchedule) return;
    const phases = [...editingSchedule.phases];
    phases[idx] = phase;
    setEditingSchedule({ ...editingSchedule, phases });
  };

  const removePhase = (idx: number) => {
    if (!editingSchedule) return;
    setEditingSchedule({
      ...editingSchedule,
      phases: editingSchedule.phases.filter((_, i) => i !== idx),
    });
  };

  // â”€â”€â”€ FRUIT STATE â”€â”€â”€â”€
  const [editingFruit, setEditingFruit] = useState<Fruit | null>(null);
  const emptyFruit = (): Fruit => ({
    id: "",
    name: "",
    description: "",
    createdAt: new Date().toISOString().split("T")[0],
  });

  const saveFruit = async () => {
    if (!editingFruit || !editingFruit.name.trim()) return;
    setIsSaving(true);
    try {
      let saved: Fruit;
      if (editingFruit.id) {
        saved = await apiUpdateCrop(
          editingFruit.id,
          editingFruit.name,
          editingFruit.description,
        );
      } else {
        saved = await apiCreateCrop(
          editingFruit.name,
          editingFruit.description,
        );
      }
      setFruits((prev) =>
        editingFruit.id
          ? prev.map((f) => (f.id === editingFruit.id ? saved : f))
          : [...prev, saved],
      );
      addLog({
        eventType: "policy_management",
        time: new Date().toISOString(),
        user: currentUser!.name,
        description: `${editingFruit.id ? "Cập nhật" : "Tạo"} nông sản "${editingFruit.name}"`,
        severity: "info",
      });
      setEditingFruit(null);
    } catch (e) {
      alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFruit = (f: Fruit) =>
    showConfirm("Xóa nông sản", `Xóa "${f.name}"?`, async () => {
      try {
        await apiDeleteCrop(f.id);
        setFruits((prev) => prev.filter((x) => x.id !== f.id));
        addLog({
          eventType: "policy_management",
          time: new Date().toISOString(),
          user: currentUser!.name,
          description: `Xóa nông sản "${f.name}"`,
          severity: "warning",
        });
      } catch (e) {
        alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  // â”€â”€â”€ ALERT RULE STATE â”€â”€â”€â”€
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const emptyRule = (): AlertRule => ({
    id: "",
    name: "",
    description: "",
    fruitId: fruits[0]?.id || "",
    pairs: [],
    objects: [],
    createdAt: new Date().toISOString(),
    active: true,
  });

  const saveRule = async () => {
    if (!editingRule || !editingRule.name.trim()) return;
    setIsSaving(true);
    try {
      const saved = await apiSaveRule(editingRule);
      setAlertRules((prev) =>
        editingRule.id
          ? prev.map((r) => (r.id === editingRule.id ? saved : r))
          : [...prev, saved],
      );
      addLog({
        eventType: "policy_management",
        time: new Date().toISOString(),
        user: currentUser!.name,
        description: `${editingRule.id ? "Cập nhật" : "Tạo"} quy tắc cảnh báo "${editingRule.name}"`,
        severity: "info",
      });
      setEditingRule(null);
    } catch (e) {
      alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRule = (r: AlertRule) =>
    showConfirm("Xóa quy tắc", `Xóa "${r.name}"?`, async () => {
      try {
        await apiDeleteRule(r.id);
        setAlertRules((prev) => prev.filter((x) => x.id !== r.id));
        addLog({
          eventType: "policy_management",
          time: new Date().toISOString(),
          user: currentUser!.name,
          description: `Xóa quy tắc cảnh báo "${r.name}"`,
          severity: "warning",
        });
      } catch (e) {
        alert(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  const addPair = () => {
    if (!editingRule) return;
    const np: AlertConditionActionPair = {
      id: `CP-${uid()}`,
      name: "",
      conditions: [],
      actions: [],
    };
    setEditingRule({ ...editingRule, pairs: [...editingRule.pairs, np] });
  };

  const updatePair = (idx: number, pair: AlertConditionActionPair) => {
    if (!editingRule) return;
    const pairs = [...editingRule.pairs];
    pairs[idx] = pair;
    setEditingRule({ ...editingRule, pairs });
  };

  const removePair = (idx: number) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      pairs: editingRule.pairs.filter((_, i) => i !== idx),
    });
  };

  // â”€â”€â”€ FILTERED DATA â”€â”€â”€â”€
  const filteredSchedules = schedules.filter(
    (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
  );
  const filteredFruits = fruits.filter(
    (f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q),
  );
  const filteredRules = alertRules.filter(
    (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const tabs: {
    key: Tab;
    label: string;
    icon: typeof CalendarDays;
    count: number;
  }[] = [
    {
      key: "schedules",
      label: "Lịch trình",
      icon: CalendarDays,
      count: schedules.length,
    },
    {
      key: "rules",
      label: "Quy tắc cảnh báo",
      icon: ShieldAlert,
      count: alertRules.length,
    },
    { key: "fruits", label: "Nông sản", icon: Leaf, count: fruits.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all border ${
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
              style={{ fontWeight: active ? 600 : 400 }}
            >
              <Icon size={16} />
              {t.label}
              <span
                className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-slate-100"}`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            if (tab === "schedules") setEditingSchedule(emptySchedule());
            else if (tab === "fruits") setEditingFruit(emptyFruit());
            else setEditingRule(emptyRule());
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white hover:opacity-90 transition-all"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            fontWeight: 600,
          }}
        >
          <Plus size={16} />
          Thêm{" "}
          {tab === "schedules"
            ? "lịch trình"
            : tab === "fruits"
              ? "nông sản"
              : "quy tắc"}
        </button>
      </div>

      {/* â”€â”€â”€ SCHEDULES TAB â”€â”€â”€ */}
      {tab === "schedules" && (
        <div className="space-y-3">
          {filteredSchedules.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Chưa có lịch trình nào
            </div>
          )}
          {filteredSchedules.map((s) => {
            const fruit = fruits.find((f) => f.id === s.fruitId);
            const expanded = expandedScheduleId === s.id;
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedScheduleId(expanded ? null : s.id)}
                >
                  {expanded ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-slate-900 truncate"
                      style={{ fontWeight: 600 }}
                    >
                      {s.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{s.id}</span>
                      {fruit && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                          {fruit.name}
                        </span>
                      )}
                      <span>{s.phases.length} giai đoạn</span>
                      {s.phases.length > 0 && (
                        <span>
                          Tổng{" "}
                          {formatOffsetSeconds(
                            Math.max(...s.phases.map((p) => p.offsetSeconds)),
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditingSchedule({ ...s })}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteSchedule(s)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    {s.phases.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">
                        Không có giai đoạn
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {s.phases.map((phase, i) => (
                          <div
                            key={phase.id}
                            className="bg-white rounded-lg border border-slate-100 p-3"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </span>
                              <span
                                className="text-sm text-slate-800"
                                style={{ fontWeight: 600 }}
                              >
                                {phase.name}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock size={10} />
                                {formatOffsetSeconds(phase.offsetSeconds)}
                              </span>
                            </div>
                            <div className="pl-7 text-xs text-slate-500">
                              {buildActionsDesc(
                                phase.actions,
                                s.objects ?? [],
                                deviceTypes,
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* â”€â”€â”€ FRUITS TAB â”€â”€â”€ */}
      {tab === "fruits" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredFruits.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              Chưa có nông sản nào
            </div>
          )}
          {filteredFruits.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p
                    className="text-sm text-slate-900"
                    style={{ fontWeight: 600 }}
                  >
                    {f.name}
                  </p>
                  <p className="text-xs text-slate-400">{f.id}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingFruit({ ...f })}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteFruit(f)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {f.description && (
                <p className="text-xs text-slate-500 line-clamp-2">
                  {f.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€â”€ ALERT RULES TAB â”€â”€â”€ */}
      {tab === "rules" && (
        <div className="space-y-3">
          {filteredRules.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Chưa có quy tắc cảnh báo nào
            </div>
          )}
          {filteredRules.map((r) => {
            const fruit = fruits.find((f) => f.id === r.fruitId);
            const expanded = expandedRuleId === r.id;
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedRuleId(expanded ? null : r.id)}
                >
                  {expanded ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-slate-900 truncate"
                      style={{ fontWeight: 600 }}
                    >
                      {r.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{r.id}</span>
                      {fruit && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                          {fruit.name}
                        </span>
                      )}
                      <span>{r.pairs.length} cặp điều kiện</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full ${r.active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}
                      >
                        {r.active ? "Đang bật" : "Tắt"}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setEditingRule({
                          ...r,
                          pairs: r.pairs.map((p) => ({
                            ...p,
                            conditions: [...p.conditions],
                            actions: [...p.actions],
                          })),
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteRule(r)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                    {r.description && (
                      <p className="text-xs text-slate-500 italic">
                        {r.description}
                      </p>
                    )}
                    {r.pairs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">
                        Không có cặp điều kiện
                      </p>
                    ) : (
                      r.pairs.map((pair, pi) => (
                        <div
                          key={pair.id}
                          className="bg-white rounded-lg border border-slate-100 p-3"
                        >
                          <p
                            className="text-xs text-slate-500 mb-2"
                            style={{ fontWeight: 600 }}
                          >
                            {pair.name || `Cặp ${pi + 1}`}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                                <AlertTriangle size={10} /> Điều kiện
                              </p>
                              <div className="space-y-1">
                                {pair.conditions.map((c, ci) => {
                                  const obj = (r.objects ?? []).find(
                                    (o) => o.id === c.objectId,
                                  );
                                  const dt = obj
                                    ? deviceTypes.find(
                                        (d) => d.id === obj.deviceTypeId,
                                      )
                                    : null;
                                  return (
                                    <div
                                      key={ci}
                                      className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded"
                                    >
                                      {ci > 0 && (
                                        <span className="font-bold mr-1">
                                          AND
                                        </span>
                                      )}
                                      {obj?.label || dt?.name || c.objectId}{" "}
                                      {operatorLabels[c.operator]} {c.value}
                                      {dt?.unit}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                                <Zap size={10} /> Hành động
                              </p>
                              <div className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">
                                {buildActionsDesc(
                                  pair.actions,
                                  r.objects ?? [],
                                  deviceTypes,
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* â•â•â• SCHEDULE FORM MODAL â•â•â• */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2
                className="text-lg text-slate-900"
                style={{ fontWeight: 700 }}
              >
                {editingSchedule.id ? "Sửa lịch trình" : "Thêm lịch trình"}
              </h2>
              <button
                onClick={() => setEditingSchedule(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Tên lịch trình *
                </label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingSchedule.name}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              {/* Fruit */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Nông sản
                </label>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingSchedule.fruitId}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      fruitId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn --</option>
                  {fruits.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Objects (virtual device slots) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Đối tượng thiết bị ({(editingSchedule.objects ?? []).length}
                    )
                  </label>
                  <button
                    onClick={() => {
                      const first = deviceTypes[0];
                      if (!first) return;
                      const newObj: PolicyObject = {
                        id: `OBJ-${uid()}`,
                        deviceTypeId: first.id,
                        label: `${first.name} ${(editingSchedule.objects ?? []).length + 1}`,
                      };
                      setEditingSchedule({
                        ...editingSchedule,
                        objects: [...(editingSchedule.objects ?? []), newObj],
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> Thêm đối tượng
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingSchedule.objects ?? []).map((obj, oi) => (
                    <div
                      key={obj.id}
                      className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100"
                    >
                      <input
                        className="border rounded-lg px-2 py-1 text-xs flex-1"
                        placeholder="Nhãn"
                        value={obj.label}
                        onChange={(e) => {
                          const objs = [...(editingSchedule.objects ?? [])];
                          objs[oi] = { ...obj, label: e.target.value };
                          setEditingSchedule({
                            ...editingSchedule,
                            objects: objs,
                          });
                        }}
                      />
                      <select
                        className="border rounded-lg px-2 py-1 text-xs flex-1"
                        value={obj.deviceTypeId}
                        onChange={(e) => {
                          const objs = [...(editingSchedule.objects ?? [])];
                          objs[oi] = { ...obj, deviceTypeId: e.target.value };
                          setEditingSchedule({
                            ...editingSchedule,
                            objects: objs,
                          });
                        }}
                      >
                        {deviceTypes.map((dt) => (
                          <option key={dt.id} value={dt.id}>
                            {dt.name} ({dt.category})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const objs = (editingSchedule.objects ?? []).filter(
                            (_, j) => j !== oi,
                          );
                          // Also remove actions referencing this object in all phases
                          const phases = editingSchedule.phases.map((ph) => ({
                            ...ph,
                            actions: ph.actions.filter(
                              (a) => a.objectId !== obj.id,
                            ),
                          }));
                          setEditingSchedule({
                            ...editingSchedule,
                            objects: objs,
                            phases,
                          });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Giai đoạn ({editingSchedule.phases.length})
                  </label>
                  <button
                    onClick={addPhase}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> Thêm giai đoạn
                  </button>
                </div>
                <div className="space-y-3">
                  {editingSchedule.phases.map((phase, idx) => (
                    <PhaseEditor
                      key={phase.id}
                      index={idx}
                      phase={phase}
                      objects={editingSchedule.objects ?? []}
                      allDeviceTypes={deviceTypes}
                      onChange={(p) => updatePhase(idx, p)}
                      onRemove={() => removePhase(idx)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingSchedule(null)}
                className="px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={saveSchedule}
                disabled={!editingSchedule.name.trim() || isSaving}
                className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  fontWeight: 600,
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â• FRUIT FORM MODAL â•â•â• */}
      {editingFruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="border-b border-slate-100 p-5 flex items-center justify-between">
              <h2
                className="text-lg text-slate-900"
                style={{ fontWeight: 700 }}
              >
                {editingFruit.id ? "Sửa nông sản" : "Thêm nông sản"}
              </h2>
              <button
                onClick={() => setEditingFruit(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Tên nông sản *
                </label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={editingFruit.name}
                  onChange={(e) =>
                    setEditingFruit({ ...editingFruit, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Mô tả
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  rows={2}
                  value={editingFruit.description || ""}
                  onChange={(e) =>
                    setEditingFruit({
                      ...editingFruit,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="border-t border-slate-100 p-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingFruit(null)}
                className="px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={saveFruit}
                disabled={!editingFruit.name.trim() || isSaving}
                className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  fontWeight: 600,
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â• ALERT RULE FORM MODAL â•â•â• */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2
                className="text-lg text-slate-900"
                style={{ fontWeight: 700 }}
              >
                {editingRule.id ? "Sửa quy tắc" : "Thêm quy tắc cảnh báo"}
              </h2>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">
                    Tên quy tắc *
                  </label>
                  <input
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={editingRule.name}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Nông sản
                  </label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={editingRule.fruitId}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        fruitId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn --</option>
                    {fruits.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.active}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          active: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    Kích hoạt
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">
                    Mô tả
                  </label>
                  <input
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={editingRule.description || ""}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Objects (virtual device slots) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Đối tượng thiết bị ({(editingRule.objects ?? []).length})
                  </label>
                  <button
                    onClick={() => {
                      const first = deviceTypes[0];
                      if (!first) return;
                      const newObj: PolicyObject = {
                        id: `OBJ-${uid()}`,
                        deviceTypeId: first.id,
                        label: `${first.name} ${(editingRule.objects ?? []).length + 1}`,
                      };
                      setEditingRule({
                        ...editingRule,
                        objects: [...(editingRule.objects ?? []), newObj],
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> Thêm đối tượng
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingRule.objects ?? []).map((obj, oi) => (
                    <div
                      key={obj.id}
                      className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100"
                    >
                      <input
                        className="border rounded-lg px-2 py-1 text-xs flex-1"
                        placeholder="Nhãn"
                        value={obj.label}
                        onChange={(e) => {
                          const objs = [...(editingRule.objects ?? [])];
                          objs[oi] = { ...obj, label: e.target.value };
                          setEditingRule({ ...editingRule, objects: objs });
                        }}
                      />
                      <select
                        className="border rounded-lg px-2 py-1 text-xs flex-1"
                        value={obj.deviceTypeId}
                        onChange={(e) => {
                          const objs = [...(editingRule.objects ?? [])];
                          objs[oi] = { ...obj, deviceTypeId: e.target.value };
                          setEditingRule({ ...editingRule, objects: objs });
                        }}
                      >
                        {deviceTypes.map((dt) => (
                          <option key={dt.id} value={dt.id}>
                            {dt.name} ({dt.category})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const objs = (editingRule.objects ?? []).filter(
                            (_, j) => j !== oi,
                          );
                          // Also remove conditions/actions referencing this object in all pairs
                          const pairs = editingRule.pairs.map((p) => ({
                            ...p,
                            conditions: p.conditions.filter(
                              (c) => c.objectId !== obj.id,
                            ),
                            actions: p.actions.filter(
                              (a) => a.objectId !== obj.id,
                            ),
                          }));
                          setEditingRule({
                            ...editingRule,
                            objects: objs,
                            pairs,
                          });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Condition-Action Pairs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-xs text-slate-500"
                    style={{ fontWeight: 600 }}
                  >
                    Cặp Điều kiện → Hành động ({editingRule.pairs.length})
                  </label>
                  <button
                    onClick={addPair}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> Thêm cặp
                  </button>
                </div>
                <div className="space-y-3">
                  {editingRule.pairs.map((pair, idx) => (
                    <div
                      key={pair.id}
                      className="bg-slate-50 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p
                          className="text-xs text-slate-600"
                          style={{ fontWeight: 600 }}
                        >
                          Cặp {idx + 1}
                        </p>
                        <button
                          onClick={() => removePair(idx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1 font-semibold">
                          Tên cặp
                        </p>
                        <input
                          type="text"
                          placeholder="Nhập tên mô tả cặp điều kiện..."
                          value={pair.name ?? ""}
                          onChange={(e) =>
                            updatePair(idx, { ...pair, name: e.target.value })
                          }
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-amber-600 mb-1.5 flex items-center gap-1 font-semibold">
                            <AlertTriangle size={10} /> Điều kiện (AND)
                          </p>
                          <ConditionEditor
                            conditions={pair.conditions}
                            onChange={(c) =>
                              updatePair(idx, { ...pair, conditions: c })
                            }
                            objects={editingRule.objects ?? []}
                            allDeviceTypes={deviceTypes}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 mb-1.5 flex items-center gap-1 font-semibold">
                            <Zap size={10} /> Hành động
                          </p>
                          <ActionEditor
                            actions={pair.actions}
                            onChange={(a) =>
                              updatePair(idx, { ...pair, actions: a })
                            }
                            objects={editingRule.objects ?? []}
                            allDeviceTypes={deviceTypes}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={saveRule}
                disabled={!editingRule.name.trim() || isSaving}
                className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  fontWeight: 600,
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {isSaving ? "Đang lưu..." : "Lưu"}
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
        onConfirm={() => {
          confirmDialog.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

// â”€â”€â”€ Phase Editor sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PhaseEditor({
  index,
  phase,
  objects,
  allDeviceTypes,
  onChange,
  onRemove,
}: {
  index: number;
  phase: SchedulePhase;
  objects: PolicyObject[];
  allDeviceTypes: DeviceTypeModel[];
  onChange: (p: SchedulePhase) => void;
  onRemove: () => void;
}) {
  // offset unit for editing convenience
  const [offsetUnit, setOffsetUnit] = useState<"seconds" | "minutes" | "hours">(
    phase.offsetSeconds >= 3600
      ? "hours"
      : phase.offsetSeconds >= 60
        ? "minutes"
        : "seconds",
  );

  const displayValue =
    offsetUnit === "hours"
      ? phase.offsetSeconds / 3600
      : offsetUnit === "minutes"
        ? phase.offsetSeconds / 60
        : phase.offsetSeconds;

  const setOffset = (val: number) => {
    const seconds =
      offsetUnit === "hours"
        ? val * 3600
        : offsetUnit === "minutes"
          ? val * 60
          : val;
    onChange({ ...phase, offsetSeconds: Math.max(0, Math.round(seconds)) });
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          <input
            className="border rounded-lg px-2 py-1 text-sm w-40"
            value={phase.name}
            placeholder="Thời gian"
            onChange={(e) => onChange({ ...phase, name: e.target.value })}
          />
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Offset */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500">Thời gian:</span>
        <input
          type="number"
          className="border rounded-lg px-2 py-1 text-xs w-20"
          value={displayValue}
          min={0}
          step={offsetUnit === "hours" ? 0.5 : 1}
          onChange={(e) => setOffset(Number(e.target.value))}
        />
        <select
          className="border rounded-lg px-2 py-1 text-xs"
          value={offsetUnit}
          onChange={(e) => {
            const newUnit = e.target.value as typeof offsetUnit;
            setOffsetUnit(newUnit);
          }}
        >
          <option value="seconds">giây</option>
          <option value="minutes">phút</option>
          <option value="hours">giờ</option>
        </select>
        <span className="text-xs text-slate-400">sau khi bắt đầu</span>
      </div>

      {/* Actions */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5 font-semibold flex items-center gap-1">
          <Zap size={10} /> Hành động
        </p>
        <ActionEditor
          actions={phase.actions}
          onChange={(a) => onChange({ ...phase, actions: a })}
          objects={objects}
          allDeviceTypes={allDeviceTypes}
        />
      </div>
    </div>
  );
}
