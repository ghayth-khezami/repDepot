import { ReactNode, useCallback, useState } from 'react';
import Modal from './Modal';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onClose,
}: ConfirmOptions & { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      <ActionsFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-slate-600 dark:text-gray-200"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleConfirm()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? '…' : confirmLabel}
        </button>
      </ActionsFooter>
    </Modal>
  );
}

function ActionsFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function useConfirmDialog() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ ...opts, open: true });
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onClose={() => setState(null)}
    />
  ) : null;

  return { confirm, dialog };
}
