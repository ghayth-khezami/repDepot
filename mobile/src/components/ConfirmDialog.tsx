import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    resolver?.(result);
    setResolver(null);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && options ? (
        <>
          <button type="button" className="fixed inset-0 z-[100] bg-black/50" onClick={() => close(false)} />
          <div className="fixed inset-x-4 top-1/2 z-[110] max-w-sm -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 mx-auto">
            <h3 className="text-lg font-bold">{options.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{options.message}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 rounded-2xl border border-gray-200 py-3 font-semibold dark:border-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 rounded-2xl py-3 font-semibold text-white ${
                  options.destructive ? 'bg-red-600' : 'bg-primary-600'
                }`}
              >
                {options.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </ConfirmContext.Provider>
  );
}
