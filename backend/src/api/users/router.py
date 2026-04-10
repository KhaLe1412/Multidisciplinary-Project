from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user, hash_password, verify_password
from src.db import get_db
from src.model.schemas import ProfileUpdate

router = APIRouter()


@router.get("/api/users/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Trả về thông tin của người dùng đang đăng nhập."""
    return current_user


@router.put("/api/users/me")
def update_me(
    body: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Cập nhật thông tin cá nhân của người dùng đang đăng nhập.
    Nếu muốn đổi mật khẩu, phải cung cấp current_password đúng.
    """
    user_id = current_user["id"]
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        # Lấy password_hash hiện tại nếu cần đổi mật khẩu
        if body.new_password is not None:
            if not body.current_password:
                raise HTTPException(status_code=400, detail="Cần cung cấp mật khẩu hiện tại để đổi mật khẩu")
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not verify_password(body.current_password, row["password_hash"] or ""):
                raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")

        # Xây dựng câu UPDATE động chỉ với những trường được cung cấp
        fields, values = [], []
        if body.full_name is not None:
            fields.append("full_name = %s"); values.append(body.full_name)
        if body.email is not None:
            fields.append("email = %s"); values.append(body.email)
        if body.phone is not None:
            fields.append("phone = %s"); values.append(body.phone)
        if body.new_password is not None:
            fields.append("password_hash = %s"); values.append(hash_password(body.new_password))

        if not fields:
            raise HTTPException(status_code=400, detail="Không có trường nào được cập nhật")

        values.append(user_id)
        cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", values)
        conn.commit()

        # Trả về thông tin mới
        cur.execute(
            "SELECT id, full_name, email, phone, role, status FROM users WHERE id = %s",
            (user_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.get("/api/users")
def list_users():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, full_name, email, phone, role, status FROM users")
        return cursor.fetchall()
    finally:
        conn.close()


@router.get("/api/users/{user_id}")
def get_user(user_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email, phone, role, status FROM users WHERE id = %s",
            (user_id,),
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        conn.close()
