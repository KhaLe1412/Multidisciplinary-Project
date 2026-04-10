/**
 * controlApi.ts
 * Giao tiếp với Python gateway (test_main.py, port 8001).
 *
 * GET  sensor  : GET  /api/device/{feed_id}           → { feed_id, value }
 * POST actuator: POST /api/device/{feed_id}?value=X   → { feed_id, value }
 */

import { getAuthHeaders } from "./apiClient";

const GATEWAY_BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL ?? "http://127.0.0.1:8001";

function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...((init?.headers as Record<string, string>) ?? {}) },
  });
}


export interface SensorReading {
  device_id: string;
  value: number | null;
  status: boolean;
  updated_at: string;
}

/** Lệnh gửi đến một thiết bị hành động (actuator). */
export interface ActuatorCommand {
  status?: boolean;
  value?: number;
  speed?: number;
  temperature?: number;
  open?: boolean;
  message?: string;
}

/** Kết quả trả về sau khi gửi lệnh. */
export interface ActuatorResult {
  device_id: string;
  success: boolean;
  message?: string;
}

// ─── Sensor API ───────────────────────────────────────────────────────────────

/**
 * Lấy giá trị mới nhất của một feed từ gateway.
 * feed_id = id của thiết bị trong hệ thống (ví dụ: "dyer-project.ss-temp")
 *
 * GET http://localhost:8001/api/device/{feed_id}
 * → { feed_id: string, value: string }
 */
export async function fetchDryerSensors(
  feedId: string,
  signal?: AbortSignal,
): Promise<SensorReading[]> {
  const url = `${GATEWAY_BASE}/api/device/${encodeURIComponent(feedId)}`;
  const res = await apiFetch(url, { signal });

  if (!res.ok) {
    throw new Error(`fetchDryerSensors HTTP ${res.status}`);
  }

  const data = await res.json(); // { feed_id, value }
  const raw = data.value ?? null;
  return [
    {
      device_id: feedId,
      value: raw !== null ? parseFloat(raw) : null,
      status: raw !== null,
      updated_at: new Date().toISOString(),
    },
  ];
}

// ─── Actuator API ─────────────────────────────────────────────────────────────

/**
 * Gửi lệnh điều khiển đến gateway (chế độ thủ công).
 * Gateway đẩy giá trị lên Adafruit IO qua Writer.
 *
 * POST http://localhost:8001/api/device/{feed_id}?value=X
 */
export async function sendActuatorCommand(
  feedId: string,
  command: ActuatorCommand,
  signal?: AbortSignal,
): Promise<ActuatorResult> {
  // Xác định giá trị theo độ ưu tiên
  let value: string;
  if (command.value !== undefined) value = String(command.value);
  else if (command.speed !== undefined) value = String(command.speed);
  else if (command.temperature !== undefined)
    value = String(command.temperature);
  else if (command.open !== undefined) value = command.open ? "1" : "0";
  else if (command.status !== undefined) value = command.status ? "1" : "0";
  else if (command.message !== undefined) value = command.message;
  else throw new Error("sendActuatorCommand: không có giá trị hợp lệ");

  const url = `${GATEWAY_BASE}/api/device/${encodeURIComponent(feedId)}?value=${encodeURIComponent(value)}`;
  const res = await apiFetch(url, { method: "POST", signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`sendActuatorCommand HTTP ${res.status}: ${text}`);
  }

  return { device_id: feedId, success: true, message: `Đã gửi → ${value}` };
}

// ─── Device Log API ──────────────────────────────────────────────────────────

/** Một bản ghi log từ sensor_logs. */
export interface DeviceLog {
  feed_id: string;
  value: number | null;
  timestamp: string;
}

/**
 * Lấy tối đa 10 log gần nhất của một device (mới nhất trước).
 *
 * GET http://localhost:8001/api/device/{feedId}/logs
 * → [ { feed_id, value, timestamp } ]
 */
export async function fetchDeviceLogs(
  feedId: string,
  signal?: AbortSignal,
): Promise<DeviceLog[]> {
  const url = `${GATEWAY_BASE}/api/device/${encodeURIComponent(feedId)}/logs`;
  const res = await apiFetch(url, { signal });
  if (!res.ok) throw new Error(`fetchDeviceLogs HTTP ${res.status}`);
  return res.json();
}

// ─── Batch API ────────────────────────────────────────────────────────────────

/**
 * Bắt đầu mẻ sấy thủ công.
 * POST /api/batches/manual
 */
export async function apiStartManualBatch(
  dryerId: string,
  cropId: string | null,
  inputWeight: number,
  runtime: number,
): Promise<{ id: number }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryer_id: parseInt(dryerId, 10),
      crop_id: cropId ? parseInt(cropId, 10) : null,
      input_weight: inputWeight,
      runtime: Math.round(runtime),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiStartManualBatch HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Bắt đầu mẻ sấy theo rule (ngưỡng cảm biến).
 * POST /api/batches/rule
 */
export async function apiStartRuleBatch(
  dryerId: string,
  cropId: string | null,
  inputWeight: number,
  runtime: number,
  ruleId: number,
  mappings: { rule_virtual_device_id: number; device_id: string }[],
): Promise<{ id: number }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/rule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryer_id: parseInt(dryerId, 10),
      crop_id: cropId ? parseInt(cropId, 10) : null,
      input_weight: inputWeight,
      runtime: Math.round(runtime),
      rule_id: ruleId,
      mappings,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiStartRuleBatch HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Bắt đầu mẻ sấy theo lịch (schedule).
 * POST /api/batches/schedule
 */
export async function apiStartScheduleBatch(
  dryerId: string,
  cropId: string | null,
  inputWeight: number,
  runtime: number,
  scheduleId: number,
  mappings: { schedule_virtual_device_id: number; device_id: string }[],
): Promise<{ id: number }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryer_id: parseInt(dryerId, 10),
      crop_id: cropId ? parseInt(cropId, 10) : null,
      input_weight: inputWeight,
      runtime: Math.round(runtime),
      schedule_id: scheduleId,
      mappings,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiStartScheduleBatch HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Kết thúc mẻ sấy đang chạy.
 * PUT /api/batches/{batchId}/end
 */
export async function apiEndBatch(
  batchId: number,
  outputWeight: number,
  rating: number,
): Promise<void> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/${batchId}/end`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output_weight: outputWeight, rating }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiEndBatch HTTP ${res.status}: ${text}`);
  }
}

