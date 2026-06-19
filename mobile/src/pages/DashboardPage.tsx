import {
  useGetKPIsQuery,
  useGetRevenueBreakdownQuery,
  useGetTopProductsQuery,
  useGetDepotVsBuyingQuery,
  useGetCommandsByStatusQuery,
} from '../store/api/statsApi';
import { PageHeader, KpiSkeleton, ProductPrice } from '../components/ui';
import { formatTnd, uploadUrl } from '../lib/apiBase';
import { Package, ShoppingBag, Users, TrendingUp, Wallet, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const { data: kpis, isLoading: kLoading } = useGetKPIsQuery({ period: 'all' });
  const { data: revenue, isLoading: rLoading } = useGetRevenueBreakdownQuery({ period: 'all' });
  const { data: top, isLoading: tLoading } = useGetTopProductsQuery({ period: 'all', limit: 5 });
  const { data: mix } = useGetDepotVsBuyingQuery({ period: 'all' });
  const { data: byStatus } = useGetCommandsByStatusQuery({ period: 'all' });

  const loading = kLoading || rLoading;

  const delivered = byStatus?.find((s) => s.status === 'DELIVERED')?.count ?? kpis?.deliveredCommands ?? 0;
  const pending = byStatus?.find((s) => s.status === 'NOT_DELIVERED')?.count ?? (kpis ? kpis.totalCommands - kpis.deliveredCommands : 0);

  return (
    <div className="pb-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la boutique" />

      {loading ? (
        <KpiSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-4">
            <KpiCard
              label="Chiffre d'affaires"
              value={formatTnd(revenue?.totalRevenue ?? kpis?.totalRevenue ?? 0)}
              icon={Wallet}
              gradient="from-violet-500 to-purple-600"
            />
            <KpiCard
              label="Profit"
              value={formatTnd(kpis?.totalProfit ?? 0)}
              icon={TrendingUp}
              gradient="from-emerald-500 to-teal-600"
            />
            <KpiCard
              label="Produits"
              value={String(kpis?.totalProducts ?? 0)}
              icon={Package}
              gradient="from-blue-500 to-indigo-600"
            />
            <KpiCard
              label="Commandes"
              value={String(kpis?.totalCommands ?? 0)}
              icon={ShoppingBag}
              gradient="from-amber-500 to-orange-600"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 px-4">
            <KpiCard
              label="Clients"
              value={String(kpis?.totalClients ?? 0)}
              icon={Users}
              gradient="from-pink-500 to-rose-600"
              small
            />
            <KpiCard
              label="Panier moyen"
              value={formatTnd(kpis?.avgOrderValue ?? 0)}
              icon={BarChart3}
              gradient="from-cyan-500 to-sky-600"
              small
            />
          </div>

          <div className="mt-4 px-4">
            <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Revenus par type</p>
              <div className="mt-3 space-y-2">
                <RevenueRow label="Dépôt" value={revenue?.depotRevenue ?? 0} color="bg-violet-500" total={revenue?.totalRevenue ?? 1} />
                <RevenueRow label="Achat" value={revenue?.buyingRevenue ?? 0} color="bg-amber-500" total={revenue?.totalRevenue ?? 1} />
              </div>
              {mix ? (
                <p className="mt-3 text-xs text-gray-500">
                  Stock: {mix.depot} dépôt / {mix.buying} achat
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 px-4">
            <StatPill label="Livrées" value={delivered} tone="green" />
            <StatPill label="En attente" value={pending} tone="amber" />
          </div>
        </>
      )}

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Top produits</h2>
        {tLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-700" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {(top ?? []).map((p, i) => (
              <li
                key={p.productId}
                className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-700' : 'bg-primary-400'
                }`}>
                  {i + 1}
                </span>
                {p.photo ? (
                  <img src={uploadUrl(p.photo)} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary-50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.count} vente(s)</p>
                  {p.PrixVente != null ? <ProductPrice value={p.PrixVente} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  gradient,
  small,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  gradient: string;
  small?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-md`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{label}</p>
        <Icon size={18} className="text-white/70" />
      </div>
      <p className={`mt-2 font-bold ${small ? 'text-lg' : 'text-xl'}`}>{value}</p>
    </div>
  );
}

function RevenueRow({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500">{formatTnd(value)} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' }) {
  const cls = tone === 'green'
    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200';
  return (
    <div className={`rounded-2xl border p-3 text-center ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}
