import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { useGetProductsQuery } from '../store/api/productApi';
import { PAGE_SIZE } from '../lib/pagination';
import { ProductPrice, ProductThumb } from './ui';
import type { Product } from '../types';

type Props = {
  selected: Product[];
  onChange: (products: Product[]) => void;
  disabled?: boolean;
};

export function ProductMultiSelect({ selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
    setLoadedProducts([]);
  }, [debouncedSearch, open]);

  const { data, isFetching } = useGetProductsQuery(
    { page, limit: PAGE_SIZE, search: debouncedSearch || undefined, isDispo: true },
    { skip: !open },
  );

  useEffect(() => {
    if (!open || !data?.data) return;
    setLoadedProducts((prev) => {
      if (page === 1) return data.data;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...data.data.filter((p) => !ids.has(p.id))];
    });
  }, [data, page, open]);

  const hasMore = open && data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  const pickerProducts = useMemo(() => {
    const available = loadedProducts.filter((p) => p.isDispo !== false && p.stockQuantity > 0);
    const selectedIds = new Set(selected.map((p) => p.id));
    const merged = [...selected];
    for (const p of available) {
      if (!selectedIds.has(p.id)) merged.push(p);
    }
    if (!debouncedSearch) return merged;
    const q = debouncedSearch.toLowerCase();
    return merged.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q) ||
        p.category?.categoryName?.toLowerCase().includes(q),
    );
  }, [loadedProducts, selected, debouncedSearch]);

  const toggle = (product: Product) => {
    const exists = selected.some((p) => p.id === product.id);
    onChange(exists ? selected.filter((p) => p.id !== product.id) : [...selected, product]);
  };

  const remove = (id: string) => {
    onChange(selected.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left dark:border-slate-600 dark:bg-slate-900 disabled:opacity-60"
      >
        <span className="text-sm">
          {selected.length === 0 ? (
            <span className="text-gray-400">Choisir des produits…</span>
          ) : (
            <span className="font-semibold text-primary-700 dark:text-primary-300">
              {selected.length} produit{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <li
              key={p.id}
              className="flex max-w-full items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 py-1 pl-1 pr-2 dark:border-primary-800 dark:bg-primary-950"
            >
              <ProductThumb product={p} size="sm" />
              <span className="max-w-[8rem] truncate text-xs font-medium">{p.productName}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-full p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
                aria-label={`Retirer ${p.productName}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-gray-100 p-3 dark:border-slate-800">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par nom ou code-barres…"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
            {isFetching && pickerProducts.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">Chargement…</li>
            ) : pickerProducts.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">Aucun produit disponible</li>
            ) : (
              pickerProducts.map((p) => {
                const checked = selected.some((x) => x.id === p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                        checked
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-300 dark:border-slate-600'
                        }`}
                      >
                        {checked ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <ProductThumb product={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.productName}</p>
                        <ProductPrice value={p.PrixVente} />
                      </div>
                    </button>
                  </li>
                );
              })
            )}
            <div ref={sentinelRef} className="h-4" />
            {isFetching && pickerProducts.length > 0 ? (
              <li className="py-2 text-center text-xs text-gray-400">Chargement…</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
