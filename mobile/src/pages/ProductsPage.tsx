import { useCallback, useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import {
  useGetProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../store/api/productApi';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useDebouncedValue, useInfiniteScroll } from '../hooks/useDebouncedValue';
import { EmptyState, PageHeader, ProductPrice, ProductStatusBadge, ProductThumb, ListSkeleton } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { downloadAllProductLabels } from '../lib/download';
import type { Product } from '../types';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { ProductFormSheet } from '../components/ProductFormSheet';
import { PAGE_SIZE } from '../lib/pagination';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const filterKey = `${debouncedSearch}|${categoryId}`;
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filterKey]);

  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: PAGE_SIZE });
  const { data, isLoading, isFetching, refetch } = useGetProductsQuery({
    page,
    limit: PAGE_SIZE,
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

  const refreshList = () => {
    setPage(1);
    setItems([]);
    void refetch();
  };

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

  const handleDelete = async (product: Product) => {
    const ok = await confirm({
      title: 'Supprimer le produit',
      message: `Supprimer « ${product.productName} » ?`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(product.id).unwrap();
      showToast('Produit supprimé', 'success');
      setSelected(null);
      refreshList();
    } catch {
      showToast('Erreur suppression', 'error');
    }
  };

  const handleBulkLabels = async () => {
    try {
      showToast('Génération PDF…', 'success');
      await downloadAllProductLabels();
    } catch {
      showToast('Erreur téléchargement PDF', 'error');
    }
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Produits"
        subtitle={`${data?.meta.total ?? 0} au total`}
        onAdd={() => {
          if (formOpen) return;
          setEditProduct(null);
          setFormOpen(true);
        }}
        addLabel="Produit"
        addDisabled={formOpen}
      />

      <div className="space-y-3 px-4">
        <button
          type="button"
          onClick={() => void handleBulkLabels()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 py-2.5 text-sm font-semibold text-primary-700 dark:border-primary-700 dark:text-primary-300"
        >
          <Download size={16} />
          Télécharger toutes les étiquettes PDF
        </button>
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
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </select>
      </div>

      {isLoading && page === 1 ? (
        <ListSkeleton count={6} />
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
          onEdit={() => { setEditProduct(selected); setFormOpen(true); setSelected(null); }}
          onDelete={() => void handleDelete(selected)}
        />
      ) : null}

      {formOpen ? (
        <ProductFormSheet
          product={editProduct}
          onClose={() => { setFormOpen(false); setEditProduct(null); }}
          onSaved={refreshList}
        />
      ) : null}
    </div>
  );
}
