import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { BatchRecord } from "../data/mockData";
import {
  BarChart3,
  Thermometer,
  Droplets,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Leaf,
  Cpu,
  Package,
  ShieldAlert,
  Star,
  AlertTriangle,
  CheckCircle2,
  Activity,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#14b8a6",
];
const FRUIT_COLORS: Record<string, string> = {
  Xoài: "#f97316",
  Mít: "#eab308",
  Dứa: "#22c55e",
  Chuối: "#a855f7",
  "Thanh long": "#ec4899",
  Gừng: "#14b8a6",
  Nghệ: "#f59e0b",
  Nhãn: "#6366f1",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${trend === "up" ? "bg-green-100 text-green-700" : trend === "down" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}
          >
            {trend === "up" ? (
              <TrendingUp size={10} />
            ) : trend === "down" ? (
              <TrendingDown size={10} />
            ) : (
              <Activity size={10} />
            )}
            {trend === "up" ? "+12%" : trend === "down" ? "-5%" : "0%"}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl text-slate-900" style={{ fontWeight: 700 }}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          fill={s <= rating ? "#f59e0b" : "transparent"}
          className={s <= rating ? "text-amber-400" : "text-slate-300"}
        />
      ))}
    </div>
  );
}

// ── Date range helpers ──
type QuickRange = "today" | "week" | "month" | "3months" | "custom";

function getRange(quick: QuickRange): { from: string; to: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString().split("T")[0];
  switch (quick) {
    case "today":
      return { from: pad(now), to: pad(now) };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: pad(d), to: pad(now) };
    }
    case "month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: pad(d), to: pad(now) };
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: pad(d), to: pad(now) };
    }
    default:
      return { from: "", to: "" };
  }
}

// ── Batch detail chart modal ──
function BatchDetailChart({
  batch,
  onClose,
}: {
  batch: BatchRecord;
  onClose: () => void;
}) {
  const sched = { name: batch.scheduleName };
  // Generate mock sensor readings for this batch duration
  const points = useMemo(() => {
    const steps = Math.max(
      8,
      Math.min(20, Math.round((batch.totalMinutes ?? 60) / 8)),
    );
    return Array.from({ length: steps + 1 }, (_, i) => {
      const minInto = Math.round((i / steps) * (batch.totalMinutes ?? 60));
      const progress = i / steps;
      // Simulate: ramp up, stable, ramp down
      let tempBase =
        45 +
        20 *
          Math.min(1, progress * 3) *
          (1 - Math.max(0, (progress - 0.85) * 5));
      let humBase =
        55 -
        25 *
          Math.min(1, progress * 2.5) *
          (1 - Math.max(0, (progress - 0.9) * 8));
      return {
        t: minInto,
        label: `${Math.floor(minInto / 60)}h${minInto % 60}ph`,
        temp: Math.round(tempBase + (Math.random() - 0.5) * 4),
        humidity: Math.round(Math.max(10, humBase + (Math.random() - 0.5) * 5)),
      };
    });
  }, [batch.id]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #eff6ff, #f8fafc)" }}
        >
          <div>
            <h3
              className="text-base text-slate-900"
              style={{ fontWeight: 700 }}
            >
              Biểu đồ mẻ sấy: {batch.id}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {batch.fruitName} · {batch.dryerName} ·{" "}
              {new Date(batch.startTime).toLocaleDateString("vi-VN")}
              {batch.totalMinutes ? ` · ${batch.totalMinutes} phút` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Đầu vào",
                value: `${batch.inputWeight} kg`,
                color: "#3b82f6",
              },
              {
                label: "Đầu ra",
                value: batch.outputWeight ? `${batch.outputWeight} kg` : "—",
                color: "#22c55e",
              },
              {
                label: "Thu hồi",
                value: batch.outputWeight
                  ? `${((batch.outputWeight / batch.inputWeight) * 100).toFixed(1)}%`
                  : "—",
                color: "#f97316",
              },
              {
                label: "Điện năng",
                value: batch.energyKwh ? `${batch.energyKwh} kWh` : "—",
                color: "#a855f7",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                <p
                  className="text-sm"
                  style={{ fontWeight: 700, color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-xs text-slate-500 mb-2"
            style={{ fontWeight: 600 }}
          >
            NHIỆT ĐỘ & ĐỘ ẨM THEO THỜI GIAN MẺ SẤY
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={points}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="temp"
                tick={{ fontSize: 10 }}
                unit="°C"
                domain={[20, 100]}
              />
              <YAxis
                yAxisId="hum"
                orientation="right"
                tick={{ fontSize: 10 }}
                unit="%"
                domain={[0, 80]}
              />
              <Tooltip
                formatter={(v: any, n: string) => [
                  v,
                  n === "temp" ? "Nhiệt độ (°C)" : "Độ ẩm (%)",
                ]}
              />
              <Legend
                formatter={(v) =>
                  v === "temp" ? "Nhiệt độ (°C)" : "Độ ẩm (%)"
                }
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                name="temp"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="hum"
                type="monotone"
                dataKey="humidity"
                name="humidity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {batch.rating && (
            <div className="mt-3 flex items-center gap-2 justify-center">
              <span className="text-xs text-slate-500">
                Đánh giá chất lượng:
              </span>
              <StarRating rating={batch.rating} />
              <span
                className="text-xs text-amber-600"
                style={{ fontWeight: 600 }}
              >
                {batch.rating}/5
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Date range filter bar ──
function DateRangeBar({
  from,
  to,
  onFromChange,
  onToChange,
  quickRange,
  onQuickRange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  quickRange: QuickRange;
  onQuickRange: (q: QuickRange) => void;
}) {
  const quickOptions: { key: QuickRange; label: string }[] = [
    { key: "today", label: "Hôm nay" },
    { key: "week", label: "7 ngày" },
    { key: "month", label: "30 ngày" },
    { key: "3months", label: "3 tháng" },
    { key: "custom", label: "Tùy chỉnh" },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5 flex items-center gap-3 flex-wrap">
      <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
      <span
        className="text-xs text-slate-500 flex-shrink-0"
        style={{ fontWeight: 600 }}
      >
        Khoảng thời gian:
      </span>
      <div className="flex gap-1 flex-wrap">
        {quickOptions.map((o) => (
          <button
            key={o.key}
            onClick={() => onQuickRange(o.key)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${quickRange === o.key ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            style={{ fontWeight: quickRange === o.key ? 600 : 400 }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {quickRange === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-xs">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {from && to && (
        <span
          className="text-xs text-blue-600 ml-auto"
          style={{ fontWeight: 500 }}
        >
          {new Date(from).toLocaleDateString("vi-VN")} —{" "}
          {new Date(to).toLocaleDateString("vi-VN")}
        </span>
      )}
    </div>
  );
}

export function Statistics() {
  const { dryers, batchRecords, systemAlerts, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "dryers" | "report">(
    "overview",
  );
  const [filterDryer, setFilterDryer] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);

  // Date range state
  const [quickRange, setQuickRange] = useState<QuickRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = useMemo(() => {
    if (quickRange === "custom") return { from: customFrom, to: customTo };
    return getRange(quickRange);
  }, [quickRange, customFrom, customTo]);

  const handleQuickRange = (q: QuickRange) => {
    setQuickRange(q);
    if (q !== "custom") {
      const r = getRange(q);
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const p = currentUser?.permissions;
  const isAdmin = currentUser?.role === "admin";
  if (!isAdmin && !p?.statistics) {
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
            Bạn không có quyền xem thống kê.
          </p>
        </div>
      </div>
    );
  }

  // Filter batches by date range and dryer
  const completedBatches = useMemo(() => {
    return batchRecords.filter((b) => {
      if (!b.completed) return false;
      if (!from && !to) return filterDryer ? b.dryerId === filterDryer : true;
      const bDate = b.startTime.split("T")[0];
      if (from && bDate < from) return false;
      if (to && bDate > to) return false;
      if (filterDryer && b.dryerId !== filterDryer) return false;
      return true;
    });
  }, [batchRecords, from, to, filterDryer]);

  // ── Derived stats ──
  const totalBatches = completedBatches.length;
  const totalInputKg = completedBatches.reduce((s, b) => s + b.inputWeight, 0);
  const totalOutputKg = completedBatches.reduce(
    (s, b) => s + (b.outputWeight ?? 0),
    0,
  );
  const totalMinutes = completedBatches.reduce(
    (s, b) => s + (b.totalMinutes ?? 0),
    0,
  );
  const totalEnergy = completedBatches.reduce(
    (s, b) => s + (b.energyKwh ?? 0),
    0,
  );
  const ratedBatches = completedBatches.filter((b) => b.rating);
  const avgRating = ratedBatches.length
    ? ratedBatches.reduce((s, b) => s + (b.rating ?? 0), 0) /
      ratedBatches.length
    : 0;
  const yieldRate = totalInputKg > 0 ? (totalOutputKg / totalInputKg) * 100 : 0;

  const activeDryers = dryers.filter((d) => d.status === "active").length;
  const totalDryers = filterDryer ? 1 : dryers.length;
  const activeDryersFiltered = filterDryer
    ? dryers.filter((d) => d.id === filterDryer && d.status === "active").length
    : activeDryers;
  const availability =
    totalDryers > 0 ? (activeDryersFiltered / totalDryers) * 100 : 0;
  // Alerts from threshold mode dryers only
  const thresholdAlerts = systemAlerts.filter(
    (a) => !filterDryer || a.dryerId === filterDryer,
  );
  const alertCount = thresholdAlerts.length;
  const resolvedAlerts = thresholdAlerts.filter((a) => a.resolved).length;

  // By fruit
  const fruitStats = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        batches: number;
        inputKg: number;
        outputKg: number;
        totalMin: number;
        ratings: number[];
      }
    > = {};
    completedBatches.forEach((b) => {
      if (!map[b.fruitId])
        map[b.fruitId] = {
          name: b.fruitName,
          batches: 0,
          inputKg: 0,
          outputKg: 0,
          totalMin: 0,
          ratings: [],
        };
      const m = map[b.fruitId];
      m.batches++;
      m.inputKg += b.inputWeight;
      m.outputKg += b.outputWeight ?? 0;
      m.totalMin += b.totalMinutes ?? 0;
      if (b.rating) m.ratings.push(b.rating);
    });
    return Object.values(map).map((f) => ({
      ...f,
      avgMin: f.batches ? Math.round(f.totalMin / f.batches) : 0,
      avgRating: f.ratings.length
        ? +(f.ratings.reduce((a, b) => a + b, 0) / f.ratings.length).toFixed(1)
        : 0,
      yieldPct:
        f.inputKg > 0 ? +((f.outputKg / f.inputKg) * 100).toFixed(1) : 0,
    }));
  }, [completedBatches]);

  // By dryer
  const dryerStats = useMemo(() => {
    return dryers.map((d) => {
      const batches = completedBatches.filter((b) => b.dryerId === d.id);
      const inputKg = batches.reduce((s, b) => s + b.inputWeight, 0);
      const outputKg = batches.reduce((s, b) => s + (b.outputWeight ?? 0), 0);
      const energy = batches.reduce((s, b) => s + (b.energyKwh ?? 0), 0);
      const minutes = batches.reduce((s, b) => s + (b.totalMinutes ?? 0), 0);
      const errors = systemAlerts.filter((a) => a.dryerId === d.id).length;
      const ratings = batches.filter((b) => b.rating).map((b) => b.rating!);
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        batchCount: batches.length,
        inputKg,
        outputKg,
        energy,
        hours: +(minutes / 60).toFixed(1),
        errors,
        avgRating: ratings.length
          ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : 0,
        yieldPct: inputKg > 0 ? +((outputKg / inputKg) * 100).toFixed(1) : 0,
      };
    });
  }, [dryers, completedBatches, systemAlerts]);

  // Batch sensor summary for dryer chart
  const batchSensorData = useMemo(() => {
    return completedBatches.slice(0, 10).map((b, i) => ({
      name: `Mẻ ${i + 1}`,
      batchId: b.id,
      fruitName: b.fruitName,
      avgTemp: 52 + Math.round(Math.sin(i * 0.8) * 8 + Math.random() * 4),
      maxTemp: 62 + Math.round(Math.sin(i * 0.8) * 6 + Math.random() * 4),
      avgHumidity: 30 + Math.round(Math.cos(i * 0.6) * 7 + Math.random() * 3),
      hours: b.totalMinutes ? +(b.totalMinutes / 60).toFixed(1) : 0,
      rating: b.rating ?? 0,
      inputKg: b.inputWeight,
      outputKg: b.outputWeight ?? 0,
      batch: b,
    }));
  }, [completedBatches]);

  const dailyData = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        batches: number;
        inputKg: number;
        outputKg: number;
        energy: number;
      }
    > = {};
    completedBatches.forEach((b) => {
      const d = b.startTime.split("T")[0];
      if (!map[d])
        map[d] = { date: d, batches: 0, inputKg: 0, outputKg: 0, energy: 0 };
      map[d].batches++;
      map[d].inputKg += b.inputWeight;
      map[d].outputKg += b.outputWeight ?? 0;
      map[d].energy += b.energyKwh ?? 0;
    });
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        dateLabel: new Date(d.date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
      }));
  }, [completedBatches]);

  const radarData = dryerStats
    .filter((d) => d.batchCount > 0)
    .slice(0, 6)
    .map((d) => ({
      dryer: d.name.replace("Máy sấy ", ""),
      "Hiệu suất": d.yieldPct,
      "Chất lượng": d.avgRating * 20,
      "Giờ HĐ": Math.min(100, d.hours * 10),
    }));
  const pieData = fruitStats.map((f) => ({ name: f.name, value: f.batches }));
  const filterDryerObj = dryers.find((d) => d.id === filterDryer);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-slate-900 mb-1"
            style={{ fontWeight: 700 }}
          >
            Thống kê & Báo cáo
          </h1>
          <p className="text-slate-500 text-sm">
            Phân tích hiệu suất vận hành nhà máy
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {[
          { key: "overview", label: "Tổng quan", icon: BarChart3 },
          { key: "dryers", label: "Theo máy sấy", icon: Cpu },
          { key: "report", label: "Báo cáo", icon: FileText },
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

      {/* Date range bar */}
      <DateRangeBar
        from={from}
        to={to}
        onFromChange={setCustomFrom}
        onToChange={setCustomTo}
        quickRange={quickRange}
        onQuickRange={handleQuickRange}
      />

      {/* Dryer filter (for all tabs) */}
      {
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 mb-5 flex items-center gap-3 flex-wrap">
          <Cpu size={15} className="text-slate-400 flex-shrink-0" />
          <span
            className="text-xs text-slate-500 flex-shrink-0"
            style={{ fontWeight: 600 }}
          >
            Lọc theo máy sấy:
          </span>
          <button
            onClick={() => setFilterDryer("")}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${!filterDryer ? "bg-blue-500 text-white border-blue-500" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}
            style={{ fontWeight: !filterDryer ? 600 : 400 }}
          >
            Tất cả
          </button>
          {dryers.map((d) => (
            <button
              key={d.id}
              onClick={() => setFilterDryer(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${filterDryer === d.id ? "bg-blue-500 text-white border-blue-500" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}
              style={{ fontWeight: filterDryer === d.id ? 600 : 400 }}
            >
              {d.name}
            </button>
          ))}
        </div>
      }

      {/* No data notice */}
      {totalBatches === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Không có mẻ sấy nào trong khoảng thời gian đã chọn. Thử mở rộng
            khoảng thời gian.
          </p>
        </div>
      )}

      {/* ===== OVERVIEW ===== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Tổng mẻ sấy"
              value={totalBatches}
              sub="mẻ hoàn thành"
              icon={Package}
              color="#3b82f6"
              trend="up"
            />
            <StatCard
              label="Tổng giờ hoạt động"
              value={`${(totalMinutes / 60).toFixed(1)}h`}
              sub={`${totalMinutes} phút`}
              icon={Clock}
              color="#8b5cf6"
              trend="up"
            />
            <StatCard
              label="Điện năng tiêu thụ"
              value={`${totalEnergy.toFixed(1)} kWh`}
              sub={
                totalBatches
                  ? `~${(totalEnergy / totalBatches).toFixed(1)} kWh/mẻ`
                  : "—"
              }
              icon={Zap}
              color="#f97316"
              trend="neutral"
            />
            <StatCard
              label="Đánh giá trung bình"
              value={avgRating > 0 ? `${avgRating.toFixed(1)}/5 ★` : "—"}
              sub="chất lượng sản phẩm"
              icon={Star}
              color="#eab308"
              trend="up"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Khối lượng đầu vào"
              value={`${totalInputKg} kg`}
              icon={TrendingUp}
              color="#22c55e"
            />
            <StatCard
              label="Khối lượng đầu ra"
              value={`${totalOutputKg} kg`}
              icon={Package}
              color="#14b8a6"
            />
            <StatCard
              label="Tỉ lệ thu hồi"
              value={`${yieldRate.toFixed(1)}%`}
              sub="output/input"
              icon={Activity}
              color="#6366f1"
            />
            <StatCard
              label="TB thời gian / mẻ"
              value={
                totalBatches
                  ? `${Math.round(totalMinutes / totalBatches)} ph`
                  : "—"
              }
              icon={Clock}
              color="#0ea5e9"
            />
          </div>

          {/* Hiệu suất tổng thể */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2
              className="text-base text-slate-900 mb-4"
              style={{ fontWeight: 700 }}
            >
              Hiệu suất tổng thể
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                {
                  label: "Tỉ lệ hoạt động",
                  value: availability,
                  color: "#22c55e",
                  desc: `${activeDryersFiltered}/${totalDryers} máy đang chạy`,
                  icon: CheckCircle2,
                  isPercent: true,
                },
                {
                  label: "Số cảnh báo",
                  value: alertCount,
                  color: "#f59e0b",
                  desc: `${resolvedAlerts} đã giải quyết · ${alertCount - resolvedAlerts} chưa xử lý`,
                  icon: ShieldAlert,
                  isPercent: false,
                },
                {
                  label: "Chất lượng sản phẩm",
                  value: avgRating > 0 ? (avgRating / 5) * 100 : 0,
                  color: "#f59e0b",
                  desc:
                    avgRating > 0
                      ? `${avgRating.toFixed(1)}/5 sao trung bình`
                      : "Chưa có đánh giá",
                  icon: Star,
                  isPercent: true,
                },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  {item.isPercent ? (
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <svg
                        viewBox="0 0 36 36"
                        className="w-full h-full -rotate-90"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="3"
                          strokeDasharray={`${item.value} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="text-lg text-slate-900"
                          style={{ fontWeight: 700 }}
                        >
                          {item.value.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-24 h-24 mx-auto mb-3 rounded-full flex items-center justify-center"
                      style={{
                        background: `${item.color}18`,
                        border: `3px solid ${item.color}40`,
                      }}
                    >
                      <span
                        className="text-3xl text-slate-900"
                        style={{ fontWeight: 800, color: item.color }}
                      >
                        {item.value}
                      </span>
                    </div>
                  )}
                  <p
                    className="text-sm text-slate-800 mb-1"
                    style={{ fontWeight: 600 }}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2
                className="text-base text-slate-900 mb-4"
                style={{ fontWeight: 600 }}
              >
                Sản lượng theo ngày
              </h2>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: any, n: string) => [
                        v,
                        n === "inputKg" ? "Đầu vào (kg)" : "Đầu ra (kg)",
                      ]}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "inputKg" ? "Đầu vào (kg)" : "Đầu ra (kg)"
                      }
                    />
                    <Bar
                      dataKey="inputKg"
                      fill="#93c5fd"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="outputKg"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                  Không có dữ liệu
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2
                className="text-base text-slate-900 mb-4"
                style={{ fontWeight: 600 }}
              >
                Mẻ sấy theo loại nông sản
              </h2>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {pieData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              FRUIT_COLORS[entry.name] ??
                              COLORS[i % COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {fruitStats.map((f) => (
                      <div key={f.name} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: FRUIT_COLORS[f.name] ?? "#64748b",
                          }}
                        />
                        <span
                          className="text-xs text-slate-700 flex-1 truncate"
                          style={{ fontWeight: 500 }}
                        >
                          {f.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {f.batches} mẻ
                        </span>
                        <span className="text-xs text-slate-400">
                          {f.avgRating > 0 ? `${f.avgRating}★` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                  Không có dữ liệu
                </div>
              )}
            </div>
          </div>

          {/* Fruit stats table */}
          {fruitStats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2
                className="text-base text-slate-900 mb-4"
                style={{ fontWeight: 600 }}
              >
                Thống kê theo loại nông sản
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {[
                        "Loại",
                        "Số mẻ",
                        "ĐV (kg)",
                        "ĐR (kg)",
                        "Thu hồi",
                        "TB thời gian",
                        "Đánh giá",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs text-slate-400 py-2 pr-4"
                          style={{ fontWeight: 600 }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fruitStats.map((f) => (
                      <tr
                        key={f.name}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: FRUIT_COLORS[f.name] ?? "#64748b",
                              }}
                            />
                            <span style={{ fontWeight: 500 }}>{f.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.batches}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.inputKg}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.outputKg}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${f.yieldPct >= 35 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {f.yieldPct}%
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {f.avgMin} ph
                        </td>
                        <td className="py-2.5 pr-4">
                          {f.avgRating > 0 ? (
                            <StarRating rating={Math.round(f.avgRating)} />
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== DRYERS TAB ===== */}
      {activeTab === "dryers" && (
        <div className="space-y-5">
          {/* Dryer performance table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2
              className="text-base text-slate-900 mb-4"
              style={{ fontWeight: 600 }}
            >
              Hiệu suất từng máy sấy
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Máy sấy",
                      "Trạng thái",
                      "Số mẻ",
                      "ĐV (kg)",
                      "ĐR (kg)",
                      "Thu hồi",
                      "Giờ HĐ",
                      "Lỗi",
                      "Đánh giá",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs text-slate-400 py-2 pr-4"
                        style={{ fontWeight: 600 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dryerStats
                    .filter((d) => !filterDryer || d.id === filterDryer)
                    .map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <div>
                            <p style={{ fontWeight: 500 }}>{d.name}</p>
                            <p className="text-xs text-slate-400">{d.id}</p>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${d.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {d.status === "active" ? "● Hoạt động" : "○ Dừng"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.batchCount}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.inputKg}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.outputKg}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${d.yieldPct >= 35 ? "bg-green-100 text-green-700" : d.yieldPct > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {d.yieldPct > 0 ? `${d.yieldPct}%` : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {d.hours}h
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs ${d.errors > 0 ? "text-red-600" : "text-slate-400"}`}
                            style={{ fontWeight: d.errors > 0 ? 600 : 400 }}
                          >
                            {d.errors}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {d.avgRating > 0 ? (
                            <StarRating rating={Math.round(d.avgRating)} />
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch charts */}
          {batchSensorData.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h2
                  className="text-base text-slate-900 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Nhiệt độ theo mẻ sấy
                </h2>
                <p className="text-xs text-slate-400 mb-3">
                  Bấm vào một điểm để xem biểu đồ chi tiết
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={batchSensorData}
                    onClick={(e) => {
                      if (e?.activePayload?.[0]?.payload?.batch)
                        setSelectedBatch(e.activePayload[0].payload.batch);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="°C" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: any) => [`${v}°C`]}
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgTemp"
                      name="TB nhiệt độ"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 5, cursor: "pointer", fill: "#f97316" }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxTemp"
                      name="Max nhiệt độ"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={{ r: 4, cursor: "pointer" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h2
                  className="text-base text-slate-900 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Độ ẩm & giờ hoạt động theo mẻ
                </h2>
                <p className="text-xs text-slate-400 mb-3">
                  Bấm vào một cột để xem biểu đồ chi tiết
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={batchSensorData}
                    onClick={(e) => {
                      if (e?.activePayload?.[0]?.payload?.batch)
                        setSelectedBatch(e.activePayload[0].payload.batch);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="hum" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis
                      yAxisId="hrs"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      unit="h"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="hum"
                      dataKey="avgHumidity"
                      name="TB độ ẩm (%)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      yAxisId="hrs"
                      dataKey="hours"
                      name="Giờ HĐ"
                      fill="#a855f7"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2
                className="text-base text-slate-900 mb-4"
                style={{ fontWeight: 600 }}
              >
                So sánh hiệu suất máy sấy
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="dryer" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                  />
                  <Radar
                    name="Hiệu suất"
                    dataKey="Hiệu suất"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Chất lượng"
                    dataKey="Chất lượng"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.15}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Batch detail table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2
              className="text-base text-slate-900 mb-1"
              style={{ fontWeight: 600 }}
            >
              Chi tiết mẻ sấy{" "}
              {filterDryerObj ? `— ${filterDryerObj.name}` : "— Tất cả máy"}
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Bấm vào một mẻ sấy để xem biểu đồ nhiệt độ, độ ẩm chi tiết
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "ID",
                      "Máy sấy",
                      "Nông sản",
                      "ĐV (kg)",
                      "ĐR (kg)",
                      "Thu hồi",
                      "Bắt đầu",
                      "T.gian",
                      "Đánh giá",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-slate-400 py-2 pr-3"
                        style={{ fontWeight: 600 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedBatches
                    .filter((b) => !filterDryer || b.dryerId === filterDryer)
                    .map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-50 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedBatch(b)}
                      >
                        <td className="py-2 pr-3 text-blue-600 font-mono underline">
                          {b.id}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {b.dryerName}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              background: `${FRUIT_COLORS[b.fruitName] ?? "#64748b"}20`,
                              color: FRUIT_COLORS[b.fruitName] ?? "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            {b.fruitName}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {b.inputWeight}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {b.outputWeight ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {b.outputWeight && b.inputWeight ? (
                            <span
                              className="text-green-700"
                              style={{ fontWeight: 600 }}
                            >
                              {((b.outputWeight / b.inputWeight) * 100).toFixed(
                                1,
                              )}
                              %
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-500">
                          {new Date(b.startTime).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {b.totalMinutes ? `${b.totalMinutes}ph` : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {b.rating ? <StarRating rating={b.rating} /> : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {completedBatches.filter(
                (b) => !filterDryer || b.dryerId === filterDryer,
              ).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Không có mẻ sấy nào trong khoảng thời gian này
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== REPORT TAB ===== */}
      {activeTab === "report" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="text-lg text-slate-900"
                  style={{ fontWeight: 700 }}
                >
                  Báo cáo vận hành nhà máy
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {from && to
                    ? `Giai đoạn: ${new Date(from).toLocaleDateString("vi-VN")} — ${new Date(to).toLocaleDateString("vi-VN")}`
                    : "Tất cả thời gian"}{" "}
                  · Tạo: {new Date().toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-all"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "white",
                  fontWeight: 600,
                }}
                onClick={() => window.print()}
              >
                <FileText size={15} /> In / Xuất PDF
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "Tổng mẻ sấy",
                  value: `${totalBatches} mẻ`,
                  color: "#3b82f6",
                },
                {
                  label: "Tổng đầu vào",
                  value: `${totalInputKg} kg`,
                  color: "#22c55e",
                },
                {
                  label: "Tổng đầu ra",
                  value: `${totalOutputKg} kg`,
                  color: "#14b8a6",
                },
                {
                  label: "Điện tiêu thụ",
                  value: `${totalEnergy.toFixed(1)} kWh`,
                  color: "#f97316",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center p-3 rounded-xl border border-slate-100 bg-slate-50"
                >
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p
                    className="text-lg"
                    style={{ fontWeight: 700, color: s.color }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Performance Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-6 border border-blue-100">
              <h3
                className="text-sm text-slate-800 mb-3"
                style={{ fontWeight: 700 }}
              >
                Hiệu suất tổng thể
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Tỉ lệ hoạt động</p>
                  <p
                    className="text-2xl text-green-600"
                    style={{ fontWeight: 700 }}
                  >
                    {availability.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Số cảnh báo</p>
                  <p
                    className="text-2xl text-amber-600"
                    style={{ fontWeight: 700 }}
                  >
                    {alertCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chất lượng sản phẩm</p>
                  <p
                    className="text-2xl text-amber-500"
                    style={{ fontWeight: 700 }}
                  >
                    {avgRating > 0 ? `${avgRating.toFixed(1)}/5` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Top performers */}
            {dryerStats.filter((d) => d.batchCount > 0).length > 0 && (
              <div className="mb-5">
                <h3
                  className="text-sm text-slate-800 mb-3"
                  style={{ fontWeight: 700 }}
                >
                  Máy sấy hiệu suất cao nhất
                </h3>
                <div className="space-y-2">
                  {dryerStats
                    .filter((d) => d.batchCount > 0)
                    .sort((a, b) => b.yieldPct - a.yieldPct)
                    .slice(0, 3)
                    .map((d, i) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div
                          className={`w-7 h-7 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-700"}`}
                          style={{ fontWeight: 700 }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p
                            className="text-sm text-slate-800"
                            style={{ fontWeight: 600 }}
                          >
                            {d.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {d.batchCount} mẻ · {d.hours}h · {d.errors} lỗi
                          </p>
                        </div>
                        <span
                          className="text-sm text-green-700 px-3 py-1 bg-green-100 rounded-full"
                          style={{ fontWeight: 700 }}
                        >
                          {d.yieldPct}% thu hồi
                        </span>
                        {d.avgRating > 0 && (
                          <StarRating rating={Math.round(d.avgRating)} />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Best fruits */}
            {fruitStats.length > 0 && (
              <div className="mb-5">
                <h3
                  className="text-sm text-slate-800 mb-3"
                  style={{ fontWeight: 700 }}
                >
                  Nông sản theo hiệu suất
                </h3>
                <div className="space-y-2">
                  {fruitStats
                    .sort((a, b) => b.yieldPct - a.yieldPct)
                    .slice(0, 4)
                    .map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            background: FRUIT_COLORS[f.name] ?? "#64748b",
                          }}
                        />
                        <div className="flex-1">
                          <p
                            className="text-sm text-slate-800"
                            style={{ fontWeight: 500 }}
                          >
                            {f.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {f.batches} mẻ · TB {f.avgMin} ph/mẻ
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: `${FRUIT_COLORS[f.name] ?? "#64748b"}20`,
                            color: FRUIT_COLORS[f.name] ?? "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {f.yieldPct}% thu hồi
                        </span>
                        {f.avgRating > 0 && (
                          <StarRating rating={Math.round(f.avgRating)} />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Alerts summary */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h3
                className="text-sm text-red-800 mb-3 flex items-center gap-2"
                style={{ fontWeight: 700 }}
              >
                <AlertTriangle size={15} /> Tóm tắt cảnh báo
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p
                    className="text-2xl text-red-600"
                    style={{ fontWeight: 700 }}
                  >
                    {alertCount}
                  </p>
                  <p className="text-xs text-red-500">Tổng cảnh báo</p>
                </div>
                <div>
                  <p
                    className="text-2xl text-amber-600"
                    style={{ fontWeight: 700 }}
                  >
                    {alertCount - resolvedAlerts}
                  </p>
                  <p className="text-xs text-amber-500">Chưa giải quyết</p>
                </div>
                <div>
                  <p
                    className="text-2xl text-green-600"
                    style={{ fontWeight: 700 }}
                  >
                    {resolvedAlerts}
                  </p>
                  <p className="text-xs text-green-500">Đã giải quyết</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch detail chart modal */}
      {selectedBatch && (
        <BatchDetailChart
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </div>
  );
}
