import { Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-accent ${className}`} size={18} />;
}

export function PageLoading({ text = "加载中…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-mist">
      <Spinner /> {text}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      {icon && <div className="text-4xl opacity-60">{icon}</div>}
      <div className="text-sm font-medium text-neutral-300">{title}</div>
      {hint && <div className="max-w-sm text-xs leading-relaxed text-fog">{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-sm text-red-400">{message}</div>
      {retry && (
        <button className="btn-ghost btn-sm" onClick={retry}>
          重试
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`card relative w-full ${width} p-6 shadow-2xl animate-fade-up`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button className="text-fog transition-colors hover:text-white" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ emoji, size = "md" }: { emoji: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "h-7 w-7 text-sm rounded-lg", md: "h-10 w-10 text-lg rounded-xl", lg: "h-14 w-14 text-2xl rounded-2xl", xl: "h-20 w-20 text-4xl rounded-3xl" };
  return (
    <div className={`flex shrink-0 items-center justify-center border border-line bg-card-2 ${sizes[size]}`} aria-hidden>
      {emoji || "🙂"}
    </div>
  );
}

/** 简易 toast：单例事件总线 */
type ToastFn = (message: string, kind?: "ok" | "err") => void;
let toastFn: ToastFn | null = null;
export function setToastHandler(fn: ToastFn) {
  toastFn = fn;
}
export const toast: ToastFn = (message, kind = "ok") => toastFn?.(message, kind);
