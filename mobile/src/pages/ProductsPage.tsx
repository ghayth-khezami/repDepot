import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import {
  useGetProductsQuery,
  useUpdateProductMutation,
} from '../store/api/productApi';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader, ProductPrice, ProductStatusBadge, ProductThumb } from '../components/ui';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';
import { ProductDetailSheet } from '../components/ProductDetailSheet';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { showToast } = useToast();
  const [updateProduct] = useUpdateProductMutation();

  const filterKey = `${debouncedSearch}|${categoryId}`;
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filterKey]);

  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const { data, isLoading, isFetching } = useGetProductsQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => {
      if (page === 1) return data.data;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...data.data.filter((p) => !ids.has(p.id))];
    });
  }, [data, page]);

  const hasMore = data ? data.meta.page < data.meta.totalPages : false;
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching);

  const markSold = async (product: Product) => {
    try {
      await updateProduct({
        id: product.id,
        data: { isDispo: false, stockQuantity: 0 },
      }).unwrap();
      showToast('Produit marqué comme vendu', 'success');
      setSelected(null);
      setItems((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isDispo: false, stockQuantity: 0 } : p,
        ),
      );
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title="Produits" subtitle={`${data?.meta.total ?? 0} au total`} />

      <div className="space-y-3 px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-2xl border border-gray-200 py-3 pl-10 pr-4 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">Toutes les catégories</option>
          {(categories?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.categoryName}
            </option>
          ))}
        </select>
      </div>

      {isLoading && page === 1 ? (
        <EmptyState message="Chargement…" />
      ) : items.length === 0 ? (
        <EmptyState message="Aucun produit trouvé." />
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <ProductThumb product={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.productName}</p>
                  <ProductPrice value={p.PrixVente} />
                  <div className="mt-1 flex flex-wrap gap-2">
                    <ProductStatusBadge product={p} />
                    {p.barcode ? (
                      <span className="text-[10px] text-gray-400">#{p.barcode}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-8" />
      {isFetching && page > 1 ? <p className="py-4 text-center text-xs text-gray-500">Chargement…</p> : null}

      {selected ? (
        <ProductDetailSheet
          product={selected}
          onClose={() => setSelected(null)}
          onMarkSold={() => void markSold(selected)}
        />
      ) : null}
    </div>
  );
}
