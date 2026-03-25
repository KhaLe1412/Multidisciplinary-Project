import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const iconBg = variant === "danger" ? "bg-red-100" : "bg-amber-100";
  const iconColor = variant === "danger" ? "text-red-600" : "text-amber-600";
  const btnBg =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-amber-600 hover:bg-amber-700";
  const Icon = variant === "danger" ? Trash2 : AlertTriangle;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            <Icon size={24} className={iconColor} />
          </div>
          <h3
            className="text-lg text-slate-900 mb-2"
            style={{ fontWeight: 700 }}
          >
            {title}
          </h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
            style={{ fontWeight: 600 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm text-white ${btnBg} transition-colors`}
            style={{ fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
