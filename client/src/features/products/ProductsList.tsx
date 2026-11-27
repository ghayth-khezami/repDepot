import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownUp,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Package,
  PackagePlus,
  Plus,
  QrCode,
  Tag,
  UserRound,
  CircleDot,
} from 'lucide-react';
import { useGetProductsFeedInfiniteQuery, type ProductFeedArgs, type ProductStage } from '../../store/api/productApi';
import { useGetCategoriesFeedInfiniteQuery } from '../../store/api/categoryApi';
import { useGetCoClientsFeedInfiniteQuery } from '../../store/api/coClientApi';
import InfinitePickerList from '../../components/InfinitePickerList';
import HeartButton from './HeartButton';
import OrderBadge from './OrderBadge';
import type { Category, CoClient } from '../../types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { downloadAuthed } from '../../lib/download';
import { uploadUrl } from '../../lib/apiBase';
import { formatTnd, toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { exportPath } from '../../components/ExcelButton';
import {
  BottomSheet,
  EmptyState,
  Fab,
  FilterChip,
  FilterChips,
  InfiniteSentinel,
  ListRow,
  PageHeader,
  SearchBar,
  SegmentedFilter,
  SheetAction,
  SheetSection,
  SheetTile,
  Skeleton,
  Pager,
  useDesktopPager,
  useIsDesktop,
} from '../../components/ui';
import StageControl, { STAGE_META, stageFrom } from './StageControl';
import type { Product } from '../../types';

type Segment = 'all' | 'depot' | 'achat';
type Picker = 'category' | 'stage' | 'deposant' | 'actions' | null;

const SORTS: Array<{ value: ProductFeedArgs['sort'] | undefined; label: string }> = [
  { value: undefined, label: 'Plus récents' },
  { value: 'price_desc', label: 'Prix ↓' },
  { value: 'price_asc', label: 'Prix ↑' },
];

function qs(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export default function ProductsList({
  initialSearch = '',
  contractId,
  onClearContract,
  onAdd,
  onOpen,
}: {
  initialSearch?: string;
  contractId?: string;
  onClearContract: () => void;
  onAdd: () => void;
  onOpen: (p: Product) => void;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [q, setQ] = useState(initialSearch);
  const search = useDebouncedValue(q.trim());
  const [segment, setSegment] = useState<Segment>('all');
  const [category, setCategory] = useState<{ id: string; label: string } | null>(null);
  const [lot, setLot] = useState<{ id: string; label: string } | null>(contractId ? { id: contractId, label: 'Contrat filtré' } : null);
  const [stage, setStage] = useState<ProductStage | null>(null);
  const [deposant, setDeposant] = useState<{ id: string; label: string } | null>(null);
  const [sort, setSort] = useState(0);
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const args: ProductFeedArgs = {
    search: search || undefined,
    isDepot: segment === 'all' ? undefined : segment === 'depot',
    categoryId: category?.id,
    depositRequestId: lot?.id,
    stage: stage ?? undefined,
    coclientId: deposant?.id,
    sort: SORTS[sort].value,
  };
  const feed = useGetProductsFeedInfiniteQuery(args);
  const pages = feed.data?.pages ?? [];
  const products = useMemo(() => pages.flatMap((p) => p.data), [pages]);
  const meta = pages[0]?.meta;
  const counts = meta?.counts;

  // Picker data (only while open), page by page with server-side search
  const pSearch = useDebouncedValue(pickerSearch.trim()) || undefined;
  const catFeed = useGetCategoriesFeedInfiniteQuery({ search: pSearch }, { skip: picker !== 'category' });
  const depFeed = useGetCoClientsFeedInfiniteQuery({ search: pSearch }, { skip: picker !== 'deposant' });
  const isDesktop = useIsDesktop();
  const pager = useDesktopPager({
    items: products,
    total: meta?.total,
    hasNextPage: !!feed.hasNextPage,
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: () => void feed.fetchNextPage(),
    resetKey: JSON.stringify(args),
  });

  const openPicker = (p: Picker) => {
    setPickerSearch('');
    setPicker(p);
  };

  const download = async (key: string, path: string, name: string) => {
    setBusy(key);
    try {
      await downloadAuthed(path, name);
    } catch (e) {
      showToast((e as Error).message || 'Téléchargement impossible', 'error');
    } finally {
      setBusy(null);
    }
  };
  const filterParams = { search: search || undefined, isDepot: args.isDepot, categoryId: category?.id, depositRequestId: lot?.id, stage: stage ?? undefined, coclientId: deposant?.id };

  return (
    <div className="bd-ui w-full pb-24">
      <PageHeader eyebrow="Catalogue" title="Produits" subtitle="Achats et articles déposés (D-…)" onMore={() => openPicker('actions')} />

      <div className="space-y-3 md:sticky md:top-16 md:z-20 md:-mx-8 md:bg-bd-bg/90 md:px-8 md:pb-3 md:pt-1 md:backdrop-blur">
        <div className="flex items-center gap-3">
          <SearchBar value={q} onChange={setQ} placeholder="Nom, réf., déposant ou téléphone…" className="flex-1" />
          <button type="button" onClick={onAdd} className="bd-focus hidden min-h-[48px] shrink-0 items-center gap-2 rounded-2xl bg-grad-pink-strong px-5 font-extrabold text-white shadow-glow-pink md:inline-flex">
            <Plus size={18} aria-hidden /> Ajouter
          </button>
        </div>
        <SegmentedFilter<Segment>
          label="Type de produit"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: 'Tous', count: counts?.all },
            { value: 'depot', label: 'Dépôts', count: counts?.depot },
            { value: 'achat', label: 'Achats', count: counts?.achat },
          ]}
        />
        <FilterChips>
          <FilterChip icon={Tag} label={category?.label ?? 'Catégorie'} active={!!category} onClick={() => openPicker('category')} onClear={() => setCategory(null)} />
          {lot ? <FilterChip icon={Layers} label={lot.label} active onClick={() => (setLot(null), onClearContract())} onClear={() => (setLot(null), onClearContract())} /> : null}
          <FilterChip icon={CircleDot} label={stage ? STAGE_META[stage].label : 'Statut'} active={!!stage} onClick={() => openPicker('stage')} onClear={() => setStage(null)} />
          <FilterChip icon={UserRound} label={deposant?.label ?? 'Déposant'} active={!!deposant} onClick={() => openPicker('deposant')} onClear={() => setDeposant(null)} />
        </FilterChips>
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-bd-muted tabular-nums">{meta ? `${meta.total} produit${meta.total > 1 ? 's' : ''}` : ' '}</p>
        <button type="button" onClick={() => setSort((s) => (s + 1) % SORTS.length)} className="bd-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-sm font-extrabold text-bd-ink">
          <ArrowDownUp size={15} aria-hidden /> {SORTS[sort].label}
        </button>
      </div>

      {feed.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : feed.isError ? (
        <EmptyState icon={Package} title="Impossible de charger les produits" action={<button type="button" onClick={() => void feed.refetch()} className="bd-focus rounded-full bg-grad-pink-strong px-5 py-2.5 font-extrabold text-white">Réessayer</button>} />
      ) : products.length && isDesktop ? (
        <>
          <ul className={cn('grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5', (pager.loading || (feed.isFetching && !feed.isFetchingNextPage)) && 'opacity-60')}>
            {pager.pageItems.map((p) => (
              <li key={p.id} className="bd-anim-fade-up group flex flex-col overflow-hidden rounded-3xl border border-bd-line/10 bg-bd-surface shadow-card transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(76,29,149,0.16)]">
                <button type="button" onClick={() => onOpen(p)} className="bd-focus relative block aspect-[4/3] w-full overflow-hidden bg-bd-lilac/50 text-left">
                  {p.photos?.[0] ? (
                    <img src={uploadUrl(p.photos[0].photoDoc)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <Package size={40} aria-hidden className="absolute inset-0 m-auto text-bd-violet/50" />
                  )}
                  <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow', p.isDepot ? 'bg-white/95 text-bd-violet-strong' : 'bg-white/95 text-bd-pink-strong')}>
                    {p.isDepot ? 'Dépôt' : 'Achat'}
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <button type="button" onClick={() => onOpen(p)} className="bd-focus min-w-0 rounded-lg text-left">
                    <span className="block truncate text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">
                      {p.ref ?? ''} · {p.depositRequest?.contractNumber ?? (p.isDepot ? 'Dépôt' : 'Stock boutique')}
                    </span>
                    <span className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-extrabold leading-tight text-bd-ink">{p.productName}</span>
                  </button>
                  <p className="text-lg font-black tabular-nums text-bd-ink">{formatTnd(toMillimes(p.PrixVente))}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    <StageControl productId={p.id} stage={stageFrom(p)} isDepot={p.isDepot} size="sm" />
                    <OrderBadge status={(p as { orderStatus?: string | null }).orderStatus} />
                    <span className="flex-1" />
                    <HeartButton productId={p.id} name={p.productName} />
                    <button
                      type="button"
                      aria-label={`QR de ${p.productName}`}
                      title="Carte QR"
                      onClick={() => void download(`qr-${p.id}`, `/products/${p.id}/qr-card/pdf`, `qr-${p.ref ?? p.id}.pdf`)}
                      className="bd-focus flex h-10 w-10 items-center justify-center rounded-xl text-bd-violet hover:bg-bd-lilac/60"
                    >
                      <QrCode size={18} aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {pager.loading && !pager.pageItems.length ? [0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-72" /></li>) : null}
          </ul>
          <Pager page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} loading={pager.loading} onPage={(n) => { pager.setPage(n); window.document.querySelector('.bo-page')?.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      ) : products.length ? (
        <ul className={cn('space-y-2 transition-opacity', feed.isFetching && !feed.isFetchingNextPage && 'opacity-60')}>
          {products.map((p) => {
            const lotLabel = p.depositRequest?.contractNumber ?? (p.isDepot ? 'Dépôt' : 'Stock boutique');
            return (
              <ListRow
                key={p.id}
                onClick={() => onOpen(p)}
                thumb={p.photos?.[0] ? <img src={uploadUrl(p.photos[0].photoDoc)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={22} aria-hidden />}
                meta={`${p.ref ?? ''} · ${lotLabel}`}
                title={p.productName}
                subtitle={
                  <>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold', p.isDepot ? 'bg-violet-100 text-bd-violet-strong dark:bg-violet-500/20' : 'bg-bd-blush text-bd-pink-strong')}>
                      {p.isDepot ? 'Dépôt' : 'Achat'}
                    </span>
                    <StageControl productId={p.id} stage={stageFrom(p)} isDepot={p.isDepot} size="sm" />
                    <OrderBadge status={(p as { orderStatus?: string | null }).orderStatus} />
                  </>
                }
                trailing={
                  <div className="flex shrink-0 items-center gap-0.5">
                    <HeartButton productId={p.id} name={p.productName} className="h-9 w-9" />
                    <span className="text-right">
                      <span className="block text-[15px] font-black tabular-nums text-bd-ink">{formatTnd(toMillimes(p.PrixVente), false)}</span>
                      <span className="block text-[10px] font-extrabold text-bd-muted">TND</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`QR de ${p.productName}`}
                      title="Carte QR"
                      onClick={() => void download(`qr-${p.id}`, `/products/${p.id}/qr-card/pdf`, `qr-${p.ref ?? p.id}.pdf`)}
                      className="bd-focus flex h-11 w-11 items-center justify-center rounded-xl text-bd-violet hover:bg-bd-lilac/60"
                    >
                      <QrCode size={18} aria-hidden />
                    </button>
                  </div>
                }
              />
            );
          })}
          <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
        </ul>
      ) : (
        <EmptyState icon={Package} title={search || category || lot || stage || deposant ? 'Aucun produit pour ces filtres' : 'Aucun produit pour le moment'}>
          {search ? `Rien ne correspond à « ${search} ».` : 'Ajoutez un produit ou créez un dépôt.'}
        </EmptyState>
      )}

      <Fab icon={Plus} label="Ajouter" onClick={onAdd} />

      {/* Pickers */}
      <BottomSheet open={picker === 'category'} onClose={() => setPicker(null)} title="Catégorie">
        <InfinitePickerList<Category>
          feed={catFeed}
          placeholder="Rechercher une catégorie"
          search={pickerSearch}
          onSearch={setPickerSearch}
          selected={category?.id}
          toItem={(c) => ({ id: c.id, label: c.categoryName })}
          onPick={(it) => (setCategory({ id: it.id, label: it.label }), setPicker(null))}
        />
      </BottomSheet>
      <BottomSheet open={picker === 'stage'} onClose={() => setPicker(null)} title="Statut">
        <ul className="space-y-2">
          {(Object.keys(STAGE_META) as ProductStage[]).map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => (setStage(s), setPicker(null))}
                className={cn('bd-focus flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-4 font-extrabold', stage === s ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/10')}
              >
                <span aria-hidden className={cn('h-3 w-3 rounded-full', STAGE_META[s].dot)} /> {STAGE_META[s].label}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
      <BottomSheet open={picker === 'deposant'} onClose={() => setPicker(null)} title="Déposant">
        <InfinitePickerList<CoClient>
          feed={depFeed}
          placeholder="Nom, téléphone ou N°"
          search={pickerSearch}
          onSearch={setPickerSearch}
          selected={deposant?.id}
          toItem={(d) => ({ id: d.id, label: `${d.firstName} ${d.lastName}`, hint: d.number ? `N° ${d.number}` : undefined })}
          onPick={(it) => (setDeposant({ id: it.id, label: it.label }), setPicker(null))}
        />
      </BottomSheet>

      {/* Secondary actions */}
      <BottomSheet open={picker === 'actions'} onClose={() => setPicker(null)} title="Actions produits">
        <SheetSection title="Créer">
          <SheetAction icon={PackagePlus} label="Nouveau dépôt" hint="Enregistrer les articles d'un déposant" onClick={() => navigate('/depots/nouveau')} />
          <SheetAction icon={Plus} tone="violet" label="Ajouter un produit" hint="Produit acheté pour la boutique" onClick={() => (setPicker(null), onAdd())} />
        </SheetSection>
        <SheetSection title="Exporter et imprimer (filtres appliqués)">
          <div className="grid grid-cols-2 gap-2">
            <SheetTile icon={FileSpreadsheet} tone="green" label="Export Excel" loading={busy === 'xlsx'} onClick={() => void download('xlsx', exportPath('products', filterParams), 'produits.xlsx')} />
            <SheetTile icon={FileText} tone="pink" label="Liste en PDF" loading={busy === 'pdf'} onClick={() => void download('pdf', '/products/export/pdf', 'produits.pdf')} />
            <SheetTile icon={Download} label="Télécharger CSV" loading={busy === 'csv'} onClick={() => void download('csv', '/products/export/csv', 'produits.csv')} />
            <SheetTile icon={QrCode} label="QR de tous les produits" loading={busy === 'qr'} onClick={() => void download('qr', `/products/export/qr-cards/pdf${qs(filterParams)}`, 'qr-produits.pdf')} />
          </div>
        </SheetSection>
      </BottomSheet>
    </div>
  );
}
