/**
 * controlApi.ts
 * Giao tiếp với Python gateway (test_main.py, port 8001).
 *
 * GET  sensor  : GET  /api/device/{feed_id}           → { feed_id, value }
 * POST actuator: POST /api/device/{feed_id}?value=X   → { feed_id, value }
 */

const GATEWAY_BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL ?? "http://127.0.0.1:8001";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Giá trị đọc về từ một cảm biến. */
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
  const res = await fetch(url, { signal });

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
  const res = await fetch(url, { method: "POST", signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`sendActuatorCommand HTTP ${res.status}: ${text}`);
  }

  return { device_id: feedId, success: true, message: `Đã gửi → ${value}` };
}
