import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
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
  Download,
  FileText,
  Info,
  MapPin,
  Package,
  PackagePlus,
  QrCode,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useGetRevenueBreakdownQuery,
  useGetMonthlySoldProductsQuery,
  useGetDepotVsBuyingQuery,
  useGetCommandLocationsQuery,
  useGetTotalSurchargeQuery,
  useGetTopProductsQuery,
  useGetDepotKpisQuery,
  useGetDepotLocationsQuery,
} from '../store/api/statsApi';
import DeposantSuivi from '../features/depot/DeposantSuivi';
import AppHeader, { DATE_RANGE_DELTA_LABEL, DATE_RANGE_LABEL, rangeFor, type DateRangeKey } from '../components/AppHeader';
import ExcelButton from '../components/ExcelButton';
import { useGetCategoryHierarchyQuery } from '../store/api/categoryApi';
import { Button, Card, CardTitle, EmptyState, Illustration, InfoNote, Pill, StatCard, buttonClass } from '../components/ui';
import { downloadAuthed } from '../lib/download';
import { formatTnd, toMillimes } from '../lib/money';
import { uploadUrl } from '../lib/apiBase';
import { useToast } from '../context/ToastContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const tnd = (v?: number) => formatTnd(toMillimes(v ?? 0));
const pctDelta = (cur?: number, prev?: number) => {
  if (cur === undefined || prev === undefined) return null;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
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
  const { data: locations, isLoading: locationsLoading } = useGetCommandLocationsQuery(cur);
  const { data: topProducts } = useGetTopProductsQuery({ ...cur, limit: 5 });
  const { data: depotKpis, isLoading: depotKpisLoading } = useGetDepotKpisQuery(cur);
  const { data: prevDepotKpis } = useGetDepotKpisQuery(prev ?? {}, { skip: !prev });
  const { data: depotLocations, isLoading: depotLocLoading } = useGetDepotLocationsQuery(cur);
  const [suiviId, setSuiviId] = useState<string | null>(null);

  const deltaLabel = range === 'custom' ? 'vs période préc.' : DATE_RANGE_DELTA_LABEL[range];
  const d = (a?: number, b?: number) => (previous ? pctDelta(a, b) : null);
  const spark = monthly?.map((m) => m.count);
  const maxCount = Math.max(1, ...(monthly?.map((m) => m.count) ?? [1]));
  const thisMonthSales = monthly?.find((m) => Number(m.month.split('-')[1]) === new Date().getMonth() + 1 && year === thisYear)?.count ?? 0;

  const download = async (key: string, path: string, filename: string) => {
    setBusy(key);
    try {
      await downloadAuthed(path, filename);
    } catch (e) {
      showToast((e as Error).message || 'Téléchargement impossible', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Geocode order addresses (cached, throttled to Nominatim's 1 req/s policy).
  const geoCacheRef = useRef<Record<string, [number, number]>>({});
  const [, setMapTick] = useState(0);
  const toGeocode = useMemo(
    () => [...(locations ?? []).map((l) => l.address), ...(depotLocations ?? []).filter((l) => l.lat == null || l.lng == null).map((l) => l.address)],
    [locations, depotLocations],
  );
  useEffect(() => {
    if (!toGeocode.length) return;
    let cancelled = false;
    void (async () => {
      for (const address of toGeocode) {
        if (cancelled) break;
        const addr = address?.trim();
        if (!addr || geoCacheRef.current[addr]) continue;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${addr}, Tunisia`)}`, {
            headers: { 'Accept-Language': 'fr' },
          });
          const json = await res.json();
          const lat = parseFloat(json?.[0]?.lat);
          const lon = parseFloat(json?.[0]?.lon);
          if (!cancelled && Number.isFinite(lat) && Number.isFinite(lon)) {
            geoCacheRef.current[addr] = [lat, lon];
            setMapTick((t) => t + 1);
          }
        } catch {
          /* ignore geocode errors */
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toGeocode]);

  const depotPct = depotVsBuying?.total ? (depotVsBuying.depot / depotVsBuying.total) * 100 : 0;
  const buyPct = depotVsBuying?.total ? (depotVsBuying.buying / depotVsBuying.total) * 100 : 0;
  const C = 2 * Math.PI * 70;

  return (
    <div className="bd-ui mx-auto max-w-7xl">
      <AppHeader />

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
        <StatCard icon={Box} tone="amber" label="Revenu de Dépôt" value={tnd(revenue?.depotRevenue)} loading={revenueLoading} delta={d(revenue?.depotRevenue, prevRevenue?.depotRevenue)} deltaLabel={deltaLabel} spark={spark} />
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

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 sm:p-6 lg:col-span-3">
          <CardTitle
            icon={TrendingUp}
            title="Produits Vendus par Mois"
            action={
              <div className="flex gap-1.5" role="group" aria-label="Année">
                {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                  <Pill key={y} active={y === year} onClick={() => setYear(y)}>
                    {y}
                  </Pill>
                ))}
              </div>
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
                <span className="tabular-nums">{thisMonthSales}</span> ventes ce mois-ci
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

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="relative overflow-hidden p-5 sm:p-6 lg:col-span-3">
          <CardTitle icon={Package} title="Gestion des Produits" subtitle="Gérez tous les produits de votre boutique" />
          <div className="flex flex-wrap gap-2.5 pr-0 sm:pr-28">
            <Link to="/depots/nouveau" className={buttonClass('primary')}>
              <PackagePlus size={18} aria-hidden /> Nouveau dépôt
            </Link>
            <Button variant="secondary" icon={QrCode} loading={busy === 'qr'} onClick={() => download('qr', '/products/export/qr/pdf', 'produits-qr.pdf')}>
              PDF QR produits (achats)
            </Button>
          </div>
          <Illustration name="bag" className="absolute bottom-3 right-4 hidden h-24 w-24 text-[56px] sm:inline-flex" />
        </Card>

        <Card className="p-5 sm:p-6 lg:col-span-2">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
            }}
            className="flex flex-wrap items-center gap-2.5"
          >
            <label className="relative min-w-[180px] flex-1">
              <span className="sr-only">Rechercher un produit</span>
              <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bd-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou réf…" className="bd-input pl-11" />
            </label>
            <Button variant="primary" size="icon" aria-label="Exporter CSV" title="Exporter CSV" loading={busy === 'csv'} onClick={() => download('csv', '/products/export/csv', 'produits.csv')}>
              {busy === 'csv' ? null : <Download size={18} aria-hidden />}
            </Button>
            <Button variant="violet" size="icon" aria-label="Exporter PDF" title="Exporter PDF" loading={busy === 'pdf'} onClick={() => download('pdf', '/products/export/pdf', 'produits.pdf')}>
              {busy === 'pdf' ? null : <FileText size={18} aria-hidden />}
            </Button>
          </form>
          <Link to="/products" className={buttonClass('primary', 'md', 'mt-3 w-full')}>
            Gérer les produits
          </Link>
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <CardTitle icon={MapPin} tone="green" title="Localisation des commandes" />
        {locationsLoading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-bd-lilac" />
        ) : locations?.length ? (
          <div className="h-80 overflow-hidden rounded-2xl sm:h-96">
            <MapContainer center={[34.0, 9.0]} zoom={6} style={{ height: '100%', width: '100%' }} className="z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {locations.map((loc) => {
                const pos = geoCacheRef.current[loc.address] || [34.0, 9.0];
                return (
                  <Marker key={loc.id} position={pos}>
                    <Popup>
                      <p className="text-sm font-bold">{loc.client}</p>
                      <p className="text-xs">{new Date(loc.date).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs font-bold">{tnd(loc.revenue)}</p>
                      <p className="text-xs">{loc.address}</p>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        ) : (
          <EmptyState icon={MapPin} title="Aucune commande avec adresse" />
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <CardTitle icon={Store} tone="pink" title="Localisation des dépôts" subtitle={depotLocations?.length ? `${depotLocations.length} dépôt(s) sur la période` : undefined} />
        {depotLocLoading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-bd-lilac" />
        ) : depotLocations?.length ? (
          <>
            <div className="h-80 overflow-hidden rounded-2xl sm:h-96">
              <MapContainer center={[34.0, 9.0]} zoom={6} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                {depotLocations.map((loc) => {
                  const pos: [number, number] =
                    loc.lat != null && loc.lng != null ? [loc.lat, loc.lng] : geoCacheRef.current[loc.address] || [34.0, 9.0];
                  return (
                    <Marker key={loc.id} position={pos}>
                      <Popup>
                        <p className="text-sm font-bold">{loc.deposant} · N° {loc.number}</p>
                        <p className="text-xs">{loc.contractNumber} · {new Date(loc.date).toLocaleDateString('fr-FR')}</p>
                        <p className="text-xs font-bold">{loc.items} article(s) · {tnd(loc.value)}</p>
                        <p className="text-xs">{loc.address}</p>
                        <button type="button" onClick={() => setSuiviId(loc.deposantId)} className="mt-1 text-xs font-bold text-violet-700 underline">
                          Voir le suivi
                        </button>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
              {depotLocations.slice(0, 20).map((loc) => (
                <li key={loc.id}>
                  <button type="button" onClick={() => setSuiviId(loc.deposantId)} className="bd-focus flex w-full items-center gap-3 rounded-xl bg-bd-bg px-3 py-2 text-left transition hover:bg-bd-lilac/60">
                    <Activity size={15} className="shrink-0 text-bd-violet" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-bd-ink">{loc.deposant}</span>
                      <span className="block truncate text-xs font-bold text-bd-muted">{loc.contractNumber} · {loc.address || 'position GPS'}</span>
                    </span>
                    <span className="shrink-0 text-xs font-extrabold tabular-nums text-bd-ink">{loc.items} art.</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={Store} title="Aucun dépôt localisé sur la période">
            Ajoutez l'adresse du déposant (ou sa position sur la carte) lors du dépôt.
          </EmptyState>
        )}
      </Card>
      </div>
    </div>
  );
};

export default Dashboard;
