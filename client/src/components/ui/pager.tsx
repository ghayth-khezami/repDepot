import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/** ≥ 768 px. Lists: desktop = pages of cards, phone = infinite scroll. */
export function useIsDesktop() {
  const q = '(min-width: 768px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setDesktop(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return desktop;
}

/**
 * Desktop pagination on top of an infinite query: shows `pageSize` items per page and fetches the next
 * server pages only when the requested page needs them. Resets to page 1 when the list changes (filters).
 */
export function useDesktopPager<T>({
  items,
  total,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  pageSize = 12,
  resetKey,
}: {
  items: T[];
  total: number | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  pageSize?: number;
  resetKey?: unknown;
}) {
  const [rawPage, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const knownTotal = total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(knownTotal / pageSize));
  const page = Math.min(rawPage, totalPages); // filters changed → never past the last page
  const needed = page * pageSize;
  useEffect(() => {
    if (items.length < needed && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [items.length, needed, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const loading = items.length < Math.min(needed, knownTotal) && (hasNextPage || isFetchingNextPage);
  return { page, setPage: (p: number) => setPage(Math.min(Math.max(1, p), totalPages)), totalPages, pageItems, loading, total: knownTotal, pageSize };
}

function pagesToShow(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | '…'> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(total - 1, page + 1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

/** "1 2 … 9" pagination bar with the result range. */
export function Pager({ page, totalPages, total, pageSize, loading, onPage, className }: { page: number; totalPages: number; total: number; pageSize: number; loading?: boolean; onPage: (p: number) => void; className?: string }) {
  if (total <= pageSize) return total ? <p className={cn('py-3 text-center text-sm font-bold text-bd-muted', className)}>{total} résultat{total > 1 ? 's' : ''}</p> : null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'bd-focus flex h-10 min-w-[40px] items-center justify-center rounded-xl px-2 text-sm font-extrabold transition disabled:opacity-40';
  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3 py-4', className)}>
      <p className="text-sm font-bold text-bd-muted tabular-nums">
        {from}–{to} sur {total}
        {loading ? <Loader2 size={14} className="ml-2 inline animate-spin" aria-label="Chargement" /> : null}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={cn(btn, 'border border-bd-line/15 bg-bd-surface text-bd-ink')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
          <ChevronLeft size={18} aria-hidden />
        </button>
        {pagesToShow(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-bd-muted">…</span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
              className={cn(btn, p === page ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'bg-bd-surface text-bd-ink hover:bg-bd-lilac/60')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={cn(btn, 'border border-bd-line/15 bg-bd-surface text-bd-ink')} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
