import { useGetRevenueBreakdownQuery, useGetTopProductsQuery, useGetDepotVsBuyingQuery } from '../store/api/statsApi';
import { PageHeader } from '../components/ui';
import { formatTnd, uploadUrl } from '../lib/apiBase';

export default function DashboardPage() {
  const { data: revenue, isLoading: rLoading } = useGetRevenueBreakdownQuery({ period: 'all' });
  const { data: top, isLoading: tLoading } = useGetTopProductsQuery({ period: 'all', limit: 5 });
  const { data: mix } = useGetDepotVsBuyingQuery({ period: 'all' });

  return (
    <div className="pb-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la boutique" />
      <div className="grid grid-cols-2 gap-3 px-4">
        <KpiCard label="Chiffre d'affaires" value={rLoading ? '…' : formatTnd(revenue?.totalRevenue ?? 0)} />
        <KpiCard label="Revenu dépôt" value={rLoading ? '…' : formatTnd(revenue?.depotRevenue ?? 0)} />
        <KpiCard label="Revenu achat" value={rLoading ? '…' : formatTnd(revenue?.buyingRevenue ?? 0)} />
        <KpiCard label="Dépôt vs achat" value={mix ? `${mix.depot} / ${mix.buying}` : '…'} small />
      </div>

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Top produits</h2>
        {tLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : (
          <ul className="space-y-2">
            {(top ?? []).map((p, i) => (
              <li
                key={p.productId}
                className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {i + 1}
                </span>
                {p.photo ? (
                  <img src={uploadUrl(p.photo)} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary-50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.count} vente(s)</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 font-bold text-primary-700 dark:text-primary-300 ${small ? 'text-sm' : 'text-base'}`}>{value}</p>
    </div>
  );
}
