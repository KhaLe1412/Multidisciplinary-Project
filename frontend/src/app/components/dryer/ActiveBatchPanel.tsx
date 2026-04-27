import { useState, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type {
  APIBatchScheduleQueueEntry,
  APIBatchRuleSetEntry,
  LocalScheduleData,
  LocalRuleData,
} from "../../api/controlApi";
import {
  apiAddBatchSchedules,
  apiRemoveBatchScheduleEntry,
  apiClearBatchSchedules,
  apiToggleBatchSchedules,
  apiAddBatchRules,
  apiRemoveBatchRule,
  apiToggleBatchRules,
} from "../../api/controlApi";
import {
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Square,
  GripVertical,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const DND_TYPES = {
  LIVE_SCHEDULE: "live_schedule",
  LIVE_RULE: "live_rule",
};

/* ── Sub: Add-to-batch item ──────────────────────────────────── */
function AddableItem({
  type,
  id,
  label,
  sublabel,
  colorCls,
  onAdd,
  disabled,
}: {
  type: string;
  id: number;
  label: string;
  sublabel?: string;
  colorCls: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type,
      item: { id },
      canDrag: !disabled,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [id, type, disabled],
  );

  return (
    <div
      ref={drag as any}
      className={`flex items-center gap-2 rounded-lg p-2 text-xs ${colorCls} ${
        isDragging ? "opacity-40" : ""
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-grab"}`}
    >
      <GripVertical size={12} className="opacity-40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{label}</p>
        {sublabel && <p className="opacity-60 truncate">{sublabel}</p>}
      </div>
      {!disabled && (
        <button
          onClick={onAdd}
          className="p-0.5 rounded hover:bg-white/30 flex-shrink-0"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Schedule queue drop zone ────────────────────────────────── */
function ScheduleDropZone({
  onDrop,
  children,
}: {
  onDrop: (localScheduleId: number) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DND_TYPES.LIVE_SCHEDULE,
      drop: (item: { id: number }) => onDrop(item.id),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [onDrop],
  );

  return (
    <div
      ref={drop as any}
      className={`min-h-[60px] rounded-lg border-2 border-dashed p-1.5 transition-colors space-y-1 ${
        isOver
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      {children}
    </div>
  );
}

/* ── Rule set drop zone ──────────────────────────────────────── */
function RuleDropZone({
  onDrop,
  children,
}: {
  onDrop: (localRuleId: number) => void;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DND_TYPES.LIVE_RULE,
      drop: (item: { id: number }) => onDrop(item.id),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [onDrop],
  );

  return (
    <div
      ref={drop as any}
      className={`min-h-[60px] rounded-lg border-2 border-dashed p-1.5 transition-colors space-y-1 ${
        isOver
          ? "border-purple-400 bg-purple-50"
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      {children}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function ActiveBatchPanel({
  batchId,
  batchScheduleQueue,
  batchRuleSet,
  batchSchedulesEnabled,
  batchRulesEnabled,
  localSchedules,
  localRules,
  onStop,
  onComplete,
}: {
  batchId: number;
  batchScheduleQueue: APIBatchScheduleQueueEntry[];
  batchRuleSet: APIBatchRuleSetEntry[];
  batchSchedulesEnabled: boolean;
  batchRulesEnabled: boolean;
  localSchedules: LocalScheduleData[];
  localRules: LocalRuleData[];
  onStop: () => void;
  onComplete: () => void;
}) {
  const [pendingChanges, setPendingChanges] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ── Live add schedule to batch ────────────────────────── */
  const handleAddSchedule = useCallback(
    async (localScheduleId: number) => {
      try {
        await apiAddBatchSchedules(batchId, [localScheduleId]);
        setPendingChanges(false);
      } catch (err) {
        console.error("[batch/addSchedule]", err);
      }
    },
    [batchId],
  );

  const handleRemoveScheduleEntry = useCallback(
    async (entryId: number) => {
      try {
        await apiRemoveBatchScheduleEntry(batchId, entryId);
        setPendingChanges(false);
      } catch (err) {
        console.error("[batch/removeSchedule]", err);
      }
    },
    [batchId],
  );

  const handleClearSchedules = useCallback(async () => {
    try {
      await apiClearBatchSchedules(batchId);
    } catch (err) {
      console.error("[batch/clearSchedules]", err);
    }
  }, [batchId]);

  const handleToggleSchedules = useCallback(
    async (enabled: boolean) => {
      try {
        await apiToggleBatchSchedules(batchId, enabled);
        // When disabling schedules, also clear the queue
        if (!enabled) {
          await apiClearBatchSchedules(batchId);
        }
      } catch (err) {
        console.error("[batch/toggleSchedules]", err);
      }
    },
    [batchId],
  );

  /* ── Live add rule to batch ────────────────────────────── */
  const handleAddRule = useCallback(
    async (localRuleId: number) => {
      const existing = batchRuleSet.some(
        (r) => r.local_rule_id === localRuleId,
      );
      if (existing) return;
      try {
        await apiAddBatchRules(batchId, [localRuleId]);
        setPendingChanges(false);
      } catch (err) {
        console.error("[batch/addRule]", err);
      }
    },
    [batchId, batchRuleSet],
  );

  const handleRemoveRule = useCallback(
    async (localRuleId: number) => {
      try {
        // API expects local_rule_id, not batch_rule_set row id
        await apiRemoveBatchRule(batchId, localRuleId);
        setPendingChanges(false);
      } catch (err) {
        console.error("[batch/removeRule]", err);
      }
    },
    [batchId],
  );

  const handleToggleRules = useCallback(
    async (enabled: boolean) => {
      try {
        await apiToggleBatchRules(batchId, enabled);
      } catch (err) {
        console.error("[batch/toggleRules]", err);
      }
    },
    [batchId],
  );

  const existingRuleIds = new Set(batchRuleSet.map((r) => r.local_rule_id));

  const statusLabel = (s: string) => {
    const map: Record<string, { text: string; cls: string }> = {
      pending: { text: "Chờ", cls: "bg-slate-100 text-slate-600" },
      running: { text: "Chạy", cls: "bg-green-100 text-green-700" },
      completed: { text: "Xong", cls: "bg-blue-100 text-blue-600" },
      cancelled: { text: "Hủy", cls: "bg-red-100 text-red-600" },
    };
    const info = map[s] ?? { text: s, cls: "bg-slate-100 text-slate-500" };
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${info.cls}`}
      >
        {info.text}
      </span>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-4">
        {/* ── Header: title + toggle buttons + action buttons ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm text-amber-800 font-bold mr-auto">
            Mẻ sấy đang chạy #{batchId}
          </h3>
          {/* Schedule toggle */}
          <button
            onClick={() => handleToggleSchedules(!batchSchedulesEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              batchSchedulesEnabled
                ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
            }`}
            title={batchSchedulesEnabled ? "Tắt lịch trình" : "Bật lịch trình"}
          >
            {batchSchedulesEnabled ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            Lịch trình
          </button>
          {/* Rule toggle */}
          <button
            onClick={() => handleToggleRules(!batchRulesEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              batchRulesEnabled
                ? "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
            }`}
            title={batchRulesEnabled ? "Tắt quy tắc" : "Bật quy tắc"}
          >
            {batchRulesEnabled ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            Quy tắc
          </button>
          <button
            onClick={onComplete}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
          >
            <Check size={12} /> Hoàn thành
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 flex items-center gap-1"
          >
            <Square size={12} /> Dừng
          </button>
        </div>

        {/* Schedule queue section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-600" />
              <span className="text-xs text-slate-700 font-bold">
                Hàng đợi lịch trình ({batchScheduleQueue.length})
              </span>
            </div>
            {batchSchedulesEnabled && (
              <button
                onClick={handleClearSchedules}
                className="text-xs text-red-400 hover:text-red-600"
                title="Xóa tất cả"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Available local schedules — disabled when schedule engine is off */}
            <div
              className={
                !batchSchedulesEnabled ? "opacity-40 pointer-events-none" : ""
              }
            >
              <p className="text-[10px] text-slate-500 font-semibold mb-1">
                {batchSchedulesEnabled
                  ? "Thêm vào hàng đợi"
                  : "Bật lịch trình để thêm"}
              </p>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {localSchedules.map((ls) => (
                  <AddableItem
                    key={ls.id}
                    type={DND_TYPES.LIVE_SCHEDULE}
                    id={ls.id}
                    label={ls.name}
                    sublabel={ls.schedule_name}
                    colorCls="bg-blue-50 text-blue-700"
                    onAdd={() => handleAddSchedule(ls.id)}
                    disabled={!batchSchedulesEnabled}
                  />
                ))}
              </div>
            </div>
            {/* Current queue */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold mb-1">
                Hàng đợi hiện tại
              </p>
              <ScheduleDropZone onDrop={handleAddSchedule}>
                {batchScheduleQueue.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg p-2 text-xs bg-blue-100 text-blue-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                      {entry.queue_order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {entry.local_schedule_name}
                      </p>
                      <p className="text-blue-500 truncate text-[10px]">
                        {entry.schedule_name}
                      </p>
                    </div>
                    {statusLabel(entry.status)}
                    {entry.status === "pending" && (
                      <button
                        onClick={() => handleRemoveScheduleEntry(entry.id)}
                        className="p-0.5 rounded hover:bg-blue-200 flex-shrink-0"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
                {batchScheduleQueue.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Kéo lịch trình vào đây
                  </p>
                )}
              </ScheduleDropZone>
            </div>
          </div>
        </div>

        {/* Rule set section */}
        <div className="space-y-2 border-t border-amber-200 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-purple-600" />
              <span className="text-xs text-slate-700 font-bold">
                Bộ quy tắc ({batchRuleSet.length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Available local rules */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold mb-1">
                Thêm quy tắc
              </p>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {localRules.map((lr) => {
                  const alreadyIn = existingRuleIds.has(lr.id);
                  return (
                    <AddableItem
                      key={lr.id}
                      type={DND_TYPES.LIVE_RULE}
                      id={lr.id}
                      label={lr.name}
                      sublabel={lr.rule_name}
                      colorCls={
                        alreadyIn
                          ? "bg-slate-100 text-slate-400"
                          : "bg-purple-50 text-purple-700"
                      }
                      onAdd={() => handleAddRule(lr.id)}
                      disabled={alreadyIn}
                    />
                  );
                })}
              </div>
            </div>
            {/* Current rule set */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold mb-1">
                Quy tắc hiện tại
              </p>
              <RuleDropZone onDrop={handleAddRule}>
                {batchRuleSet.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg p-2 text-xs bg-purple-100 text-purple-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                      {entry.priority_order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {entry.local_rule_name}
                      </p>
                      <p className="text-purple-500 truncate text-[10px]">
                        {entry.rule_name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveRule(entry.local_rule_id)}
                      className="p-0.5 rounded hover:bg-purple-200 flex-shrink-0"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {batchRuleSet.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Kéo quy tắc vào đây
                  </p>
                )}
              </RuleDropZone>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
