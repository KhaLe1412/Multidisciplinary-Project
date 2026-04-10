import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { apiFetchSystemLogs, apiFetchEventTypes } from "../api/logsApi";
import type { SystemLog } from "../data/mockData";
import {
  Search,
  FileText,
  LogIn,
  LogOut,
  Settings,
  AlertTriangle,
  Download,
  Filter,
  ClipboardList,
  Cpu,
  BookOpen,
  UserCog,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

const eventTypeIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  device_control: Settings,
  device_management: Cpu,
  policy_management: BookOpen,
  alert: AlertTriangle,
  profile_change: UserCog,
};

const severityColors: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  error: "#ef4444",
  success: "#22c55e",
};
const severityBg: Record<string, string> = {
  info: "#eff6ff",
  warning: "#fffbeb",
  error: "#fef2f2",
  success: "#f0fdf4",
};

export function LogsPage() {
  const { currentUser, dryers } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const canView = isAdmin || currentUser?.permissions?.logs;

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const logs = await apiFetchSystemLogs();
      setSystemLogs(logs);
    } catch {
      // keep existing logs on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const [logSearch, setLogSearch] = useState("");
  const [logEventFilter, setLogEventFilter] = useState("");
  const [logUserFilter, setLogUserFilter] = useState("");
  const [logSeverityFilter, setLogSeverityFilter] = useState("");
  const [logDryerFilter, setLogDryerFilter] = useState("");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logTimeFrom, setLogTimeFrom] = useState("");
  const [logTimeTo, setLogTimeTo] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => {
    apiFetchEventTypes().then(setEventTypes);
  }, []);

  if (!canView) {
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
            Bạn không có quyền xem nhật ký hệ thống.
          </p>
        </div>
      </div>
    );
  }

  const uniqueUsers = [...new Set(systemLogs.map((l) => l.user))];

  const filteredLogs = systemLogs.filter((log) => {
    const matchSearch =
      !logSearch ||
      log.description.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.user.toLowerCase().includes(logSearch.toLowerCase());
    const matchEvent = !logEventFilter || log.eventType === logEventFilter;
    const matchUser = !logUserFilter || log.user === logUserFilter;
    const matchSeverity =
      !logSeverityFilter || log.severity === logSeverityFilter;
    const matchDryer = !logDryerFilter || log.dryerId === logDryerFilter;
    const matchFrom =
      !logDateFrom ||
      new Date(log.time) >=
        new Date(`${logDateFrom}T${logTimeFrom || "00:00:00"}`);
    const matchTo =
      !logDateTo ||
      new Date(log.time) <= new Date(`${logDateTo}T${logTimeTo || "23:59:59"}`);
    return (
      matchSearch &&
      matchEvent &&
      matchUser &&
      matchSeverity &&
      matchDryer &&
      matchFrom &&
      matchTo
    );
  });

  const clearFilters = () => {
    setLogSearch("");
    setLogEventFilter("");
    setLogUserFilter("");
    setLogSeverityFilter("");
    setLogDryerFilter("");
    setLogDateFrom("");
    setLogDateTo("");
    setLogTimeFrom("");
    setLogTimeTo("");
  };

  const handleExport = () => {
    const header =
      "Thời gian,Loại sự kiện,Mức độ,Người thực hiện,Máy sấy,Mô tả\n";
    const rows = filteredLogs
      .map(
        (log) =>
          `"${new Date(log.time).toLocaleString("vi-VN")}","${log.eventType}","${log.severity}","${log.user}","${log.dryerId || ""}","${log.description}"`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nhat-ky-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const statsByType: Record<string, number> = {};
  systemLogs.forEach((l) => {
    statsByType[l.eventType] = (statsByType[l.eventType] || 0) + 1;
  });
  const errorCount = systemLogs.filter((l) => l.severity === "error").length;
  const warningCount = systemLogs.filter(
    (l) => l.severity === "warning",
  ).length;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-slate-900 mb-1"
            style={{ fontWeight: 700 }}
          >
            Nhật ký hệ thống
          </h1>
          <p className="text-slate-500 text-sm">
            Theo dõi toàn bộ hoạt động và sự kiện trong hệ thống máy sấy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm transition-all hover:bg-slate-200 disabled:opacity-50"
            style={{ fontWeight: 600 }}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all hover:opacity-90 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              fontWeight: 600,
            }}
          >
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Tổng bản ghi",
            value: systemLogs.length,
            color: "#3b82f6",
            bg: "#eff6ff",
            icon: ClipboardList,
          },
          {
            label: "Lỗi (Error)",
            value: errorCount,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: AlertTriangle,
          },
          {
            label: "Cảnh báo",
            value: warningCount,
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: ShieldAlert,
          },
          {
            label: "Đang hiển thị",
            value: filteredLogs.length,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: FileText,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <Icon size={20} style={{ color: s.color }} />
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
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500" style={{ fontWeight: 600 }}>
            BỘ LỌC
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Tìm theo nội dung, người dùng..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Event type */}
          <select
            value={logEventFilter}
            onChange={(e) => setLogEventFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            <option value="">Tất cả loại sự kiện</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
          {/* Severity */}
          <select
            value={logSeverityFilter}
            onChange={(e) => setLogSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            <option value="">Tất cả mức độ</option>
            <option value="info">Thông tin</option>
            <option value="warning">Cảnh báo</option>
            <option value="error">Lỗi</option>
            <option value="success">Thành công</option>
          </select>
          {/* User */}
          <select
            value={logUserFilter}
            onChange={(e) => setLogUserFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            <option value="">Tất cả người dùng</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {/* Dryer */}
          <select
            value={logDryerFilter}
            onChange={(e) => setLogDryerFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            <option value="">Tất cả máy sấy</option>
            {dryers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.name}
              </option>
            ))}
          </select>
          {/* Date + time from */}
          <div className="flex gap-1 items-center">
            <span className="text-xs text-slate-400 flex-shrink-0">Từ</span>
            <input
              type="date"
              value={logDateFrom}
              onChange={(e) => setLogDateFrom(e.target.value)}
              className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={logTimeFrom}
              onChange={(e) => setLogTimeFrom(e.target.value)}
              className="w-24 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Date + time to */}
          <div className="flex gap-1 items-center">
            <span className="text-xs text-slate-400 flex-shrink-0">Đến</span>
            <input
              type="date"
              value={logDateTo}
              onChange={(e) => setLogDateTo(e.target.value)}
              className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={logTimeTo}
              onChange={(e) => setLogTimeTo(e.target.value)}
              className="w-24 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">
            {filteredLogs.length} / {systemLogs.length} bản ghi
          </span>
          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
              <tr>
                {[
                  "Thời gian",
                  "Loại sự kiện",
                  "Mức độ",
                  "Người thực hiện",
                  "Máy sấy",
                  "Mô tả",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs text-slate-400 whitespace-nowrap"
                    style={{ fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const Icon = eventTypeIcons[log.eventType] || Settings;
                const color = severityColors[log.severity];
                const bg = severityBg[log.severity];
                return (
                  <tr
                    key={log.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.time).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                        style={{ background: bg, color }}
                      >
                        <Icon size={11} />
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: bg, color, fontWeight: 600 }}
                      >
                        {log.severity === "info"
                          ? "Thông tin"
                          : log.severity === "warning"
                            ? "Cảnh báo"
                            : log.severity === "error"
                              ? "Lỗi"
                              : "Thành công"}
                      </span>
                    </td>
                    <td
                      className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap"
                      style={{ fontWeight: 500 }}
                    >
                      {log.user}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.dryerId && (
                        <span
                          className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                          style={{ fontWeight: 500 }}
                        >
                          {log.dryerId}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 max-w-xs">
                      {log.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có bản ghi nào phù hợp với bộ lọc</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
