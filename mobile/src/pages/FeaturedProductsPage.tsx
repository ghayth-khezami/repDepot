import { useGetFeaturedProductsQuery } from '../store/api/featuredProductApi';
import { PageHeader, ProductThumb, ProductPrice, EmptyState } from '../components/ui';

export default function FeaturedProductsPage() {
  const { data, isLoading } = useGetFeaturedProductsQuery();

  return (
    <div className="pb-6">
      <PageHeader title="Coups de cœur" subtitle="Max 8 produits en vitrine" />
      {isLoading ? (
        <EmptyState message="Chargement…" />
      ) : !data?.length ? (
        <EmptyState message="Aucun coup de cœur configuré." />
      ) : (
        <ul className="space-y-2 px-4">
          {data.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
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
  );
}
