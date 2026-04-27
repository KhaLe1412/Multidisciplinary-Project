"""
device_manager.py
Quản lý động các MQTT Client (Adafruit IO).
- Đồng bộ danh sách clients với DB mỗi 60 giây (background thread).
- Cung cấp set_device_value / get_latest_db_value / is_registered cho các module khác.
- Gọi sync_clients() thủ công qua POST /api/sensor/refresh-clients.
"""
import os
import threading
import time
from typing import Dict, Optional

from client import Client as ClientClass
from src.db import get_db, insert_sensor_log, get_list_devices, write_system_log

_USERNAME = os.environ["ADAFRUIT_USERNAME"]
_KEY      = os.environ["ADAFRUIT_KEY"]

_clients: Dict[str, ClientClass] = {}
_lock = threading.Lock()


# ─── Callback MQTT ────────────────────────────────────────────────────────────

def _on_feed_message(feed_id: str, payload: str) -> None:
    try:
        insert_sensor_log(feed_id, float(payload))
        print(f"[device_manager] ← {feed_id} = {payload}")
    except Exception as e:
        print(f"[device_manager] Lỗi ghi sensor_logs ({feed_id}): {e}")


# ─── Đồng bộ clients ─────────────────────────────────────────────────────────

def sync_clients() -> None:
    """Đồng bộ _clients với danh sách devices trong DB."""
    try:
        db_devices = set(get_list_devices()["devices"])
    except Exception as e:
        print(f"[device_manager] Không lấy được device list: {e}")
        return

    with _lock:
        current = set(_clients.keys())

        # Thêm client cho device mới xuất hiện trong DB
        for fid in db_devices - current:
            try:
                _clients[fid] = ClientClass(fid, _USERNAME, _KEY, on_message=_on_feed_message)
                print(f"[device_manager] Thêm client: {fid}")
            except Exception as e:
                print(f"[device_manager] Lỗi tạo client {fid}: {e}")

        # Ngắt kết nối và xóa client của device đã bị xóa khỏi DB
        for fid in current - db_devices:
            try:
                _clients[fid].client.disconnect()
            except Exception:
                pass
            del _clients[fid]
            print(f"[device_manager] Xóa client: {fid}")


# ─── API công khai ────────────────────────────────────────────────────────────

def is_registered(feed_id: str) -> bool:
    """Kiểm tra device có đang được quản lý không."""
    with _lock:
        return feed_id in _clients

def get_connected_device_ids() -> list:
    """Lấy danh sách tất cả device IDs đang kết nối với Adafruit."""
    with _lock:
        return list(_clients.keys())

def get_dryer_by_devices(feed_id: str) -> int:
    """Lấy id máy sấy từ feed_id của device."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT dryer_id FROM devices WHERE id = %s",
            (feed_id,),
        )
        row = cursor.fetchone()
        return int(row[0]) if row else None
    finally:
        conn.close()

def set_device_value(feed_id: str, value: float) -> bool:
    """
    Ghi giá trị lên Adafruit IO và sensor_logs.
    Trả về True nếu thành công, False nếu device không tồn tại.
    """
    with _lock:
        c = _clients.get(feed_id)
    if c is None:
        print(f"[device_manager] set_device_value: {feed_id} chưa đăng ký")
        return False
    try:
        c.write(str(value))
        insert_sensor_log(feed_id, value)
        dryer_id = get_dryer_by_devices(feed_id)
        print(f"[device_manager] → {feed_id} = {value}")
        return True
    except Exception as e:
        print(f"[device_manager] Lỗi set_device_value {feed_id}: {e}")
        return False


def get_latest_db_value(feed_id: str) -> Optional[float]:
    """Lấy giá trị mới nhất của device từ sensor_logs."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT value FROM sensor_logs WHERE device_id = %s ORDER BY timestamp DESC LIMIT 1",
            (feed_id,),
        )
        row = cur.fetchone()
        return float(row[0]) if row else None
    finally:
        conn.close()


# ─── Background sync ──────────────────────────────────────────────────────────

def _background_sync() -> None:
    while True:
        time.sleep(60)
        print("[device_manager] Auto-sync clients...")
        sync_clients()


# Khởi tạo ngay khi module được import lần đầu
sync_clients()

_sync_thread = threading.Thread(
    target=_background_sync,
    daemon=True,
    name="device-manager-sync",
)
_sync_thread.start()
