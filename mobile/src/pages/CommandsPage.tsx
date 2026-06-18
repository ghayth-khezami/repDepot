import { useCallback, useEffect, useState } from 'react';
import { useGetCommandsQuery, useUpdateCommandMutation } from '../store/api/commandApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader } from '../components/ui';
import { useToast } from '../context/ToastContext';
import type { Command } from '../types';
import { formatTnd } from '../lib/apiBase';

export default function CommandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Command[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { showToast } = useToast();
  const [updateCommand] = useUpdateCommandMutation();

  const filterKey = `${debouncedSearch}|${status}`;
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filterKey]);

  const { data, isLoading, isFetching } = useGetCommandsQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => {
      if (page === 1) return data.data;
      const ids = new Set(prev.map((c) => c.id));
      return [...prev, ...data.data.filter((c) => !ids.has(c.id))];
    });
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  const toggleDelivered = async (cmd: Command) => {
    const next = cmd.status === 'DELIVERED' ? 'NOT_DELIVERED' : 'DELIVERED';
    try {
      await updateCommand({ id: cmd.id, data: { status: next } }).unwrap();
      showToast(next === 'DELIVERED' ? 'Commande livrée' : 'Commande en attente', 'success');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title="Commandes" subtitle={`${data?.meta.total ?? 0} au total`} />
      <div className="space-y-3 px-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">Tous les statuts</option>
          <option value="NOT_DELIVERED">Non livré</option>
          <option value="DELIVERED">Livré</option>
        </select>
      </div>

      {isLoading && page === 1 ? (
        <EmptyState message="Chargement…" />
      ) : items.length === 0 ? (
        <EmptyState message="Aucune commande." />
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {items.map((cmd) => (
            <li
              key={cmd.id}
              className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{formatTnd(cmd.PrixVente)}</p>
                  <p className="text-xs text-gray-500">{cmd.productsNumber} article(s)</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{cmd.adresseLivraison}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                    cmd.status === 'DELIVERED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {cmd.status === 'DELIVERED' ? 'Livré' : 'En attente'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void toggleDelivered(cmd)}
                className="mt-3 w-full rounded-xl border border-primary-200 py-2 text-sm font-semibold text-primary-700 dark:border-slate-600 dark:text-primary-300"
              >
                {cmd.status === 'DELIVERED' ? 'Marquer non livré' : 'Marquer livré'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}
