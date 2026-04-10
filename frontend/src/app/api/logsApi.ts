/**
 * logsApi.ts
 * Fetch system_logs từ backend API.
 */

import { SystemLog } from "../data/mockData";
import { getAuthHeaders } from "./apiClient";

const BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL ?? "http://localhost:8001";

interface RawLog {
  id: number;
  timestamp: string;
  event_type: string;
  severity: string;
  user: string;
  user_id: number | null;
  dryer_id: number | null;
  description: string;
}

function mapLog(r: RawLog): SystemLog {
  return {
    id: String(r.id),
    eventType: r.event_type,
    time: r.timestamp,
    user: r.user,
    description: r.description,
    severity: r.severity as SystemLog["severity"],
    dryerId: r.dryer_id != null ? String(r.dryer_id) : undefined,
  };
}

/** Lấy toàn bộ system_logs (dùng cho trang Nhật ký hệ thống). */
export async function apiFetchSystemLogs(): Promise<SystemLog[]> {
  const res = await fetch(`${BASE}/api/logs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`apiFetchSystemLogs: ${res.status}`);
  const data: RawLog[] = await res.json();
  return data.map(mapLog);
}

/** Lấy system_logs của một máy sấy (dùng cho giao diện điều khiển). */
export async function apiFetchDryerLogs(
  dryerId: number | string,
): Promise<SystemLog[]> {
  const res = await fetch(`${BASE}/api/logs/dryer/${dryerId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`apiFetchDryerLogs: ${res.status}`);
  const data: RawLog[] = await res.json();
  return data.map(mapLog);
}

/** Lấy danh sách tên loại sự kiện từ DB (dùng cho bộ lọc). */
export async function apiFetchEventTypes(): Promise<string[]> {
  const res = await fetch(`${BASE}/api/logs/event-types`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}
