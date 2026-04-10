"""
api/auth/router.py
Xác thực người dùng: đăng nhập, trả về JWT.

POST /api/auth/login
  - Body: { email, password }
  - Kiểm tra email tồn tại → verify bcrypt → check status active
  - Trả về access_token (JWT Bearer) + thông tin user cơ bản
  - Luôn trả về cùng một thông báo lỗi 401 dù sai email hay sai mật khẩu
    (tránh tiết lộ thông tin — OWASP A07).
"""
from fastapi import APIRouter, HTTPException, status

from src.auth import create_access_token, verify_password
from src.db import get_db
from src.model.schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

_LOGIN_FAIL = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Email hoặc mật khẩu không đúng",
    headers={"WWW-Authenticate": "Bearer"},
)


@router.post("/login")
def login(body: LoginRequest):
    """
    Đăng nhập và nhận JWT.

    Trả về:
      - access_token: chuỗi JWT dùng làm Bearer token cho các request tiếp theo.
      - token_type: "bearer"
      - user: thông tin cơ bản (id, full_name, email, role) — không bao gồm hash.
    """
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, full_name, email, phone, role, status, password_hash FROM users WHERE email = %s",
            (body.email,),
        )
        user = cur.fetchone()
    finally:
        conn.close()

    # Dùng lệnh if đơn để tránh timing attack: luôn gọi verify_password
    # kể cả khi user không tồn tại (so sánh với chuỗi dummy).
    dummy_hash = "$2b$12$invalidhashusedtopreventtimingattackxxxxxxxxxxxxxxxxxxxxxxx"
    stored_hash = user["password_hash"] if user else dummy_hash

    if not verify_password(body.password, stored_hash) or user is None:
        raise _LOGIN_FAIL

    if user["status"] != "active":
        # Tài khoản bị vô hiệu hoá — không cung cấp thêm chi tiết
        raise _LOGIN_FAIL

    token = create_access_token({"sub": str(user["id"])})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
        },
    }
