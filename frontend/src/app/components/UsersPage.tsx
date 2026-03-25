import { useState } from "react";
import { useApp } from "../context/AppContext";
import { UserAccount, UserPermissions } from "../data/mockData";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Phone,
  Mail,
  Key,
  Eye,
  EyeOff,
  Cpu,
  BarChart3,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  BookOpen,
} from "lucide-react";

const roleLabel: Record<string, string> = {
  admin: "Quản trị viên",
  operator: "Vận hành viên",  
  viewer: "Người xem",
};
const roleColor: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  operator: "bg-blue-100 text-blue-700",
  viewer: "bg-slate-100 text-slate-600",
};

const defaultPermissions = (role: string): UserPermissions => {
  if (role === "admin")
    return {
      control: true,
      controlDryers: "all",
      devices: true,
      deviceDryers: "all",
      policy: true,
      statistics: true,
      logs: true,
    };
  if (role === "viewer")
    return {
      control: false,
      controlDryers: [],
      devices: false,
      deviceDryers: [],
      policy: false,
      statistics: true,
      logs: false,
    };
  return {
    control: false,
    controlDryers: [],
    devices: false,
    deviceDryers: [],
    policy: false,
    statistics: false,
    logs: false,
  };
};

export function UsersPage() {
  const { users, setUsers, currentUser, dryers, addLog } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserAccount | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "operator",
  });
  const [showPassId, setShowPassId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <ShieldAlert size={48} className="mx-auto mb-4 text-slate-300" />
          <h2
            className="text-xl text-slate-600 mb-2"
            style={{ fontWeight: 600 }}
          >
            Không có quyền truy cập
          </h2>
          <p className="text-slate-400 text-sm">
            Chức năng này chỉ dành cho quản trị viên.
          </p>
        </div>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const startEdit = (u: UserAccount) => {
    setEditingId(u.id);
    setEditForm({
      ...u,
      permissions: {
        ...u.permissions,
        controlDryers: Array.isArray(u.permissions.controlDryers)
          ? [...u.permissions.controlDryers]
          : u.permissions.controlDryers,
        deviceDryers: Array.isArray(u.permissions.deviceDryers)
          ? [...u.permissions.deviceDryers]
          : u.permissions.deviceDryers,
      },
    });
    setExpandedId(u.id);
  };

  const saveEdit = () => {
    if (!editForm) return;
    setUsers((prev) => prev.map((u) => (u.id === editingId ? editForm : u)));
    addLog({
      eventType: "profile_change",
      time: new Date().toISOString(),
      user: currentUser!.name,
      description: `Cập nhật tài khoản: ${editForm.name}`,
      severity: "info",
    });
    setEditingId(null);
    setEditForm(null);
  };

  const deleteUser = (id: string, name: string) => {
    if (id === currentUser?.id) {
      alert("Không thể xóa tài khoản đang đăng nhập!");
      return;
    }
    setConfirmDialog({ open: true, id, name });
  };

  const confirmDeleteUser = () => {
    setUsers((prev) => prev.filter((u) => u.id !== confirmDialog.id));
    addLog({
      eventType: "profile_change",
      time: new Date().toISOString(),
      user: currentUser!.name,
      description: `Xóa tài khoản: ${confirmDialog.name}`,
      severity: "warning",
    });
    setConfirmDialog({ open: false, id: "", name: "" });
  };

  const createUser = () => {
    if (!newForm.name || !newForm.email || !newForm.password) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (users.find((u) => u.email === newForm.email)) {
      alert("Email đã tồn tại!");
      return;
    }
    const id = `U${String(users.length + 1).padStart(3, "0")}`;
    const avatarLetters = newForm.name
      .split(" ")
      .map((w) => w[0])
      .slice(-2)
      .join("")
      .toUpperCase();
    const newUser: UserAccount = {
      id,
      name: newForm.name,
      email: newForm.email,
      password: newForm.password,
      phone: newForm.phone,
      role: newForm.role as any,
      avatar: avatarLetters,
      permissions: defaultPermissions(newForm.role),
      active: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    addLog({
      eventType: "profile_change",
      time: new Date().toISOString(),
      user: currentUser!.name,
      description: `Tạo tài khoản mới: ${newForm.name}`,
      severity: "success",
    });
    setNewForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "operator",
    });
    setCreateOpen(false);
  };

  const toggleDryer = (
    form: UserAccount,
    field: "controlDryers" | "deviceDryers",
    dryerId: string,
  ) => {
    const current = Array.isArray(form.permissions[field])
      ? (form.permissions[field] as string[])
      : [];
    const next = current.includes(dryerId)
      ? current.filter((d) => d !== dryerId)
      : [...current, dryerId];
    setEditForm({
      ...form,
      permissions: { ...form.permissions, [field]: next },
    });
  };

  const permItems = [
    {
      key: "control",
      label: "Điều khiển",
      icon: LayoutDashboard,
      color: "blue",
    },
    {
      key: "devices",
      label: "Quản lý thiết bị",
      icon: Cpu,
      color: "green",
    },
    {
      key: "policy",
      label: "Chính sách",
      icon: BookOpen,
      color: "purple",
    },
    {
      key: "statistics",
      label: "Thống kê",
      icon: BarChart3,
      color: "amber",
    },
    { key: "logs", label: "Nhật ký", icon: ClipboardList, color: "slate" },
  ];

  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
    amber: "#f59e0b",
    slate: "#64748b",
  };
  const bgMap: Record<string, string> = {
    blue: "#eff6ff",
    green: "#f0fdf4",
    purple: "#faf5ff",
    amber: "#fffbeb",
    slate: "#f8fafc",
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-slate-900 mb-1"
            style={{ fontWeight: 700 }}
          >
            Quản lý người dùng
          </h1>
          <p className="text-slate-500 text-sm">
            Quản lý tài khoản và quyền truy cập trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            fontWeight: 600,
          }}
        >
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Tổng tài khoản",
            value: users.length,
            color: "#3b82f6",
            bg: "#eff6ff",
            icon: Users,
          },
          {
            label: "Quản trị viên",
            value: users.filter((u) => u.role === "admin").length,
            color: "#a855f7",
            bg: "#faf5ff",
            icon: Shield,
          },
          {
            label: "Vận hành viên",
            value: users.filter((u) => u.role === "operator").length,
            color: "#3b82f6",
            bg: "#eff6ff",
            icon: User,
          },
          {
            label: "Đang hoạt động",
            value: users.filter((u) => u.active).length,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: ShieldCheck,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{s.label}</p>
                <p
                  className="text-2xl"
                  style={{ fontWeight: 700, color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Quản trị viên</option>
          <option value="operator">Vận hành viên</option>
          <option value="viewer">Người xem</option>
        </select>
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base text-slate-900"
              style={{ fontWeight: 700 }}
            >
              Thêm tài khoản mới
            </h2>
            <button
              onClick={() => setCreateOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { key: "name", label: "Họ tên *", ph: "Nguyễn Văn A" },
              { key: "email", label: "Email *", ph: "email@factory.vn" },
              { key: "password", label: "Mật khẩu *", ph: "Mật khẩu" },
              { key: "phone", label: "Số điện thoại", ph: "0901234567" },
            ].map((f) => (
              <div key={f.key}>
                <label
                  className="block text-xs text-slate-500 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  {f.label}
                </label>
                <input
                  type={f.key === "password" ? "password" : "text"}
                  value={(newForm as any)[f.key]}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.ph}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label
                className="block text-xs text-slate-500 mb-1"
                style={{ fontWeight: 600 }}
              >
                Vai trò *
              </label>
              <select
                value={newForm.role}
                onChange={(e) =>
                  setNewForm((p) => ({ ...p, role: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="operator">Vận hành viên</option>
                <option value="viewer">Người xem</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createUser}
              className="px-5 py-2 text-white rounded-lg text-sm hover:opacity-90 transition-all"
              style={{ background: "#3b82f6", fontWeight: 600 }}
            >
              Tạo tài khoản
            </button>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-3">
        {filtered.map((user) => {
          const isExpanded = expandedId === user.id;
          const isEditing = editingId === user.id;
          const ef = isEditing ? editForm! : user;
          const isCurrentUser = user.id === currentUser?.id;
          return (
            <div
              key={user.id}
              className={`bg-white rounded-xl shadow-sm border transition-all ${isCurrentUser ? "border-blue-200" : "border-slate-100 hover:border-slate-200 hover:shadow-md"}`}
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() =>
                  !isEditing &&
                  setExpandedId((prev) => (prev === user.id ? null : user.id))
                }
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                  style={{
                    background: isCurrentUser
                      ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
                      : "linear-gradient(135deg, #94a3b8, #64748b)",
                    fontWeight: 700,
                  }}
                >
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm text-slate-900"
                      style={{ fontWeight: 600 }}
                    >
                      {user.name}
                    </p>
                    {isCurrentUser && (
                      <span
                        className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                        style={{ fontWeight: 600 }}
                      >
                        Bạn
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${roleColor[user.role]}`}
                      style={{ fontWeight: 600 }}
                    >
                      {roleLabel[user.role]}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${user.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      style={{ fontWeight: 500 }}
                    >
                      {user.active ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail size={11} />
                      {user.email}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => startEdit(user)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        title="Sửa"
                      >
                        <Edit3 size={15} />
                      </button>
                      {!isCurrentUser && (
                        <button
                          onClick={() => deleteUser(user.id, user.name)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"
                        style={{ fontWeight: 600 }}
                      >
                        <Check size={12} /> Lưu
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                        }}
                        className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs"
                      >
                        Hủy
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === user.id ? null : user.id,
                      )
                    }
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Basic info */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "name", label: "Há» tÃªn" },
                          { key: "email", label: "Email" },
                          { key: "phone", label: "Äiá»‡n thoáº¡i" },
                        ].map((f) => (
                          <div key={f.key}>
                            <label
                              className="text-xs text-slate-500 block mb-1"
                              style={{ fontWeight: 600 }}
                            >
                              {f.label}
                            </label>
                            <input
                              type="text"
                              value={(ef as any)[f.key] || ""}
                              onChange={(e) =>
                                setEditForm({ ...ef, [f.key]: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ))}
                        <div>
                          <label
                            className="text-xs text-slate-500 block mb-1"
                            style={{ fontWeight: 600 }}
                          >
                            Vai trò
                          </label>
                          <select
                            value={ef.role}
                            onChange={(e) =>
                              setEditForm({
                                ...ef,
                                role: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="operator">Vận hành viên</option>
                            <option value="viewer">Người xem</option>
                            <option value="admin">Quản trị viên</option>
                          </select>
                        </div>
                        <div>
                          <label
                            className="text-xs text-slate-500 block mb-1"
                            style={{ fontWeight: 600 }}
                          >
                            Trạng thái
                          </label>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() =>
                                setEditForm({ ...ef, active: !ef.active })
                              }
                              className={`w-12 h-6 rounded-full transition-colors relative ${ef.active ? "bg-green-500" : "bg-slate-300"}`}
                            >
                              <span
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${ef.active ? "left-6" : "left-0.5"}`}
                              />
                            </button>
                            <span
                              className="text-sm"
                              style={{
                                color: ef.active ? "#22c55e" : "#94a3b8",
                                fontWeight: 500,
                              }}
                            >
                              {ef.active ? "Hoạt động" : "Vô hiệu"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Permissions */}
                      {ef.role !== "admin" && (
                        <div>
                          <p
                            className="text-xs text-slate-500 mb-3"
                            style={{ fontWeight: 600 }}
                          >
                            QUYỀN TRUY CẬP
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {permItems.map((perm) => {
                              const active = (ef.permissions as any)[perm.key];
                              return (
                                <div
                                  key={perm.key}
                                  className="rounded-xl border p-3 transition-all"
                                  style={{
                                    borderColor: active
                                      ? colorMap[perm.color] + "40"
                                      : "#e2e8f0",
                                    background: active
                                      ? bgMap[perm.color]
                                      : "white",
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <perm.icon
                                        size={15}
                                        style={{
                                          color: active
                                            ? colorMap[perm.color]
                                            : "#94a3b8",
                                        }}
                                      />
                                      <span
                                        className="text-xs"
                                        style={{
                                          fontWeight: 600,
                                          color: active ? "#0f172a" : "#94a3b8",
                                        }}
                                      >
                                        {perm.label}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setEditForm({
                                          ...ef,
                                          permissions: {
                                            ...ef.permissions,
                                            [perm.key]: !active,
                                          },
                                        })
                                      }
                                      className={`w-10 h-5 rounded-full transition-colors relative`}
                                      style={{
                                        background: active
                                          ? colorMap[perm.color]
                                          : "#cbd5e1",
                                      }}
                                    >
                                      <span
                                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? "left-5" : "left-0.5"}`}
                                      />
                                    </button>
                                  </div>

                                  {/* Dryer restrictions for control/devices */}
                                  {(perm.key === "control" ||
                                    perm.key === "devices") &&
                                    active && (
                                      <div>
                                        <div className="flex gap-1 mb-1">
                                          {["all", "specific"].map((opt) => {
                                            const field =
                                              perm.key === "control"
                                                ? "controlDryers"
                                                : "deviceDryers";
                                            const isAll =
                                              ef.permissions[field] === "all";
                                            const selected =
                                              opt === "all" ? isAll : !isAll;
                                            return (
                                              <button
                                                key={opt}
                                                onClick={() =>
                                                  setEditForm({
                                                    ...ef,
                                                    permissions: {
                                                      ...ef.permissions,
                                                      [field]:
                                                        opt === "all"
                                                          ? "all"
                                                          : [],
                                                    },
                                                  })
                                                }
                                                className={`text-xs px-2 py-0.5 rounded transition-all ${selected ? "text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                                                style={{
                                                  background: selected
                                                    ? colorMap[perm.color]
                                                    : undefined,
                                                  fontWeight: selected
                                                    ? 600
                                                    : 400,
                                                }}
                                              >
                                                {opt === "all"
                                                  ? "Táº¥t cáº£"
                                                  : "Chá»n mÃ¡y"}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {ef.permissions[
                                          perm.key === "control"
                                            ? "controlDryers"
                                            : "deviceDryers"
                                        ] !== "all" && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {dryers.map((d) => {
                                              const field =
                                                perm.key === "control"
                                                  ? "controlDryers"
                                                  : "deviceDryers";
                                              const list = ef.permissions[
                                                field
                                              ] as string[];
                                              const sel = list.includes(d.id);
                                              return (
                                                <button
                                                  key={d.id}
                                                  onClick={() =>
                                                    toggleDryer(
                                                      ef,
                                                      field as any,
                                                      d.id,
                                                    )
                                                  }
                                                  className={`text-xs px-1.5 py-0.5 rounded transition-all ${sel ? "text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                                                  style={{
                                                    background: sel
                                                      ? colorMap[perm.color]
                                                      : undefined,
                                                    fontWeight: sel ? 600 : 400,
                                                  }}
                                                >
                                                  {d.id.replace("DRY-", "")}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {ef.role === "admin" && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-2">
                          <Shield size={16} className="text-purple-500" />
                          <span className="text-sm text-purple-700">
                              Quản trị viên có toàn quyền truy cập hệ
                              thống 
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* View mode */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p
                          className="text-xs text-slate-500 mb-2"
                          style={{ fontWeight: 600 }}
                        >
                          THÔNG TIN TÀI KHOẢN 
                        </p>
                        <div className="space-y-2">
                          {[
                            { icon: User, label: "Họ tên", value: user.name },
                            { icon: Mail, label: "Email", value: user.email },
                            {
                              icon: Phone,
                              label: "Điện thoại",
                              value: user.phone || "Chưa cập nhật",
                            },
                          ].map((info) => (
                            <div
                              key={info.label}
                              className="flex items-center gap-3 text-sm"
                            >
                              <info.icon
                                size={14}
                                className="text-slate-400 flex-shrink-0"
                              />
                              <span className="text-slate-400 w-24 text-xs">
                                {info.label}
                              </span>
                              <span
                                className="text-slate-700 text-xs"
                                style={{ fontWeight: 500 }}
                              >
                                {info.value}
                              </span>
                            </div>
                          ))}
                          {user.lastLogin && (
                            <div className="flex items-center gap-3 text-sm">
                              <Key
                                size={14}
                                className="text-slate-400 flex-shrink-0"
                              />
                              <span className="text-slate-400 w-24 text-xs">
                                Đăng nhập cuối
                              </span>
                              <span
                                className="text-slate-700 text-xs"
                                style={{ fontWeight: 500 }}
                              >
                                {new Date(user.lastLogin).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p
                          className="text-xs text-slate-500 mb-2"
                          style={{ fontWeight: 600 }}
                        >
                          QUYỀN TRUY CẬP
                        </p>
                        {user.role === "admin" ? (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-2">
                            <Shield size={16} className="text-purple-500" />
                            <span className="text-sm text-purple-700">
                              Toàn quyền quản trị
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5">
                            {permItems.map((perm) => {
                              const active = (user.permissions as any)[
                                perm.key
                              ];
                              return (
                                <div
                                  key={perm.key}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${active ? "" : "opacity-50"}`}
                                  style={{
                                    background: active
                                      ? bgMap[perm.color]
                                      : "#f8fafc",
                                  }}
                                >
                                  <perm.icon
                                    size={14}
                                    style={{
                                      color: active
                                        ? colorMap[perm.color]
                                        : "#94a3b8",
                                    }}
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
                                    (perm.key === "control" ||
                                      perm.key === "devices") && (
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: colorMap[perm.color],
                                          fontWeight: 500,
                                        }}
                                      >
                                        {user.permissions[
                                          perm.key === "control"
                                            ? "controlDryers"
                                            : "deviceDryers"
                                        ] === "all"
                                          ? "Tất cả"
                                          : `${(user.permissions[perm.key === "control" ? "controlDryers" : "deviceDryers"] as string[]).length} mÃ¡y`}
                                      </span>
                                    )}
                                  {active ? (
                                    <Check
                                      size={12}
                                      style={{ color: colorMap[perm.color] }}
                                    />
                                  ) : (
                                    <X size={12} className="text-slate-300" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Không tìm thấy tài khoản nào </p>
        </div>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${confirmDialog.name}"?`}
        confirmLabel="Xóa"
        onConfirm={confirmDeleteUser}
        onCancel={() => setConfirmDialog({ open: false, id: "", name: "" })}
      />
    </div>
  );
}
