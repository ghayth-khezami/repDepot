import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000, action?: ToastAction) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, action };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="bd-ui pointer-events-none fixed inset-x-3 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] z-[96] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:top-20 md:items-end">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const TOAST_STYLE: Record<ToastType, { title: string; box: string; icon: string; Icon: typeof CheckCircle2; bar: string }> = {
  success: { title: 'Succès', box: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/70', icon: 'text-emerald-600', Icon: CheckCircle2, bar: 'bg-emerald-500' },
  error: { title: 'Une erreur est survenue', box: 'border-l-rose-500 bg-rose-50 dark:bg-rose-950/70', icon: 'text-rose-600', Icon: AlertTriangle, bar: 'bg-rose-500' },
  warning: { title: 'Attention', box: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/70', icon: 'text-amber-500', Icon: AlertCircle, bar: 'bg-amber-500' },
  info: { title: 'Information', box: 'border-l-violet-500 bg-violet-50 dark:bg-violet-950/70', icon: 'text-violet-600', Icon: Info, bar: 'bg-violet-500' },
};

/** Card like the design reference: colored left border, filled icon, title + message, close ×, timer bar. */
const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const st = TOAST_STYLE[toast.type];
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`bd-toast-in pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-xl border border-black/5 border-l-4 px-4 py-3 shadow-[0_12px_32px_rgba(30,27,75,0.16)] ${st.box}`}
    >
      <st.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${st.icon}`} fill="currentColor" stroke="white" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-bd-ink">{st.title}</p>
        <p className="text-[13px] font-semibold text-bd-ink/75">{toast.message}</p>
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              onClose();
            }}
            className="mt-1.5 rounded-full bg-bd-ink px-3 py-1 text-xs font-black text-white hover:opacity-90"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 rounded-full p-1 text-bd-ink/50 transition hover:bg-black/5 hover:text-bd-ink">
        <X className="h-4 w-4" />
      </button>
      {toast.duration && toast.duration > 0 ? (
        <span aria-hidden className={`bd-toast-bar absolute bottom-0 left-0 h-0.5 ${st.bar}`} style={{ animationDuration: `${toast.duration}ms` }} />
      ) : null}
    </div>
  );
};
