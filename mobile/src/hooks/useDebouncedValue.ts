import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useInfiniteScroll(loadMore: () => void, hasMore: boolean, loading: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  loadingRef.current = loading;
  hasMoreRef.current = hasMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return sentinelRef;
}
