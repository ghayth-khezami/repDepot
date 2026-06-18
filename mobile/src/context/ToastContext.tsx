import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed left-4 right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100'
                : t.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
                  : 'border-primary-200 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={18} /> : t.type === 'error' ? <XCircle size={18} /> : null}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
