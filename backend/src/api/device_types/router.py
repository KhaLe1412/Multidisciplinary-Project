from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import DeviceTypeCreate, DeviceTypeUpdate

router = APIRouter()


@router.get("/api/device-types")
def list_device_types():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM device_types")
        return cursor.fetchall()
    finally:
        conn.close()


@router.post("/api/device-types", status_code=201)
def create_device_type(body: DeviceTypeCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO device_types (name, description, unit, max_value, min_value, category) VALUES (%s, %s, %s, %s, %s, %s)",
            (body.name, body.description, body.unit, body.max_value, body.min_value, body.category)
        )
        conn.commit()
        new_id = cursor.lastrowid
    finally:
        conn.close()
    write_system_log("device_type_change", "info", f"Tạo loại thiết bị: {body.name}",
                     user_id=current_user["id"])
    return {"id": new_id, **body.model_dump()}


@router.put("/api/device-types/{type_id}")
def update_device_type(type_id: int, body: DeviceTypeUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM device_types WHERE id = %s", (type_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Device type not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cursor.execute(
                f"UPDATE device_types SET {set_clause} WHERE id = %s",
                (*updates.values(), type_id)
            )
            conn.commit()
        cursor.execute("SELECT * FROM device_types WHERE id = %s", (type_id,))
        result = cursor.fetchone()
    finally:
        conn.close()
    write_system_log("device_type_change", "info", f"Cập nhật loại thiết bị id={type_id}",
                     user_id=current_user["id"])
    return result


@router.delete("/api/device-types/{type_id}", status_code=204)
def delete_device_type(type_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM devices WHERE type_id = %s", (type_id,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=409, detail="Loai thiet bi dang duoc su dung, khong the xoa")
        cursor.execute("DELETE FROM device_types WHERE id = %s", (type_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device type not found")
        conn.commit()
    finally:
        conn.close()
    write_system_log("device_type_change", "info", f"Xóa loại thiết bị id={type_id}",
                     user_id=current_user["id"])
