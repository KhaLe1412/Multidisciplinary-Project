import { useState, useMemo, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  apiFetchOverview,
  apiFetchDryerStats,
  apiFetchBatchSensors,
  type OverviewData,
  type DryerAnalyticsData,
  type BatchDetail,
  type BatchSensorData,
} from "../api/analyticsApi";
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
  batch: BatchDetail;
  onClose: () => void;
}) {
  const [sensors, setSensors] = useState<BatchSensorData[]>([]);
  const [sensorIndex, setSensorIndex] = useState(0);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    setIsFetching(true);
    apiFetchBatchSensors(batch.batch_id)
      .then((data) => setSensors(data))
      .catch(() => setSensors([]))
      .finally(() => setIsFetching(false));
  }, [batch.batch_id]);

  const currentSensor = sensors[sensorIndex] ?? null;
  const chartData =
    currentSensor?.readings.map((r) => ({
      label: new Date(r.timestamp).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: r.value,
    })) ?? [];

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
              Biểu đồ mẻ sấy: #{batch.batch_id}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {batch.crop_name} · {batch.dryer_name} ·{" "}
              {new Date(batch.start_time).toLocaleDateString("vi-VN")}
              {batch.duration_minutes
                ? ` · ${batch.duration_minutes} phút`
                : ""}
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
                value: `${batch.input_weight} kg`,
                color: "#3b82f6",
              },
              {
                label: "Đầu ra",
                value:
                  batch.output_weight != null
                    ? `${batch.output_weight} kg`
                    : "—",
                color: "#22c55e",
              },
              {
                label: "Thu hồi",
                value: batch.yield_rate != null ? `${batch.yield_rate}%` : "—",
                color: "#f97316",
              },
              {
                label: "Thời gian",
                value: batch.duration_minutes
                  ? `${batch.duration_minutes} ph`
                  : "—",
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

          {/* Sensor navigation & chart */}
          {isFetching ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : sensors.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              Không có dữ liệu cảm biến
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSensorIndex((i) => Math.max(0, i - 1))}
                  disabled={sensorIndex === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p
                    className="text-xs text-slate-700"
                    style={{ fontWeight: 600 }}
                  >
                    {currentSensor!.device_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {currentSensor!.device_type}
                    {currentSensor!.unit
                      ? ` · ${currentSensor!.unit}`
                      : ""} · {sensorIndex + 1}/{sensors.length}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSensorIndex((i) => Math.min(sensors.length - 1, i + 1))
                  }
                  disabled={sensorIndex === sensors.length - 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      unit={currentSensor!.unit ?? ""}
                    />
                    <Tooltip
                      formatter={(v: any) => [
                        v,
                        `${currentSensor!.device_name}${currentSensor!.unit ? ` (${currentSensor!.unit})` : ""}`,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                  Không có dữ liệu trong giai đoạn này
                </div>
              )}
            </>
          )}

          {batch.rating != null && (
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
  const { dryers, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "dryers" | "report">(
    "overview",
  );
  const [filterDryer, setFilterDryer] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);

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

  // Analytics data
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [dryerData, setDryerData] = useState<DryerAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const dryerId = filterDryer ? Number(filterDryer) : undefined;
    setIsLoading(true);
    Promise.all([
      apiFetchOverview(from || undefined, to || undefined, dryerId),
      apiFetchDryerStats(from || undefined, to || undefined, dryerId),
    ])
      .then(([ov, dr]) => {
        setOverviewData(ov);
        setDryerData(dr);
      })
      .catch((e) => console.error("Analytics fetch failed:", e))
      .finally(() => setIsLoading(false));
  }, [from, to, filterDryer]);

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

  // ── Derived stats from API ──
  const totalBatches = overviewData?.summary.total_batches ?? 0;
  const totalMinutes = overviewData?.summary.total_operating_minutes ?? 0;
  const totalInputKg = overviewData?.summary.total_input_kg ?? 0;
  const totalOutputKg = overviewData?.summary.total_output_kg ?? 0;
  const totalEnergy = overviewData?.summary.total_energy_kwh ?? 0;
  const avgRating = overviewData?.summary.avg_rating ?? 0;
  const yieldRate = overviewData?.summary.yield_rate ?? 0;

  const dailyData = overviewData?.daily_production ?? [];
  const cropStats = overviewData?.crop_stats ?? [];
  const pieData = cropStats.map((f) => ({
    name: f.crop_name,
    value: f.batch_count,
  }));

  const dryerStats = dryerData?.dryer_stats ?? [];
  const batchDetails = dryerData?.batch_details ?? [];

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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" />
          Đang tải dữ liệu...
        </div>
      )}

      {/* No data notice */}
      {!isLoading && totalBatches === 0 && (
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
                    <XAxis dataKey="date_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: any, n: string) => [
                        v,
                        n === "input_kg" ? "Đầu vào (kg)" : "Đầu ra (kg)",
                      ]}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "input_kg" ? "Đầu vào (kg)" : "Đầu ra (kg)"
                      }
                    />
                    <Bar
                      dataKey="input_kg"
                      fill="#93c5fd"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="output_kg"
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
                    {cropStats.map((f) => (
                      <div key={f.crop_id} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: FRUIT_COLORS[f.crop_name] ?? "#64748b",
                          }}
                        />
                        <span
                          className="text-xs text-slate-700 flex-1 truncate"
                          style={{ fontWeight: 500 }}
                        >
                          {f.crop_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {f.batch_count} mẻ
                        </span>
                        <span className="text-xs text-slate-400">
                          {f.avg_rating > 0 ? `${f.avg_rating}★` : "—"}
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

          {/* Crop stats table */}
          {cropStats.length > 0 && (
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
                    {cropStats.map((f) => (
                      <tr
                        key={f.crop_id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background:
                                  FRUIT_COLORS[f.crop_name] ?? "#64748b",
                              }}
                            />
                            <span style={{ fontWeight: 500 }}>
                              {f.crop_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.batch_count}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.input_kg}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {f.output_kg}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${f.yield_rate >= 35 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {f.yield_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {f.avg_minutes} ph
                        </td>
                        <td className="py-2.5 pr-4">
                          {f.avg_rating > 0 ? (
                            <StarRating rating={Math.round(f.avg_rating)} />
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
                    .filter(
                      (d) => !filterDryer || d.dryer_id === Number(filterDryer),
                    )
                    .map((d) => (
                      <tr
                        key={d.dryer_id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <div>
                            <p style={{ fontWeight: 500 }}>{d.dryer_name}</p>
                            <p className="text-xs text-slate-400">
                              #{d.dryer_id}
                            </p>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${d.status === "running" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {d.status === "running" ? "● Hoạt động" : "○ Dừng"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.batch_count}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.input_kg}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {d.output_kg}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${d.yield_rate >= 35 ? "bg-green-100 text-green-700" : d.yield_rate > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {d.yield_rate > 0 ? `${d.yield_rate}%` : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {d.operating_hours}h
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs ${d.error_count > 0 ? "text-red-600" : "text-slate-400"}`}
                            style={{
                              fontWeight: d.error_count > 0 ? 600 : 400,
                            }}
                          >
                            {d.error_count}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {d.avg_rating > 0 ? (
                            <StarRating rating={Math.round(d.avg_rating)} />
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
              Bấm vào một mẻ sấy để xem biểu đồ cảm biến chi tiết
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
                  {batchDetails.map((b) => (
                    <tr
                      key={b.batch_id}
                      className="border-b border-slate-50 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBatch(b)}
                    >
                      <td className="py-2 pr-3 text-blue-600 font-mono underline">
                        {b.batch_id}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {b.dryer_name}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: `${FRUIT_COLORS[b.crop_name] ?? "#64748b"}20`,
                            color: FRUIT_COLORS[b.crop_name] ?? "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {b.crop_name}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {b.input_weight}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {b.output_weight ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {b.yield_rate != null ? (
                          <span
                            className="text-green-700"
                            style={{ fontWeight: 600 }}
                          >
                            {b.yield_rate}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">
                        {new Date(b.start_time).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {b.duration_minutes ? `${b.duration_minutes}ph` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {b.rating ? <StarRating rating={b.rating} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batchDetails.length === 0 && (
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
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Tỉ lệ thu hồi</p>
                  <p
                    className="text-2xl text-green-600"
                    style={{ fontWeight: 700 }}
                  >
                    {yieldRate.toFixed(1)}%
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
            {dryerStats.filter((d) => d.batch_count > 0).length > 0 && (
              <div className="mb-5">
                <h3
                  className="text-sm text-slate-800 mb-3"
                  style={{ fontWeight: 700 }}
                >
                  Máy sấy hiệu suất cao nhất
                </h3>
                <div className="space-y-2">
                  {dryerStats
                    .filter((d) => d.batch_count > 0)
                    .sort((a, b) => b.yield_rate - a.yield_rate)
                    .slice(0, 3)
                    .map((d, i) => (
                      <div
                        key={d.dryer_id}
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
                            {d.dryer_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {d.batch_count} mẻ · {d.operating_hours}h ·{" "}
                            {d.error_count} lỗi
                          </p>
                        </div>
                        <span
                          className="text-sm text-green-700 px-3 py-1 bg-green-100 rounded-full"
                          style={{ fontWeight: 700 }}
                        >
                          {d.yield_rate}% thu hồi
                        </span>
                        {d.avg_rating > 0 && (
                          <StarRating rating={Math.round(d.avg_rating)} />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Best crops */}
            {cropStats.length > 0 && (
              <div className="mb-5">
                <h3
                  className="text-sm text-slate-800 mb-3"
                  style={{ fontWeight: 700 }}
                >
                  Nông sản theo hiệu suất
                </h3>
                <div className="space-y-2">
                  {[...cropStats]
                    .sort((a, b) => b.yield_rate - a.yield_rate)
                    .slice(0, 4)
                    .map((f) => (
                      <div
                        key={f.crop_id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            background: FRUIT_COLORS[f.crop_name] ?? "#64748b",
                          }}
                        />
                        <div className="flex-1">
                          <p
                            className="text-sm text-slate-800"
                            style={{ fontWeight: 500 }}
                          >
                            {f.crop_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {f.batch_count} mẻ · TB {f.avg_minutes} ph/mẻ
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: `${FRUIT_COLORS[f.crop_name] ?? "#64748b"}20`,
                            color: FRUIT_COLORS[f.crop_name] ?? "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {f.yield_rate}% thu hồi
                        </span>
                        {f.avg_rating > 0 && (
                          <StarRating rating={Math.round(f.avg_rating)} />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
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
