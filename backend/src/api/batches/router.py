"""
batches/router.py
Quản lý mẻ sấy thống nhất: manual + schedule queue + rule set chạy đồng thời.

Kiến trúc:
- Mỗi mẻ có 1 main thread (chờ runtime / stop) + tối đa 2 sub-thread (schedule, rule).
- ActiveBatchState chứa toàn bộ trạng thái chia sẻ giữa các thread, bảo vệ bởi lock.
- Schedule sub-thread: chạy lần lượt local schedules trong queue.
- Rule sub-thread: polling mỗi POLL_INTERVAL, đánh giá tất cả local rules đồng thời.
- Manual control luôn khả dụng (gửi lệnh trực tiếp qua device_manager).
- Dynamic add/remove schedules/rules trong khi mẻ đang chạy.
"""
import collections
import operator as op_module
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log, get_device_name
from src.model.schemas import (
    BatchAddRules,
    BatchAddSchedules,
    BatchEnd,
    BatchRuleToggle,
    BatchScheduleToggle,
    BatchStart,
)
import src.device_manager as device_manager

router = APIRouter(prefix="/api/batches", tags=["batches"])

# ─── Constants ────────────────────────────────────────────────────────────────

POLL_INTERVAL = 3  # giây — tần suất polling rule engine

_OP_MAP = {
    ">":  op_module.gt,
    "<":  op_module.lt,
    "=":  op_module.eq,
    ">=": op_module.ge,
    "<=": op_module.le,
}


# ─── Active batch state ──────────────────────────────────────────────────────

@dataclass
class ActiveBatchState:
    batch_id: int
    dryer_id: int
    runtime: Optional[int]
    stop_event: threading.Event = field(default_factory=threading.Event)
    lock: threading.Lock = field(default_factory=threading.Lock)

    # Schedule
    schedule_enabled: bool = False
    schedule_queue: collections.deque = field(default_factory=collections.deque)
    schedule_wake: threading.Event = field(default_factory=threading.Event)
    schedule_thread: Optional[threading.Thread] = None
    schedule_cancel: threading.Event = field(default_factory=threading.Event)

    # Rules
    rule_enabled: bool = False
    rule_set: List[Tuple[int, int, int]] = field(default_factory=list)  # [(batch_rule_set_id, local_rule_id, rule_id)]
    rule_wake: threading.Event = field(default_factory=threading.Event)
    rule_thread: Optional[threading.Thread] = None


_active_batches: Dict[int, ActiveBatchState] = {}
_ab_lock = threading.Lock()


# ─── DB helpers ───────────────────────────────────────────────────────────────

def _get_dryer_controllers(dryer_id: int) -> List[str]:
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT d.id FROM devices d
               JOIN device_types dt ON dt.id = d.type_id
               WHERE d.dryer_id = %s AND dt.category = 'controller'""",
            (dryer_id,),
        )
        return [row[0] for row in cur.fetchall()]
    finally:
        conn.close()


def _turn_off_dryer(dryer_id: int) -> None:
    for device_id in _get_dryer_controllers(dryer_id):
        try:
            ok = device_manager.set_device_value(device_id, 0.0)
            if not ok:
                print(f"[batches] Không thể tắt {device_id} (chưa đăng ký)")
        except Exception as e:
            print(f"[batches] Lỗi tắt {device_id}: {e}")


def _get_stages_with_actions(schedule_id: int) -> List[dict]:
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, start_offset, name FROM stages WHERE schedule_id = %s ORDER BY start_offset",
            (schedule_id,),
        )
        stages = cur.fetchall()
        for stage in stages:
            cur.execute(
                "SELECT schedule_virtual_device_id, value FROM schedule_actions WHERE stage_id = %s",
                (stage["id"],),
            )
            stage["actions"] = cur.fetchall()
        return stages
    finally:
        conn.close()


def _get_rule_value_pairs(rule_id: int) -> List[dict]:
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, name FROM value_pairs WHERE rule_id = %s ORDER BY id",
            (rule_id,),
        )
        pairs = cur.fetchall()
        for pair in pairs:
            cur.execute(
                "SELECT rule_virtual_device_id, operator, compare_value FROM conditions WHERE value_pair_id = %s",
                (pair["id"],),
            )
            pair["conditions"] = cur.fetchall()
            cur.execute(
                "SELECT rule_virtual_device_id, value FROM rule_actions WHERE value_pair_id = %s",
                (pair["id"],),
            )
            pair["actions"] = cur.fetchall()
        return pairs
    finally:
        conn.close()


def _get_local_schedule_mapping(local_schedule_id: int) -> Dict[int, str]:
    """Load device mapping for a local schedule: {schedule_virtual_device_id: device_id}"""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT schedule_virtual_device_id, device_id FROM local_schedule_device_mapping WHERE local_schedule_id = %s",
            (local_schedule_id,),
        )
        return {row[0]: row[1] for row in cur.fetchall()}
    finally:
        conn.close()


def _get_local_rule_mapping(local_rule_id: int) -> Dict[int, str]:
    """Load device mapping for a local rule: {rule_virtual_device_id: device_id}"""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT rule_virtual_device_id, device_id FROM local_rule_device_mapping WHERE local_rule_id = %s",
            (local_rule_id,),
        )
        return {row[0]: row[1] for row in cur.fetchall()}
    finally:
        conn.close()


def _get_local_schedule_info(local_schedule_id: int) -> Optional[dict]:
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT ls.id, ls.schedule_id, ls.dryer_id, ls.name FROM local_schedules ls WHERE ls.id = %s",
            (local_schedule_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


# ─── Condition evaluator ──────────────────────────────────────────────────────

def _check_conditions(
    conditions: List[dict],
    rvd_to_device: Dict[int, str],
    latest: Dict[str, Optional[float]],
) -> bool:
    if not conditions:
        return False
    for cond in conditions:
        dev_id = rvd_to_device.get(cond["rule_virtual_device_id"])
        if dev_id is None:
            return False
        val = latest.get(dev_id)
        if val is None:
            return False
        compare_fn = _OP_MAP.get(cond["operator"])
        if compare_fn is None or not compare_fn(val, float(cond["compare_value"])):
            return False
    return True


# ─── Queue entry DB update ────────────────────────────────────────────────────

def _update_queue_entry_status(queue_entry_id: int, status: str) -> None:
    conn = get_db()
    try:
        cur = conn.cursor()
        if status == 'running':
            cur.execute(
                "UPDATE batch_schedule_queue SET status = %s, started_at = NOW() WHERE id = %s",
                (status, queue_entry_id),
            )
        elif status in ('completed', 'cancelled'):
            cur.execute(
                "UPDATE batch_schedule_queue SET status = %s, completed_at = NOW() WHERE id = %s",
                (status, queue_entry_id),
            )
        else:
            cur.execute(
                "UPDATE batch_schedule_queue SET status = %s WHERE id = %s",
                (status, queue_entry_id),
            )
        conn.commit()
    finally:
        conn.close()


# ─── Background workers ──────────────────────────────────────────────────────

def _run_main_batch(state: ActiveBatchState) -> None:
    """Main batch thread: waits for runtime or stop_event, then cleans up."""
    if state.runtime is not None:
        state.stop_event.wait(state.runtime)
    else:
        state.stop_event.wait()

    # Signal sub-threads to stop
    state.stop_event.set()
    state.schedule_cancel.set()
    state.schedule_wake.set()
    state.rule_wake.set()

    # Wait for sub-threads to finish
    with state.lock:
        sched_t = state.schedule_thread
        rule_t = state.rule_thread
    if sched_t and sched_t.is_alive():
        sched_t.join(timeout=10)
    if rule_t and rule_t.is_alive():
        rule_t.join(timeout=10)

    with _ab_lock:
        _active_batches.pop(state.batch_id, None)

    print(f"[batches] Batch {state.batch_id} main thread kết thúc")


def _run_schedule_worker(state: ActiveBatchState) -> None:
    """Schedule sub-thread: executes local schedules from queue sequentially."""
    while not state.stop_event.is_set():
        # Get next queue entry
        entry = None
        with state.lock:
            if not state.schedule_enabled:
                break
            if state.schedule_queue:
                entry = state.schedule_queue.popleft()

        if entry is None:
            state.schedule_wake.clear()
            state.schedule_wake.wait(timeout=5)
            if state.stop_event.is_set():
                break
            continue

        queue_entry_id, local_schedule_id = entry

        # Load local schedule info
        ls_info = _get_local_schedule_info(local_schedule_id)
        if not ls_info:
            _update_queue_entry_status(queue_entry_id, 'cancelled')
            continue

        schedule_id = ls_info["schedule_id"]
        svd_to_device = _get_local_schedule_mapping(local_schedule_id)
        stages = _get_stages_with_actions(schedule_id)

        _update_queue_entry_status(queue_entry_id, 'running')
        state.schedule_cancel.clear()

        write_system_log("SCHEDULE_STAGE", "info",
                         f"Bắt đầu lịch cục bộ '{ls_info['name']}' (schedule_id={schedule_id}) | batch_id={state.batch_id}",
                         user_id=None, dryer_id=state.dryer_id)

        schedule_start = time.monotonic()
        cancelled = False

        for stage in stages:
            if state.stop_event.is_set() or state.schedule_cancel.is_set():
                cancelled = True
                break

            offset = stage["start_offset"]
            elapsed = time.monotonic() - schedule_start
            wait_sec = max(0.0, offset - elapsed)

            if wait_sec > 0:
                triggered = state.stop_event.wait(wait_sec)
                if triggered or state.schedule_cancel.is_set():
                    cancelled = True
                    break

            if state.stop_event.is_set() or state.schedule_cancel.is_set():
                cancelled = True
                break

            write_system_log("SCHEDULE_STAGE", "info",
                             f"Giai đoạn '{stage['name']}' của lịch '{ls_info['name']}' | batch_id={state.batch_id}",
                             user_id=None, dryer_id=state.dryer_id)

            for action in stage["actions"]:
                svd_id = action["schedule_virtual_device_id"]
                device_id = svd_to_device.get(svd_id)
                if device_id:
                    try:
                        device_manager.set_device_value(device_id, float(action["value"]))
                        write_system_log("SCHEDULE_ACTION", "info",
                                         f"Lịch '{ls_info['name']}' thiết lập {get_device_name(device_id)} = {action['value']} | batch_id={state.batch_id}",
                                         user_id=None, dryer_id=state.dryer_id)
                    except Exception as e:
                        print(f"[batches] Lỗi schedule action {device_id}: {e}")

        if cancelled:
            _update_queue_entry_status(queue_entry_id, 'cancelled')
        else:
            _update_queue_entry_status(queue_entry_id, 'completed')

    with state.lock:
        state.schedule_thread = None

    print(f"[batches] Batch {state.batch_id} schedule worker kết thúc")


def _run_rule_worker(state: ActiveBatchState) -> None:
    """Rule sub-thread: polls and evaluates all active local rules concurrently."""
    while not state.stop_event.is_set():
        with state.lock:
            if not state.rule_enabled:
                break
            current_rules = list(state.rule_set)

        if not current_rules:
            state.rule_wake.clear()
            state.rule_wake.wait(timeout=5)
            if state.stop_event.is_set():
                break
            continue

        triggered = state.stop_event.wait(POLL_INTERVAL)
        if triggered:
            break

        with state.lock:
            if not state.rule_enabled:
                break
            current_rules = list(state.rule_set)

        if not current_rules:
            continue

        # Collect device mappings for all local rules
        all_mappings: Dict[int, Dict[int, str]] = {}
        all_device_ids: set = set()

        for _brs_id, local_rule_id, _rule_id in current_rules:
            mapping = _get_local_rule_mapping(local_rule_id)
            all_mappings[local_rule_id] = mapping
            all_device_ids.update(mapping.values())

        # Read latest values
        latest: Dict[str, Optional[float]] = {
            dev_id: device_manager.get_latest_db_value(dev_id)
            for dev_id in all_device_ids
        }

        # Evaluate each rule in priority order
        for _brs_id, local_rule_id, rule_id in current_rules:
            if state.stop_event.is_set():
                break

            rvd_to_device = all_mappings.get(local_rule_id, {})
            pairs = _get_rule_value_pairs(rule_id)

            for pair in pairs:
                if _check_conditions(pair["conditions"], rvd_to_device, latest):
                    for action in pair["actions"]:
                        dev_id = rvd_to_device.get(action["rule_virtual_device_id"])
                        if dev_id:
                            try:
                                last_val = latest.get(dev_id)
                                if float(action["value"]) != last_val:
                                    device_manager.set_device_value(dev_id, float(action["value"]))
                                    pair_name = pair.get("name") or f"Cặp {pair['id']}"
                                    write_system_log("RULE_ALERT", "warning",
                                                     f"Rule cục bộ {local_rule_id} – \"{pair_name}\" kích hoạt | batch_id={state.batch_id}",
                                                     user_id=None, dryer_id=state.dryer_id)
                                    write_system_log("RULE_ACTION", "info",
                                                     f"Rule cục bộ {local_rule_id} thiết lập {get_device_name(dev_id)} = {action['value']} | batch_id={state.batch_id}",
                                                     user_id=None, dryer_id=state.dryer_id)
                            except Exception as e:
                                print(f"[batches] Lỗi rule action {dev_id}: {e}")
                    break  # first match per rule

    with state.lock:
        state.rule_thread = None

    print(f"[batches] Batch {state.batch_id} rule worker kết thúc")


# ─── Thread management helpers ────────────────────────────────────────────────

def _ensure_schedule_thread(state: ActiveBatchState) -> None:
    with state.lock:
        if state.schedule_thread is None or not state.schedule_thread.is_alive():
            state.schedule_enabled = True
            t = threading.Thread(
                target=_run_schedule_worker,
                args=(state,),
                daemon=True,
                name=f"batch-schedule-{state.batch_id}",
            )
            state.schedule_thread = t
            t.start()


def _ensure_rule_thread(state: ActiveBatchState) -> None:
    with state.lock:
        if state.rule_thread is None or not state.rule_thread.is_alive():
            state.rule_enabled = True
            t = threading.Thread(
                target=_run_rule_worker,
                args=(state,),
                daemon=True,
                name=f"batch-rule-{state.batch_id}",
            )
            state.rule_thread = t
            t.start()


def _get_batch_state(batch_id: int) -> ActiveBatchState:
    with _ab_lock:
        state = _active_batches.get(batch_id)
    if not state:
        raise HTTPException(status_code=404, detail="Batch not running")
    return state


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/start", status_code=201)
def start_batch(body: BatchStart, current_user: dict = Depends(get_current_user)):
    """Start a unified batch. Manual control always available. Schedule/rule added dynamically."""
    conn = get_db()
    try:
        cur = conn.cursor()

        cur.execute("SELECT id FROM dryers WHERE id = %s", (body.dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")

        # Check no active batch on this dryer
        with _ab_lock:
            for s in _active_batches.values():
                if s.dryer_id == body.dryer_id:
                    raise HTTPException(status_code=409, detail="Dryer already has an active batch")

        cur.execute(
            "INSERT INTO batches (input_weight, runtime, start_time, dryer_id, crop_id) VALUES (%s, %s, NOW(), %s, %s)",
            (body.input_weight, body.runtime, body.dryer_id, body.crop_id),
        )
        conn.commit()
        batch_id = cur.lastrowid
    finally:
        conn.close()

    state = ActiveBatchState(
        batch_id=batch_id,
        dryer_id=body.dryer_id,
        runtime=body.runtime,
    )

    with _ab_lock:
        _active_batches[batch_id] = state

    threading.Thread(
        target=_run_main_batch,
        args=(state,),
        daemon=True,
        name=f"batch-main-{batch_id}",
    ).start()

    write_system_log("START_BATCH", "info",
                     f"Bắt đầu mẻ batch_id={batch_id} tại dryer_id={body.dryer_id} runtime={body.runtime}",
                     user_id=current_user["id"], dryer_id=body.dryer_id)

    return {
        "id": batch_id,
        "dryer_id": body.dryer_id,
        "crop_id": body.crop_id,
        "input_weight": body.input_weight,
        "runtime": body.runtime,
        "status": "running",
    }


@router.put("/{batch_id}/end")
def end_batch(batch_id: int, body: BatchEnd, current_user: dict = Depends(get_current_user)):
    """End a batch: record results and turn off devices."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM batches WHERE id = %s", (batch_id,))
        batch = cur.fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch["end_time"] is not None:
            raise HTTPException(status_code=400, detail="Batch already ended")

        cur.execute(
            "UPDATE batches SET output_weight = %s, rating = %s, end_time = NOW() WHERE id = %s",
            (body.output_weight, body.rating, batch_id),
        )
        conn.commit()
        dryer_id = batch["dryer_id"]
    finally:
        conn.close()

    # Stop the batch
    with _ab_lock:
        state = _active_batches.pop(batch_id, None)
    if state:
        state.stop_event.set()
        state.schedule_cancel.set()
        state.schedule_wake.set()
        state.rule_wake.set()

    _turn_off_dryer(dryer_id)

    write_system_log("DEVICE_CONTROL", "info",
                     f"Tắt thiết bị dryer_id={dryer_id} khi kết thúc batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    write_system_log("END_BATCH", "info",
                     f"Kết thúc mẻ batch_id={batch_id} dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)

    return {"id": batch_id, "status": "ended"}


# ─── Schedule Queue Endpoints ─────────────────────────────────────────────────

@router.get("/{batch_id}/schedules")
def get_batch_schedules(batch_id: int):
    """Get schedule queue status for a batch."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """SELECT bsq.*, ls.name AS local_schedule_name, s.name AS schedule_name
               FROM batch_schedule_queue bsq
               JOIN local_schedules ls ON ls.id = bsq.local_schedule_id
               JOIN schedules s ON s.id = ls.schedule_id
               WHERE bsq.batch_id = %s ORDER BY bsq.queue_order""",
            (batch_id,),
        )
        schedules = cur.fetchall()
        cur.execute("SELECT schedule_enabled FROM batches WHERE id = %s", (batch_id,))
        batch = cur.fetchone()
        return {
            "schedules": schedules,
            "enabled": bool(batch["schedule_enabled"]) if batch else False,
        }
    finally:
        conn.close()


@router.post("/{batch_id}/schedules", status_code=201)
def add_batch_schedules(batch_id: int, body: BatchAddSchedules, current_user: dict = Depends(get_current_user)):
    """Add local schedules to the batch queue. Appends to existing queue."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute(
            "SELECT COALESCE(MAX(queue_order), 0) AS max_order FROM batch_schedule_queue WHERE batch_id = %s",
            (batch_id,),
        )
        max_order = cur.fetchone()["max_order"]

        entries = []
        for i, ls_id in enumerate(body.local_schedule_ids):
            cur.execute(
                "SELECT id, dryer_id FROM local_schedules WHERE id = %s",
                (ls_id,),
            )
            ls = cur.fetchone()
            if not ls:
                raise HTTPException(status_code=404, detail=f"Local schedule {ls_id} not found")
            if ls["dryer_id"] != state.dryer_id:
                raise HTTPException(status_code=400, detail=f"Local schedule {ls_id} does not belong to dryer {state.dryer_id}")

            order = max_order + i + 1
            cur.execute(
                "INSERT INTO batch_schedule_queue (batch_id, local_schedule_id, queue_order, status) VALUES (%s, %s, %s, 'pending')",
                (batch_id, ls_id, order),
            )
            entry_id = cur.lastrowid
            entries.append((entry_id, ls_id))

        cur.execute("UPDATE batches SET schedule_enabled = TRUE WHERE id = %s", (batch_id,))
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        for entry_id, ls_id in entries:
            state.schedule_queue.append((entry_id, ls_id))
        state.schedule_enabled = True
    state.schedule_wake.set()
    _ensure_schedule_thread(state)

    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Thêm {len(entries)} lịch vào queue batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=state.dryer_id)

    return {"added": len(entries), "batch_id": batch_id}


@router.delete("/{batch_id}/schedules/{queue_entry_id}")
def remove_batch_schedule_entry(batch_id: int, queue_entry_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a specific schedule entry from the queue."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT * FROM batch_schedule_queue WHERE id = %s AND batch_id = %s",
            (queue_entry_id, batch_id),
        )
        entry = cur.fetchone()
        if not entry:
            raise HTTPException(status_code=404, detail="Queue entry not found")

        if entry["status"] == "pending":
            cur.execute(
                "UPDATE batch_schedule_queue SET status = 'cancelled', completed_at = NOW() WHERE id = %s",
                (queue_entry_id,),
            )
            conn.commit()
            with state.lock:
                state.schedule_queue = collections.deque(
                    (eid, lsid) for eid, lsid in state.schedule_queue if eid != queue_entry_id
                )
        elif entry["status"] == "running":
            state.schedule_cancel.set()
        else:
            raise HTTPException(status_code=400, detail=f"Cannot remove entry with status '{entry['status']}'")
    finally:
        conn.close()

    return {"status": "removed", "queue_entry_id": queue_entry_id}


@router.delete("/{batch_id}/schedules")
def clear_batch_schedules(batch_id: int, current_user: dict = Depends(get_current_user)):
    """Disable all schedule control: cancel pending and running schedules."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE batch_schedule_queue SET status = 'cancelled', completed_at = NOW() WHERE batch_id = %s AND status IN ('pending', 'running')",
            (batch_id,),
        )
        cur.execute("UPDATE batches SET schedule_enabled = FALSE WHERE id = %s", (batch_id,))
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        state.schedule_enabled = False
        state.schedule_queue.clear()
    state.schedule_cancel.set()
    state.schedule_wake.set()

    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Tắt tất cả lịch trình batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=state.dryer_id)

    return {"status": "schedules_cleared", "batch_id": batch_id}


@router.put("/{batch_id}/schedules/toggle")
def toggle_batch_schedules(batch_id: int, body: BatchScheduleToggle, current_user: dict = Depends(get_current_user)):
    """Toggle schedule evaluation on/off."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE batches SET schedule_enabled = %s WHERE id = %s", (body.enabled, batch_id))
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        state.schedule_enabled = body.enabled

    if body.enabled:
        state.schedule_wake.set()
        _ensure_schedule_thread(state)
    else:
        state.schedule_wake.set()

    status = "enabled" if body.enabled else "disabled"
    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Schedule evaluation {status} cho batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=state.dryer_id)

    return {"status": status, "batch_id": batch_id}


# ─── Rule Set Endpoints ──────────────────────────────────────────────────────

@router.get("/{batch_id}/rules")
def get_batch_rules(batch_id: int):
    """Get active rules for a batch."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """SELECT brs.*, lr.name AS local_rule_name, r.name AS rule_name
               FROM batch_rule_set brs
               JOIN local_rules lr ON lr.id = brs.local_rule_id
               JOIN rules r ON r.id = lr.rule_id
               WHERE brs.batch_id = %s ORDER BY brs.priority_order""",
            (batch_id,),
        )
        rules = cur.fetchall()
        cur.execute("SELECT rule_enabled FROM batches WHERE id = %s", (batch_id,))
        batch = cur.fetchone()
        return {
            "rules": rules,
            "enabled": bool(batch["rule_enabled"]) if batch else False,
        }
    finally:
        conn.close()


@router.post("/{batch_id}/rules", status_code=201)
def add_batch_rules(batch_id: int, body: BatchAddRules, current_user: dict = Depends(get_current_user)):
    """Add local rules to the batch rule set."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute(
            "SELECT COALESCE(MAX(priority_order), 0) AS max_p FROM batch_rule_set WHERE batch_id = %s",
            (batch_id,),
        )
        max_p = cur.fetchone()["max_p"]

        added = []
        for i, lr_id in enumerate(body.local_rule_ids):
            cur.execute(
                "SELECT lr.id, lr.dryer_id, lr.rule_id FROM local_rules lr WHERE lr.id = %s",
                (lr_id,),
            )
            lr = cur.fetchone()
            if not lr:
                raise HTTPException(status_code=404, detail=f"Local rule {lr_id} not found")
            if lr["dryer_id"] != state.dryer_id:
                raise HTTPException(status_code=400, detail=f"Local rule {lr_id} does not belong to dryer {state.dryer_id}")

            cur.execute(
                "SELECT id FROM batch_rule_set WHERE batch_id = %s AND local_rule_id = %s",
                (batch_id, lr_id),
            )
            if cur.fetchone():
                continue  # skip duplicates

            priority = max_p + i + 1
            cur.execute(
                "INSERT INTO batch_rule_set (batch_id, local_rule_id, priority_order) VALUES (%s, %s, %s)",
                (batch_id, lr_id, priority),
            )
            brs_id = cur.lastrowid
            added.append((brs_id, lr_id, lr["rule_id"]))

        cur.execute("UPDATE batches SET rule_enabled = TRUE WHERE id = %s", (batch_id,))
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        for brs_id, lr_id, rule_id in added:
            state.rule_set.append((brs_id, lr_id, rule_id))
        state.rule_enabled = True
    state.rule_wake.set()
    _ensure_rule_thread(state)

    write_system_log("RULE_CHANGE", "info",
                     f"Thêm {len(added)} rule vào batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=state.dryer_id)

    return {"added": len(added), "batch_id": batch_id}


@router.delete("/{batch_id}/rules/{local_rule_id}")
def remove_batch_rule(batch_id: int, local_rule_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a specific local rule from the batch rule set."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM batch_rule_set WHERE batch_id = %s AND local_rule_id = %s",
            (batch_id, local_rule_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not in batch rule set")
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        state.rule_set = [
            (brs_id, lr_id, rule_id)
            for brs_id, lr_id, rule_id in state.rule_set
            if lr_id != local_rule_id
        ]

    return {"status": "removed", "local_rule_id": local_rule_id}


@router.put("/{batch_id}/rules/toggle")
def toggle_batch_rules(batch_id: int, body: BatchRuleToggle, current_user: dict = Depends(get_current_user)):
    """Toggle rule evaluation on/off."""
    state = _get_batch_state(batch_id)

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE batches SET rule_enabled = %s WHERE id = %s", (body.enabled, batch_id))
        conn.commit()
    finally:
        conn.close()

    with state.lock:
        state.rule_enabled = body.enabled

    if body.enabled:
        state.rule_wake.set()
        _ensure_rule_thread(state)
    else:
        state.rule_wake.set()

    status = "enabled" if body.enabled else "disabled"
    write_system_log("RULE_CHANGE", "info",
                     f"Rule evaluation {status} cho batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=state.dryer_id)

    return {"status": status, "batch_id": batch_id}
