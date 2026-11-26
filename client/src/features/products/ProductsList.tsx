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
import { useGetCategoryHierarchyQuery } from '../../store/api/categoryApi';
import { useGetDepositRequestsQuery } from '../../store/api/depositRequestApi';
import { useSearchDeposantsQuery } from '../../store/api/depotApi';
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
} from '../../components/ui';
import StageControl, { STAGE_META, stageFrom } from './StageControl';
import type { Product } from '../../types';

type Segment = 'all' | 'depot' | 'achat';
type Picker = 'category' | 'lot' | 'stage' | 'deposant' | 'actions' | null;

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

/** Searchable list inside a bottom sheet (categories, lots, déposants). */
function PickerList({
  items,
  selected,
  onPick,
  placeholder,
  search,
  onSearch,
  loading,
}: {
  items: Array<{ id: string; label: string; hint?: string }>;
  selected?: string;
  onPick: (id: string, label: string) => void;
  placeholder: string;
  search: string;
  onSearch: (v: string) => void;
  loading?: boolean;
}) {
  return (
    <div>
      <SearchBar value={search} onChange={onSearch} placeholder={placeholder} className="mb-3" />
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : items.length ? (
        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onPick(it.id, it.label)}
                className={cn('bd-focus flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl px-3 text-left', selected === it.id ? 'bg-bd-lilac text-bd-violet-strong' : 'hover:bg-bd-bg')}
              >
                <span className="truncate font-extrabold">{it.label}</span>
                {it.hint ? <span className="shrink-0 text-xs font-bold text-bd-muted">{it.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm font-bold text-bd-muted">Aucun résultat.</p>
      )}
    </div>
  );
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
  const search = useDebouncedValue(q.trim(), 300);
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

  // Picker data (only while open)
  const { data: categories, isLoading: catLoading } = useGetCategoryHierarchyQuery(undefined, { skip: picker !== 'category' });
  const { data: lots, isLoading: lotLoading } = useGetDepositRequestsQuery({ page: 1, limit: 50 }, { skip: picker !== 'lot' });
  const depSearch = useDebouncedValue(pickerSearch.trim(), 250);
  const { data: deposants, isFetching: depLoading } = useSearchDeposantsQuery(depSearch, { skip: picker !== 'deposant' });

  const openPicker = (p: Picker) => {
    setPickerSearch('');
    setPicker(p);
  };
  const filterText = (label: string) => label.toLowerCase().includes(pickerSearch.trim().toLowerCase());

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
    <div className="bd-ui mx-auto max-w-3xl pb-24">
      <PageHeader eyebrow="Catalogue" title="Produits" subtitle="Achats et articles déposés (D-…)" onMore={() => openPicker('actions')} />

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Nom, réf., déposant ou téléphone…" />
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
          <FilterChip icon={Layers} label={lot?.label ?? 'Lot de dépôt'} active={!!lot} onClick={() => openPicker('lot')} onClear={() => (setLot(null), onClearContract())} />
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
                  </>
                }
                trailing={
                  <div className="flex shrink-0 items-center gap-1">
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
        <PickerList
          placeholder="Rechercher une catégorie"
          search={pickerSearch}
          onSearch={setPickerSearch}
          loading={catLoading}
          selected={category?.id}
          items={(categories ?? []).filter((c) => filterText(c.categoryName)).map((c) => ({ id: c.id, label: c.categoryName }))}
          onPick={(id, label) => (setCategory({ id, label }), setPicker(null))}
        />
      </BottomSheet>
      <BottomSheet open={picker === 'lot'} onClose={() => setPicker(null)} title="Lot de dépôt">
        <PickerList
          placeholder="DV-2026-…"
          search={pickerSearch}
          onSearch={setPickerSearch}
          loading={lotLoading}
          selected={lot?.id}
          items={(lots?.data ?? [])
            .filter((d) => d.contractNumber && filterText(`${d.contractNumber} ${d.fullName}`))
            .map((d) => ({ id: d.id, label: d.contractNumber!, hint: d.fullName }))}
          onPick={(id, label) => (setLot({ id, label }), setPicker(null))}
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
        <PickerList
          placeholder="Nom ou téléphone"
          search={pickerSearch}
          onSearch={setPickerSearch}
          loading={depLoading && !deposants}
          selected={deposant?.id}
          items={(deposants ?? []).map((d) => ({ id: d.id, label: `${d.firstName} ${d.lastName}`, hint: `N° ${d.number}` }))}
          onPick={(id, label) => (setDeposant({ id, label }), setPicker(null))}
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
