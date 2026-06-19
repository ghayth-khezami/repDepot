import { useEffect, useState } from 'react';
import {
  useGetFeaturedProductsQuery,
  useGetFeaturedProductIdsQuery,
  useSetFeaturedProductsMutation,
} from '../store/api/featuredProductApi';
import { useGetProductsQuery } from '../store/api/productApi';
import { PageHeader, ProductThumb, ProductPrice, EmptyState, ListSkeleton } from '../components/ui';
import { PrimaryButton, TextInput } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';
import { PAGE_SIZE } from '../lib/pagination';

export default function FeaturedProductsPage() {
  const { data: featured, isLoading } = useGetFeaturedProductsQuery();
  const { data: featuredIds } = useGetFeaturedProductIdsQuery();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const { showToast } = useToast();
  const [save, { isLoading: saving }] = useSetFeaturedProductsMutation();
  const { data: searchResults } = useGetProductsQuery({ page: 1, limit: PAGE_SIZE, search: search || undefined });

  useEffect(() => {
    if (featuredIds) setSelected(featuredIds);
  }, [featuredIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) {
        showToast('Maximum 8 coups de cœur', 'error');
        return prev;
      }
      return [...prev, id];
    });
  };

  const submit = async () => {
    try {
      await save(selected).unwrap();
      showToast('Coups de cœur enregistrés', 'success');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const pickerProducts = (searchResults?.data ?? []) as Product[];

  return (
    <div className="pb-6">
      <PageHeader title="Coups de cœur" subtitle={`${selected.length}/8 sélectionnés`} />
      {isLoading ? <ListSkeleton count={4} /> : (
        <>
          <div className="px-4">
            <p className="mb-2 text-sm font-semibold text-gray-600">Actuellement en vitrine</p>
            {!featured?.length ? <p className="text-sm text-gray-400">Aucun</p> : (
              <ul className="space-y-2">
                {featured.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <ProductThumb product={p} />
                    <div>
                      <p className="font-semibold">{p.productName}</p>
                      <ProductPrice value={p.PrixVente} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 px-4">
            <p className="mb-2 text-sm font-semibold">Ajouter / retirer des produits</p>
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" />
            <ul className="mt-3 space-y-2">
              {pickerProducts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                      selected.includes(p.id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <ProductThumb product={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.productName}</p>
                      <ProductPrice value={p.PrixVente} />
                    </div>
                    <span className="text-xs font-bold">{selected.includes(p.id) ? '✓' : '+'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 px-4">
            <PrimaryButton type="button" onClick={() => void submit()} loading={saving}>
              Enregistrer les coups de cœur
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
