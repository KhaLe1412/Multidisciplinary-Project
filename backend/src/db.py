import mysql.connector
import os

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST", "localhost"),
    "port":     int(os.environ.get("DB_PORT", 3307)),
    "user":     os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", "rootpassword"),
    "database": os.environ.get("DB_NAME", "DADN"),
    "charset":  "utf8mb4",
}


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def insert_sensor_log(device_id: str, value: float) -> None:
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.callproc("insert_sensor_log", [device_id, value])
        conn.commit()
    finally:
        conn.close()

def get_list_devices(type: str = None) -> dict:
    """Lấy danh sách tất cả feed_id từ sensor_logs."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        if type == "sensor":
            cursor.execute("SELECT devices.id FROM devices join device_types ON devices.type_id = device_types.id WHERE device_types.category = 'sensor'")
        elif type == "controller":
            cursor.execute("SELECT devices.id FROM devices join device_types ON devices.type_id = device_types.id WHERE device_types.category = 'controller'")
        else:
            cursor.execute("SELECT devices.id FROM devices")
        rows = cursor.fetchall()
    finally:
        conn.close()
    return {"devices": [row[0] for row in rows]}


def get_device_name(device_id: str) -> str:
    """Trả về tên thiết bị theo device_id; fallback về device_id nếu không tìm thấy."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM devices WHERE id = %s", (device_id,))
        row = cursor.fetchone()
    finally:
        conn.close()
    return row[0] if row and row[0] else device_id


# ─── System log helper ──────────────────────────────────────────────────────────────────────────────────

_EVENT_TYPE_IDS: dict = {}
_SEVERITY_IDS: dict = {}


def _load_log_ids() -> None:
    global _EVENT_TYPE_IDS, _SEVERITY_IDS
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, event_code FROM event_types")
        _EVENT_TYPE_IDS = {event_code: eid for eid, event_code in cur.fetchall()}
        cur.execute("SELECT id, level FROM severity_levels")
        _SEVERITY_IDS = {level: sid for sid, level in cur.fetchall()}
    finally:
        conn.close()


def write_system_log(
    event_code: str,
    severity: str,
    description: str,
    user_id=None,
    dryer_id=None,
) -> None:
    """Ghi một bản ghi vào system_logs. Không bao giờ ném exception."""
    try:
        if not _EVENT_TYPE_IDS or not _SEVERITY_IDS:
            _load_log_ids()
        et_id = _EVENT_TYPE_IDS.get(event_code)
        sv_id = _SEVERITY_IDS.get(severity)
        if et_id is None or sv_id is None:
            print(f"[system_log] Không tìm thấy event_code={event_code!r} hoặc severity={severity!r}")
            return
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.callproc("insert_system_log", [user_id, dryer_id, et_id, sv_id, description])
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        print(f"[system_log] Lỗi ghi log: {exc}")
