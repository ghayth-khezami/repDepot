import { useCallback, useEffect, useState } from 'react';
import { PageHeader, EmptyState } from '../components/ui';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import type { PaginatedResponse } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

type Props<T extends { id: string }> = {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  useQuery: (args: { page: number; limit: number; search?: string }) => {
    data?: PaginatedResponse<T>;
    isLoading: boolean;
    isFetching: boolean;
  };
  renderItem: (item: T) => React.ReactNode;
};

export function PaginatedListPage<T extends { id: string }>({
  title,
  subtitle,
  searchPlaceholder = 'Rechercher…',
  onAdd,
  addLabel,
  useQuery,
  renderItem,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => {
      if (page === 1) return data.data;
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...data.data.filter((x) => !ids.has(x.id))];
    });
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  return (
    <div className="pb-6">
      <PageHeader
        title={title}
        subtitle={subtitle ?? `${data?.meta.total ?? 0} au total`}
        onAdd={onAdd}
        addLabel={addLabel}
      />
      <div className="px-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>
      {isLoading && page === 1 ? (
        <EmptyState message="Chargement…" />
      ) : items.length === 0 ? (
        <EmptyState message="Aucun résultat." />
      ) : (
        <ul className="mt-4 space-y-2 px-4">{items.map((item) => <li key={item.id}>{renderItem(item)}</li>)}</ul>
      )}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}
