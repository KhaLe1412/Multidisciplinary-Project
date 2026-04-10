from fastapi import APIRouter, Depends
from src.auth import get_current_user
from src.db import get_db

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/event-types")
def list_event_types(current_user: dict = Depends(get_current_user)):
    """Trả về danh sách tên các loại sự kiện từ bảng event_types."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT name FROM event_types ORDER BY name")
        return [r["name"] for r in cur.fetchall()]
    finally:
        conn.close()


def _build_log_row(row: dict) -> dict:
    return {
        "id": row["id"],
        "timestamp": row["timestamp"].isoformat() if row["timestamp"] else None,
        "event_type": row["event_type"],
        "severity": row["severity"],
        "user": row["user"] or "Hệ thống",
        "user_id": row["user_id"],
        "dryer_id": row["dryer_id"],
        "description": row["description"],
    }


@router.get("")
def list_logs(current_user: dict = Depends(get_current_user)):
    """Lấy tất cả system_logs, mới nhất trước."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT sl.id, sl.timestamp, sl.user_id, sl.dryer_id, sl.description,
                   et.name  AS event_type,
                   sv.level AS severity,
                   u.full_name AS user
            FROM system_logs sl
            JOIN event_types    et ON et.id = sl.event_type_id
            JOIN severity_levels sv ON sv.id = sl.severity_id
            LEFT JOIN users     u  ON u.id  = sl.user_id
            ORDER BY sl.id DESC
            LIMIT 100
            """
        )
        rows = cur.fetchall()
        return [_build_log_row(r) for r in rows]
    finally:
        conn.close()


@router.get("/dryer/{dryer_id}")
def list_dryer_logs(dryer_id: int, current_user: dict = Depends(get_current_user)):
    """Lấy system_logs của một máy sấy cụ thể, mới nhất trước."""
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT sl.id, sl.timestamp, sl.user_id, sl.dryer_id, sl.description,
                   et.name  AS event_type,
                   sv.level AS severity,
                   u.full_name AS user
            FROM system_logs sl
            JOIN event_types    et ON et.id = sl.event_type_id
            JOIN severity_levels sv ON sv.id = sl.severity_id
            LEFT JOIN users     u  ON u.id  = sl.user_id
            WHERE sl.dryer_id = %s
            ORDER BY sl.id DESC
            LIMIT 20
            """,
            (dryer_id,),
        )
        rows = cur.fetchall()
        return [_build_log_row(r) for r in rows]
    finally:
        conn.close()
