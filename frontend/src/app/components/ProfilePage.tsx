import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  User,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  Check,
  Edit3,
  Shield,
  LayoutDashboard,
  Cpu,
  BookOpen,
  BarChart3,
  Clock,
} from "lucide-react";

const roleLabel: Record<string, string> = {
  admin: "Quản trị viên",
  operator: "Vận hành viên",
  viewer: "Người xem",
};
const roleColor: Record<string, string> = {
  admin: "#a855f7",
  operator: "#3b82f6",
  viewer: "#64748b",
};

const permItems = [
  {
    key: "control",
    label: "Điều khiển máy sấy",
    icon: LayoutDashboard,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    key: "devices",
    label: "Quản lý thiết bị",
    icon: Cpu,
    color: "#22c55e",
    bg: "#f0fdf4",
  },
  {
    key: "policy",
    label: "Chính sách",
    icon: BookOpen,
    color: "#a855f7",
    bg: "#faf5ff",
  },
  {
    key: "statistics",
    label: "Xem thống kê",
    icon: BarChart3,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
];

export function ProfilePage() {
  const { currentUser, updateCurrentUser } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  if (!currentUser) return null;

  const saveInfo = () => {
    updateCurrentUser({ name: editForm.name, phone: editForm.phone });
    setEditMode(false);
  };

  const changePassword = () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (pwForm.current !== currentUser.password) {
      setPwError("Mật khẩu hiện tại không đúng!");
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError("Mật khẩu mới phải ít nhất 6 ký tự!");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Xác nhận mật khẩu không khớp!");
      return;
    }
    updateCurrentUser({ password: pwForm.next });
    setPwSuccess(true);
    setPwError("");
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSuccess(false), 3000);
  };

  const toggleShow = (field: string) =>
    setShowPw((p) => ({ ...p, [field]: !p[field] }));

  const p = currentUser.permissions;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1
          className="text-2xl text-slate-900 mb-1"
          style={{ fontWeight: 700 }}
        >
          Tài khoản của tôi
        </h1>
        <p className="text-slate-500 text-sm">
          Xem và chỉnh sửa thông tin cá nhân
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Avatar + Role */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                fontWeight: 700,
              }}
            >
              {currentUser.avatar}
            </div>
            <h2
              className="text-lg text-slate-900 mb-1"
              style={{ fontWeight: 700 }}
            >
              {currentUser.name}
            </h2>
            <span
              className="text-sm px-3 py-1 rounded-full"
              style={{
                background: roleColor[currentUser.role] + "20",
                color: roleColor[currentUser.role],
                fontWeight: 600,
              }}
            >
              {roleLabel[currentUser.role]}
            </span>
            <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail size={14} className="text-slate-400" />
                <span className="text-xs truncate">{currentUser.email}</span>
              </div>
              {currentUser.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-xs">{currentUser.phone}</span>
                </div>
              )}

              {currentUser.lastLogin && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-xs">
                    Đăng nhập:{" "}
                    {new Date(currentUser.lastLogin).toLocaleDateString(
                      "vi-VN",
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Permissions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p
              className="text-sm text-slate-700 mb-3"
              style={{ fontWeight: 600 }}
            >
              Quyền truy cập
            </p>
            {currentUser.role === "admin" ? (
              <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-3">
                <Shield size={16} className="text-purple-500" />
                <span
                  className="text-sm text-purple-700"
                  style={{ fontWeight: 500 }}
                >
                  Toàn quyền quản trị
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {permItems.map((perm) => {
                  const active = (p as any)[perm.key];
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${active ? "" : "opacity-40"}`}
                      style={{ background: active ? perm.bg : "#f8fafc" }}
                    >
                      <perm.icon
                        size={13}
                        style={{ color: active ? perm.color : "#94a3b8" }}
                      />
                      <span
                        className="text-xs flex-1"
                        style={{
                          color: active ? "#0f172a" : "#94a3b8",
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        {perm.label}
                      </span>
                      {active &&
                        (perm.key === "control" || perm.key === "devices") && (
                          <span
                            className="text-xs"
                            style={{ color: perm.color, fontWeight: 600 }}
                          >
                            {p[
                              perm.key === "control"
                                ? "controlDryers"
                                : "deviceDryers"
                            ] === "all"
                              ? "Tất cả"
                              : `${(p[perm.key === "control" ? "controlDryers" : "deviceDryers"] as string[]).length} máy`}
                          </span>
                        )}
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${active ? "" : "bg-slate-200"}`}
                        style={{ background: active ? perm.color : undefined }}
                      >
                        {active && <Check size={9} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Edit + Password */}
        <div className="lg:col-span-2 space-y-5">
          {/* Personal info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base text-slate-900"
                style={{ fontWeight: 600 }}
              >
                Thông tin cá nhân
              </h3>
              {!editMode ? (
                <button
                  onClick={() => {
                    setEditMode(true);
                    setEditForm({
                      name: currentUser.name,
                      phone: currentUser.phone || "",
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all"
                  style={{
                    background: "#eff6ff",
                    color: "#3b82f6",
                    fontWeight: 600,
                  }}
                >
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveInfo}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    style={{ fontWeight: 600 }}
                  >
                    <Check size={14} /> Lưu
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Họ và tên", icon: User },
                  { key: "phone", label: "Số điện thoại", icon: Phone },
                ].map((f) => (
                  <div key={f.key}>
                    <label
                      className="block text-xs text-slate-500 mb-1.5"
                      style={{ fontWeight: 600 }}
                    >
                      <f.icon size={12} className="inline mr-1" />
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={(editForm as any)[f.key]}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label
                    className="block text-xs text-slate-500 mb-1.5"
                    style={{ fontWeight: 600 }}
                  >
                    <Mail size={12} className="inline mr-1" />
                    Email (không thể thay đổi)
                  </label>
                  <input
                    type="text"
                    value={currentUser.email}
                    disabled
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: User, label: "Họ và tên", value: currentUser.name },
                  { icon: Mail, label: "Email", value: currentUser.email },
                  {
                    icon: Phone,
                    label: "Điện thoại",
                    value: currentUser.phone || "Chưa cập nhật",
                  },
                ].map((info) => (
                  <div
                    key={info.label}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <info.icon size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{info.label}</p>
                      <p
                        className="text-sm text-slate-800 mt-0.5"
                        style={{ fontWeight: 500 }}
                      >
                        {info.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3
              className="text-base text-slate-900 mb-4"
              style={{ fontWeight: 600 }}
            >
              Đổi mật khẩu
            </h3>

            {pwSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
                <Check size={16} /> Đổi mật khẩu thành công!
              </div>
            )}
            {pwError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                {pwError}
              </div>
            )}

            <div className="space-y-3">
              {[
                { key: "current", label: "Mật khẩu hiện tại" },
                { key: "next", label: "Mật khẩu mới" },
                { key: "confirm", label: "Xác nhận mật khẩu mới" },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    className="block text-xs text-slate-500 mb-1.5"
                    style={{ fontWeight: 600 }}
                  >
                    <Key size={12} className="inline mr-1" />
                    {f.label}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw[f.key] ? "text" : "password"}
                      value={(pwForm as any)[f.key]}
                      onChange={(e) => {
                        setPwForm((p) => ({ ...p, [f.key]: e.target.value }));
                        setPwError("");
                      }}
                      className="w-full px-3 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(f.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw[f.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={changePassword}
                className="w-full py-2.5 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  fontWeight: 600,
                }}
              >
                Đổi mật khẩu
              </button>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-700" style={{ fontWeight: 500 }}>
                💡 Gợi ý tài khoản demo:{" "}
                <code className="bg-white px-1 rounded">admin@factory.vn</code>{" "}
                / <code className="bg-white px-1 rounded">Admin@123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
