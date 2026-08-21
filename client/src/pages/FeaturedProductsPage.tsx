import { useEffect, useState } from 'react';
import { Heart, Search, X } from 'lucide-react';
import {
  useGetFeaturedProductsQuery,
  useSetFeaturedProductsMutation,
} from '../store/api/featuredProductApi';
import { useGetProductsQuery } from '../store/api/productApi';
import { useToast } from '../context/ToastContext';
import { Product } from '../types';

const MAX_FEATURED = 8;

const FeaturedProductsPage = () => {
  const { showToast } = useToast();
  const { data: featuredProducts = [], isLoading: featuredLoading } = useGetFeaturedProductsQuery();
  const [selected, setSelected] = useState<Map<string, Product>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [setFeatured, { isLoading: saving }] = useSetFeaturedProductsMutation();

  useEffect(() => {
    if (featuredLoading || initialized) return;
    setSelected(new Map(featuredProducts.map((p) => [p.id, p])));
    setInitialized(true);
  }, [featuredLoading, featuredProducts, initialized]);

  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
    page,
    limit: 10,
    search: search || undefined,
  });

  const selectedIds = [...selected.keys()];

  const toggleProduct = (product: Product) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        return next;
      }
      if (next.size >= MAX_FEATURED) {
        showToast(`Maximum ${MAX_FEATURED} produits`, 'error');
        return prev;
      }
      next.set(product.id, product);
      return next;
    });
  };

  const removeProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await setFeatured(selectedIds).unwrap();
      showToast('Coups de cœur enregistrés', 'success');
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const photoUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${apiBaseUrl}${path}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Coups de cœur</h1>
          <p className="bo-muted mt-2">
            Choisissez jusqu&apos;à {MAX_FEATURED} produits affichés sur la page d&apos;accueil.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Sélection ({selectedIds.length}/{MAX_FEATURED})
          </h2>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Tout retirer
            </button>
          )}
        </div>

        {selectedIds.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun produit sélectionné pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {selectedIds.map((id, index) => {
              const product = selected.get(id);
              const photo = product?.photos?.[0]?.photoDoc;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                  {photo ? (
                    <img src={photoUrl(photo)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-slate-700" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product?.productName ?? id}</p>
                    {product && <p className="text-xs text-gray-500">{product.PrixVente} TND</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(id)}
                    className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-red-500"
                    aria-label="Retirer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un produit…"
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
      </div>

      {productsLoading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(productsData?.data ?? []).map((product) => {
            const isSelected = selected.has(product.id);
            const disabled = !isSelected && selected.size >= MAX_FEATURED;
            const photo = product.photos?.[0]?.photoDoc;
            return (
              <button
                key={product.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleProduct(product)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                    : 'border-gray-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {photo ? (
                  <img src={photoUrl(photo)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-gray-200 dark:bg-slate-700" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.productName}</p>
                  <p className="text-sm text-gray-500">{product.PrixVente} TND</p>
                </div>
                <Heart
                  className={`h-5 w-5 shrink-0 ${isSelected ? 'fill-violet-600 text-violet-600' : 'text-gray-300'}`}
                />
              </button>
            );
          })}
        </div>
      )}

      {(productsData?.meta.totalPages ?? 0) > page && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="mt-6 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-slate-600"
        >
          Charger plus
        </button>
      )}
    </div>
  );
};

export default FeaturedProductsPage;
