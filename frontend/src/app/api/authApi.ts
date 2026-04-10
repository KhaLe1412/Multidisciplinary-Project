/**
 * authApi.ts
 * Giao tiếp với POST /api/auth/login và GET/PUT /api/users/me.
 */

const BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL ?? "http://127.0.0.1:8001";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  };
}

/** Đăng nhập — trả về token + thông tin user. Ném Error nếu thất bại. */
export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lỗi kết nối" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}
