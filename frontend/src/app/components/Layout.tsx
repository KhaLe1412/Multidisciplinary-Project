import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../context/AppContext";
import { NotificationPanel } from "./NotificationPanel";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Cpu,
  BarChart3,
  Bell,
  LogOut,
  Factory,
  ChevronRight,
  Users,
  Shield,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
} from "lucide-react";

export function Layout() {
  const {
    currentUser,
    logout,
    notifications,
    notificationOpen,
    setNotificationOpen,
    isAuthenticated,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = notifications.filter((n) => !n.read).length;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const p = currentUser?.permissions;
  const isAdmin = currentUser?.role === "admin";

  const navItems = [
    {
      to: "/control",
      icon: LayoutDashboard,
      label: "Điều khiển",
      show: p?.control,
    },
    { to: "/devices", icon: Cpu, label: "Thiết bị", show: p?.devices },
    {
      to: "/policy",
      icon: Shield,
      label: "Chính sách",
      show: p?.policy,
    },
    {
      to: "/statistics",
      icon: BarChart3,
      label: "Thống kê",
      show: p?.statistics,
    },
    { to: "/logs", icon: ClipboardList, label: "Nhật ký", show: p?.logs },
  ].filter((item) => isAdmin || item.show);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/control/")) return "Chi tiết máy sấy";
    if (path === "/control") return "Điều khiển";
    if (path === "/devices") return "Quản lý thiết bị";
    if (path === "/policy") return "Chính sách";
    if (path === "/statistics") return "Thống kê";
    if (path === "/logs") return "Nhật ký hệ thống";
    if (path === "/users") return "Quản lý người dùng";
    if (path === "/profile") return "Tài khoản";
    return "DryerControl";
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f0f4f8" }}
    >
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-300 relative"
        style={{
          width: sidebarOpen ? 220 : 64,
          background:
            "linear-gradient(180deg, #0c1a2e 0%, #0f2a4a 50%, #0c1a2e 100%)",
          borderRight: "1px solid rgba(99,179,237,0.1)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "rgba(99,179,237,0.15)", minHeight: 64 }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            <Factory size={18} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p
                className="text-white text-sm truncate"
                style={{ fontWeight: 700 }}
              >
                DryerControl
              </p>
              <p className="text-xs truncate" style={{ color: "#64b5f6" }}>
                Nhà máy ABC
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {sidebarOpen && (
            <p
              className="text-xs px-3 mb-2 uppercase tracking-wider"
              style={{ color: "#4a7fa5", fontWeight: 600 }}
            >
              Chức năng
            </p>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative ${
                  isActive ? "text-white" : "hover:text-white hover:bg-white/5"
                }`
              }
              style={({ isActive }) => ({
                background: isActive
                  ? "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))"
                  : "transparent",
                borderLeft: isActive
                  ? "3px solid #3b82f6"
                  : "3px solid transparent",
                color: isActive ? "#ffffff" : "#94a3b8",
              })}
              title={!sidebarOpen ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className="flex-shrink-0"
                    style={{ color: isActive ? "#60a5fa" : "inherit" }}
                  />
                  {sidebarOpen && (
                    <>
                      <span style={{ fontWeight: isActive ? 600 : 400 }}>
                        {label}
                      </span>
                      {isActive && (
                        <ChevronRight
                          size={14}
                          className="ml-auto"
                          style={{ color: "#60a5fa" }}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              {sidebarOpen && (
                <p
                  className="text-xs px-3 mt-4 mb-2 uppercase tracking-wider"
                  style={{ color: "#4a7fa5", fontWeight: 600 }}
                >
                  Quản trị
                </p>
              )}
              {!sidebarOpen && (
                <div
                  className="my-2 border-t"
                  style={{ borderColor: "rgba(99,179,237,0.1)" }}
                />
              )}
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative`
                }
                style={({ isActive }) => ({
                  background: isActive
                    ? "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid #3b82f6"
                    : "3px solid transparent",
                  color: isActive ? "#ffffff" : "#94a3b8",
                })}
                title={!sidebarOpen ? "Người dùng" : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Users
                      size={18}
                      className="flex-shrink-0"
                      style={{ color: isActive ? "#60a5fa" : "inherit" }}
                    />
                    {sidebarOpen && (
                      <span style={{ fontWeight: isActive ? 600 : 400 }}>
                        Người dùng
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User info */}
        <div
          className="border-t p-2"
          style={{ borderColor: "rgba(99,179,237,0.15)" }}
        >
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all"
            style={({ isActive }) => ({
              background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
            })}
            title={!sidebarOpen ? "Tài khoản" : undefined}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                fontWeight: 700,
              }}
            >
              {currentUser?.avatar}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p
                  className="text-white text-xs truncate"
                  style={{ fontWeight: 500 }}
                >
                  {currentUser?.name}
                </p>
                <p className="text-xs truncate" style={{ color: "#64b5f6" }}>
                  {currentUser?.role === "admin"
                    ? "Quản trị viên"
                    : currentUser?.role === "operator"
                      ? "Vận hành viên"
                      : "Xem"}
                </p>
              </div>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg mt-1 transition-all text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-xs" style={{ fontWeight: 500 }}>
                Đăng xuất
              </span>
            )}
          </button>
        </div>

        {/* Toggle button — tab on the right edge */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 hover:scale-110 z-20"
          style={{
            right: -14,
            width: 28,
            height: 52,
            background: "linear-gradient(135deg, #1e40af, #2563eb)",
            borderRadius: "0 10px 10px 0",
            border: "1px solid rgba(99,179,237,0.3)",
            borderLeft: "none",
            boxShadow: "3px 0 12px rgba(0,0,0,0.25)",
            color: "white",
          }}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={14} />
          ) : (
            <PanelLeftOpen size={14} />
          )}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{
            height: 64,
            background: "white",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div>
            <h1
              className="text-slate-900 text-base"
              style={{ fontWeight: 700 }}
            >
              {getPageTitle()}
            </h1>
            <p className="text-slate-400 text-xs">
              Hệ thống quản lý máy sấy công nghiệp
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Alerts badge */}
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all text-slate-500 hover:text-blue-600"
              style={{
                background: notificationOpen ? "#eff6ff" : "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                  style={{ fontWeight: 700 }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {/* Avatar */}
            <NavLink
              to="/profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                  fontWeight: 700,
                }}
              >
                {currentUser?.avatar}
              </div>
              <div className="hidden sm:block">
                <p
                  className="text-sm text-slate-800"
                  style={{ fontWeight: 600 }}
                >
                  {currentUser?.name}
                </p>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  {currentUser?.role === "admin"
                    ? "Quản trị viên"
                    : currentUser?.role === "operator"
                      ? "Vận hành viên"
                      : "Người xem"}
                </p>
              </div>
            </NavLink>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet key={location.pathname} />
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  );
}
