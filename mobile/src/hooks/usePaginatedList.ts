import { useCallback, useEffect, useState } from 'react';
import type { PaginatedResponse } from '../types';
import { PAGE_SIZE } from '../lib/pagination';
import { useInfiniteScroll } from './useDebouncedValue';

type QueryResult<T> = {
  data?: PaginatedResponse<T>;
  isLoading: boolean;
  isFetching: boolean;
};

type PaginatedArgs = { page?: number; limit?: number };

/** Infinite scroll: loads pages of 10 and appends as the user scrolls. */
export function useInfinitePaginatedQuery<T extends { id: string }, Args extends PaginatedArgs>(
  useQuery: (args: Args) => QueryResult<T>,
  baseArgs: Omit<Args, 'page' | 'limit'>,
  resetKey: unknown,
  options?: { skip?: boolean },
) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const skip = options?.skip ?? false;

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [resetKey, skip]);

  const query = useQuery({ ...baseArgs, page, limit: PAGE_SIZE } as Args);

  useEffect(() => {
    if (skip || !query.data?.data) return;
    setItems((prev) => {
      if (page === 1) return query.data!.data;
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...query.data!.data.filter((x) => !ids.has(x.id))];
    });
  }, [query.data, page, skip]);

  const hasMore = !skip && query.data ? query.data.meta.page < query.data.meta.totalPages : false;
  const loadMore = useCallback(() => {
    if (hasMore && !query.isFetching) setPage((p) => p + 1);
  }, [hasMore, query.isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, query.isFetching);

  return {
    items,
    total: query.data?.meta.total ?? items.length,
    hasMore,
    isLoading: !skip && query.isLoading && page === 1,
    isFetching: !skip && query.isFetching,
    sentinelRef,
  };
}

/** Auto-fetch every page (10 items each) — for dropdowns. */
export function useAutoPaginatedQuery<T extends { id: string }, Args extends PaginatedArgs>(
  useQuery: (args: Args) => QueryResult<T>,
  baseArgs: Omit<Args, 'page' | 'limit'>,
  resetKey: unknown,
  enabled = true,
) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const skip = !enabled;

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [resetKey, enabled]);

  const query = useQuery({ ...baseArgs, page, limit: PAGE_SIZE } as Args);

  useEffect(() => {
    if (skip || !query.data?.data) return;
    setItems((prev) => {
      if (page === 1) return query.data!.data;
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...query.data!.data.filter((x) => !ids.has(x.id))];
    });
  }, [query.data, page, skip]);

  const hasMore = !skip && query.data ? query.data.meta.page < query.data.meta.totalPages : false;

  useEffect(() => {
    if (skip || !hasMore || query.isFetching) return;
    setPage((p) => p + 1);
  }, [skip, hasMore, query.isFetching, query.data?.meta.page]);

  return {
    items,
    total: query.data?.meta.total ?? items.length,
    isLoading: !skip && query.isLoading && page === 1,
    isFetching: !skip && query.isFetching,
  };
}

export { PAGE_SIZE };
