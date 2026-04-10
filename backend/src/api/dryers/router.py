from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import DryerCreate, DryerUpdate, DeviceCreate, DeviceUpdate
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
    write_system_log("dryer_change", "info", f"Tạo máy sấy mới: {body.name}",
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
    write_system_log("dryer_change", "info", f"Cập nhật máy sấy id={dryer_id}",
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
    write_system_log("dryer_change", "info", f"Xóa máy sấy id={dryer_id}",
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
            raise HTTPException(status_code=409, detail="Device ID da ton tai")
        cursor.execute(
            "INSERT INTO devices (id, name, type_id, power_status, install_date, dryer_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (body.id, body.name, body.type_id, body.power_status, install_date, dryer_id)
        )
        conn.commit()
        result = {"dryer_id": dryer_id, "install_date": install_date, **body.model_dump()}
    finally:
        conn.close()
    write_system_log("device_change", "info", f"Thêm thiết bị {body.id} vào máy sấy id={dryer_id}",
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
    write_system_log("device_change", "info", f"Cập nhật thiết bị {device_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return result


@router.delete("/api/dryers/{dryer_id}/devices/{device_id}", status_code=204)
def delete_device_record(dryer_id: int, device_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM devices WHERE id = %s AND dryer_id = %s", (device_id, dryer_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        conn.commit()
    finally:
        conn.close()
    write_system_log("device_change", "info", f"Xóa thiết bị {device_id} khỏi máy sấy id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
