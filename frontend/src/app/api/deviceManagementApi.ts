/**
 * deviceManagementApi.ts
 * CRUD cho areas, device_types, dryers, devices — giao tiếp với test_main.py.
 */
import type {
  Area,
  DeviceTypeModel,
  Dryer,
  Device,
  DryerStatus,
  DryerMode,
} from "../data/mockData";

import { getAuthHeaders } from "./apiClient";

const BASE =
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

// â”€â”€â”€ Backend response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AreaRes {
  id: number;
  name: string;
  description: string | null;
  manager_id: number | null;
}

interface DeviceTypeRes {
  id: number;
  name: string;
  description: string | null;
  unit: string | null;
  max_value: number | null;
  min_value: number | null;
  category: string;
}

interface DeviceRes {
  id: string;
  name: string;
  type_id: number;
  power_status: string | null;
  install_date: string | null;
  dryer_id: number;
}

interface DryerRes {
  id: number;
  name: string;
  area_id: number;
  capacity: number | null;
  manager_id: number | null;
  status: string;
  devices: DeviceRes[];
}

// ─── Converters (backend → frontend) ─────────────────────────────────────────

function toArea(r: AreaRes): Area {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    managerId: r.manager_id ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

function toDeviceType(r: DeviceTypeRes): DeviceTypeModel {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    unit: r.unit ?? "",
    category: (r.category as "sensor" | "controller") ?? "sensor",
    valueRange:
      r.min_value != null && r.max_value != null
        ? { min: r.min_value, max: r.max_value }
        : undefined,
    createdAt: new Date().toISOString(),
  };
}

function toDevice(r: DeviceRes): Device {
  return {
    id: r.id,
    name: r.name,
    deviceTypeId: String(r.type_id),
    status: r.power_status === "on",
    installDate: r.install_date ?? undefined,
  };
}

function toDryer(r: DryerRes): Dryer {
  return {
    id: String(r.id),
    name: r.name,
    areaId: String(r.area_id),
    capacity: r.capacity ?? undefined,
    status: (r.status as DryerStatus) ?? "off",
    managerId: r.manager_id ?? undefined,
    mode: "manual" as DryerMode,
    devices: (r.devices ?? []).map(toDevice),
    createdAt: new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ detail: "Lỗi không xác định" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
}

// ─── Areas ────────────────────────────────────────────────────────────────────

export async function apiFetchAreas(): Promise<Area[]> {
  const res = await apiFetch(`${BASE}/api/areas`);
  await throwIfError(res);
  return ((await res.json()) as AreaRes[]).map(toArea);
}

export async function apiCreateArea(body: {
  name: string;
  description: string;
  manager_id?: number | null;
}): Promise<Area> {
  const res = await apiFetch(`${BASE}/api/areas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return toArea(await res.json());
}

export async function apiUpdateArea(
  id: string,
  body: { name?: string; description?: string; manager_id?: number | null },
): Promise<Area> {
  const res = await apiFetch(`${BASE}/api/areas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return toArea(await res.json());
}

export async function apiDeleteArea(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/areas/${id}`, { method: "DELETE" });
  await throwIfError(res);
}

// ─── Device Types ─────────────────────────────────────────────────────────────

export async function apiFetchDeviceTypes(): Promise<DeviceTypeModel[]> {
  const res = await apiFetch(`${BASE}/api/device-types`);
  await throwIfError(res);
  return ((await res.json()) as DeviceTypeRes[]).map(toDeviceType);
}

export async function apiCreateDeviceType(body: {
  name: string;
  description: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  category: string;
}): Promise<DeviceTypeModel> {
  const res = await apiFetch(`${BASE}/api/device-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return toDeviceType(await res.json());
}

export async function apiUpdateDeviceType(
  id: string,
  body: {
    name?: string;
    description?: string;
    unit?: string | null;
    min_value?: number | null;
    max_value?: number | null;
    category?: string;
  },
): Promise<DeviceTypeModel> {
  const res = await apiFetch(`${BASE}/api/device-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return toDeviceType(await res.json());
}

export async function apiDeleteDeviceType(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/device-types/${id}`, {
    method: "DELETE",
  });
  await throwIfError(res);
}

// ─── Dryers ───────────────────────────────────────────────────────────────────

export async function apiFetchDryers(): Promise<Dryer[]> {
  const res = await apiFetch(`${BASE}/api/dryers`);
  await throwIfError(res);
  return ((await res.json()) as DryerRes[]).map(toDryer);
}

export async function apiCreateDryer(body: {
  name: string;
  area_id: number;
  capacity?: number | null;
  manager_id?: number | null;
  status?: string;
}): Promise<Dryer> {
  const res = await apiFetch(`${BASE}/api/dryers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  const data = await res.json();
  return toDryer({ ...data, devices: [] });
}

export async function apiUpdateDryer(
  id: string,
  body: {
    name?: string;
    area_id?: number;
    capacity?: number | null;
    manager_id?: number | null;
    status?: string;
  },
): Promise<Dryer> {
  const res = await apiFetch(`${BASE}/api/dryers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  const data = await res.json();
  return toDryer({ ...data, devices: [] });
}

export async function apiDeleteDryer(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/dryers/${id}`, { method: "DELETE" });
  await throwIfError(res);
}

// ─── Devices (under dryer) ────────────────────────────────────────────────────

export async function apiCreateDevice(
  dryerId: string,
  body: {
    id: string;
    name: string;
    type_id: number;
    power_status?: string | null;
  },
): Promise<Device> {
  const res = await apiFetch(`${BASE}/api/dryers/${dryerId}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return toDevice(await res.json());
}

export async function apiUpdateDevice(
  dryerId: string,
  deviceId: string,
  body: {
    name?: string;
    type_id?: number;
    power_status?: string | null;
    install_date?: string | null;
  },
): Promise<Device> {
  const res = await apiFetch(
    `${BASE}/api/dryers/${dryerId}/devices/${deviceId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  await throwIfError(res);
  return toDevice(await res.json());
}

export async function apiDeleteDevice(
  dryerId: string,
  deviceId: string,
): Promise<void> {
  const res = await apiFetch(
    `${BASE}/api/dryers/${dryerId}/devices/${deviceId}`,
    {
      method: "DELETE",
    },
  );
  await throwIfError(res);
}

// ─── Users (for manager selection) ────────────────────────────────────────────

export interface SystemUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
}

export async function apiFetchUsers(): Promise<SystemUser[]> {
  const res = await apiFetch(`${BASE}/api/users`);
  await throwIfError(res);
  return (await res.json()) as SystemUser[];
}
