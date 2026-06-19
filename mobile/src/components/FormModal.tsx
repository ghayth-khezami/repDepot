import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function FormModal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const tryClose = () => {
    if (!busy) onClose();
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] bg-black/40"
        onClick={tryClose}
        aria-label="Fermer"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-[8dvh] z-[90] mx-auto flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={tryClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
