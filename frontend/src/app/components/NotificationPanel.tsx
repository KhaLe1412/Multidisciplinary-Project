import { useApp } from '../context/AppContext';
import { X, Bell, AlertTriangle, Info, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const typeConfig = {
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-100' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
};

export function NotificationPanel() {
  const { notifications, setNotifications, notificationOpen, setNotificationOpen } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  const markAll = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markOne = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const deleteOne = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  if (!notificationOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-700" />
            <span className="text-slate-900 text-base" style={{ fontWeight: 600 }}>Thông báo</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-blue-600 hover:text-blue-700">Đánh dấu tất cả</button>
            )}
            <button onClick={() => setNotificationOpen(false)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Bell size={36} className="mb-2 opacity-30" />
              <p className="text-sm">Không có thông báo nào</p>
            </div>
          ) : notifications.map(n => {
            const cfg = typeConfig[n.type];
            const Icon = cfg.icon;
            return (
              <div key={n.id}
                className={`relative flex gap-3 p-3 rounded-lg border ${cfg.bg} ${!n.read ? 'ring-1 ring-blue-200' : ''} cursor-pointer`}
                onClick={() => markOne(n.id)}>
                {!n.read && <div className="absolute top-3 right-8 w-2 h-2 bg-blue-500 rounded-full" />}
                <Icon size={18} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800" style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                  className="flex-shrink-0 p-1 hover:bg-white/70 rounded text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 px-5 py-3 bg-slate-50">
          <p className="text-xs text-slate-400 text-center">{notifications.length} thông báo tổng cộng</p>
        </div>
      </div>
    </>
  );
}
