import { useCallback, useEffect, useState } from 'react';
import {
  useGetDepositRequestsQuery,
  useUpdateDepositRequestStatusMutation,
  useGetDepositRequestQuery,
  type DepositRequest,
  type DepositRequestStatus,
} from '../store/api/depositRequestApi';
import { BottomSheet } from '../components/BottomSheet';
import { SecondaryButton } from '../components/mobile-forms';
import { PageHeader, EmptyState } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { formatTnd } from '../lib/apiBase';
import { PAGE_SIZE } from '../lib/pagination';

const statusLabel: Record<string, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contacté',
  CONFIRMED: 'Confirmé',
  CLOSED: 'Clôturé',
};

const nextActions: Record<DepositRequestStatus, { label: string; status: DepositRequestStatus }[]> = {
  PENDING: [{ label: 'Marquer contacté', status: 'CONTACTED' }],
  CONTACTED: [{ label: 'Confirmer', status: 'CONFIRMED' }],
  CONFIRMED: [{ label: 'Clôturer', status: 'CLOSED' }],
  CLOSED: [],
};

export default function DepositRequestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<DepositRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { showToast } = useToast();
  const [updateStatus] = useUpdateDepositRequestStatusMutation();
  const { data: detail } = useGetDepositRequestQuery(selectedId ?? '', { skip: !selectedId });

  const filterKey = `${debouncedSearch}|${statusFilter}`;
  useEffect(() => { setPage(1); setItems([]); }, [filterKey]);

  const { data, isLoading, isFetching } = useGetDepositRequestsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data.filter((x) => !prev.some((p) => p.id === x.id))]));
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => { if (hasMore && !isFetching) setPage((p) => p + 1); }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  const changeStatus = async (id: string, status: DepositRequestStatus) => {
    try {
      await updateStatus({ id, status }).unwrap();
      showToast('Statut mis à jour', 'success');
      setSelectedId(null);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title="Demandes de dépôt" subtitle={`${data?.meta.total ?? 0} au total`} />
      <div className="space-y-3 px-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading && page === 1 ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune demande." /> : (
        <ul className="mt-4 space-y-2 px-4">
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className="w-full rounded-2xl border border-primary-100 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{r.fullName}</p>
                  <span className="text-xs font-bold uppercase text-primary-600">{statusLabel[r.status] ?? r.status}</span>
                </div>
                <p className="text-sm text-gray-500">{r.phoneNumber}</p>
                <p className="text-sm font-medium text-primary-700">{formatTnd(r.proposedPrice)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinelRef} className="h-8" />

      {selectedId && detail ? (
        <BottomSheet title="Demande de dépôt" onClose={() => setSelectedId(null)}>
          <div className="space-y-3 text-sm">
            <p><strong>Nom:</strong> {detail.fullName}</p>
            <p><strong>Tél:</strong> {detail.phoneNumber}</p>
            <p><strong>Prix proposé:</strong> {formatTnd(detail.proposedPrice)}</p>
            <p><strong>Statut:</strong> {statusLabel[detail.status]}</p>
            {detail.message ? <p><strong>Message:</strong> {detail.message}</p> : null}
            {detail.items?.length ? (
              <div>
                <p className="font-semibold">Articles ({detail.items.length})</p>
                <ul className="mt-1 space-y-1">
                  {detail.items.map((it) => (
                    <li key={it.id} className="text-gray-600">{it.productName} — {formatTnd(it.proposedPrice)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2">
              {(nextActions[detail.status] ?? []).map((a) => (
                <SecondaryButton key={a.status} type="button" onClick={() => void changeStatus(detail.id, a.status)}>
                  {a.label}
                </SecondaryButton>
              ))}
            </div>
          </div>
        </BottomSheet>
      ) : null}
    </div>
  );
}
