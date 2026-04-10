"""
auth.py
Xác thực JWT và quản lý mật khẩu.

- hash_password / verify_password: dùng bcrypt trực tiếp.
- create_access_token: tạo JWT có hạn dùng (mặc định 24 giờ).
- get_current_user: FastAPI Dependency, giải mã JWT và tra cứu user trong DB.
  Raise HTTP 401 nếu token không hợp lệ, hết hạn, hoặc user bị vô hiệu hoá.
"""
import os
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from src.db import get_db

# ─── Cấu hình ─────────────────────────────────────────────────────────────────

# JWT_SECRET phải được đặt qua biến môi trường trong production.
# Giá trị fallback chỉ dùng cho môi trường dev/test.
SECRET_KEY: str = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM: str = "HS256"
EXPIRE_MINUTES: int = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))  # 24 giờ

# tokenUrl chỉ dùng để hiển thị trong Swagger UI — không ảnh hưởng logic.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Password helpers ─────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Băm mật khẩu bằng bcrypt. Trả về chuỗi hash để lưu DB."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """So sánh mật khẩu plaintext với hash lưu trong DB."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ─── JWT helpers ──────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Tạo JWT từ dict `data`.
    Tự động thêm trường `exp` (thời điểm hết hạn) vào payload.
    """
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─── FastAPI Dependency ───────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency: giải mã Bearer token và trả về thông tin user hiện tại.

    Flow:
      1. Giải mã JWT → lấy `sub` (user_id).
      2. Tra cứu user trong DB theo user_id.
      3. Kiểm tra user tồn tại và đang active.
      4. Trả về dict thông tin user (không có password_hash).

    Raise HTTP 401 cho mọi trường hợp lỗi (không tiết lộ lý do cụ thể
    để tránh information leakage — OWASP A07).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, full_name, email, phone, role, status FROM users WHERE id = %s",
            (int(user_id),),
        )
        user = cur.fetchone()
    finally:
        conn.close()

    if user is None or user["status"] != "active":
        raise credentials_exception

    return user
