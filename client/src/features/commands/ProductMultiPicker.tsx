import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Package, Search, X } from 'lucide-react';
import { useGetProductsFeedInfiniteQuery } from '../../store/api/productApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { uploadUrl } from '../../lib/apiBase';
import { formatTnd, toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { InfiniteSentinel } from '../../components/ui';
import type { Product } from '../../types';

/**
 * Articles of an order: type to search (0.8 s debounce), the list loads page by page while scrolling,
 * and only articles still for sale are offered — dépôt (D-…) or achat. Selected ones show as chips.
 */
export default function ProductMultiPicker({
  value,
  onChange,
  selectedProducts,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[], picked: Product[]) => void;
  /** Products already known for the selected ids (chips + totals). */
  selectedProducts: Product[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim());
  const feed = useGetProductsFeedInfiniteQuery({ search: search || undefined, stage: 'EN_VENTE' }, { skip: !open });
  const rows = useMemo(() => (feed.data?.pages ?? []).flatMap((p) => p.data), [feed.data]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (p: Product) => {
    const has = value.includes(p.id);
    const ids = has ? value.filter((x) => x !== p.id) : [...value, p.id];
    const known = [...selectedProducts.filter((x) => x.id !== p.id), ...(has ? [] : [p])];
    onChange(ids, known.filter((x) => ids.includes(x.id)));
  };
  const chips = value.map((id) => selectedProducts.find((p) => p.id === id)).filter(Boolean) as Product[];

  return (
    <div ref={box} className="bd-ui relative">
      {chips.length ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {chips.map((p) => (
            <li key={p.id} className="inline-flex max-w-full items-center gap-2 rounded-full bg-bd-lilac/70 py-1 pl-1 pr-2 text-sm font-extrabold text-bd-violet-strong">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                {p.photos?.[0] ? <img src={uploadUrl(p.photos[0].photoDoc)} alt="" className="h-full w-full object-cover" /> : <Package size={14} aria-hidden />}
              </span>
              <span className="truncate">{p.ref ? `${p.ref} · ` : ''}{p.productName}</span>
              {!disabled ? (
                <button type="button" aria-label={`Retirer ${p.productName}`} onClick={() => toggle(p)} className="rounded-full p-0.5 hover:bg-white/70">
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!disabled ? (
        <label className="relative block">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bd-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Rechercher un article : nom, réf. (D-…, P-…)"
            className="bd-input pl-11"
            data-dictation="off"
            role="combobox"
            aria-expanded={open}
          />
        </label>
      ) : null}
      {open && !disabled ? (
        <div className="absolute inset-x-0 top-full z-[1100] mt-2 overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-surface shadow-[0_18px_50px_rgba(30,27,75,0.2)]">
          <ul role="listbox" aria-multiselectable className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {feed.isLoading ? <li className="p-3 text-center text-sm font-bold text-bd-muted">Chargement…</li> : null}
            {rows.map((p) => {
              const on = value.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(p)}
                    className={cn('bd-focus flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 text-left', on ? 'bg-bd-lilac/70' : 'hover:bg-bd-bg')}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-bd-violet bg-bd-violet text-white' : 'border-bd-line/30')}>
                      {on ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bd-lilac/60 text-bd-violet">
                      {p.photos?.[0] ? <img src={uploadUrl(p.photos[0].photoDoc)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={18} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-bd-ink">{p.productName}</span>
                      <span className="block truncate text-xs font-bold text-bd-muted">
                        {p.ref ?? ''} ·{' '}
                        <span className={p.isDepot ? 'text-bd-violet-strong' : 'text-bd-pink-strong'}>{p.isDepot ? `Dépôt${p.depotPercentage ? ` ${p.depotPercentage} %` : ''}` : 'Achat'}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-bd-ink">{formatTnd(toMillimes(p.PrixVente))}</span>
                  </button>
                </li>
              );
            })}
            {!feed.isLoading && !rows.length ? <li className="p-4 text-center text-sm font-bold text-bd-muted">{search ? `Aucun article en vente pour « ${search} »` : 'Aucun article en vente'}</li> : null}
            <li className="list-none">
              <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
            </li>
          </ul>
          <div className="flex items-center justify-between border-t border-bd-line/10 px-3 py-2">
            <span className="text-xs font-bold text-bd-muted">{value.length} article{value.length > 1 ? 's' : ''} sélectionné{value.length > 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setOpen(false)} className="bd-focus min-h-[36px] rounded-xl bg-grad-pink-strong px-3 text-xs font-extrabold text-white">
              Terminé
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
