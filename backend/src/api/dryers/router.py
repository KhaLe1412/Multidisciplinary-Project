from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import (
    DryerCreate, DryerUpdate, DeviceCreate, DeviceUpdate,
    LocalScheduleCreate, LocalScheduleUpdate,
    LocalRuleCreate, LocalRuleUpdate,
)
from datetime import date

router = APIRouter()


# ─── Dryers ───────────────────────────────────────────────────────────────────

@router.get("/api/dryers")
def list_dryers():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM dryers")
        dryers = cursor.fetchall()
        for dryer in dryers:
            cursor.execute("SELECT * FROM devices WHERE dryer_id = %s", (dryer["id"],))
            dryer["devices"] = cursor.fetchall()
        return dryers
    finally:
        conn.close()


@router.get("/api/dryers/{dryer_id}")
def get_dryer(dryer_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM dryers WHERE id = %s", (dryer_id,))
        dryer = cursor.fetchone()
        if not dryer:
            raise HTTPException(status_code=404, detail="Dryer not found")
        cursor.execute("SELECT * FROM devices WHERE dryer_id = %s", (dryer_id,))
        dryer["devices"] = cursor.fetchall()
        return dryer
    finally:
        conn.close()


@router.post("/api/dryers", status_code=201)
def create_dryer(body: DryerCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM areas WHERE id = %s", (body.area_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Area not found")
        cursor.execute(
            "INSERT INTO dryers (name, area_id, capacity, manager_id, status) VALUES (%s, %s, %s, %s, %s)",
            (body.name, body.area_id, body.capacity, body.manager_id, body.status)
        )
        conn.commit()
        new_id = cursor.lastrowid
    finally:
        conn.close()
    write_system_log("DRYER_CHANGE", "info", f"Tạo máy sấy mới: {body.name}",
                     user_id=current_user["id"], dryer_id=new_id)
    return {"id": new_id, **body.model_dump()}


@router.put("/api/dryers/{dryer_id}")
def update_dryer(dryer_id: int, body: DryerUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM dryers WHERE id = %s", (dryer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cursor.execute(
                f"UPDATE dryers SET {set_clause} WHERE id = %s",
                (*updates.values(), dryer_id)
            )
            conn.commit()
        cursor.execute("SELECT * FROM dryers WHERE id = %s", (dryer_id,))
        result = cursor.fetchone()
    finally:
        conn.close()
    write_system_log("DRYER_CHANGE", "info", f"Cập nhật máy sấy id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return result


@router.delete("/api/dryers/{dryer_id}", status_code=204)
def delete_dryer(dryer_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM devices WHERE dryer_id = %s", (dryer_id,))
        cursor.execute("DELETE FROM dryers WHERE id = %s", (dryer_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Dryer not found")
        conn.commit()
    finally:
        conn.close()
    write_system_log("DRYER_CHANGE", "info", f"Xóa máy sấy id={dryer_id}",
                     user_id=current_user["id"])


# ─── Devices (under dryer) ────────────────────────────────────────────────────

@router.get("/api/dryers/{dryer_id}/devices")
def list_devices(dryer_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM devices WHERE dryer_id = %s", (dryer_id,))
        return cursor.fetchall()
    finally:
        conn.close()


@router.post("/api/dryers/{dryer_id}/devices", status_code=201)
def create_device(dryer_id: int, body: DeviceCreate, current_user: dict = Depends(get_current_user)):
    install_date = date.today().isoformat()
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM dryers WHERE id = %s", (dryer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cursor.execute("SELECT id FROM devices WHERE id = %s", (body.id,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Device ID đã tồn tại")
        cursor.execute(
            "INSERT INTO devices (id, name, type_id, power_status, install_date, dryer_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (body.id, body.name, body.type_id, body.power_status, install_date, dryer_id)
        )
        conn.commit()
        result = {"dryer_id": dryer_id, "install_date": install_date, **body.model_dump()}
    finally:
        conn.close()
    write_system_log("DEVICE_CHANGE", "info", f"Thêm thiết bị {body.id} vào máy sấy id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return result


@router.put("/api/dryers/{dryer_id}/devices/{device_id}")
def update_device_record(dryer_id: int, device_id: str, body: DeviceUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM devices WHERE id = %s AND dryer_id = %s", (device_id, dryer_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cursor.execute(
                f"UPDATE devices SET {set_clause} WHERE id = %s AND dryer_id = %s",
                (*updates.values(), device_id, dryer_id)
            )
            conn.commit()
        cursor.execute("SELECT * FROM devices WHERE id = %s", (device_id,))
        result = cursor.fetchone()
    finally:
        conn.close()
    write_system_log("DEVICE_CHANGE", "info", f"Cập nhật thiết bị {device_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return result


@router.delete("/api/dryers/{dryer_id}/devices/{device_id}", status_code=204)
def delete_device_record(dryer_id: int, device_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sensor_logs WHERE device_id = %s", (device_id,))
        cursor.execute("DELETE FROM devices WHERE id = %s AND dryer_id = %s", (device_id, dryer_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        conn.commit()
    finally:
        conn.close()
    write_system_log("DEVICE_CHANGE", "info", f"Xóa thiết bị {device_id} khỏi máy sấy id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)


# ─── Local Schedules (per-dryer instances) ─────────────────────────────────────

@router.get("/api/dryers/{dryer_id}/local-schedules")
def list_local_schedules(dryer_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM dryers WHERE id = %s", (dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cur.execute(
            """SELECT ls.*, s.name AS schedule_name
               FROM local_schedules ls
               JOIN schedules s ON s.id = ls.schedule_id
               WHERE ls.dryer_id = %s ORDER BY ls.id""",
            (dryer_id,),
        )
        schedules = cur.fetchall()
        for ls in schedules:
            cur.execute(
                """SELECT lsdm.schedule_virtual_device_id, lsdm.device_id,
                          svd.name AS virtual_device_name, dt.name AS device_type_name
                   FROM local_schedule_device_mapping lsdm
                   JOIN schedule_virtual_devices svd ON svd.id = lsdm.schedule_virtual_device_id
                   JOIN device_types dt ON dt.id = svd.device_type_id
                   WHERE lsdm.local_schedule_id = %s""",
                (ls["id"],),
            )
            ls["mappings"] = cur.fetchall()
        return schedules
    finally:
        conn.close()


@router.get("/api/dryers/{dryer_id}/local-schedules/{local_schedule_id}")
def get_local_schedule(dryer_id: int, local_schedule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """SELECT ls.*, s.name AS schedule_name
               FROM local_schedules ls
               JOIN schedules s ON s.id = ls.schedule_id
               WHERE ls.id = %s AND ls.dryer_id = %s""",
            (local_schedule_id, dryer_id),
        )
        ls = cur.fetchone()
        if not ls:
            raise HTTPException(status_code=404, detail="Local schedule not found")
        cur.execute(
            """SELECT lsdm.schedule_virtual_device_id, lsdm.device_id,
                      svd.name AS virtual_device_name, dt.name AS device_type_name
               FROM local_schedule_device_mapping lsdm
               JOIN schedule_virtual_devices svd ON svd.id = lsdm.schedule_virtual_device_id
               JOIN device_types dt ON dt.id = svd.device_type_id
               WHERE lsdm.local_schedule_id = %s""",
            (local_schedule_id,),
        )
        ls["mappings"] = cur.fetchall()
        return ls
    finally:
        conn.close()


@router.post("/api/dryers/{dryer_id}/local-schedules", status_code=201)
def create_local_schedule(dryer_id: int, body: LocalScheduleCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM dryers WHERE id = %s", (dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cur.execute("SELECT id FROM schedules WHERE id = %s", (body.schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")

        # Validate mappings: devices must belong to dryer and match virtual device types
        for m in body.mappings:
            cur.execute(
                "SELECT svd.device_type_id FROM schedule_virtual_devices svd WHERE svd.id = %s AND svd.schedule_id = %s",
                (m.schedule_virtual_device_id, body.schedule_id),
            )
            svd = cur.fetchone()
            if not svd:
                raise HTTPException(status_code=400, detail=f"Virtual device {m.schedule_virtual_device_id} not found in schedule {body.schedule_id}")
            cur.execute(
                "SELECT type_id FROM devices WHERE id = %s AND dryer_id = %s",
                (m.device_id, dryer_id),
            )
            dev = cur.fetchone()
            if not dev:
                raise HTTPException(status_code=400, detail=f"Device {m.device_id} not found on dryer {dryer_id}")
            if dev["type_id"] != svd["device_type_id"]:
                raise HTTPException(status_code=400, detail=f"Device {m.device_id} type mismatch with virtual device {m.schedule_virtual_device_id}")

        # Duplicate detection: same schedule_id + same sorted mappings
        sorted_mappings = sorted((m.schedule_virtual_device_id, m.device_id) for m in body.mappings)
        cur.execute(
            "SELECT ls.id FROM local_schedules ls WHERE ls.dryer_id = %s AND ls.schedule_id = %s",
            (dryer_id, body.schedule_id),
        )
        for existing in cur.fetchall():
            cur.execute(
                "SELECT schedule_virtual_device_id, device_id FROM local_schedule_device_mapping WHERE local_schedule_id = %s ORDER BY schedule_virtual_device_id, device_id",
                (existing["id"],),
            )
            existing_mappings = sorted((r["schedule_virtual_device_id"], r["device_id"]) for r in cur.fetchall())
            if existing_mappings == sorted_mappings:
                raise HTTPException(status_code=409, detail=f"Duplicate local schedule: same schedule and device mappings already exist (id={existing['id']})")

        cur.execute(
            "INSERT INTO local_schedules (dryer_id, schedule_id, name) VALUES (%s, %s, %s)",
            (dryer_id, body.schedule_id, body.name),
        )
        conn.commit()
        ls_id = cur.lastrowid

        for m in body.mappings:
            cur.execute(
                "INSERT INTO local_schedule_device_mapping (local_schedule_id, schedule_virtual_device_id, device_id) VALUES (%s, %s, %s)",
                (ls_id, m.schedule_virtual_device_id, m.device_id),
            )
        conn.commit()
    finally:
        conn.close()

    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Tạo lịch cục bộ '{body.name}' (schedule_id={body.schedule_id}) cho dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return {"id": ls_id, "dryer_id": dryer_id, "schedule_id": body.schedule_id, "name": body.name}


@router.put("/api/dryers/{dryer_id}/local-schedules/{local_schedule_id}")
def update_local_schedule(dryer_id: int, local_schedule_id: int, body: LocalScheduleUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT * FROM local_schedules WHERE id = %s AND dryer_id = %s",
            (local_schedule_id, dryer_id),
        )
        ls = cur.fetchone()
        if not ls:
            raise HTTPException(status_code=404, detail="Local schedule not found")

        if body.name is not None:
            cur.execute(
                "UPDATE local_schedules SET name = %s WHERE id = %s",
                (body.name, local_schedule_id),
            )

        if body.mappings is not None:
            # Validate new mappings
            for m in body.mappings:
                cur.execute(
                    "SELECT svd.device_type_id FROM schedule_virtual_devices svd WHERE svd.id = %s AND svd.schedule_id = %s",
                    (m.schedule_virtual_device_id, ls["schedule_id"]),
                )
                svd = cur.fetchone()
                if not svd:
                    raise HTTPException(status_code=400, detail=f"Virtual device {m.schedule_virtual_device_id} not found")
                cur.execute(
                    "SELECT type_id FROM devices WHERE id = %s AND dryer_id = %s",
                    (m.device_id, dryer_id),
                )
                dev = cur.fetchone()
                if not dev:
                    raise HTTPException(status_code=400, detail=f"Device {m.device_id} not found on dryer {dryer_id}")
                if dev["type_id"] != svd["device_type_id"]:
                    raise HTTPException(status_code=400, detail=f"Device type mismatch")

            # Replace mappings
            cur.execute("DELETE FROM local_schedule_device_mapping WHERE local_schedule_id = %s", (local_schedule_id,))
            for m in body.mappings:
                cur.execute(
                    "INSERT INTO local_schedule_device_mapping (local_schedule_id, schedule_virtual_device_id, device_id) VALUES (%s, %s, %s)",
                    (local_schedule_id, m.schedule_virtual_device_id, m.device_id),
                )

        conn.commit()
    finally:
        conn.close()

    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Cập nhật lịch cục bộ id={local_schedule_id} cho dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return {"id": local_schedule_id, "status": "updated"}


@router.delete("/api/dryers/{dryer_id}/local-schedules/{local_schedule_id}", status_code=204)
def delete_local_schedule(dryer_id: int, local_schedule_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id FROM local_schedules WHERE id = %s AND dryer_id = %s",
            (local_schedule_id, dryer_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Local schedule not found")

        # Check not used in active batch
        cur.execute(
            """SELECT bsq.id FROM batch_schedule_queue bsq
               JOIN batches b ON b.id = bsq.batch_id
               WHERE bsq.local_schedule_id = %s AND b.end_time IS NULL AND bsq.status IN ('pending', 'running')""",
            (local_schedule_id,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Local schedule is used in an active batch")

        cur.execute("DELETE FROM local_schedules WHERE id = %s", (local_schedule_id,))
        conn.commit()
    finally:
        conn.close()

    write_system_log("SCHEDULE_CHANGE", "info",
                     f"Xóa lịch cục bộ id={local_schedule_id} khỏi dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)


# ─── Local Rules (per-dryer instances) ─────────────────────────────────────────

@router.get("/api/dryers/{dryer_id}/local-rules")
def list_local_rules(dryer_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM dryers WHERE id = %s", (dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Máy sấy không tồn tại")
        cur.execute(
            """SELECT lr.*, r.name AS rule_name
               FROM local_rules lr
               JOIN rules r ON r.id = lr.rule_id
               WHERE lr.dryer_id = %s ORDER BY lr.id""",
            (dryer_id,),
        )
        rules = cur.fetchall()
        for lr in rules:
            cur.execute(
                """SELECT lrdm.rule_virtual_device_id, lrdm.device_id,
                          rvd.name AS virtual_device_name, dt.name AS device_type_name
                   FROM local_rule_device_mapping lrdm
                   JOIN rule_virtual_devices rvd ON rvd.id = lrdm.rule_virtual_device_id
                   JOIN device_types dt ON dt.id = rvd.device_type_id
                   WHERE lrdm.local_rule_id = %s""",
                (lr["id"],),
            )
            lr["mappings"] = cur.fetchall()
        return rules
    finally:
        conn.close()


@router.get("/api/dryers/{dryer_id}/local-rules/{local_rule_id}")
def get_local_rule(dryer_id: int, local_rule_id: int):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """SELECT lr.*, r.name AS rule_name
               FROM local_rules lr
               JOIN rules r ON r.id = lr.rule_id
               WHERE lr.id = %s AND lr.dryer_id = %s""",
            (local_rule_id, dryer_id),
        )
        lr = cur.fetchone()
        if not lr:
            raise HTTPException(status_code=404, detail="Local rule not found")
        cur.execute(
            """SELECT lrdm.rule_virtual_device_id, lrdm.device_id,
                      rvd.name AS virtual_device_name, dt.name AS device_type_name
               FROM local_rule_device_mapping lrdm
               JOIN rule_virtual_devices rvd ON rvd.id = lrdm.rule_virtual_device_id
               JOIN device_types dt ON dt.id = rvd.device_type_id
               WHERE lrdm.local_rule_id = %s""",
            (local_rule_id,),
        )
        lr["mappings"] = cur.fetchall()
        return lr
    finally:
        conn.close()


@router.post("/api/dryers/{dryer_id}/local-rules", status_code=201)
def create_local_rule(dryer_id: int, body: LocalRuleCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM dryers WHERE id = %s", (dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cur.execute("SELECT id FROM rules WHERE id = %s", (body.rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")

        for m in body.mappings:
            cur.execute(
                "SELECT rvd.device_type_id FROM rule_virtual_devices rvd WHERE rvd.id = %s AND rvd.rule_id = %s",
                (m.rule_virtual_device_id, body.rule_id),
            )
            rvd = cur.fetchone()
            if not rvd:
                raise HTTPException(status_code=400, detail=f"Virtual device {m.rule_virtual_device_id} not found in rule {body.rule_id}")
            cur.execute(
                "SELECT type_id FROM devices WHERE id = %s AND dryer_id = %s",
                (m.device_id, dryer_id),
            )
            dev = cur.fetchone()
            if not dev:
                raise HTTPException(status_code=400, detail=f"Device {m.device_id} not found on dryer {dryer_id}")
            if dev["type_id"] != rvd["device_type_id"]:
                raise HTTPException(status_code=400, detail=f"Device {m.device_id} type mismatch with virtual device {m.rule_virtual_device_id}")

        # Duplicate detection: same rule_id + same sorted mappings
        sorted_mappings = sorted((m.rule_virtual_device_id, m.device_id) for m in body.mappings)
        cur.execute(
            "SELECT lr.id FROM local_rules lr WHERE lr.dryer_id = %s AND lr.rule_id = %s",
            (dryer_id, body.rule_id),
        )
        for existing in cur.fetchall():
            cur.execute(
                "SELECT rule_virtual_device_id, device_id FROM local_rule_device_mapping WHERE local_rule_id = %s ORDER BY rule_virtual_device_id, device_id",
                (existing["id"],),
            )
            existing_mappings = sorted((r["rule_virtual_device_id"], r["device_id"]) for r in cur.fetchall())
            if existing_mappings == sorted_mappings:
                raise HTTPException(status_code=409, detail=f"Duplicate local rule: same rule and device mappings already exist (id={existing['id']})")

        cur.execute(
            "INSERT INTO local_rules (dryer_id, rule_id, name) VALUES (%s, %s, %s)",
            (dryer_id, body.rule_id, body.name),
        )
        conn.commit()
        lr_id = cur.lastrowid

        for m in body.mappings:
            cur.execute(
                "INSERT INTO local_rule_device_mapping (local_rule_id, rule_virtual_device_id, device_id) VALUES (%s, %s, %s)",
                (lr_id, m.rule_virtual_device_id, m.device_id),
            )
        conn.commit()
    finally:
        conn.close()

    write_system_log("RULE_CHANGE", "info",
                     f"Tạo rule cục bộ '{body.name}' (rule_id={body.rule_id}) cho dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return {"id": lr_id, "dryer_id": dryer_id, "rule_id": body.rule_id, "name": body.name}


@router.put("/api/dryers/{dryer_id}/local-rules/{local_rule_id}")
def update_local_rule(dryer_id: int, local_rule_id: int, body: LocalRuleUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT * FROM local_rules WHERE id = %s AND dryer_id = %s",
            (local_rule_id, dryer_id),
        )
        lr = cur.fetchone()
        if not lr:
            raise HTTPException(status_code=404, detail="Local rule not found")

        if body.name is not None:
            cur.execute(
                "UPDATE local_rules SET name = %s WHERE id = %s",
                (body.name, local_rule_id),
            )

        if body.mappings is not None:
            for m in body.mappings:
                cur.execute(
                    "SELECT rvd.device_type_id FROM rule_virtual_devices rvd WHERE rvd.id = %s AND rvd.rule_id = %s",
                    (m.rule_virtual_device_id, lr["rule_id"]),
                )
                rvd = cur.fetchone()
                if not rvd:
                    raise HTTPException(status_code=400, detail=f"Virtual device {m.rule_virtual_device_id} not found")
                cur.execute(
                    "SELECT type_id FROM devices WHERE id = %s AND dryer_id = %s",
                    (m.device_id, dryer_id),
                )
                dev = cur.fetchone()
                if not dev:
                    raise HTTPException(status_code=400, detail=f"Device {m.device_id} not found on dryer {dryer_id}")
                if dev["type_id"] != rvd["device_type_id"]:
                    raise HTTPException(status_code=400, detail=f"Device type mismatch")

            cur.execute("DELETE FROM local_rule_device_mapping WHERE local_rule_id = %s", (local_rule_id,))
            for m in body.mappings:
                cur.execute(
                    "INSERT INTO local_rule_device_mapping (local_rule_id, rule_virtual_device_id, device_id) VALUES (%s, %s, %s)",
                    (local_rule_id, m.rule_virtual_device_id, m.device_id),
                )

        conn.commit()
    finally:
        conn.close()

    write_system_log("RULE_CHANGE", "info",
                     f"Cập nhật rule cục bộ id={local_rule_id} cho dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return {"id": local_rule_id, "status": "updated"}


@router.delete("/api/dryers/{dryer_id}/local-rules/{local_rule_id}", status_code=204)
def delete_local_rule(dryer_id: int, local_rule_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id FROM local_rules WHERE id = %s AND dryer_id = %s",
            (local_rule_id, dryer_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Local rule not found")

        # Check not used in active batch
        cur.execute(
            """SELECT brs.id FROM batch_rule_set brs
               JOIN batches b ON b.id = brs.batch_id
               WHERE brs.local_rule_id = %s AND b.end_time IS NULL""",
            (local_rule_id,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Local rule is used in an active batch")

        cur.execute("DELETE FROM local_rules WHERE id = %s", (local_rule_id,))
        conn.commit()
    finally:
        conn.close()

    write_system_log("RULE_CHANGE", "info",
                     f"Xóa rule cục bộ id={local_rule_id} khỏi dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
