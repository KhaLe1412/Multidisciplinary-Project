/**
 * apiClient.ts
 * Token storage helpers và auth header builder dùng chung cho tất cả API files.
 */

export const TOKEN_KEY = "auth_token";

/** Lấy JWT token từ localStorage. */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Lưu JWT token vào localStorage. */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Xóa JWT token khỏi localStorage (khi logout). */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Trả về object headers kèm Authorization nếu đã đăng nhập. */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
