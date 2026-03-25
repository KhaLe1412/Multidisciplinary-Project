import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  AlertRule,
  AlertConditionActionPair,
  AlertCondition,
  AlertOperator,
  PolicyAction,
  PolicyObject,
  DeviceTypeModel,
  buildActionsDesc,
} from "../data/mockData";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Shield,
  Bell,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from "lucide-react";

/* â”€â”€â”€ uid helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let _uid = 0;
const uid = () => `${Date.now()}-${++_uid}`;

/* â”€â”€â”€ operator labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const operatorLabels: Record<AlertOperator, string> = {
  ">": ">",
  "<": "<",
  "=": "=",
  ">=": ">=",
  "<=": "<=",
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â”€â”€â”€ MAIN COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function AlertsPage() {
  const {
    alertRules,
    setAlertRules,
    systemAlerts,
    setSystemAlerts,
    deviceTypes,
    fruits,
    currentUser,
    addLog,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"rules" | "triggered">("rules");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "resolved">(
    "all",
  );

  const canEdit =
    currentUser?.role === "admin" || currentUser?.permissions?.policy;

  /* â”€â”€â”€ empty rule factory â”€â”€â”€ */
  const emptyRule = (): AlertRule => ({
    id: "",
    name: "",
    description: "",
    fruitId: fruits[0]?.id || "",
    objects: [],
    pairs: [],
    createdAt: new Date().toISOString(),
    active: true,
  });

  /* â”€â”€â”€ CRUD â”€â”€â”€ */
  const saveRule = () => {
    if (!editingRule || !editingRule.name.trim()) return;
    if (editingRule.id) {
      setAlertRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? editingRule : r)),
      );
    } else {
      const ns = {
        ...editingRule,
        id: `ALR-${uid()}`,
        createdAt: new Date().toISOString(),
      };
      setAlertRules((prev) => [...prev, ns]);
    }
    addLog({
      eventType: "policy_management",
      time: new Date().toISOString(),
      user: currentUser!.name,
      description: `${editingRule.id ? "Cập nhật" : "Tạo"} quy tắc cảnh báo: ${editingRule.name}`,
      severity: "info",
    });
    setEditingRule(null);
  };

  const deleteRule = (id: string, name: string) => {
    setConfirmDialog({ open: true, id, name });
  };

  const confirmDeleteRule = () => {
    setAlertRules((prev) => prev.filter((r) => r.id !== confirmDialog.id));
    addLog({
      eventType: "policy_management",
      time: new Date().toISOString(),
      user: currentUser!.name,
      description: `Xóa quy tắc cảnh báo: ${confirmDialog.name}`,
      severity: "warning",
    });
    setConfirmDialog({ open: false, id: "", name: "" });
  };

  const resolveAlert = (id: string) => {
    setSystemAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    );
  };

  const filteredAlerts = systemAlerts.filter((a) =>
    alertFilter === "all"
      ? true
      : alertFilter === "active"
        ? !a.resolved
        : a.resolved,
  );
  const unresolvedCount = systemAlerts.filter((a) => !a.resolved).length;

  /* helpers for pair editing */
  const addPair = () => {
    if (!editingRule) return;
    const newPair: AlertConditionActionPair = {
      id: `AP-${uid()}`,
      conditions: [],
      actions: [],
    };
    setEditingRule({
      ...editingRule,
      pairs: [...editingRule.pairs, newPair],
    });
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

  /* sensor labels for triggered alerts */
  const sensorLabels: Record<string, string> = {
    temperature: "Nhiá»‡t Ä‘á»™",
    humidity: "Äá»™ áº©m",
  };
  const sensorUnits: Record<string, string> = {
    temperature: "Â°C",
    humidity: "%",
  };
  const sensorColors: Record<string, string> = {
    temperature: "#f97316",
    humidity: "#3b82f6",
  };

  /* â•â•â• RENDER â•â•â• */
  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-slate-900 mb-1"
            style={{ fontWeight: 700 }}
          >
            Quản lý cảnh báo
          </h1>
          <p className="text-slate-500 text-sm">
            Thiết lập ngưỡng giới hạn và xem các cảnh báo hệ thống
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditingRule(emptyRule())}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
            style={{
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              fontWeight: 600,
            }}
          >
            <Plus size={16} /> Tạo quy tắc mới
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Tổng quy tắc",
            value: alertRules.length,
            icon: Shield,
            color: "#3b82f6",
            bg: "#eff6ff",
          },
          {
            label: "Đang hoạt động",
            value: alertRules.filter((r) => r.active).length,
            icon: ShieldCheck,
            color: "#22c55e",
            bg: "#f0fdf4",
          },
          {
            label: "Cảnh báo chưa xử lý",
            value: unresolvedCount,
            icon: ShieldAlert,
            color: "#ef4444",
            bg: "#fef2f2",
          },
          {
            label: "Tổng cảnh báo",
            value: systemAlerts.length,
            icon: Bell,
            color: "#f97316",
            bg: "#fff7ed",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{s.label}</p>
                <p
                  className="text-2xl"
                  style={{ fontWeight: 700, color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: "rules", label: "Quy tắc cảnh báo" },
          {
            key: "triggered",
            label: `Cảnh báo hệ thống${unresolvedCount > 0 ? ` (${unresolvedCount})` : ""}`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            style={{ fontWeight: activeTab === t.key ? 600 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== RULES TAB ===== */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {alertRules.map((rule) => {
            const isExpanded = expandedId === rule.id;
            const fruitName = fruits.find((f) => f.id === rule.fruitId)?.name;
            return (
              <div
                key={rule.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:border-slate-200 hover:shadow-md"
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedId((prev) => (prev === rule.id ? null : rule.id))
                  }
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.active ? "bg-red-100" : "bg-slate-100"}`}
                  >
                    <Shield
                      size={20}
                      className={
                        rule.active ? "text-red-500" : "text-slate-400"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm text-slate-900"
                        style={{ fontWeight: 600 }}
                      >
                        {rule.name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${rule.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {rule.active ? "Đang hoạt động" : "Tắt"}
                      </span>
                      {fruitName && (
                        <span className="text-xs text-slate-400">
                          🍎 {fruitName}
                        </span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {rule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {(rule.objects ?? []).length} đối tượng ·{" "}
                        {rule.pairs.length} cặp ĐK→HĐ
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canEdit && (
                      <>
                        <button
                          onClick={() =>
                            setEditingRule(JSON.parse(JSON.stringify(rule)))
                          }
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          title="Sửa"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id, rule.name)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId((prev) =>
                          prev === rule.id ? null : rule.id,
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

                {/* â”€â”€ Expanded rule detail â”€â”€ */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
                    {/* Objects list */}
                    {(rule.objects ?? []).length > 0 && (
                      <div>
                        <p
                          className="text-xs text-slate-500 mb-2"
                          style={{ fontWeight: 600 }}
                        >
                          ĐỐI TƯỢNG THIẾT BỊ
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(rule.objects ?? []).map((obj) => {
                            const dt = deviceTypes.find(
                              (t) => t.id === obj.deviceTypeId,
                            );
                            return (
                              <span
                                key={obj.id}
                                className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1"
                              >
                                <span className="text-slate-400 font-mono">
                                  {obj.id}
                                </span>
                                <span className="text-slate-700 font-medium">
                                  {obj.label}
                                </span>
                                <span className="text-slate-400">
                                  ({dt?.name || obj.deviceTypeId})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Conditionâ†’Action pairs */}
                    {rule.pairs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">
                        Không có cặp điều kiện → hành động
                      </p>
                    ) : (
                      rule.pairs.map((pair, pi) => (
                        <div
                          key={pair.id}
                          className="bg-white rounded-lg border border-slate-100 p-3"
                        >
                          <p
                            className="text-xs text-slate-500 mb-2"
                            style={{ fontWeight: 600 }}
                          >
                            Cặp {pi + 1}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                                <AlertTriangle size={10} /> Điều kiện
                              </p>
                              <div className="space-y-1">
                                {pair.conditions.map((c, ci) => {
                                  const obj = (rule.objects ?? []).find(
                                    (o) => o.id === c.objectId,
                                  );
                                  const dt = obj
                                    ? deviceTypes.find(
                                        (t) => t.id === obj.deviceTypeId,
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
                                      {obj?.label || c.objectId}{" "}
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
                                  rule.objects ?? [],
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

          {alertRules.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Shield size={40} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có quy tắc cảnh báo nào</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TRIGGERED ALERTS TAB ===== */}
      {activeTab === "triggered" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {[
              { key: "all", label: "Tất cả" },
              { key: "active", label: `Chưa xử lý (${unresolvedCount})` },
              { key: "resolved", label: "Đã xử lý" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setAlertFilter(f.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${alertFilter === f.key ? "bg-red-500 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"}`}
                style={{ fontWeight: alertFilter === f.key ? 600 : 400 }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const unit = sensorUnits[alert.sensorType] || "";
              const color = sensorColors[alert.sensorType] || "#666";
              const isAbove = alert.direction === "above_max";
              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 transition-all cursor-default ${
                    alert.resolved
                      ? "border-slate-100 opacity-75 hover:opacity-100 hover:border-slate-300 hover:shadow-sm"
                      : "border-red-200 hover:border-red-400 hover:shadow-md hover:bg-red-50/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.resolved ? "bg-slate-100" : "bg-red-100"}`}
                      >
                        <AlertTriangle
                          size={20}
                          className={
                            alert.resolved ? "text-slate-400" : "text-red-500"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className="text-sm text-slate-900"
                            style={{ fontWeight: 600 }}
                          >
                            {alert.dryerName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{
                              background: isAbove ? "#ef4444" : "#3b82f6",
                              fontWeight: 600,
                            }}
                          >
                            {sensorLabels[alert.sensorType]}{" "}
                            {isAbove
                              ? "vượt ngưỡng trên"
                              : "dưới ngưỡng dưới"}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${alert.resolved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            style={{ fontWeight: 500 }}
                          >
                            {alert.resolved ? "Đã xử lý" : "Chưa xử lý"}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color }}>
                          Giá trị:{" "}
                          <strong>
                            {alert.value}
                            {unit}
                          </strong>
                          <span className="text-slate-400 mx-2">|</span>
                          Ngưỡng:{" "}
                          <strong>
                            {alert.threshold}
                            {unit}
                          </strong>
                        </p>
                        {alert.actionTaken && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Zap size={12} className="text-amber-500" />
                            Đã thực hiện: {alert.actionTaken}
                          </p>
                        )}
                        {alert.ruleName && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Shield size={11} /> Quy tắc: {alert.ruleName}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(alert.time).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors flex-shrink-0"
                        style={{ fontWeight: 600 }}
                      >
                        <Check size={12} /> Đánh dấu xử lý
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Bell size={40} className="mx-auto mb-3 opacity-30" />
                <p>Không có cảnh báo nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ――― EDIT / CREATE RULE MODAL ――― */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2
                className="text-lg text-slate-900"
                style={{ fontWeight: 700 }}
              >
                {editingRule.id
                  ? "Sửa quy tắc"
                  : "Thêm quy tắc cảnh báo"}
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
                    Đối tượng thiết bị (
                    {(editingRule.objects ?? []).length})
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
                    <Plus size={12} /> ThÃªm Ä‘á»‘i tÆ°á»£ng
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
                        placeholder="NhÃ£n"
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
                    Cáº·p Äiá»u kiá»‡n â†’ HÃ nh Ä‘á»™ng (
                    {editingRule.pairs.length})
                  </label>
                  <button
                    onClick={addPair}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> ThÃªm cáº·p
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
                          Cáº·p {idx + 1}
                        </p>
                        <button
                          onClick={() => removePair(idx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-amber-600 mb-1.5 flex items-center gap-1 font-semibold">
                            <AlertTriangle size={10} /> Äiá»u kiá»‡n (AND)
                          </p>
                          <InlineConditionEditor
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
                            <Zap size={10} /> HÃ nh Ä‘á»™ng
                          </p>
                          <InlineActionEditor
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
                Há»§y
              </button>
              <button
                onClick={saveRule}
                disabled={!editingRule.name.trim()}
                className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  fontWeight: 600,
                }}
              >
                <Check size={14} /> LÆ°u
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title="XÃ³a quy táº¯c cáº£nh bÃ¡o"
        message={`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a quy táº¯c "${confirmDialog.name}"?`}
        confirmLabel="XÃ³a"
        onConfirm={confirmDeleteRule}
        onCancel={() => setConfirmDialog({ open: false, id: "", name: "" })}
      />
    </div>
  );
}

/* â”€â”€â”€ Inline Condition Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function InlineConditionEditor({
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
          <Plus size={12} /> ThÃªm Ä‘iá»u kiá»‡n
        </button>
      )}
    </div>
  );
}

/* â”€â”€â”€ Inline Action Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function InlineActionEditor({
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
    return dt?.category === "actuator";
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
                <option value={1}>Báº­t</option>
                <option value={0}>Táº¯t</option>
              </select>
            ) : dt?.unit === "text" ? (
              <input
                type="text"
                className="border rounded-lg px-2 py-1 text-xs flex-1"
                value={String(a.value)}
                placeholder="Ná»™i dung LCD..."
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
          <Plus size={12} /> ThÃªm hÃ nh Ä‘á»™ng
        </button>
      )}
    </div>
  );
}
