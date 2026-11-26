import { useMemo } from 'react';
import type { PaginatedResponse } from '../types';

interface FeedResult {
  data?: { pages: unknown[] };
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
}

/**
 * Adapts an RTK infinite query to the `{ data: { data, meta } }` shape the list pages already use,
 * plus the `infinite` prop for ReusableTable (scroll to load the next page, no page numbers).
 */
export function useInfiniteList<T>(feed: FeedResult) {
  const pages = feed.data?.pages as PaginatedResponse<T>[] | undefined;
  const data = useMemo(() => {
    if (!pages?.length) return undefined;
    return { data: pages.flatMap((p) => p.data), meta: pages[0].meta } as PaginatedResponse<T>;
  }, [pages]);
  return {
    data,
    isLoading: feed.isLoading,
    infinite: {
      hasNextPage: feed.hasNextPage,
      isFetchingNextPage: feed.isFetchingNextPage,
      fetchNextPage: () => void feed.fetchNextPage(),
      total: pages?.[0]?.meta.total,
    },
  };
}
