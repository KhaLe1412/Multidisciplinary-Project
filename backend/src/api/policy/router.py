from fastapi import APIRouter, HTTPException, Depends
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import (
    CropCreate, CropUpdate,
    ScheduleVirtualDeviceCreate, ScheduleVirtualDeviceUpdate,
    RuleVirtualDeviceCreate, RuleVirtualDeviceUpdate,
    ScheduleCreate, ScheduleUpdate,
    StageCreate, StageUpdate,
    ScheduleActionCreate, ScheduleActionUpdate,
    RuleCreate, RuleUpdate,
    ValuePairCreate, ValuePairUpdate,
    ConditionCreate, ConditionUpdate,
    RuleActionCreate, RuleActionUpdate,
)

router = APIRouter(prefix="/api", tags=["policy"])

VALID_OPERATORS = {">", "<", "=", ">=", "<="}


# ══════════════════════════════════════════════════════════════════════════════
# CROPS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/crops")
def list_crops():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM crops ORDER BY id")
        return cur.fetchall()
    finally:
        conn.close()


@router.get("/crops/{crop_id}")
def get_crop(crop_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM crops WHERE id = %s", (crop_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Crop not found")
        return row
    finally:
        conn.close()


@router.post("/crops", status_code=201)
def create_crop(body: CropCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO crops (name, description) VALUES (%s, %s)",
            (body.name, body.description),
        )
        conn.commit()
        write_system_log("CROP_CHANGE", "info", f"Crop '{body.name}', crop_id: {cur.lastrowid} được tạo", user_id=current_user["id"])
        return {"id": cur.lastrowid, **body.model_dump()}
    finally:
        conn.close()


@router.put("/crops/{crop_id}")
def update_crop(crop_id: int, body: CropUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM crops WHERE id = %s", (crop_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Crop not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE crops SET {clause} WHERE id = %s", (*updates.values(), crop_id))
            conn.commit()
        write_system_log("CROP_CHANGE", "info", f"Crop '{updates.get('name', 'id ' + str(crop_id))}', crop_id: {crop_id} được cập nhật", user_id=current_user["id"])
        cur.execute("SELECT * FROM crops WHERE id = %s", (crop_id,))
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/crops/{crop_id}", status_code=204)
def delete_crop(crop_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        # Kiểm tra ràng buộc schedule và rule
        cur.execute("SELECT COUNT(*) FROM schedules WHERE crop_id = %s", (crop_id,))
        if cur.fetchone()[0] > 0:
            raise HTTPException(status_code=409, detail="Crop đang được dùng bởi schedule, không thể xoá")
        cur.execute("SELECT COUNT(*) FROM rules WHERE crop_id = %s", (crop_id,))
        if cur.fetchone()[0] > 0:
            raise HTTPException(status_code=409, detail="Crop đang được dùng bởi rule, không thể xoá")
        cur.execute("DELETE FROM crops WHERE id = %s", (crop_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Crop không tồn tại")
        conn.commit()
        write_system_log("CROP_CHANGE", "warning", f"Crop id: {crop_id} được xoá", user_id=current_user["id"])
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# SCHEDULE VIRTUAL DEVICES (standalone CRUD)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/schedule-virtual-devices/{svd_id}")
def get_schedule_virtual_device(svd_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Schedule virtual device not found")
        return row
    finally:
        conn.close()


@router.put("/schedule-virtual-devices/{svd_id}")
def update_schedule_virtual_device(svd_id: int, body: ScheduleVirtualDeviceUpdate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule virtual device not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE schedule_virtual_devices SET {clause} WHERE id = %s",
                (*updates.values(), svd_id),
            )
            conn.commit()
        cur.execute("SELECT * FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/schedule-virtual-devices/{svd_id}", status_code=204)
def delete_schedule_virtual_device(svd_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, schedule_id FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        svd = cur.fetchone()
        if not svd:
            raise HTTPException(status_code=404, detail="Schedule virtual device not found")
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM schedule_actions WHERE schedule_virtual_device_id = %s", (svd_id,)
        )
        if cur.fetchone()["cnt"] > 0:
            raise HTTPException(
                status_code=409,
                detail="Schedule virtual device đang được dùng bởi schedule actions, không thể xoá",
            )
        # Clean up local schedules that reference this virtual device
        cur.execute(
            "SELECT DISTINCT local_schedule_id FROM local_schedule_device_mapping WHERE schedule_virtual_device_id = %s",
            (svd_id,),
        )
        orphan_ids = [r["local_schedule_id"] for r in cur.fetchall()]
        if orphan_ids:
            placeholders = ",".join(["%s"] * len(orphan_ids))
            cur.execute(f"DELETE FROM local_schedule_device_mapping WHERE local_schedule_id IN ({placeholders})", tuple(orphan_ids))
            cur.execute(f"DELETE FROM local_schedules WHERE id IN ({placeholders})", tuple(orphan_ids))
        # Xóa mapping lịch sử mẻ sấy trước khi xóa SVD
        cur.execute(
            "DELETE FROM batch_schedule_device_mapping WHERE schedule_virtual_device_id = %s",
            (svd_id,),
        )
        cur.execute("DELETE FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# RULE VIRTUAL DEVICES (standalone CRUD)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/rule-virtual-devices/{rvd_id}")
def get_rule_virtual_device(rvd_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rule virtual device not found")
        return row
    finally:
        conn.close()


@router.put("/rule-virtual-devices/{rvd_id}")
def update_rule_virtual_device(rvd_id: int, body: RuleVirtualDeviceUpdate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule virtual device not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE rule_virtual_devices SET {clause} WHERE id = %s",
                (*updates.values(), rvd_id),
            )
            conn.commit()
        cur.execute("SELECT * FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/rule-virtual-devices/{rvd_id}", status_code=204)
def delete_rule_virtual_device(rvd_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, rule_id FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        rvd = cur.fetchone()
        if not rvd:
            raise HTTPException(status_code=404, detail="Rule virtual device not found")
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM conditions WHERE rule_virtual_device_id = %s", (rvd_id,)
        )
        if cur.fetchone()["cnt"] > 0:
            raise HTTPException(
                status_code=409,
                detail="Rule virtual device đang được dùng bởi conditions, không thể xoá",
            )
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM rule_actions WHERE rule_virtual_device_id = %s", (rvd_id,)
        )
        if cur.fetchone()["cnt"] > 0:
            raise HTTPException(
                status_code=409,
                detail="Rule virtual device đang được dùng bởi rule actions, không thể xoá",
            )
        # Clean up local rules that reference this virtual device
        cur.execute(
            "SELECT DISTINCT local_rule_id FROM local_rule_device_mapping WHERE rule_virtual_device_id = %s",
            (rvd_id,),
        )
        orphan_ids = [r["local_rule_id"] for r in cur.fetchall()]
        if orphan_ids:
            placeholders = ",".join(["%s"] * len(orphan_ids))
            cur.execute(f"DELETE FROM local_rule_device_mapping WHERE local_rule_id IN ({placeholders})", tuple(orphan_ids))
            cur.execute(f"DELETE FROM local_rules WHERE id IN ({placeholders})", tuple(orphan_ids))
        cur.execute("DELETE FROM batch_rule_device_mapping WHERE rule_virtual_device_id = %s", (rvd_id,))
        cur.execute("DELETE FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# SCHEDULES
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_schedule(cur, schedule_id: int):
    """Lấy schedule kèm virtual_devices và stages (với actions)."""
    cur.execute("SELECT * FROM schedules WHERE id = %s", (schedule_id,))
    sch = cur.fetchone()
    if not sch:
        return None
    # virtual devices (inline trong schedule_virtual_devices)
    cur.execute(
        "SELECT * FROM schedule_virtual_devices WHERE schedule_id = %s ORDER BY id",
        (schedule_id,),
    )
    sch["virtual_devices"] = cur.fetchall()
    # stages + actions
    cur.execute("SELECT * FROM stages WHERE schedule_id = %s ORDER BY start_offset", (schedule_id,))
    stages = cur.fetchall()
    for stage in stages:
        cur.execute(
            """SELECT sa.*, svd.name AS virtual_device_name
               FROM schedule_actions sa
               JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
               WHERE sa.stage_id = %s""",
            (stage["id"],),
        )
        stage["actions"] = cur.fetchall()
    sch["stages"] = stages
    return sch


@router.get("/schedules")
def list_schedules():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM schedules ORDER BY id")
        schedules = cur.fetchall()
        for sch in schedules:
            cur.execute(
                "SELECT * FROM schedule_virtual_devices WHERE schedule_id = %s ORDER BY id",
                (sch["id"],),
            )
            sch["virtual_devices"] = cur.fetchall()
            cur.execute("SELECT COUNT(*) AS cnt FROM stages WHERE schedule_id = %s", (sch["id"],))
            sch["stage_count"] = cur.fetchone()["cnt"]
        return schedules
    finally:
        conn.close()


@router.get("/schedules/{schedule_id}")
def get_schedule(schedule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        sch = _fetch_schedule(cur, schedule_id)
        if not sch:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return sch
    finally:
        conn.close()


@router.post("/schedules", status_code=201)
def create_schedule(body: ScheduleCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        # Kiểm tra crop tồn tại (nếu có)
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")
        cur.execute("INSERT INTO schedules (name, crop_id) VALUES (%s, %s)", (body.name, body.crop_id))
        schedule_id = cur.lastrowid
        # Tạo inline virtual devices
        for vd in (body.virtual_devices or []):
            cur.execute(
                "INSERT INTO schedule_virtual_devices (schedule_id, name, device_type_id) VALUES (%s, %s, %s)",
                (schedule_id, vd.name, vd.device_type_id),
            )
        conn.commit()
        write_system_log("SCHEDULE_CHANGE", "info", f"Schedule '{body.name}', schedule_id: {schedule_id} được tạo", user_id=current_user["id"])
        return _fetch_schedule(cur, schedule_id)
    finally:
        conn.close()


@router.put("/schedules/{schedule_id}")
def update_schedule(schedule_id: int, body: ScheduleUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE schedules SET {clause} WHERE id = %s", (*updates.values(), schedule_id))
            conn.commit()
            write_system_log("SCHEDULE_CHANGE", "info", f"Schedule '{updates.get('name', 'id ' + str(schedule_id))}', schedule_id: {schedule_id} được cập nhật", user_id=current_user["id"])
        return _fetch_schedule(cur, schedule_id)
    finally:
        conn.close()


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        # Cascade: actions → stages → schedule_virtual_devices → mapping → schedule
        # Also clean up local_schedules referencing this schedule
        cur.execute(
            "DELETE FROM local_schedule_device_mapping WHERE local_schedule_id IN (SELECT id FROM local_schedules WHERE schedule_id = %s)",
            (schedule_id,),
        )
        cur.execute("DELETE FROM local_schedules WHERE schedule_id = %s", (schedule_id,))
        cur.execute(
            "DELETE sa FROM schedule_actions sa JOIN stages s ON s.id = sa.stage_id WHERE s.schedule_id = %s",
            (schedule_id,),
        )
        cur.execute("DELETE FROM stages WHERE schedule_id = %s", (schedule_id,))
        cur.execute("DELETE FROM batch_schedule_device_mapping WHERE schedule_id = %s", (schedule_id,))
        cur.execute("DELETE FROM schedule_virtual_devices WHERE schedule_id = %s", (schedule_id,))
        cur.execute("DELETE FROM schedules WHERE id = %s", (schedule_id,))
        conn.commit()
        write_system_log("SCHEDULE_CHANGE", "warning", f"Schedule id: {schedule_id} được xoá", user_id=current_user["id"])
    finally:
        conn.close()


# ── Schedule ↔ Virtual Device links ──────────────────────────────────────────

@router.get("/schedules/{schedule_id}/virtual-devices")
def list_schedule_virtual_devices(schedule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        cur.execute(
            "SELECT * FROM schedule_virtual_devices WHERE schedule_id = %s ORDER BY id",
            (schedule_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@router.post("/schedules/{schedule_id}/virtual-devices", status_code=201)
def create_schedule_virtual_device(schedule_id: int, body: ScheduleVirtualDeviceCreate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        cur.execute(
            "INSERT INTO schedule_virtual_devices (schedule_id, name, device_type_id) VALUES (%s, %s, %s)",
            (schedule_id, body.name, body.device_type_id),
        )
        conn.commit()
        svd_id = cur.lastrowid
        cur.execute("SELECT * FROM schedule_virtual_devices WHERE id = %s", (svd_id,))
        return cur.fetchone()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# STAGES
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_stage(cur, stage_id: int):
    cur.execute("SELECT * FROM stages WHERE id = %s", (stage_id,))
    stage = cur.fetchone()
    if not stage:
        return None
    cur.execute(
        """SELECT sa.*, svd.name AS virtual_device_name
           FROM schedule_actions sa
           JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
           WHERE sa.stage_id = %s""",
        (stage_id,),
    )
    stage["actions"] = cur.fetchall()
    return stage


@router.get("/schedules/{schedule_id}/stages")
def list_stages(schedule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        cur.execute("SELECT * FROM stages WHERE schedule_id = %s ORDER BY start_offset", (schedule_id,))
        stages = cur.fetchall()
        for stage in stages:
            cur.execute(
                """SELECT sa.*, svd.name AS virtual_device_name
                   FROM schedule_actions sa
                   JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
                   WHERE sa.stage_id = %s""",
                (stage["id"],),
            )
            stage["actions"] = cur.fetchall()
        return stages
    finally:
        conn.close()


@router.get("/stages/{stage_id}")
def get_stage(stage_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        stage = _fetch_stage(cur, stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found")
        return stage
    finally:
        conn.close()


@router.post("/schedules/{schedule_id}/stages", status_code=201)
def create_stage(schedule_id: int, body: StageCreate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedules WHERE id = %s", (schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        cur.execute(
            "INSERT INTO stages (schedule_id, name, start_offset) VALUES (%s, %s, %s)",
            (schedule_id, body.name, body.start_offset),
        )
        conn.commit()
        return _fetch_stage(cur, cur.lastrowid)
    finally:
        conn.close()


@router.put("/stages/{stage_id}")
def update_stage(stage_id: int, body: StageUpdate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        if not _fetch_stage(cur, stage_id):
            raise HTTPException(status_code=404, detail="Stage not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE stages SET {clause} WHERE id = %s", (*updates.values(), stage_id))
            conn.commit()
        return _fetch_stage(cur, stage_id)
    finally:
        conn.close()


@router.delete("/stages/{stage_id}", status_code=204)
def delete_stage(stage_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM stages WHERE id = %s", (stage_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Stage not found")
        cur.execute("DELETE FROM schedule_actions WHERE stage_id = %s", (stage_id,))
        cur.execute("DELETE FROM stages WHERE id = %s", (stage_id,))
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# SCHEDULE ACTIONS (hành động trong stage)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/stages/{stage_id}/actions")
def list_stage_actions(stage_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM stages WHERE id = %s", (stage_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Stage not found")
        cur.execute(
            """SELECT sa.*, svd.name AS virtual_device_name
               FROM schedule_actions sa
               JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
               WHERE sa.stage_id = %s""",
            (stage_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@router.post("/stages/{stage_id}/actions", status_code=201)
def create_stage_action(stage_id: int, body: ScheduleActionCreate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM stages WHERE id = %s", (stage_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Stage not found")
        cur.execute(
            "SELECT id FROM schedule_virtual_devices WHERE id = %s",
            (body.schedule_virtual_device_id,),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule virtual device not found")
        cur.execute(
            "INSERT INTO schedule_actions (stage_id, schedule_virtual_device_id, value) VALUES (%s, %s, %s)",
            (stage_id, body.schedule_virtual_device_id, body.value),
        )
        conn.commit()
        action_id = cur.lastrowid
        cur.execute(
            """SELECT sa.*, svd.name AS virtual_device_name
               FROM schedule_actions sa
               JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
               WHERE sa.id = %s""",
            (action_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.put("/schedule-actions/{action_id}")
def update_stage_action(action_id: int, body: ScheduleActionUpdate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM schedule_actions WHERE id = %s", (action_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule action not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE schedule_actions SET {clause} WHERE id = %s", (*updates.values(), action_id)
            )
            conn.commit()
        cur.execute(
            """SELECT sa.*, svd.name AS virtual_device_name
               FROM schedule_actions sa
               JOIN schedule_virtual_devices svd ON svd.id = sa.schedule_virtual_device_id
               WHERE sa.id = %s""",
            (action_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/schedule-actions/{action_id}", status_code=204)
def delete_stage_action(action_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM schedule_actions WHERE id = %s", (action_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Schedule action not found")
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# RULES
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_rule(cur, rule_id: int):
    cur.execute("SELECT * FROM rules WHERE id = %s", (rule_id,))
    rule = cur.fetchone()
    if not rule:
        return None
    # virtual devices (inline trong rule_virtual_devices)
    cur.execute(
        "SELECT * FROM rule_virtual_devices WHERE rule_id = %s ORDER BY id",
        (rule_id,),
    )
    rule["virtual_devices"] = cur.fetchall()
    # value_pairs + conditions + actions
    cur.execute("SELECT * FROM value_pairs WHERE rule_id = %s ORDER BY id", (rule_id,))
    pairs = cur.fetchall()
    for pair in pairs:
        cur.execute(
            """SELECT c.*, rvd.name AS virtual_device_name
               FROM conditions c
               JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
               WHERE c.value_pair_id = %s""",
            (pair["id"],),
        )
        pair["conditions"] = cur.fetchall()
        cur.execute(
            """SELECT ra.*, rvd.name AS virtual_device_name
               FROM rule_actions ra
               JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
               WHERE ra.value_pair_id = %s""",
            (pair["id"],),
        )
        pair["actions"] = cur.fetchall()
    rule["value_pairs"] = pairs
    return rule


@router.get("/rules")
def list_rules():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM rules ORDER BY id")
        rules = cur.fetchall()
        for rule in rules:
            cur.execute(
                "SELECT * FROM rule_virtual_devices WHERE rule_id = %s ORDER BY id",
                (rule["id"],),
            )
            rule["virtual_devices"] = cur.fetchall()
            cur.execute("SELECT COUNT(*) AS cnt FROM value_pairs WHERE rule_id = %s", (rule["id"],))
            rule["value_pair_count"] = cur.fetchone()["cnt"]
        return rules
    finally:
        conn.close()


@router.get("/rules/{rule_id}")
def get_rule(rule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        rule = _fetch_rule(cur, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return rule
    finally:
        conn.close()


@router.post("/rules", status_code=201)
def create_rule(body: RuleCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        # Kiểm tra crop tồn tại (nếu có)
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")
        cur.execute(
            "INSERT INTO rules (name, description, crop_id) VALUES (%s, %s, %s)",
            (body.name, body.description, body.crop_id),
        )
        rule_id = cur.lastrowid
        # Tạo inline virtual devices
        for vd in (body.virtual_devices or []):
            cur.execute(
                "INSERT INTO rule_virtual_devices (rule_id, name, device_type_id) VALUES (%s, %s, %s)",
                (rule_id, vd.name, vd.device_type_id),
            )
        conn.commit()
        write_system_log("RULE_CHANGE", "info", f"Rule '{body.name}', rule_id: {rule_id} được tạo", user_id=current_user["id"])
        return _fetch_rule(cur, rule_id)
    finally:
        conn.close()


@router.put("/rules/{rule_id}")
def update_rule(rule_id: int, body: RuleUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        if not _fetch_rule(cur, rule_id):
            raise HTTPException(status_code=404, detail="Rule not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE rules SET {clause} WHERE id = %s", (*updates.values(), rule_id))
            conn.commit()
        write_system_log("RULE_CHANGE", "info", f"Rule '{updates.get('name', 'id ' + str(rule_id))}', rule_id: {rule_id} được cập nhật", user_id=current_user["id"])
        return _fetch_rule(cur, rule_id)
    finally:
        conn.close()


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM rules WHERE id = %s", (rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        # Cascade: conditions → rule_actions → value_pairs → mapping → rule_virtual_devices → rule
        # Also clean up local_rules referencing this rule
        cur.execute(
            "DELETE FROM local_rule_device_mapping WHERE local_rule_id IN (SELECT id FROM local_rules WHERE rule_id = %s)",
            (rule_id,),
        )
        cur.execute("DELETE FROM local_rules WHERE rule_id = %s", (rule_id,))
        cur.execute(
            "DELETE c FROM conditions c JOIN value_pairs vp ON vp.id = c.value_pair_id WHERE vp.rule_id = %s",
            (rule_id,),
        )
        cur.execute(
            "DELETE ra FROM rule_actions ra JOIN value_pairs vp ON vp.id = ra.value_pair_id WHERE vp.rule_id = %s",
            (rule_id,),
        )
        cur.execute("DELETE FROM value_pairs WHERE rule_id = %s", (rule_id,))
        cur.execute("DELETE FROM batch_rule_device_mapping WHERE rule_id = %s", (rule_id,))
        cur.execute("DELETE FROM rule_virtual_devices WHERE rule_id = %s", (rule_id,))
        cur.execute("DELETE FROM rules WHERE id = %s", (rule_id,))
        conn.commit()
        write_system_log("RULE_CHANGE", "warning", f"Rule id: {rule_id} được xoá", user_id=current_user["id"])
    finally:
        conn.close()


# ── Rule ↔ Virtual Device links ───────────────────────────────────────────────

@router.get("/rules/{rule_id}/virtual-devices")
def list_rule_virtual_devices(rule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rules WHERE id = %s", (rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        cur.execute(
            "SELECT * FROM rule_virtual_devices WHERE rule_id = %s ORDER BY id",
            (rule_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@router.post("/rules/{rule_id}/virtual-devices", status_code=201)
def create_rule_virtual_device(rule_id: int, body: RuleVirtualDeviceCreate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rules WHERE id = %s", (rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule không tồn tại")
        cur.execute(
            "INSERT INTO rule_virtual_devices (rule_id, name, device_type_id) VALUES (%s, %s, %s)",
            (rule_id, body.name, body.device_type_id),
        )
        conn.commit()
        rvd_id = cur.lastrowid
        cur.execute("SELECT * FROM rule_virtual_devices WHERE id = %s", (rvd_id,))
        return cur.fetchone()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# VALUE PAIRS
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_value_pair(cur, pair_id: int):
    cur.execute("SELECT * FROM value_pairs WHERE id = %s", (pair_id,))
    pair = cur.fetchone()
    if not pair:
        return None
    cur.execute(
        """SELECT c.*, rvd.name AS virtual_device_name
           FROM conditions c
           JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
           WHERE c.value_pair_id = %s""",
        (pair_id,),
    )
    pair["conditions"] = cur.fetchall()
    cur.execute(
        """SELECT ra.*, rvd.name AS virtual_device_name
           FROM rule_actions ra
           JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
           WHERE ra.value_pair_id = %s""",
        (pair_id,),
    )
    pair["actions"] = cur.fetchall()
    return pair


@router.get("/rules/{rule_id}/value-pairs")
def list_value_pairs(rule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rules WHERE id = %s", (rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        cur.execute("SELECT * FROM value_pairs WHERE rule_id = %s ORDER BY id", (rule_id,))
        pairs = cur.fetchall()
        for pair in pairs:
            cur.execute(
                """SELECT c.*, rvd.name AS virtual_device_name
                   FROM conditions c
                   JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
                   WHERE c.value_pair_id = %s""",
                (pair["id"],),
            )
            pair["conditions"] = cur.fetchall()
            cur.execute(
                """SELECT ra.*, rvd.name AS virtual_device_name
                   FROM rule_actions ra
                   JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
                   WHERE ra.value_pair_id = %s""",
                (pair["id"],),
            )
            pair["actions"] = cur.fetchall()
        return pairs
    finally:
        conn.close()


@router.get("/value-pairs/{pair_id}")
def get_value_pair(pair_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        pair = _fetch_value_pair(cur, pair_id)
        if not pair:
            raise HTTPException(status_code=404, detail="Value pair not found")
        return pair
    finally:
        conn.close()


@router.post("/rules/{rule_id}/value-pairs", status_code=201)
def create_value_pair(rule_id: int, body: ValuePairCreate = None):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rules WHERE id = %s", (rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        pair_name = (body.name or "") if body else ""
        cur.execute(
            "INSERT INTO value_pairs (rule_id, name) VALUES (%s, %s)",
            (rule_id, pair_name),
        )
        conn.commit()
        return _fetch_value_pair(cur, cur.lastrowid)
    finally:
        conn.close()


@router.patch("/value-pairs/{pair_id}")
def update_value_pair(pair_id: int, body: ValuePairUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        if body.name is not None:
            cur.execute("UPDATE value_pairs SET name = %s WHERE id = %s", (body.name, pair_id))
            conn.commit()
        return _fetch_value_pair(cur, pair_id)
    finally:
        conn.close()


@router.delete("/value-pairs/{pair_id}", status_code=204)
def delete_value_pair(pair_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        cur.execute("DELETE FROM conditions WHERE value_pair_id = %s", (pair_id,))
        cur.execute("DELETE FROM rule_actions WHERE value_pair_id = %s", (pair_id,))
        cur.execute("DELETE FROM value_pairs WHERE id = %s", (pair_id,))
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# CONDITIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/value-pairs/{pair_id}/conditions")
def list_conditions(pair_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        cur.execute(
            """SELECT c.*, rvd.name AS virtual_device_name
               FROM conditions c
               JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
               WHERE c.value_pair_id = %s""",
            (pair_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@router.post("/value-pairs/{pair_id}/conditions", status_code=201)
def create_condition(pair_id: int, body: ConditionCreate):
    if body.operator not in VALID_OPERATORS:
        raise HTTPException(status_code=422, detail=f"Operator không hợp lệ. Phải là một trong: {VALID_OPERATORS}")
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        cur.execute("SELECT id FROM rule_virtual_devices WHERE id = %s", (body.rule_virtual_device_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule virtual device not found")
        cur.execute(
            "INSERT INTO conditions (value_pair_id, operator, compare_value, rule_virtual_device_id) VALUES (%s, %s, %s, %s)",
            (pair_id, body.operator, body.compare_value, body.rule_virtual_device_id),
        )
        conn.commit()
        condition_id = cur.lastrowid
        cur.execute(
            """SELECT c.*, rvd.name AS virtual_device_name
               FROM conditions c
               JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
               WHERE c.id = %s""",
            (condition_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.put("/conditions/{condition_id}")
def update_condition(condition_id: int, body: ConditionUpdate):
    if body.operator is not None and body.operator not in VALID_OPERATORS:
        raise HTTPException(status_code=422, detail=f"Operator không hợp lệ. Phải là một trong: {VALID_OPERATORS}")
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM conditions WHERE id = %s", (condition_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Condition not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE conditions SET {clause} WHERE id = %s", (*updates.values(), condition_id))
            conn.commit()
        cur.execute(
            """SELECT c.*, rvd.name AS virtual_device_name
               FROM conditions c
               JOIN rule_virtual_devices rvd ON rvd.id = c.rule_virtual_device_id
               WHERE c.id = %s""",
            (condition_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/conditions/{condition_id}", status_code=204)
def delete_condition(condition_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM conditions WHERE id = %s", (condition_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Condition not found")
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# RULE ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/value-pairs/{pair_id}/actions")
def list_rule_actions(pair_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        cur.execute(
            """SELECT ra.*, rvd.name AS virtual_device_name
               FROM rule_actions ra
               JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
               WHERE ra.value_pair_id = %s""",
            (pair_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@router.post("/value-pairs/{pair_id}/actions", status_code=201)
def create_rule_action(pair_id: int, body: RuleActionCreate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM value_pairs WHERE id = %s", (pair_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Value pair not found")
        cur.execute("SELECT id FROM rule_virtual_devices WHERE id = %s", (body.rule_virtual_device_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule virtual device not found")
        cur.execute(
            "INSERT INTO rule_actions (value_pair_id, rule_virtual_device_id, value) VALUES (%s, %s, %s)",
            (pair_id, body.rule_virtual_device_id, body.value),
        )
        conn.commit()
        action_id = cur.lastrowid
        cur.execute(
            """SELECT ra.*, rvd.name AS virtual_device_name
               FROM rule_actions ra
               JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
               WHERE ra.id = %s""",
            (action_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.put("/rule-actions/{action_id}")
def update_rule_action(action_id: int, body: RuleActionUpdate):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM rule_actions WHERE id = %s", (action_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule action not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(f"UPDATE rule_actions SET {clause} WHERE id = %s", (*updates.values(), action_id))
            conn.commit()
        cur.execute(
            """SELECT ra.*, rvd.name AS virtual_device_name
               FROM rule_actions ra
               JOIN rule_virtual_devices rvd ON rvd.id = ra.rule_virtual_device_id
               WHERE ra.id = %s""",
            (action_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.delete("/rule-actions/{action_id}", status_code=204)
def delete_rule_action(action_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM rule_actions WHERE id = %s", (action_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule action not found")
        conn.commit()
    finally:
        conn.close()
