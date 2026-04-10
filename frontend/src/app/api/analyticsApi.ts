/**
 * analyticsApi.ts
 * Fetch analytics data from backend API.
 */

import { getAuthHeaders } from "./apiClient";

const BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL ?? "http://localhost:8001";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewSummary {
  total_batches: number;
  total_operating_minutes: number;
  avg_batch_minutes: number;
  total_energy_kwh: number;
  avg_rating: number;
  total_input_kg: number;
  total_output_kg: number;
  yield_rate: number;
}

export interface DailyProduction {
  date: string;
  date_label: string;
  batches: number;
  input_kg: number;
  output_kg: number;
}

export interface CropStat {
  crop_id: number;
  crop_name: string;
  batch_count: number;
  input_kg: number;
  output_kg: number;
  yield_rate: number;
  avg_minutes: number;
  avg_rating: number;
}

export interface OverviewData {
  summary: OverviewSummary;
  daily_production: DailyProduction[];
  crop_stats: CropStat[];
}

export interface DryerStat {
  dryer_id: number;
  dryer_name: string;
  status: string;
  batch_count: number;
  input_kg: number;
  output_kg: number;
  yield_rate: number;
  operating_hours: number;
  error_count: number;
  avg_rating: number;
}

export interface BatchDetail {
  batch_id: number;
  dryer_id: number;
  dryer_name: string;
  crop_name: string;
  input_weight: number;
  output_weight: number | null;
  yield_rate: number | null;
  start_time: string;
  duration_minutes: number | null;
  rating: number | null;
}

export interface DryerAnalyticsData {
  dryer_stats: DryerStat[];
  batch_details: BatchDetail[];
}

export interface SensorReading {
  timestamp: string;
  value: number | null;
}

export interface BatchSensorData {
  device_id: string;
  device_name: string;
  device_type: string;
  unit: string | null;
  readings: SensorReading[];
}

// ─── API functions ─────────────────────────────────────────────────────────────

function buildQuery(from?: string, to?: string, dryerId?: number): string {
  const p = new URLSearchParams();
  if (from) p.set("from_date", from);
  if (to) p.set("to_date", to);
  if (dryerId) p.set("dryer_id", String(dryerId));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function apiFetchOverview(
  from?: string,
  to?: string,
  dryerId?: number,
): Promise<OverviewData> {
  const res = await fetch(
    `${BASE}/api/analytics/overview${buildQuery(from, to, dryerId)}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`Analytics overview error: ${res.status}`);
  return res.json();
}

export async function apiFetchDryerStats(
  from?: string,
  to?: string,
  dryerId?: number,
): Promise<DryerAnalyticsData> {
  const res = await fetch(
    `${BASE}/api/analytics/dryers${buildQuery(from, to, dryerId)}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`Analytics dryers error: ${res.status}`);
  return res.json();
}

export async function apiFetchBatchSensors(
  batchId: number,
): Promise<BatchSensorData[]> {
  const res = await fetch(`${BASE}/api/analytics/batches/${batchId}/sensors`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Analytics sensors error: ${res.status}`);
  return res.json();
}
