from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log, get_device_name
import src.device_manager as device_manager

router = APIRouter()


# ─── Đọc giá trị mới nhất ────────────────────────────────────────────────────

@router.get("/api/device/{feed_id}")
def get_device(feed_id: str):
    """Lấy giá trị mới nhất của feed từ sensor_logs."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT value, timestamp FROM sensor_logs WHERE device_id = %s ORDER BY timestamp DESC LIMIT 1",
            (feed_id,),
        )
        row = cursor.fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"feed_id": feed_id, "value": row[0], "timestamp": row[1]}


# ─── Lấy log gần nhất ────────────────────────────────────────────────────────

@router.get("/api/device/{feed_id}/logs")
def get_device_logs(feed_id: str):
    """Lấy tối đa 10 log gần nhất của device từ sensor_logs."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT value, timestamp FROM sensor_logs WHERE device_id = %s ORDER BY timestamp DESC LIMIT 10",
            (feed_id,),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()
    return [{"feed_id": feed_id, "value": r[0], "timestamp": r[1]} for r in rows]


# ─── Ghi giá trị ─────────────────────────────────────────────────────────────

@router.post("/api/device/{feed_id}")
def set_device(feed_id: str, value: str, current_user: dict = Depends(get_current_user)):
    """Gửi giá trị lên Adafruit IO và ghi vào sensor_logs."""
    try:
        float_value = float(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="value phai la so")
    if not device_manager.is_registered(feed_id):
        raise HTTPException(status_code=404, detail="Device not found")
    ok = device_manager.set_device_value(feed_id, float_value)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    dryer_id = device_manager.get_dryer_by_devices(feed_id)
    device_name = get_device_name(feed_id)
    write_system_log("DEVICE_CONTROL", "info",
                     f"Gửi lệnh thiết bị {device_name} = {float_value}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    return {"feed_id": feed_id, "value": float_value}


# ─── Danh sách thiết bị đang kết nối ─────────────────────────────────────────

@router.get("/api/sensor/connected-devices")
def get_connected_devices():
    """Trả về danh sách device IDs đang kết nối với Adafruit IO."""
    return {"connected": device_manager.get_connected_device_ids()}


# ─── Đồng bộ clients thủ công ────────────────────────────────────────────────

@router.post("/api/sensor/refresh-clients", status_code=200)
def refresh_clients():
    """Kích hoạt đồng bộ lại danh sách MQTT clients theo DB."""
    device_manager.sync_clients()
    return {"status": "refreshed"}
