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
    headers: {
      ...getAuthHeaders(),
      ...((init?.headers as Record<string, string>) ?? {}),
    },
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
  const res = await apiFetch(url, signal ? { signal } : {});

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
  const res = await apiFetch(url, {
    method: "POST",
    ...(signal ? { signal } : {}),
  });

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
  const res = await apiFetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`fetchDeviceLogs HTTP ${res.status}`);
  return res.json();
}

// ─── Connected Devices API ────────────────────────────────────────────────────

/**
 * Lấy danh sách device IDs đang kết nối với Adafruit IO.
 * GET /api/sensor/connected-devices → { connected: string[] }
 */
export async function apiFetchConnectedDevices(): Promise<Set<string>> {
  const url = `${GATEWAY_BASE}/api/sensor/connected-devices`;
  const res = await apiFetch(url).catch(() => null);
  if (!res || !res.ok) return new Set();
  const data = await res.json().catch(() => ({ connected: [] }));
  return new Set<string>(data.connected ?? []);
}

// ─── Batch API ────────────────────────────────────────────────────────────────

// ─── Batch API (unified) ──────────────────────────────────────────────────────

/** Bắt đầu mẻ sấy thống nhất. POST /api/batches/start */
export async function apiStartBatch(
  dryerId: string,
  cropId: string | null,
  inputWeight: number | null,
  runtime: number | null,
): Promise<{ id: number }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryer_id: parseInt(dryerId, 10),
      crop_id: cropId ? parseInt(cropId, 10) : null,
      input_weight: inputWeight,
      runtime: runtime ? Math.round(runtime) : null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiStartBatch HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/** Kết thúc mẻ sấy. PUT /api/batches/{batchId}/end */
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

// ─── Batch Schedule Queue ─────────────────────────────────────────────────────

export interface BatchScheduleQueueEntry {
  id: number;
  batch_id: number;
  local_schedule_id: number;
  queue_order: number;
  status: "pending" | "running" | "completed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  local_schedule_name: string;
  schedule_name: string;
}

export async function apiGetBatchSchedules(
  batchId: number,
): Promise<{ schedules: BatchScheduleQueueEntry[]; enabled: boolean }> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/schedules`,
  );
  if (!res.ok) throw new Error(`apiGetBatchSchedules HTTP ${res.status}`);
  return res.json();
}

export async function apiAddBatchSchedules(
  batchId: number,
  localScheduleIds: number[],
): Promise<{ added: number }> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/schedules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ local_schedule_ids: localScheduleIds }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiAddBatchSchedules HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function apiRemoveBatchScheduleEntry(
  batchId: number,
  queueEntryId: number,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/schedules/${queueEntryId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiRemoveBatchScheduleEntry HTTP ${res.status}: ${text}`);
  }
}

export async function apiClearBatchSchedules(batchId: number): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/schedules`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiClearBatchSchedules HTTP ${res.status}: ${text}`);
  }
}

// ─── Batch Rule Set ──────────────────────────────────────────────────────────

export interface BatchRuleSetEntry {
  id: number;
  batch_id: number;
  local_rule_id: number;
  priority_order: number;
  local_rule_name: string;
  rule_name: string;
}

export async function apiGetBatchRules(
  batchId: number,
): Promise<{ rules: BatchRuleSetEntry[]; enabled: boolean }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/${batchId}/rules`);
  if (!res.ok) throw new Error(`apiGetBatchRules HTTP ${res.status}`);
  return res.json();
}

export async function apiAddBatchRules(
  batchId: number,
  localRuleIds: number[],
): Promise<{ added: number }> {
  const res = await apiFetch(`${GATEWAY_BASE}/api/batches/${batchId}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ local_rule_ids: localRuleIds }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiAddBatchRules HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function apiRemoveBatchRule(
  batchId: number,
  localRuleId: number,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/rules/${localRuleId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiRemoveBatchRule HTTP ${res.status}: ${text}`);
  }
}

export async function apiToggleBatchRules(
  batchId: number,
  enabled: boolean,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/rules/toggle`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiToggleBatchRules HTTP ${res.status}: ${text}`);
  }
}

export async function apiToggleBatchSchedules(
  batchId: number,
  enabled: boolean,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/batches/${batchId}/schedules/toggle`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiToggleBatchSchedules HTTP ${res.status}: ${text}`);
  }
}

// ─── Local Schedule CRUD ──────────────────────────────────────────────────────

export interface LocalScheduleData {
  id: number;
  dryer_id: number;
  schedule_id: number;
  name: string;
  created_at: string;
  schedule_name?: string;
  mappings?: {
    schedule_virtual_device_id: number;
    device_id: string;
    svd_name?: string;
    device_name?: string;
  }[];
}

export async function apiGetLocalSchedules(
  dryerId: string,
): Promise<LocalScheduleData[]> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-schedules`,
  );
  if (!res.ok) throw new Error(`apiGetLocalSchedules HTTP ${res.status}`);
  return res.json();
}

export async function apiCreateLocalSchedule(
  dryerId: string,
  body: {
    name: string;
    schedule_id: number;
    mappings: { schedule_virtual_device_id: number; device_id: string }[];
  },
): Promise<LocalScheduleData> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-schedules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiCreateLocalSchedule HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function apiUpdateLocalSchedule(
  dryerId: string,
  localScheduleId: number,
  body: {
    name?: string;
    mappings?: { schedule_virtual_device_id: number; device_id: string }[];
  },
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-schedules/${localScheduleId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiUpdateLocalSchedule HTTP ${res.status}: ${text}`);
  }
}

export async function apiDeleteLocalSchedule(
  dryerId: string,
  localScheduleId: number,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-schedules/${localScheduleId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiDeleteLocalSchedule HTTP ${res.status}: ${text}`);
  }
}

// ─── Local Rule CRUD ──────────────────────────────────────────────────────────

export interface LocalRuleData {
  id: number;
  dryer_id: number;
  rule_id: number;
  name: string;
  created_at: string;
  rule_name?: string;
  mappings?: {
    rule_virtual_device_id: number;
    device_id: string;
    rvd_name?: string;
    device_name?: string;
  }[];
}

export async function apiGetLocalRules(
  dryerId: string,
): Promise<LocalRuleData[]> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-rules`,
  );
  if (!res.ok) throw new Error(`apiGetLocalRules HTTP ${res.status}`);
  return res.json();
}

export async function apiCreateLocalRule(
  dryerId: string,
  body: {
    name: string;
    rule_id: number;
    mappings: { rule_virtual_device_id: number; device_id: string }[];
  },
): Promise<LocalRuleData> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-rules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiCreateLocalRule HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function apiUpdateLocalRule(
  dryerId: string,
  localRuleId: number,
  body: {
    name?: string;
    mappings?: { rule_virtual_device_id: number; device_id: string }[];
  },
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-rules/${localRuleId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiUpdateLocalRule HTTP ${res.status}: ${text}`);
  }
}

export async function apiDeleteLocalRule(
  dryerId: string,
  localRuleId: number,
): Promise<void> {
  const res = await apiFetch(
    `${GATEWAY_BASE}/api/dryers/${dryerId}/local-rules/${localRuleId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiDeleteLocalRule HTTP ${res.status}: ${text}`);
  }
}
