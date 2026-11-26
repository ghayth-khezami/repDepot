import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { downloadAuthed } from '../lib/download';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/cn';

export type ExportEntity =
  | 'dashboard'
  | 'products'
  | 'clients'
  | 'co-clients'
  | 'commands'
  | 'deposit-requests'
  | 'users'
  | 'newsletter'
  | 'feedbacks';

export type ExportParams = Record<string, string | number | boolean | null | undefined>;

export function exportPath(entity: ExportEntity, params: ExportParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const q = qs.toString();
  return `/export/${entity}/xlsx${q ? `?${q}` : ''}`;
}

/** Green "Excel" button: downloads a server-built .xlsx honoring the current filters. */
export default function ExcelButton({
  entity,
  params,
  label = 'Excel',
  className,
  compact,
}: {
  entity: ExportEntity;
  params?: ExportParams;
  label?: string;
  className?: string;
  /** Icon-only on small screens. */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const run = async () => {
    setBusy(true);
    try {
      await downloadAuthed(exportPath(entity, params), `${entity}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Export Excel prêt', 'success');
    } catch (e) {
      showToast((e as Error).message || 'Export Excel impossible', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="bd-ui contents">
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      title="Exporter en Excel (filtres appliqués)"
      aria-label={`${label} — exporter en Excel`}
      className={cn(
        'bd-focus inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#15803D,#22C55E)] px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(22,163,74,0.3)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60',
        className,
      )}
    >
      {busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <FileSpreadsheet size={17} aria-hidden />}
      <span className={cn(compact && 'hidden sm:inline')}>{label}</span>
    </button>
    </span>
  );
}
