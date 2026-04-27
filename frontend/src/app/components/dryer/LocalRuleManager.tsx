import { useState } from "react";
import type {
  AlertRule,
  PolicyObject,
  Device,
  DeviceTypeModel,
} from "../../data/mockData";
import type { LocalRuleData } from "../../api/controlApi";
import {
  apiCreateLocalRule,
  apiUpdateLocalRule,
  apiDeleteLocalRule,
  apiGetLocalRules,
} from "../../api/controlApi";
import {
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
} from "lucide-react";

/* ── Create / Edit Modal ─────────────────────────────────────── */
function RuleModal({
  alertRules,
  devices,
  deviceTypes,
  existing,
  onSave,
  onClose,
}: {
  alertRules: AlertRule[];
  devices: Device[];
  deviceTypes: DeviceTypeModel[];
  existing?: LocalRuleData | null;
  onSave: (data: {
    name: string;
    rule_id: number;
    mappings: { rule_virtual_device_id: number; device_id: string }[];
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    existing?.rule_id?.toString() ?? "",
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    if (existing?.mappings) {
      for (const mp of existing.mappings) {
        m[String(mp.rule_virtual_device_id)] = mp.device_id;
      }
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const globalRule = alertRules.find((r) => r.id === selectedRuleId);
  const virtualDevices: PolicyObject[] = globalRule?.objects ?? [];

  const handleRuleChange = (id: string) => {
    setSelectedRuleId(id);
    setMappings({});
    if (!name) {
      const r = alertRules.find((r) => r.id === id);
      if (r) setName(r.name);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Cần nhập tên");
      return;
    }
    if (!selectedRuleId) {
      setError("Cần chọn quy tắc");
      return;
    }
    for (const vd of virtualDevices) {
      if (!mappings[vd.id]) {
        setError(`Chưa ánh xạ thiết bị cho "${vd.label}"`);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        rule_id: parseInt(selectedRuleId),
        mappings: virtualDevices.map((vd) => ({
          rule_virtual_device_id: parseInt(vd.id),
          device_id: mappings[vd.id] || "",
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const devicesForType = (typeId: string) =>
    devices.filter((d) => d.deviceTypeId === typeId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-slate-900 font-bold">
            {existing ? "Sửa quy tắc cục bộ" : "Tạo quy tắc cục bộ"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 block mb-1 font-medium">
            Tên
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Tên quy tắc cục bộ"
          />
        </div>

        {/* Global rule selection */}
        {!existing && (
          <div className="mb-4">
            <label className="text-sm text-slate-600 block mb-1 font-medium">
              Chọn quy tắc toàn cục
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => handleRuleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">-- Chọn --</option>
              {alertRules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rule info */}
        {globalRule && (
          <div className="mb-4 bg-purple-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-purple-600 font-semibold">
              {globalRule.pairs.length} cặp điều kiện-hành động ·{" "}
              {virtualDevices.length} thiết bị ảo
            </p>
            {globalRule.pairs.map((pair) => (
              <div key={pair.id} className="text-xs text-purple-700">
                <span className="font-medium">
                  {pair.name || `Cặp ${pair.id}`}
                </span>
                <span className="text-purple-400 ml-1">
                  · {pair.conditions.length} điều kiện, {pair.actions.length}{" "}
                  hành động
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Device mapping */}
        {virtualDevices.length > 0 && (
          <div className="mb-4">
            <label className="text-sm text-slate-600 block mb-2 font-medium">
              Ánh xạ thiết bị ảo → thật
            </label>
            <div className="space-y-2">
              {virtualDevices.map((vd) => {
                const dtName =
                  deviceTypes.find((t) => t.id === vd.deviceTypeId)?.name ??
                  vd.deviceTypeId;
                const options = devicesForType(vd.deviceTypeId);
                return (
                  <div
                    key={vd.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 font-semibold truncate">
                        {vd.label}
                      </p>
                      <p className="text-xs text-slate-400">{dtName}</p>
                    </div>
                    <span className="text-xs text-slate-400">→</span>
                    <select
                      value={mappings[vd.id] || ""}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [vd.id]: e.target.value,
                        }))
                      }
                      className="w-48 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">-- Chọn --</option>
                      {options.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.id})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : existing ? "Cập nhật" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible detail row ─────────────────────────────────── */
function RuleDetailRow({
  lr,
  globalRule,
  deviceTypes,
  devices,
}: {
  lr: LocalRuleData;
  globalRule?: AlertRule;
  deviceTypes: DeviceTypeModel[];
  devices: Device[];
}) {
  const [open, setOpen] = useState(false);
  const mappingMap = new Map(
    (lr.mappings ?? []).map((m) => [
      String(m.rule_virtual_device_id),
      m.device_id,
    ]),
  );

  const resolveDeviceName = (virtualDeviceId: string) => {
    const realId = mappingMap.get(virtualDeviceId);
    const dev = devices.find((d) => d.id === realId);
    return dev ? dev.name : (realId ?? "?");
  };

  return (
    <div className="bg-purple-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2.5 text-xs text-left hover:bg-purple-100 transition-colors"
      >
        {open ? (
          <ChevronDown size={12} className="text-purple-500" />
        ) : (
          <ChevronRight size={12} className="text-purple-500" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-purple-700 font-semibold truncate">{lr.name}</p>
          <p className="text-purple-400 truncate">
            {lr.rule_name ?? `Rule #${lr.rule_id}`}
          </p>
        </div>
      </button>
      {open && globalRule && (
        <div className="px-3 pb-3 space-y-2 border-t border-purple-100">
          {/* Virtual→Real device mappings */}
          <div className="mt-2">
            <p className="text-xs text-purple-600 font-semibold mb-1">
              Ánh xạ thiết bị:
            </p>
            {globalRule.objects.map((vd) => (
              <div
                key={vd.id}
                className="flex items-center gap-2 text-xs text-purple-700 py-0.5"
              >
                <span className="text-purple-400">{vd.label}</span>
                <span className="text-purple-300">→</span>
                <span className="font-medium">{resolveDeviceName(vd.id)}</span>
              </div>
            ))}
          </div>
          {/* Condition-Action pairs */}
          <div>
            <p className="text-xs text-purple-600 font-semibold mb-1">
              Cặp điều kiện-hành động:
            </p>
            {globalRule.pairs.map((pair) => (
              <div
                key={pair.id}
                className="text-xs text-purple-700 py-0.5 ml-2"
              >
                <span className="font-medium">
                  {pair.name || `Cặp ${pair.id}`}
                </span>
                <div className="ml-2 text-purple-500">
                  {pair.conditions.map((c, ci) => {
                    const vd = globalRule.objects.find(
                      (o) => o.id === c.objectId,
                    );
                    return (
                      <span key={ci} className="block">
                        NẾU {vd ? resolveDeviceName(vd.id) : c.objectId}{" "}
                        {c.operator} {c.value}
                      </span>
                    );
                  })}
                  {pair.actions.map((a, ai) => {
                    const vd = globalRule.objects.find(
                      (o) => o.id === a.objectId,
                    );
                    return (
                      <span key={ai} className="block text-purple-600">
                        → {vd ? resolveDeviceName(vd.id) : a.objectId} ={" "}
                        {a.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function LocalRuleManager({
  dryerId,
  alertRules,
  devices,
  deviceTypes,
  localRules,
  setLocalRules,
  disabled,
}: {
  dryerId: string;
  alertRules: AlertRule[];
  devices: Device[];
  deviceTypes: DeviceTypeModel[];
  localRules: LocalRuleData[];
  setLocalRules: React.Dispatch<React.SetStateAction<LocalRuleData[]>>;
  disabled: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LocalRuleData | null>(null);

  const refreshList = async () => {
    try {
      const list = await apiGetLocalRules(dryerId);
      setLocalRules(list);
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async (data: {
    name: string;
    rule_id: number;
    mappings: { rule_virtual_device_id: number; device_id: string }[];
  }) => {
    await apiCreateLocalRule(dryerId, data);
    await refreshList();
  };

  const handleUpdate = async (data: {
    name: string;
    rule_id: number;
    mappings: { rule_virtual_device_id: number; device_id: string }[];
  }) => {
    if (!editing) return;
    await apiUpdateLocalRule(dryerId, editing.id, {
      name: data.name,
      mappings: data.mappings,
    });
    await refreshList();
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDeleteLocalRule(dryerId, id);
      setLocalRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("[rule/delete]", err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-slate-700 font-bold flex items-center gap-2">
          <AlertTriangle size={14} className="text-purple-600" />
          Quy tắc cục bộ ({localRules.length})
        </h3>
        {!disabled && (
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
            title="Thêm quy tắc"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {localRules.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Chưa có quy tắc nào
        </p>
      ) : (
        <div className="space-y-1.5">
          {localRules.map((lr) => {
            const globalR = alertRules.find((r) => r.id === String(lr.rule_id));
            return (
              <div key={lr.id} className="relative group">
                <RuleDetailRow
                  lr={lr}
                  globalRule={globalR}
                  deviceTypes={deviceTypes}
                  devices={devices}
                />
                {!disabled && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditing(lr);
                        setShowModal(true);
                      }}
                      className="p-1 rounded text-purple-400 hover:text-purple-600 hover:bg-purple-100"
                      title="Sửa"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(lr.id)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <RuleModal
          alertRules={alertRules}
          devices={devices}
          deviceTypes={deviceTypes}
          existing={editing}
          onSave={editing ? handleUpdate : handleCreate}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
