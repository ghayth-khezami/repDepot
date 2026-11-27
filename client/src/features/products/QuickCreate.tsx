import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';

/**
 * "+ Créer" next to a category / sous-catégorie field: type a name, Enter → created and selected.
 * A name that already exists (accents / case ignored) is refused by the server and reported.
 */
export default function QuickCreate({
  label,
  disabled,
  disabledHint,
  onCreate,
}: {
  label: string;
  disabled?: boolean;
  disabledHint?: string;
  onCreate: (name: string) => Promise<{ id: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const submit = async () => {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onCreate(v);
      showToast(`${label} « ${v} » créée et sélectionnée`, 'success');
      setName('');
      setOpen(false);
    } catch (e) {
      showToast(apiErrorMessage(e, `Création impossible`), 'error', 6000);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-pink-600 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Créer
      </button>
    );
  }
  return (
    <span className="mt-1 flex w-full items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={`Nouvelle ${label.toLowerCase()}`}
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
        data-dictation="off"
      />
      <button type="button" disabled={busy || !name.trim()} onClick={() => void submit()} aria-label="Créer" className="rounded-lg bg-pink-500 p-2 text-white disabled:opacity-50">
        <Check className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={() => setOpen(false)} aria-label="Annuler" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </span>
  );
}
