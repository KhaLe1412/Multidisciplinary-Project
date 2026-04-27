import { useState, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { LocalScheduleData, LocalRuleData } from "../../api/controlApi";
import type { Fruit } from "../../data/mockData";
import {
  Clock,
  AlertTriangle,
  Play,
  GripVertical,
  X,
  Plus,
} from "lucide-react";

const ITEM_TYPES = {
  SCHEDULE: "schedule",
  RULE: "rule",
  QUEUE_ITEM: "queue_item",
  RULESET_ITEM: "ruleset_item",
};

/* ── Draggable source item (available list) ──────────────────── */
function DragSourceItem({
  type,
  item,
  label,
  sublabel,
  colorCls,
  onAdd,
}: {
  type: string;
  item: { id: number };
  label: string;
  sublabel?: string;
  colorCls: string;
  onAdd: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type,
      item: { id: item.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [item.id, type],
  );

  return (
    <div
      ref={drag as any}
      className={`flex items-center gap-2 rounded-lg p-2 text-xs cursor-grab ${colorCls} ${isDragging ? "opacity-40" : ""}`}
    >
      <GripVertical size={12} className="opacity-40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{label}</p>
        {sublabel && <p className="opacity-60 truncate">{sublabel}</p>}
      </div>
      <button
        onClick={onAdd}
        className="p-0.5 rounded hover:bg-white/30 flex-shrink-0"
        title="Thêm"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

/* ── Draggable queue/ruleset item (reorderable) ──────────────── */
function SortableItem({
  type,
  index,
  label,
  sublabel,
  colorCls,
  onRemove,
  onMove,
}: {
  type: string;
  index: number;
  label: string;
  sublabel?: string;
  colorCls: string;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type,
      item: { index },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [index, type],
  );

  const [, drop] = useDrop(
    () => ({
      accept: type,
      hover: (draggedItem: { index: number }) => {
        if (draggedItem.index !== index) {
          onMove(draggedItem.index, index);
          draggedItem.index = index;
        }
      },
    }),
    [index, type, onMove],
  );

  return (
    <div
      ref={(node) => {
        drag(drop(node));
      }}
      className={`flex items-center gap-2 rounded-lg p-2 text-xs cursor-grab ${colorCls} ${isDragging ? "opacity-40" : ""}`}
    >
      <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
        {index + 1}
      </span>
      <GripVertical size={12} className="opacity-40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{label}</p>
        {sublabel && <p className="opacity-60 truncate">{sublabel}</p>}
      </div>
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-white/30 flex-shrink-0"
        title="Xóa"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/* ── Drop zone for receiving new items ───────────────────────── */
function DropZone({
  acceptType,
  onDrop,
  children,
  emptyText,
}: {
  acceptType: string;
  onDrop: (id: number) => void;
  children: React.ReactNode;
  emptyText: string;
}) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: acceptType,
      drop: (item: { id: number }) => onDrop(item.id),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [acceptType, onDrop],
  );

  return (
    <div
      ref={drop as any}
      className={`min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      {children || (
        <p className="text-xs text-slate-400 text-center py-4">{emptyText}</p>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function BatchConfigDnD({
  fruits,
  localSchedules,
  localRules,
  batchFruitId,
  setBatchFruitId,
  batchWeight,
  setBatchWeight,
  batchRunSec,
  setBatchRunSec,
  useRuntime,
  setUseRuntime,
  onStart,
}: {
  fruits: Fruit[];
  localSchedules: LocalScheduleData[];
  localRules: LocalRuleData[];
  batchFruitId: string;
  setBatchFruitId: (v: string) => void;
  batchWeight: string;
  setBatchWeight: (v: string) => void;
  batchRunSec: string;
  setBatchRunSec: (v: string) => void;
  useRuntime: boolean;
  setUseRuntime: (v: boolean) => void;
  onStart: (scheduleIds: number[], ruleIds: number[]) => void;
}) {
  const [useSchedules, setUseSchedules] = useState(false);
  const [useRules, setUseRules] = useState(false);

  // Schedule queue: list of local_schedule_ids (can repeat)
  const [scheduleQueue, setScheduleQueue] = useState<
    { uid: string; localScheduleId: number }[]
  >([]);

  // Rule set: list of local_rule_ids (unique)
  const [ruleSet, setRuleSet] = useState<
    { uid: string; localRuleId: number }[]
  >([]);

  const addSchedule = useCallback((localScheduleId: number) => {
    setScheduleQueue((prev) => [
      ...prev,
      {
        uid: `${localScheduleId}-${Date.now()}-${Math.random()}`,
        localScheduleId,
      },
    ]);
  }, []);

  const removeSchedule = useCallback((idx: number) => {
    setScheduleQueue((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveSchedule = useCallback((from: number, to: number) => {
    setScheduleQueue((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      if (moved) updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  const addRule = useCallback((localRuleId: number) => {
    setRuleSet((prev) => {
      if (prev.some((r) => r.localRuleId === localRuleId)) return prev;
      return [...prev, { uid: `${localRuleId}-${Date.now()}`, localRuleId }];
    });
  }, []);

  const removeRule = useCallback((idx: number) => {
    setRuleSet((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveRule = useCallback((from: number, to: number) => {
    setRuleSet((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      if (moved) updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  const selectedRuleIds = new Set(ruleSet.map((r) => r.localRuleId));

  const handleStart = () => {
    const schedIds = useSchedules
      ? scheduleQueue.map((s) => s.localScheduleId)
      : [];
    const rIds = useRules ? ruleSet.map((r) => r.localRuleId) : [];
    onStart(schedIds, rIds);
  };

  const getScheduleName = (id: number) =>
    localSchedules.find((s) => s.id === id)?.name ?? `#${id}`;
  const getScheduleSub = (id: number) =>
    localSchedules.find((s) => s.id === id)?.schedule_name;
  const getRuleName = (id: number) =>
    localRules.find((r) => r.id === id)?.name ?? `#${id}`;
  const getRuleSub = (id: number) =>
    localRules.find((r) => r.id === id)?.rule_name;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm text-slate-700 font-bold">Cấu hình mẻ sấy</h3>

        {/* Basic config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1 font-semibold">
              Nông sản
            </label>
            <select
              value={batchFruitId}
              onChange={(e) => setBatchFruitId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Không chọn</option>
              {fruits.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1 font-semibold">
              Khối lượng (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={batchWeight}
              onChange={(e) => setBatchWeight(e.target.value)}
              min={0}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useRuntime}
              onChange={(e) => setUseRuntime(e.target.checked)}
              className="rounded border-slate-300"
            />
            Giới hạn thời gian
          </label>
          {useRuntime && (
            <input
              type="number"
              value={batchRunSec}
              onChange={(e) => setBatchRunSec(e.target.value)}
              min={1}
              className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Giây"
            />
          )}
        </div>

        {/* Schedule DnD section */}
        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={useSchedules}
              onChange={(e) => setUseSchedules(e.target.checked)}
              className="rounded border-blue-300 text-blue-600"
            />
            <Clock size={14} className="text-blue-600" />
            Áp dụng lịch trình
          </label>
          {useSchedules && (
            <div className="grid grid-cols-2 gap-3">
              {/* Available */}
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                  Có sẵn ({localSchedules.length})
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {localSchedules.map((ls) => (
                    <DragSourceItem
                      key={ls.id}
                      type={ITEM_TYPES.SCHEDULE}
                      item={{ id: ls.id }}
                      label={ls.name}
                      sublabel={ls.schedule_name}
                      colorCls="bg-blue-50 text-blue-700"
                      onAdd={() => addSchedule(ls.id)}
                    />
                  ))}
                  {localSchedules.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">
                      Chưa có lịch trình cục bộ
                    </p>
                  )}
                </div>
              </div>
              {/* Queue */}
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                  Hàng đợi ({scheduleQueue.length})
                </p>
                <DropZone
                  acceptType={ITEM_TYPES.SCHEDULE}
                  onDrop={addSchedule}
                  emptyText="Kéo lịch trình vào đây"
                >
                  {scheduleQueue.length > 0 && (
                    <div className="space-y-1">
                      {scheduleQueue.map((item, idx) => (
                        <SortableItem
                          key={item.uid}
                          type={ITEM_TYPES.QUEUE_ITEM}
                          index={idx}
                          label={getScheduleName(item.localScheduleId)}
                          sublabel={getScheduleSub(item.localScheduleId)}
                          colorCls="bg-blue-100 text-blue-800"
                          onRemove={() => removeSchedule(idx)}
                          onMove={moveSchedule}
                        />
                      ))}
                    </div>
                  )}
                </DropZone>
              </div>
            </div>
          )}
        </div>

        {/* Rule DnD section */}
        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={useRules}
              onChange={(e) => setUseRules(e.target.checked)}
              className="rounded border-purple-300 text-purple-600"
            />
            <AlertTriangle size={14} className="text-purple-600" />
            Áp dụng quy tắc
          </label>
          {useRules && (
            <div className="grid grid-cols-2 gap-3">
              {/* Available */}
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                  Có sẵn ({localRules.length})
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {localRules.map((lr) => {
                    const selected = selectedRuleIds.has(lr.id);
                    return (
                      <DragSourceItem
                        key={lr.id}
                        type={selected ? "__disabled__" : ITEM_TYPES.RULE}
                        item={{ id: lr.id }}
                        label={lr.name}
                        sublabel={lr.rule_name}
                        colorCls={
                          selected
                            ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                            : "bg-purple-50 text-purple-700"
                        }
                        onAdd={() => !selected && addRule(lr.id)}
                      />
                    );
                  })}
                  {localRules.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">
                      Chưa có quy tắc cục bộ
                    </p>
                  )}
                </div>
              </div>
              {/* Rule set */}
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                  Đã chọn ({ruleSet.length})
                </p>
                <DropZone
                  acceptType={ITEM_TYPES.RULE}
                  onDrop={addRule}
                  emptyText="Kéo quy tắc vào đây"
                >
                  {ruleSet.length > 0 && (
                    <div className="space-y-1">
                      {ruleSet.map((item, idx) => (
                        <SortableItem
                          key={item.uid}
                          type={ITEM_TYPES.RULESET_ITEM}
                          index={idx}
                          label={getRuleName(item.localRuleId)}
                          sublabel={getRuleSub(item.localRuleId)}
                          colorCls="bg-purple-100 text-purple-800"
                          onRemove={() => removeRule(idx)}
                          onMove={moveRule}
                        />
                      ))}
                    </div>
                  )}
                </DropZone>
              </div>
            </div>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!batchWeight}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
            batchWeight
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Play size={16} /> Bắt đầu sấy
        </button>
      </div>
    </DndProvider>
  );
}
