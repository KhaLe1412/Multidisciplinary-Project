import { useState } from "react";
import type {
  Schedule,
  PolicyObject,
  Device,
  DeviceTypeModel,
} from "../../data/mockData";
import type { LocalScheduleData } from "../../api/controlApi";
import {
  apiCreateLocalSchedule,
  apiUpdateLocalSchedule,
  apiDeleteLocalSchedule,
  apiGetLocalSchedules,
} from "../../api/controlApi";
import {
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
  Check,
} from "lucide-react";

/* ── Create / Edit Modal ─────────────────────────────────────── */
function ScheduleModal({
  schedules,
  devices,
  deviceTypes,
  existing,
  onSave,
  onClose,
}: {
  schedules: Schedule[];
  devices: Device[];
  deviceTypes: DeviceTypeModel[];
  existing?: LocalScheduleData | null;
  onSave: (data: {
    name: string;
    schedule_id: number;
    mappings: { schedule_virtual_device_id: number; device_id: string }[];
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    existing?.schedule_id?.toString() ?? "",
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    if (existing?.mappings) {
      for (const mp of existing.mappings) {
        m[String(mp.schedule_virtual_device_id)] = mp.device_id;
      }
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const globalSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const virtualDevices: PolicyObject[] = globalSchedule?.objects ?? [];

  const handleScheduleChange = (id: string) => {
    setSelectedScheduleId(id);
    setMappings({});
    if (!name) {
      const sch = schedules.find((s) => s.id === id);
      if (sch) setName(sch.name);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Cần nhập tên");
      return;
    }
    if (!selectedScheduleId) {
      setError("Cần chọn lịch trình");
      return;
    }
    // check all virtual devices mapped
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
        schedule_id: parseInt(selectedScheduleId),
        mappings: virtualDevices.map((vd) => ({
          schedule_virtual_device_id: parseInt(vd.id),
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
            {existing ? "Sửa lịch trình cục bộ" : "Tạo lịch trình cục bộ"}
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
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tên lịch trình cục bộ"
          />
        </div>

        {/* Global schedule selection */}
        {!existing && (
          <div className="mb-4">
            <label className="text-sm text-slate-600 block mb-1 font-medium">
              Chọn lịch trình toàn cục
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => handleScheduleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Chọn --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Schedule info */}
        {globalSchedule && (
          <div className="mb-4 bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-blue-600 font-semibold">
              {globalSchedule.phases.length} giai đoạn · {virtualDevices.length}{" "}
              thiết bị ảo
            </p>
            {globalSchedule.phases.map((ph) => (
              <div key={ph.id} className="text-xs text-blue-700">
                <span className="font-medium">{ph.name}</span>
                <span className="text-blue-400 ml-1">
                  (offset: {ph.offsetSeconds}s)
                </span>
                {ph.actions.length > 0 && (
                  <span className="text-blue-500 ml-1">
                    · {ph.actions.length} hành động
                  </span>
                )}
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
                      className="w-48 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : existing ? "Cập nhật" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible detail row ─────────────────────────────────── */
function ScheduleDetailRow({
  ls,
  globalSchedule,
  deviceTypes,
  devices,
}: {
  ls: LocalScheduleData;
  globalSchedule?: Schedule;
  deviceTypes: DeviceTypeModel[];
  devices: Device[];
}) {
  const [open, setOpen] = useState(false);
  const mappingMap = new Map(
    (ls.mappings ?? []).map((m) => [
      String(m.schedule_virtual_device_id),
      m.device_id,
    ]),
  );

  const resolveDeviceName = (virtualDeviceId: string) => {
    const realId = mappingMap.get(virtualDeviceId);
    const dev = devices.find((d) => d.id === realId);
    return dev ? dev.name : (realId ?? "?");
  };

  return (
    <div className="bg-blue-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2.5 text-xs text-left hover:bg-blue-100 transition-colors"
      >
        {open ? (
          <ChevronDown size={12} className="text-blue-500" />
        ) : (
          <ChevronRight size={12} className="text-blue-500" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-blue-700 font-semibold truncate">{ls.name}</p>
          <p className="text-blue-400 truncate">
            {ls.schedule_name ?? `Schedule #${ls.schedule_id}`}
          </p>
        </div>
      </button>
      {open && globalSchedule && (
        <div className="px-3 pb-3 space-y-2 border-t border-blue-100">
          {/* Virtual→Real device mappings */}
          <div className="mt-2">
            <p className="text-xs text-blue-600 font-semibold mb-1">
              Ánh xạ thiết bị:
            </p>
            {globalSchedule.objects.map((vd) => (
              <div
                key={vd.id}
                className="flex items-center gap-2 text-xs text-blue-700 py-0.5"
              >
                <span className="text-blue-400">{vd.label}</span>
                <span className="text-blue-300">→</span>
                <span className="font-medium">{resolveDeviceName(vd.id)}</span>
              </div>
            ))}
          </div>
          {/* Phases */}
          <div>
            <p className="text-xs text-blue-600 font-semibold mb-1">
              Giai đoạn:
            </p>
            {globalSchedule.phases.map((ph) => (
              <div key={ph.id} className="text-xs text-blue-700 py-0.5">
                <span className="font-medium">{ph.name}</span>
                <span className="text-blue-400 ml-1">
                  (+{ph.offsetSeconds}s)
                </span>
                {ph.actions.map((a, ai) => {
                  const vd = globalSchedule.objects.find(
                    (o) => o.id === a.objectId,
                  );
                  return (
                    <span key={ai} className="ml-2 text-blue-500">
                      {vd ? resolveDeviceName(vd.id) : a.objectId} = {a.value}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function LocalScheduleManager({
  dryerId,
  schedules,
  devices,
  deviceTypes,
  localSchedules,
  setLocalSchedules,
  disabled,
}: {
  dryerId: string;
  schedules: Schedule[];
  devices: Device[];
  deviceTypes: DeviceTypeModel[];
  localSchedules: LocalScheduleData[];
  setLocalSchedules: React.Dispatch<React.SetStateAction<LocalScheduleData[]>>;
  disabled: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LocalScheduleData | null>(null);

  const refreshList = async () => {
    try {
      const list = await apiGetLocalSchedules(dryerId);
      setLocalSchedules(list);
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async (data: {
    name: string;
    schedule_id: number;
    mappings: { schedule_virtual_device_id: number; device_id: string }[];
  }) => {
    await apiCreateLocalSchedule(dryerId, data);
    await refreshList();
  };

  const handleUpdate = async (data: {
    name: string;
    schedule_id: number;
    mappings: { schedule_virtual_device_id: number; device_id: string }[];
  }) => {
    if (!editing) return;
    await apiUpdateLocalSchedule(dryerId, editing.id, {
      name: data.name,
      mappings: data.mappings,
    });
    await refreshList();
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDeleteLocalSchedule(dryerId, id);
      setLocalSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("[schedule/delete]", err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-slate-700 font-bold flex items-center gap-2">
          <Clock size={14} className="text-blue-600" />
          Lịch trình cục bộ ({localSchedules.length})
        </h3>
        {!disabled && (
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
            title="Thêm lịch trình"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {localSchedules.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Chưa có lịch trình nào
        </p>
      ) : (
        <div className="space-y-1.5">
          {localSchedules.map((ls) => {
            const globalSch = schedules.find(
              (s) => s.id === String(ls.schedule_id),
            );
            return (
              <div key={ls.id} className="relative group">
                <ScheduleDetailRow
                  ls={ls}
                  globalSchedule={globalSch}
                  deviceTypes={deviceTypes}
                  devices={devices}
                />
                {!disabled && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditing(ls);
                        setShowModal(true);
                      }}
                      className="p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                      title="Sửa"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(ls.id)}
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
        <ScheduleModal
          schedules={schedules}
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
