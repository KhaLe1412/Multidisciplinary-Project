from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import AreaCreate, AreaUpdate

router = APIRouter()


@router.get("/api/areas")
def list_areas():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM areas")
        return cursor.fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()


@router.post("/api/areas", status_code=201)
def create_area(body: AreaCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO areas (name, description, manager_id) VALUES (%s, %s, %s)",
            (body.name, body.description, body.manager_id)
        )
        conn.commit()
        new_id = cursor.lastrowid
    finally:
        conn.close()
    write_system_log("area_change", "info", f"Tạo khu vực mới: {body.name}",
                     user_id=current_user["id"])
    return {"id": new_id, **body.model_dump()}


@router.put("/api/areas/{area_id}")
def update_area(area_id: int, body: AreaUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM areas WHERE id = %s", (area_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Area not found")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cursor.execute(
                f"UPDATE areas SET {set_clause} WHERE id = %s",
                (*updates.values(), area_id)
            )
            conn.commit()
        cursor.execute("SELECT * FROM areas WHERE id = %s", (area_id,))
        result = cursor.fetchone()
    finally:
        conn.close()
    write_system_log("area_change", "info", f"Cập nhật khu vực id={area_id}",
                     user_id=current_user["id"])
    return result


@router.delete("/api/areas/{area_id}", status_code=204)
def delete_area(area_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dryers WHERE area_id = %s", (area_id,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=409, detail="Khu vuc con may say, khong the xoa")
        cursor.execute("DELETE FROM areas WHERE id = %s", (area_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Area not found")
        conn.commit()
    finally:
        conn.close()
    write_system_log("area_change", "info", f"Xóa khu vực id={area_id}",
                     user_id=current_user["id"])
