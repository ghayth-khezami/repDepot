import { useMemo, useState } from 'react';
import {
  Award,
  BadgeDollarSign,
  Box,
  Gauge,
  Coins,
  Store,
  CalendarRange,
  RotateCcw,
  Tag,
  DollarSign,
  Info,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  useGetRevenueBreakdownQuery,
  useGetMonthlySoldProductsQuery,
  useGetDepotVsBuyingQuery,
  useGetTotalSurchargeQuery,
  useGetTopProductsQuery,
  useGetDepotKpisQuery,
} from '../store/api/statsApi';
import DeposantSuivi from '../features/depot/DeposantSuivi';
import DashboardMaps from '../features/dashboard/DashboardMaps';
import PaymentRequestsReminder from '../features/dashboard/PaymentRequestsReminder';
import AppHeader, { DATE_RANGE_DELTA_LABEL, DATE_RANGE_LABEL, rangeFor, type DateRangeKey } from '../components/AppHeader';
import ExcelButton from '../components/ExcelButton';
import InstallAppButton from '../components/InstallAppButton';
import { useGetCategoryHierarchyQuery } from '../store/api/categoryApi';
import { Card, CardTitle, Illustration, InfoNote, StatCard } from '../components/ui';
import { formatTnd, toMillimes } from '../lib/money';
import { uploadUrl } from '../lib/apiBase';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const tnd = (v?: number) => formatTnd(toMillimes(v ?? 0));
const pctDelta = (cur?: number, prev?: number) => {
  if (cur === undefined || prev === undefined) return null;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

const Dashboard = () => {
  const [range, setRange] = useState<DateRangeKey | 'custom'>(() => {
    try {
      return (localStorage.getItem('bd-dash-range') as DateRangeKey | 'custom' | null) ?? 'month';
    } catch {
      return 'month';
    }
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data: categories } = useGetCategoryHierarchyQuery();

  const pickRange = (r: DateRangeKey | 'custom') => {
    setRange(r);
    try {
      localStorage.setItem('bd-dash-range', r);
    } catch {
      /* ignore */
    }
  };

  const { current, previous } = useMemo(() => {
    if (range !== 'custom') return rangeFor(range);
    if (!customFrom && !customTo) return { current: {}, previous: null };
    const start = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(2000, 0, 1);
    const end = customTo ? new Date(`${customTo}T23:59:59.999`) : new Date();
    const span = end.getTime() - start.getTime();
    return {
      current: { startDate: start.toISOString(), endDate: end.toISOString() },
      previous: customFrom ? { startDate: new Date(start.getTime() - span - 1).toISOString(), endDate: new Date(start.getTime() - 1).toISOString() } : null,
    };
  }, [range, customFrom, customTo]);
  const cat = categoryId || undefined;
  const cur = useMemo(() => ({ ...current, categoryId: cat }), [current, cat]);
  const prev = useMemo(() => (previous ? { ...previous, categoryId: cat } : null), [previous, cat]);
  const { data: revenue, isLoading: revenueLoading, isFetching: revenueFetching } = useGetRevenueBreakdownQuery(cur);
  const { data: prevRevenue } = useGetRevenueBreakdownQuery(prev ?? {}, { skip: !prev });
  const { data: surcharge, isLoading: surchargeLoading } = useGetTotalSurchargeQuery(cur);
  const { data: prevSurcharge } = useGetTotalSurchargeQuery(prev ?? {}, { skip: !prev });
  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlySoldProductsQuery({ year, categoryId: cat });
  const { data: depotVsBuying, isLoading: depotLoading } = useGetDepotVsBuyingQuery(cur);
  const { data: topProducts } = useGetTopProductsQuery({ ...cur, limit: 5 });
  const { data: depotKpis, isLoading: depotKpisLoading } = useGetDepotKpisQuery(cur);
  const { data: prevDepotKpis } = useGetDepotKpisQuery(prev ?? {}, { skip: !prev });
  const [suiviId, setSuiviId] = useState<string | null>(null);

  const deltaLabel = range === 'custom' ? 'vs période préc.' : DATE_RANGE_DELTA_LABEL[range];
  const d = (a?: number, b?: number) => (previous ? pctDelta(a, b) : null);
  const spark = monthly?.map((m) => m.count);
  const maxCount = Math.max(1, ...(monthly?.map((m) => m.count) ?? [1]));
  const yearTotal = monthly?.reduce((t, m) => t + m.count, 0) ?? 0;
  const thisMonthSales = monthly?.find((m) => Number(m.month.split('-')[1]) === new Date().getMonth() + 1 && year === thisYear)?.count ?? 0;

  const depotPct = depotVsBuying?.total ? (depotVsBuying.depot / depotVsBuying.total) * 100 : 0;
  const buyPct = depotVsBuying?.total ? (depotVsBuying.buying / depotVsBuying.total) * 100 : 0;
  const C = 2 * Math.PI * 70;

  return (
    <div className="bd-ui w-full">
      <AppHeader />
      <InstallAppButton variant="card" className="mb-4 md:hidden" />
      <PaymentRequestsReminder />

      <div className="mb-6 grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex sm:justify-end">
        <label className="relative min-w-0 sm:w-52">
          <span className="sr-only">Période</span>
          <CalendarRange size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bd-violet" />
          <select
            value={range}
            onChange={(e) => pickRange(e.target.value as DateRangeKey | 'custom')}
            className="bd-input min-h-[46px] truncate rounded-full border-transparent bg-bd-surface pl-10 pr-8 text-sm font-extrabold shadow-card"
          >
            {(Object.keys(DATE_RANGE_LABEL) as DateRangeKey[]).map((k) => (
              <option key={k} value={k}>
                {DATE_RANGE_LABEL[k]}
              </option>
            ))}
            <option value="custom">Dates personnalisées…</option>
          </select>
        </label>
        <label className="relative min-w-0 sm:w-56">
          <span className="sr-only">Catégorie</span>
          <Tag size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bd-pink" />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bd-input min-h-[46px] truncate rounded-full border-transparent bg-bd-surface pl-10 pr-8 text-sm font-extrabold shadow-card"
          >
            <option value="">Toutes catégories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </label>
        {categoryId || range === 'custom' ? (
          <button
            type="button"
            aria-label="Réinitialiser les filtres"
            title="Réinitialiser"
            onClick={() => {
              pickRange('month');
              setCategoryId('');
              setCustomFrom('');
              setCustomTo('');
            }}
            className="bd-focus hidden h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-bd-surface text-bd-muted shadow-card hover:text-bd-pink-strong sm:flex"
          >
            <RotateCcw size={18} aria-hidden />
          </button>
        ) : null}
        <ExcelButton entity="dashboard" label="Exporter" compact params={{ ...cur, year }} className="h-[46px] w-[46px] px-0 sm:w-auto sm:px-5" />
        {range === 'custom' ? (
          <div className="bd-anim-pop col-span-3 grid grid-cols-2 gap-2 sm:col-auto">
            <input type="date" aria-label="Du" data-dictation="off" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="bd-input min-h-[46px] rounded-full border-transparent bg-bd-surface text-sm font-bold shadow-card" />
            <input type="date" aria-label="Au" data-dictation="off" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="bd-input min-h-[46px] rounded-full border-transparent bg-bd-surface text-sm font-bold shadow-card" />
          </div>
        ) : null}
      </div>
      {revenueFetching ? <div aria-hidden className="-mt-4 mb-4 h-0.5 animate-pulse rounded-full bg-grad-pink" /> : null}

      <section aria-label="Indicateurs" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={DollarSign} tone="pink" label="Revenu Total" value={tnd(revenue?.totalRevenue)} loading={revenueLoading} delta={d(revenue?.totalRevenue, prevRevenue?.totalRevenue)} deltaLabel={deltaLabel} spark={spark} />
        <StatCard icon={ShoppingBag} tone="violet" label="Revenu d'Achat" value={tnd(revenue?.buyingRevenue)} loading={revenueLoading} delta={d(revenue?.buyingRevenue, prevRevenue?.buyingRevenue)} deltaLabel={deltaLabel} spark={spark} />
        <StatCard icon={Box} tone="amber" label="Revenu de Dépôt" value={tnd(revenue?.depotRevenue)} hint={`Commission ${tnd(revenue?.commission)} + ventes achat ${tnd(revenue?.achatSales)}`} loading={revenueLoading} delta={d(revenue?.depotRevenue, prevRevenue?.depotRevenue)} deltaLabel={deltaLabel} spark={spark} />
        <StatCard icon={Wallet} tone="purple" label="Surcharge Totale" value={tnd(surcharge?.totalSurcharge)} loading={surchargeLoading} delta={d(surcharge?.totalSurcharge, prevSurcharge?.totalSurcharge)} deltaLabel={deltaLabel} spark={spark} />
      </section>

      <section aria-label="Dépôt-vente" className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-bd-violet">
          <Store size={16} aria-hidden /> Dépôt-vente
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Box}
            tone="pink"
            label="Articles en dépôt"
            value={depotKpis?.onSaleCount ?? 0}
            hint={`Valeur ${tnd(depotKpis?.onSaleValue)} · +${depotKpis?.depositedInPeriod ?? 0} sur la période`}
            loading={depotKpisLoading}
          />
          <StatCard
            icon={Coins}
            tone="green"
            label="À payer aux déposants"
            value={tnd(depotKpis?.toPayAmount)}
            hint={`${depotKpis?.toPayCount ?? 0} article(s) vendu(s) non payé(s)`}
            loading={depotKpisLoading}
          />
          <StatCard
            icon={BadgeDollarSign}
            tone="violet"
            label="Commission dépôt"
            value={tnd(depotKpis?.commissionAmount)}
            hint={`${depotKpis?.soldCount ?? 0} vente(s) dépôt`}
            delta={d(depotKpis?.commissionAmount, prevDepotKpis?.commissionAmount)}
            deltaLabel={deltaLabel}
            loading={depotKpisLoading}
          />
          <StatCard
            icon={Gauge}
            tone="amber"
            label="Taux d'écoulement"
            value={`${(depotKpis?.sellThroughRate ?? 0).toFixed(0)} %`}
            hint={`${depotKpis?.contracts ?? 0} contrat(s) · ${depotKpis?.newDeposants ?? 0} nouveau(x) déposant(s)`}
            loading={depotKpisLoading}
          />
        </div>
      </section>

      <DashboardMaps args={cur} onSuivi={setSuiviId} />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 sm:p-6 lg:col-span-3">
          <CardTitle
            icon={TrendingUp}
            title="Produits Vendus par Mois"
            action={
              <label className="relative">
                <span className="sr-only">Année</span>
                <CalendarRange size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bd-violet" />
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bd-input min-h-[40px] rounded-full border-transparent bg-bd-bg py-1 pl-9 pr-8 text-sm font-extrabold"
                >
                  {Array.from({ length: thisYear - 2023 + 2 }, (_, i) => thisYear + 1 - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            {monthlyLoading ? (
              <div className="space-y-3">{Array.from({ length: 12 }, (_, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-bd-lilac" />)}</div>
            ) : (
              <ul className="space-y-2.5">
                {(monthly ?? []).map((m) => {
                  const idx = Number(m.month.split('-')[1]) - 1;
                  return (
                    <li key={m.month} className="flex items-center gap-3">
                      <span className="w-9 text-sm font-bold text-bd-ink">{MONTHS[idx]}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-bd-lilac/70" role="img" aria-label={`${MONTHS[idx]} : ${m.count} vente(s)`}>
                        <div className="h-full rounded-full bg-grad-pink transition-[width] duration-700" style={{ width: `${Math.max(3, (m.count / maxCount) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm font-extrabold tabular-nums text-bd-ink">{m.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="hidden flex-col items-center justify-between gap-4 sm:flex">
              <Illustration name="chart" className="h-32 w-32 text-[48px]" />
              <span className="inline-flex items-center gap-2 rounded-2xl bg-bd-blush px-4 py-3 text-sm font-extrabold text-bd-pink-strong">
                <ShoppingCart size={18} aria-hidden />
                {year === thisYear ? (
                  <>
                    <span className="tabular-nums">{thisMonthSales}</span> ventes ce mois-ci
                  </>
                ) : (
                  <>
                    <span className="tabular-nums">{yearTotal}</span> ventes en {year}
                  </>
                )}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 lg:col-span-2">
          <CardTitle icon={Package} title="Produits Dépôt vs Achat" />
          {depotLoading ? (
            <div className="mx-auto h-44 w-44 animate-pulse rounded-full bg-bd-lilac" />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={`Dépôt ${depotPct.toFixed(0)} %, achat ${buyPct.toFixed(0)} %`}>
                  <defs>
                    <linearGradient id="dv-pink" x1="0" x2="1"><stop offset="0" stopColor="#EC4899" /><stop offset="1" stopColor="#F472B6" /></linearGradient>
                    <linearGradient id="dv-violet" x1="0" x2="1"><stop offset="0" stopColor="#7C3AED" /><stop offset="1" stopColor="#A78BFA" /></linearGradient>
                  </defs>
                  <circle cx="90" cy="90" r="70" fill="none" stroke="rgb(var(--bd-lilac))" strokeWidth="24" />
                  {depotVsBuying?.total ? (
                    <>
                      <circle cx="90" cy="90" r="70" fill="none" stroke="url(#dv-pink)" strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(depotPct / 100) * C} ${C}`} />
                      <circle cx="90" cy="90" r="70" fill="none" stroke="url(#dv-violet)" strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(buyPct / 100) * C} ${C}`} strokeDashoffset={-(depotPct / 100) * C} />
                    </>
                  ) : null}
                </svg>
                <Illustration name="box" className="absolute inset-0 m-auto h-16 w-16 text-[36px]" />
              </div>
              <ul className="w-full space-y-2.5">
                {[
                  { label: 'En Dépôt', value: depotVsBuying?.depot ?? 0, pct: depotPct, dot: 'bg-grad-pink' },
                  { label: 'Achat', value: depotVsBuying?.buying ?? 0, pct: buyPct, dot: 'bg-grad-violet' },
                ].map((row) => (
                  <li key={row.label} className="flex min-h-[48px] items-center justify-between rounded-2xl bg-bd-bg px-4">
                    <span className="flex items-center gap-2.5 font-extrabold text-bd-ink">
                      <span aria-hidden className={`h-3 w-3 rounded-full ${row.dot}`} />
                      {row.label}
                    </span>
                    <span className="font-extrabold tabular-nums text-bd-ink">
                      {row.value} ({row.pct.toFixed(0)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!depotLoading && !depotVsBuying?.total ? (
            <InfoNote icon={Info} className="mt-4">Aucune donnée disponible pour le moment</InfoNote>
          ) : null}
        </Card>
      </div>

      {topProducts?.length ? (
        <Card className="mb-6 p-5 sm:p-6">
          <CardTitle icon={Award} tone="amber" title="Top 5 des produits les plus vendus" subtitle={range === 'custom' ? 'Période personnalisée' : DATE_RANGE_LABEL[range]} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topProducts.map((p, i) => (
              <li key={p.productId} className="overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-bg">
                <div className="relative aspect-square bg-bd-lilac/60">
                  {p.photo ? <img src={uploadUrl(p.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="absolute inset-0 m-auto h-10 w-10 text-bd-violet/60" aria-hidden />}
                  <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-grad-violet-strong text-sm font-black text-white">{p.rank || i + 1}</span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold text-bd-ink">{p.productName}</p>
                  <p className="mt-1 flex items-center justify-between text-xs font-bold text-bd-muted">
                    <span className="tabular-nums text-bd-pink-strong">{tnd(p.totalValue ?? p.PrixVente)}</span>
                    <span className="tabular-nums">{p.count}×</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {suiviId ? <DeposantSuivi id={suiviId} onClose={() => setSuiviId(null)} /> : null}
    </div>
  );
};

export default Dashboard;
