import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function BottomSheet({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} aria-label="Fermer" />
      <div
        className={`fixed inset-x-0 bottom-0 z-[90] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${
          wide ? '' : ''
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </>
  );
}
