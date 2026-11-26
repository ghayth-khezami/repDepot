import { useState } from 'react';
import { Activity, ArrowRight, ChevronLeft, ChevronRight, PackagePlus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useDeleteCoClientMutation, useGetCoClientsQuery } from '../../store/api/coClientApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import ExcelButton from '../../components/ExcelButton';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import type { DeposantSummary } from '../../store/api/depotApi';
import type { CoClient } from '../../types';
import DeposantSuivi from './DeposantSuivi';

type Row = CoClient & { _count?: { products: number; depositRequests: number } };

const fmtPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');

/**
 * The full déposants list (same data as the old "Déposants" page: search, pagination, Excel, delete)
 * — each row starts a dépôt or opens the suivi.
 */
export default function DeposantsList({ onPick, onNew }: { onPick: (d: DeposantSummary) => void; onNew: () => void }) {
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim(), 300);
  const [page, setPage] = useState(1);
  const limit = 12;
  const { data, isFetching, isLoading } = useGetCoClientsQuery({ page, limit, search: search || undefined });
  const [suiviId, setSuiviId] = useState<string | null>(null);
  const [remove] = useDeleteCoClientMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const rows = (data?.data ?? []) as Row[];
  const meta = data?.meta;

  const pick = (r: Row) =>
    onPick({
      id: r.id,
      number: r.number ?? 0,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phoneNumber,
      productsCount: r._count?.products ?? 0,
      contractsCount: r._count?.depositRequests ?? 0,
    });

  const del = (r: Row) =>
    confirm({
      title: 'Supprimer le déposant',
      message: `Supprimer ${r.firstName} ${r.lastName} ?`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try {
          await remove(r.id).unwrap();
          showToast('Déposant supprimé', 'success');
        } catch (e) {
          showToast(apiErrorMessage(e, 'Suppression impossible'), 'error');
        }
      },
    });

  return (
    <div className="space-y-4">
      {dialog}
      {suiviId ? <DeposantSuivi id={suiviId} onClose={() => setSuiviId(null)} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Rechercher un déposant</span>
          <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bd-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, téléphone, email ou RIB…"
            className="bd-input pl-11"
            autoFocus
          />
        </label>
        <ExcelButton entity="co-clients" params={{ search }} compact />
        <Button icon={UserPlus} onClick={onNew}>
          Nouveau déposant
        </Button>
      </div>

      <div aria-busy={isFetching} className={cn('transition-opacity', isFetching && !isLoading && 'opacity-60')}>
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : rows.length ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-bd-line/10 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-bd-bg text-xs font-extrabold uppercase tracking-wider text-bd-muted">
                  <tr>
                    <th className="px-4 py-3">Déposant</th>
                    <th className="px-4 py-3">Téléphone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">RIB</th>
                    <th className="px-4 py-3 text-center">Articles</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bd-line/5 bg-bd-surface">
                  {rows.map((r, i) => (
                    <tr key={r.id} style={{ animationDelay: `${i * 25}ms` }} className="bd-anim-fade-up transition hover:bg-bd-bg/70">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => pick(r)} className="flex items-center gap-3 text-left">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-xs font-black text-white">
                            {r.firstName[0]}
                            {r.lastName[0]}
                          </span>
                          <span>
                            <span className="block font-extrabold text-bd-ink">
                              {r.firstName} {r.lastName}
                            </span>
                            {r.number ? <span className="block text-xs font-bold text-bd-muted">N° {r.number}</span> : null}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-bd-ink">{fmtPhone(r.phoneNumber)}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-bd-muted">{r.email || '—'}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-bd-muted">{r.RIB || '—'}</td>
                      <td className="px-4 py-3 text-center font-extrabold tabular-nums text-bd-ink">{r._count?.products ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setSuiviId(r.id)} title="Suivi" aria-label={`Suivi de ${r.firstName}`} className="bd-focus flex h-9 w-9 items-center justify-center rounded-xl bg-bd-lilac/70 text-bd-violet hover:text-bd-pink-strong">
                            <Activity size={16} aria-hidden />
                          </button>
                          <button type="button" onClick={() => del(r)} title="Supprimer" aria-label={`Supprimer ${r.firstName}`} className="bd-focus flex h-9 w-9 items-center justify-center rounded-xl text-bd-muted hover:bg-bd-danger-bg hover:text-bd-danger">
                            <Trash2 size={16} aria-hidden />
                          </button>
                          <Button size="sm" icon={PackagePlus} onClick={() => pick(r)}>
                            Dépôt
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {rows.map((r, i) => (
                <li key={r.id} style={{ animationDelay: `${i * 30}ms` }} className="bd-anim-fade-up flex items-center gap-2 rounded-2xl border border-bd-line/10 bg-bd-surface p-2.5 shadow-card">
                  <button type="button" onClick={() => pick(r)} className="bd-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-sm font-black text-white">
                      {r.firstName[0]}
                      {r.lastName[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-extrabold text-bd-ink">
                        {r.firstName} {r.lastName}
                      </span>
                      <span className="block truncate text-xs font-bold text-bd-muted tabular-nums">
                        {r.number ? `N° ${r.number} · ` : ''}
                        {fmtPhone(r.phoneNumber)} · {r._count?.products ?? 0} art.
                      </span>
                    </span>
                  </button>
                  <button type="button" onClick={() => setSuiviId(r.id)} aria-label={`Suivi de ${r.firstName}`} className="bd-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bd-lilac/70 text-bd-violet active:scale-90">
                    <Activity size={17} aria-hidden />
                  </button>
                  <button type="button" onClick={() => pick(r)} aria-label={`Dépôt pour ${r.firstName}`} className="bd-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grad-pink-strong text-white shadow-glow-pink active:scale-90">
                    <ArrowRight size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={search ? 'Aucun déposant trouvé' : 'Aucun déposant pour le moment'}
            action={
              <Button icon={UserPlus} onClick={onNew}>
                Créer un déposant
              </Button>
            }
          >
            Créez-le en 3 champs, ou dictez-le avec l'assistant IA.
          </EmptyState>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-bd-muted tabular-nums">
            {meta.total} déposant{meta.total > 1 ? 's' : ''} · page {meta.page}/{meta.totalPages}
          </p>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="icon" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={18} aria-hidden />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Page suivante" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={18} aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
