/**
 * policyApi.ts
 * CRUD cho crops (? Fruit), schedule_virtual_devices / rule_virtual_devices,
 * schedules (? Schedule), rules (? AlertRule) — giao ti?p v?i backend API.
 */
import type {
  Fruit,
  Schedule,
  SchedulePhase,
  PolicyObject,
  PolicyAction,
  AlertRule,
  AlertConditionActionPair,
  AlertCondition,
  AlertOperator,
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

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ detail: "L?i không xác d?nh" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
}

// --- Backend response shapes --------------------------------------------------

interface CropRes {
  id: number;
  name: string;
  description: string | null;
}

interface SvdRes {
  id: number;
  schedule_id: number;
  name: string;
  device_type_id: number | null;
}

interface RvdRes {
  id: number;
  rule_id: number;
  name: string;
  device_type_id: number | null;
}

interface StageActionRes {
  id: number;
  stage_id: number;
  schedule_virtual_device_id: number;
  value: number;
  virtual_device_name?: string;
}

interface StageRes {
  id: number;
  schedule_id: number;
  name: string;
  start_offset: number;
  actions: StageActionRes[];
}

interface ScheduleListRes {
  id: number;
  name: string;
  crop_id: number | null;
  virtual_devices: SvdRes[];
  stage_count?: number;
}

interface ScheduleDetailRes extends ScheduleListRes {
  stages: StageRes[];
}

interface ConditionRes {
  id: number;
  value_pair_id: number;
  operator: string;
  compare_value: number;
  rule_virtual_device_id: number;
  virtual_device_name?: string;
}

interface RuleActionRes {
  id: number;
  value_pair_id: number;
  rule_virtual_device_id: number;
  value: number;
  virtual_device_name?: string;
}

interface ValuePairRes {
  id: number;
  rule_id: number;
  name: string | null;
  conditions: ConditionRes[];
  actions: RuleActionRes[];
}

interface RuleListRes {
  id: number;
  name: string;
  description: string | null;
  crop_id: number | null;
  virtual_devices: RvdRes[];
  value_pair_count?: number;
}

interface RuleDetailRes extends RuleListRes {
  value_pairs: ValuePairRes[];
}

// --- Converters: backend ? frontend ------------------------------------------

function toCrop(r: CropRes): Fruit {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    createdAt: "",
  };
}

function toScheduleObject(r: SvdRes): PolicyObject {
  return {
    id: String(r.id),
    label: r.name,
    deviceTypeId: r.device_type_id != null ? String(r.device_type_id) : "",
  };
}

function toRuleObject(r: RvdRes): PolicyObject {
  return {
    id: String(r.id),
    label: r.name,
    deviceTypeId: r.device_type_id != null ? String(r.device_type_id) : "",
  };
}

function toStageAction(r: StageActionRes): PolicyAction {
  return { objectId: String(r.schedule_virtual_device_id), value: r.value };
}

function toPhase(r: StageRes): SchedulePhase {
  return {
    id: String(r.id),
    name: r.name,
    offsetSeconds: r.start_offset,
    actions: (r.actions ?? []).map(toStageAction),
  };
}

function toSchedule(r: ScheduleDetailRes): Schedule {
  return {
    id: String(r.id),
    name: r.name,
    fruitId: r.crop_id != null ? String(r.crop_id) : "",
    objects: (r.virtual_devices ?? []).map(toScheduleObject),
    phases: (r.stages ?? []).map(toPhase),
    createdAt: "",
  };
}

function toCondition(r: ConditionRes): AlertCondition {
  return {
    objectId: String(r.rule_virtual_device_id),
    operator: r.operator as AlertOperator,
    value: r.compare_value,
  };
}

function toRuleAction(r: RuleActionRes): PolicyAction {
  return { objectId: String(r.rule_virtual_device_id), value: r.value };
}

function toPair(r: ValuePairRes): AlertConditionActionPair {
  return {
    id: String(r.id),
    name: r.name ?? "",
    conditions: (r.conditions ?? []).map(toCondition),
    actions: (r.actions ?? []).map(toRuleAction),
  };
}

function toRule(r: RuleDetailRes): AlertRule {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    fruitId: r.crop_id != null ? String(r.crop_id) : "",
    objects: (r.virtual_devices ?? []).map(toRuleObject),
    pairs: (r.value_pairs ?? []).map(toPair),
    createdAt: "",
    active: true,
  };
}

// --- Helper: t?o stages kèm actions -----------------------------------------

async function createStagesAndActions(
  scheduleId: string,
  phases: SchedulePhase[],
  idMap: Map<string, number>,
): Promise<void> {
  for (const phase of phases) {
    const sr = await apiFetch(`${BASE}/api/schedules/${scheduleId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: phase.name,
        start_offset: phase.offsetSeconds,
      }),
    });
    if (!sr.ok) continue;
    const stageData = await sr.json();
    for (const action of phase.actions) {
      const svdId =
        idMap.get(action.objectId) ?? (Number(action.objectId) || 0);
      if (!svdId) continue;
      await apiFetch(`${BASE}/api/stages/${stageData.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_virtual_device_id: svdId,
          value: Number(action.value),
        }),
      });
    }
  }
}

// --- Helper: t?o value_pairs kèm conditions và actions -----------------------

async function createPairsConditionsActions(
  ruleId: string,
  pairs: AlertConditionActionPair[],
  idMap: Map<string, number>,
): Promise<void> {
  for (const pair of pairs) {
    const pr = await apiFetch(`${BASE}/api/rules/${ruleId}/value-pairs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pair.name || "" }),
    });
    if (!pr.ok) continue;
    const pairData = await pr.json();

    for (const cond of pair.conditions) {
      const rvdId = idMap.get(cond.objectId) ?? (Number(cond.objectId) || 0);
      if (!rvdId) continue;
      await apiFetch(`${BASE}/api/value-pairs/${pairData.id}/conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: cond.operator,
          compare_value: cond.value,
          rule_virtual_device_id: rvdId,
        }),
      });
    }

    for (const action of pair.actions) {
      const rvdId =
        idMap.get(action.objectId) ?? (Number(action.objectId) || 0);
      if (!rvdId) continue;
      await apiFetch(`${BASE}/api/value-pairs/${pairData.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_virtual_device_id: rvdId,
          value: Number(action.value),
        }),
      });
    }
  }
}

// ------------------------------------------------------------------------------
// CROPS (? Fruit)
// ------------------------------------------------------------------------------

export async function apiFetchCrops(): Promise<Fruit[]> {
  const res = await apiFetch(`${BASE}/api/crops`);
  await throwIfError(res);
  return ((await res.json()) as CropRes[]).map(toCrop);
}

export async function apiCreateCrop(
  name: string,
  description?: string,
): Promise<Fruit> {
  const res = await apiFetch(`${BASE}/api/crops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description: description || null }),
  });
  await throwIfError(res);
  return toCrop(await res.json());
}

export async function apiUpdateCrop(
  id: string,
  name: string,
  description?: string,
): Promise<Fruit> {
  const res = await apiFetch(`${BASE}/api/crops/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description: description || null }),
  });
  await throwIfError(res);
  return toCrop(await res.json());
}

export async function apiDeleteCrop(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/crops/${id}`, { method: "DELETE" });
  await throwIfError(res);
}

// ------------------------------------------------------------------------------
// SCHEDULES
// ------------------------------------------------------------------------------

export async function apiFetchSchedules(): Promise<Schedule[]> {
  const res = await apiFetch(`${BASE}/api/schedules`);
  await throwIfError(res);
  const list = (await res.json()) as ScheduleListRes[];
  // Láº¥y chi tiáº¿t tá»«ng schedule (cÃ³ stages)
  const details = await Promise.all(
    list.map(async (item): Promise<Schedule> => {
      const r2 = await apiFetch(`${BASE}/api/schedules/${item.id}`);
      if (!r2.ok) {
        return {
          id: String(item.id),
          name: item.name,
          fruitId: item.crop_id != null ? String(item.crop_id) : "",
          objects: (item.virtual_devices ?? []).map(toScheduleObject),
          phases: [],
          createdAt: "",
        };
      }
      return toSchedule((await r2.json()) as ScheduleDetailRes);
    }),
  );
  return details;
}

export async function apiDeleteSchedule(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/schedules/${id}`, {
    method: "DELETE",
  });
  await throwIfError(res);
}

export async function apiSaveSchedule(s: Schedule): Promise<Schedule> {
  const cropId = s.fruitId ? Number(s.fruitId) || null : null;
  const objects = s.objects ?? [];
  const idMap = new Map<string, number>();
  let scheduleId: string;

  if (!s.id) {
    // T?o m?i, g?i virtual_devices inline trong body
    const res = await apiFetch(`${BASE}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: s.name,
        crop_id: cropId,
        virtual_devices: objects.map((obj) => ({
          name: obj.label,
          device_type_id: obj.deviceTypeId
            ? Number(obj.deviceTypeId) || null
            : null,
        })),
      }),
    });
    await throwIfError(res);
    const created = (await res.json()) as ScheduleDetailRes;
    scheduleId = String(created.id);
    // Map frontend object (theo th? t?) ? returned SVD id
    (created.virtual_devices ?? []).forEach((svd, i) => {
      if (objects[i]) idMap.set(objects[i].id, svd.id);
    });
  } else {
    scheduleId = s.id;
    // C?p nh?t metadata
    const res = await apiFetch(`${BASE}/api/schedules/${scheduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: s.name, crop_id: cropId }),
    });
    await throwIfError(res);

    // Xóa t?t c? stages hi?n t?i (cascade xóa actions) tru?c khi sync SVDs
    const stagesRes = await apiFetch(
      `${BASE}/api/schedules/${scheduleId}/stages`,
    );
    if (stagesRes.ok) {
      const stages = (await stagesRes.json()) as StageRes[];
      await Promise.all(
        stages.map((st) =>
          apiFetch(`${BASE}/api/stages/${st.id}`, { method: "DELETE" }),
        ),
      );
    }

    // L?y SVDs hi?n t?i
    const vdRes = await apiFetch(
      `${BASE}/api/schedules/${scheduleId}/virtual-devices`,
    );
    const oldSVDs: SvdRes[] = vdRes.ok ? await vdRes.json() : [];
    const oldSvdIds = new Set(oldSVDs.map((v) => v.id));

    // Xác d?nh SVDs c?n gi? (id là s? và t?n t?i trong DB)
    const keepIds = new Set<number>();
    for (const obj of objects) {
      const numId = Number(obj.id);
      if (numId > 0 && oldSvdIds.has(numId)) {
        idMap.set(obj.id, numId);
        keepIds.add(numId);
      }
    }

    // Xóa SVDs không còn dùng
    const deleteResults = await Promise.all(
      [...oldSvdIds]
        .filter((id) => !keepIds.has(id))
        .map((id) =>
          apiFetch(`${BASE}/api/schedule-virtual-devices/${id}`, {
            method: "DELETE",
          }),
        ),
    );
    const failedDelete = deleteResults.find((r) => !r.ok && r.status !== 404);
    if (failedDelete) {
      const err = await failedDelete
        .json()
        .catch(() => ({ detail: `HTTP ${failedDelete.status}` }));
      throw new Error(
        err.detail ?? `Không thể xóa thiết bị ảo: HTTP ${failedDelete.status}`,
      );
    }

    // T?o SVDs m?i
    for (const obj of objects) {
      const numId = Number(obj.id);
      if (!numId || !oldSvdIds.has(numId)) {
        const r = await apiFetch(
          `${BASE}/api/schedules/${scheduleId}/virtual-devices`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: obj.label,
              device_type_id: obj.deviceTypeId
                ? Number(obj.deviceTypeId) || null
                : null,
            }),
          },
        );
        if (r.ok) {
          const svd: SvdRes = await r.json();
          idMap.set(obj.id, svd.id);
        }
      }
    }
  }

  // T?o l?i t?t c? stages và actions
  await createStagesAndActions(scheduleId, s.phases, idMap);

  // L?y l?i d? li?u c?p nh?t
  const r2 = await apiFetch(`${BASE}/api/schedules/${scheduleId}`);
  await throwIfError(r2);
  return toSchedule((await r2.json()) as ScheduleDetailRes);
}

// ------------------------------------------------------------------------------
// RULES (? AlertRule)
// ------------------------------------------------------------------------------

export async function apiFetchRules(): Promise<AlertRule[]> {
  const res = await apiFetch(`${BASE}/api/rules`);
  await throwIfError(res);
  const list = (await res.json()) as RuleListRes[];
  const details = await Promise.all(
    list.map(async (item): Promise<AlertRule> => {
      const r2 = await apiFetch(`${BASE}/api/rules/${item.id}`);
      if (!r2.ok) {
        return {
          id: String(item.id),
          name: item.name,
          description: item.description ?? "",
          fruitId: item.crop_id != null ? String(item.crop_id) : "",
          objects: (item.virtual_devices ?? []).map(toRuleObject),
          pairs: [],
          createdAt: "",
          active: true,
        };
      }
      return toRule((await r2.json()) as RuleDetailRes);
    }),
  );
  return details;
}

export async function apiDeleteRule(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/rules/${id}`, { method: "DELETE" });
  await throwIfError(res);
}

export async function apiSaveRule(r: AlertRule): Promise<AlertRule> {
  const cropId = r.fruitId ? Number(r.fruitId) || null : null;
  const objects = r.objects ?? [];
  const idMap = new Map<string, number>();
  let ruleId: string;

  if (!r.id) {
    // T?o m?i — g?i virtual_devices inline trong body
    const res = await apiFetch(`${BASE}/api/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: r.name,
        description: r.description || null,
        crop_id: cropId,
        virtual_devices: objects.map((obj) => ({
          name: obj.label,
          device_type_id: obj.deviceTypeId
            ? Number(obj.deviceTypeId) || null
            : null,
        })),
      }),
    });
    await throwIfError(res);
    const created = (await res.json()) as RuleDetailRes;
    ruleId = String(created.id);
    // Map frontend object (theo th? t?) ? returned RVD id
    (created.virtual_devices ?? []).forEach((rvd, i) => {
      if (objects[i]) idMap.set(objects[i].id, rvd.id);
    });
  } else {
    ruleId = r.id;
    // C?p nh?t metadata
    const res = await apiFetch(`${BASE}/api/rules/${ruleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: r.name,
        description: r.description || null,
        crop_id: cropId,
      }),
    });
    await throwIfError(res);

    // Xóa t?t c? value_pairs hi?n t?i (cascade xóa conditions + actions) tru?c khi sync RVDs
    const pairsRes = await apiFetch(`${BASE}/api/rules/${ruleId}/value-pairs`);
    if (pairsRes.ok) {
      const currentPairs = (await pairsRes.json()) as ValuePairRes[];
      await Promise.all(
        currentPairs.map((p) =>
          apiFetch(`${BASE}/api/value-pairs/${p.id}`, { method: "DELETE" }),
        ),
      );
    }

    // L?y RVDs hi?n t?i
    const vdRes = await apiFetch(`${BASE}/api/rules/${ruleId}/virtual-devices`);
    const oldRVDs: RvdRes[] = vdRes.ok ? await vdRes.json() : [];
    const oldRvdIds = new Set(oldRVDs.map((v) => v.id));

    // Xác d?nh RVDs c?n gi?
    const keepIds = new Set<number>();
    for (const obj of objects) {
      const numId = Number(obj.id);
      if (numId > 0 && oldRvdIds.has(numId)) {
        idMap.set(obj.id, numId);
        keepIds.add(numId);
      }
    }

    // Xóa RVDs không còn dùng
    await Promise.all(
      [...oldRvdIds]
        .filter((id) => !keepIds.has(id))
        .map((id) =>
          apiFetch(`${BASE}/api/rule-virtual-devices/${id}`, {
            method: "DELETE",
          }),
        ),
    );

    // T?o RVDs m?i
    for (const obj of objects) {
      const numId = Number(obj.id);
      if (!numId || !oldRvdIds.has(numId)) {
        const rv = await apiFetch(
          `${BASE}/api/rules/${ruleId}/virtual-devices`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: obj.label,
              device_type_id: obj.deviceTypeId
                ? Number(obj.deviceTypeId) || null
                : null,
            }),
          },
        );
        if (rv.ok) {
          const rvd: RvdRes = await rv.json();
          idMap.set(obj.id, rvd.id);
        }
      }
    }
  }

  // T?o l?i t?t c? value_pairs, conditions, actions
  await createPairsConditionsActions(ruleId, r.pairs, idMap);

  // L?y l?i d? li?u c?p nh?t
  const r2 = await apiFetch(`${BASE}/api/rules/${ruleId}`);
  await throwIfError(r2);
  return toRule((await r2.json()) as RuleDetailRes);
}
