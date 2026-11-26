import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

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

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000, action?: ToastAction) => {
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
      <div className="bd-ui pointer-events-none fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[95] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:items-end">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };
  const colors = {
    success: 'text-bd-success',
    error: 'text-bd-danger',
    warning: 'text-amber-500',
    info: 'text-bd-violet',
  };
  return (
    <div role={toast.type === 'error' ? 'alert' : 'status'} className="bd-anim-pop pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-bd-ink px-4 py-3 text-white shadow-2xl">
      <span className={`shrink-0 ${colors[toast.type]}`}>{icons[toast.type]}</span>
      <p className="flex-1 text-sm font-bold">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onClose();
          }}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-black text-white hover:bg-white/25"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 opacity-70 transition-opacity hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
