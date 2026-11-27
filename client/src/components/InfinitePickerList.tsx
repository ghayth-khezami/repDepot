import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { InfiniteSentinel, SearchBar, Skeleton } from './ui';
import type { PaginatedResponse } from '../types';

export interface PickItem {
  id: string;
  label: string;
  hint?: string;
}

/** Result of any RTK `use…FeedInfiniteQuery` (pages of { data, meta }). */
export interface FeedLike {
  data?: { pages: unknown[] };
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
}

/**
 * Searchable list for selects / filters, loaded page by page: scrolling to the bottom appends the next
 * page under the current one (server-side search, debounced by the parent).
 */
export default function InfinitePickerList<T>({
  feed,
  toItem,
  filter,
  selected,
  onPick,
  placeholder,
  search,
  onSearch,
  emptyText = 'Aucun résultat.',
  footer,
}: {
  feed: FeedLike;
  toItem: (row: T) => PickItem;
  filter?: (row: T) => boolean;
  selected?: string | null;
  onPick: (item: PickItem, row: T) => void;
  placeholder: string;
  search: string;
  onSearch: (v: string) => void;
  emptyText?: string;
  footer?: React.ReactNode;
}) {
  const rows = useMemo(() => ((feed.data?.pages ?? []) as PaginatedResponse<T>[]).flatMap((p) => p.data).filter((r) => (filter ? filter(r) : true)), [feed.data, filter]);
  return (
    <div>
      <SearchBar value={search} onChange={onSearch} placeholder={placeholder} className="mb-3" />
      {feed.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : rows.length ? (
        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto overscroll-contain">
          {rows.map((r) => {
            const it = toItem(r);
            const active = selected === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick(it, r)}
                  className={cn('bd-focus flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl px-3 text-left', active ? 'bg-bd-lilac text-bd-violet-strong' : 'hover:bg-bd-bg')}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold">{it.label}</span>
                    {it.hint ? <span className="block truncate text-xs font-bold text-bd-muted">{it.hint}</span> : null}
                  </span>
                  {active ? <Check size={16} aria-hidden className="shrink-0" /> : null}
                </button>
              </li>
            );
          })}
          <li className="list-none">
            <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
          </li>
        </ul>
      ) : (
        <p className="py-6 text-center text-sm font-bold text-bd-muted">{emptyText}</p>
      )}
      {footer}
    </div>
  );
}
