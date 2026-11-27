import { useCallback, useMemo, useReducer, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FileSignature, FileX, Package, Plus } from 'lucide-react';
import { useAddDepotItemsMutation, useGetDepotQuery, type DepotContract } from '../store/api/depotApi';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../lib/apiError';
import { formatTnd, fromMillimes, parseTndInput } from '../lib/money';
import { uploadUrl } from '../lib/apiBase';
import { cn } from '../lib/cn';
import { Button, Card, EmptyState, Skeleton, StatusChip, buttonClass } from '../components/ui';
import ContractView from '../features/depot/ContractView';
import ArticlesEditor, { SummaryCard } from '../features/depot/ArticlesEditor';
import { newItem, useItemTotals, validateItem, type DraftItem, type ItemErrors } from '../features/depot/draft';

type ItemsAction =
  | { type: 'patch'; key: string; patch: Partial<DraftItem> | ((it: DraftItem) => Partial<DraftItem>) }
  | { type: 'add' }
  | { type: 'remove'; key: string }
  | { type: 'all'; pct: number };

interface ItemsState {
  items: DraftItem[];
  pct: number;
  lastCategoryId: string;
}

function itemsReducer(s: ItemsState, a: ItemsAction): ItemsState {
  switch (a.type) {
    case 'patch': {
      let last = s.lastCategoryId;
      const items = s.items.map((it) => {
        if (it.key !== a.key) return it;
        const p = typeof a.patch === 'function' ? a.patch(it) : a.patch;
        if (p.categoryId) last = p.categoryId;
        return { ...it, ...p };
      });
      return { ...s, items, lastCategoryId: last };
    }
    case 'add':
      return { ...s, items: [...s.items, newItem(s.pct, s.lastCategoryId)] };
    case 'remove':
      return { ...s, items: s.items.filter((it) => it.key !== a.key) };
    case 'all':
      return { ...s, pct: a.pct, items: s.items.map((it) => ({ ...it, commission: a.pct })) };
  }
}

const PREVIEW = 4;

/**
 * Articles already in the contract (read-only), above the editor. Compact: totals per status, a
 * search when the contract is big, the first few rows then "Voir les N autres" (scrolls inside).
 */
function ExistingArticles({ items, createdAt }: { items: DepotContract['items']; createdAt: string }) {
  const [open, setOpen] = useState(items.length <= 6);
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  if (!items.length) {
    return <p className="mb-5 rounded-2xl bg-bd-bg px-4 py-3 text-sm font-bold text-bd-muted">Ce contrat ne contient encore aucun article.</p>;
  }
  const total = items.reduce((t, it) => t + it.priceMillimes, 0);
  const n = (f: (it: DepotContract['items'][number]) => boolean) => items.filter(f).length;
  const onSale = n((it) => it.status === 'EN_VENTE');
  const sold = n((it) => it.status === 'VENDU' && it.payoutStatus !== 'PAYE');
  const paid = n((it) => it.status === 'VENDU' && it.payoutStatus === 'PAYE');
  const term = q.trim().toLowerCase();
  const filtered = term ? items.filter((it) => `${it.ref} ${it.name}`.toLowerCase().includes(term)) : items;
  const visible = all || term ? filtered : filtered.slice(0, PREVIEW);

  return (
    <section aria-label="Articles déjà dans le contrat" className="mb-6 min-w-0 overflow-hidden rounded-3xl border border-bd-line/10 bg-bd-bg">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="bd-focus flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grad-violet-strong text-white">
          <Package size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-bd-ink">
            Déjà dans ce contrat · {items.length} article{items.length > 1 ? 's' : ''}
          </span>
          <span className="block truncate text-xs font-bold text-bd-muted">Valeur {formatTnd(total)}</span>
        </span>
        <span className="shrink-0 text-xs font-extrabold text-bd-violet">{open ? 'Masquer' : 'Voir'}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-bd-muted transition', open && 'rotate-180')} aria-hidden />
      </button>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3 text-[11px] font-extrabold sm:px-4">
        {onSale ? <span className="rounded-full bg-bd-blush px-2 py-0.5 text-bd-pink-strong">{onSale} en vente</span> : null}
        {sold ? <span className="rounded-full bg-bd-success-bg px-2 py-0.5 text-bd-success">{sold} vendu(s)</span> : null}
        {paid ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-bd-violet-strong">{paid} payé(s)</span> : null}
      </div>

      {open ? (
        <div className="border-t border-bd-line/10 px-2 pb-2 pt-2 sm:px-3">
          {items.length > 6 ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher dans ce contrat (nom, réf.)"
              className="bd-input mb-2"
              data-dictation="off"
            />
          ) : null}
          <ul className={cn('grid grid-cols-1 gap-1.5 lg:grid-cols-2', (all || term) && 'max-h-[55vh] overflow-y-auto overscroll-contain pr-1')}>
            {visible.map((it) => (
              <li key={it.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-bd-surface p-2 shadow-card">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/60 text-bd-violet">
                  {it.photo ? <img src={uploadUrl(it.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={18} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-bd-ink">{it.name}</span>
                  <span className="block truncate text-[11px] font-bold text-bd-muted">
                    {it.ref} · {new Date(it.depositedAt ?? createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-black tabular-nums text-bd-ink">{formatTnd(it.priceMillimes)}</span>
                    <span className="text-[11px] font-bold tabular-nums text-bd-success">part {formatTnd(it.depositorMillimes, false)}</span>
                    <StatusChip status={it.status} payout={it.payoutStatus} className="!px-2 !py-0.5 !text-[10px]" />
                  </span>
                </span>
              </li>
            ))}
            {!visible.length ? <li className="py-3 text-center text-sm font-bold text-bd-muted">Aucun article ne correspond.</li> : null}
          </ul>
          {!term && filtered.length > PREVIEW ? (
            <button type="button" onClick={() => setAll((v) => !v)} className="bd-focus mt-2 min-h-[40px] w-full rounded-xl text-sm font-extrabold text-bd-violet-strong hover:bg-bd-lilac/50">
              {all ? 'Réduire' : `Voir les ${filtered.length - PREVIEW} autres articles`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** /depots/:id/articles — add articles to an existing contract (same editor as the stepper). */
function AddArticles({ id, contractNumber, deposantName, existing, createdAt }: { id: string; contractNumber: string; deposantName: string; existing: DepotContract['items']; createdAt: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [addItems, { isLoading }] = useAddDepotItemsMutation();
  const [state, dispatch] = useReducer(itemsReducer, { items: [newItem(25, '')], pct: 25, lastCategoryId: '' });
  const [showErrors, setShowErrors] = useState(false);
  const totals = useItemTotals(state.items);
  const errors = useMemo(() => Object.fromEntries(state.items.map((it) => [it.key, validateItem(it)])) as Record<string, ItemErrors>, [state.items]);
  const invalid = Object.values(errors).some((e) => Object.keys(e).length);
  const uploading = state.items.some((it) => it.uploading > 0);
  const onPatch = useCallback((key: string, patch: Partial<DraftItem> | ((it: DraftItem) => Partial<DraftItem>)) => dispatch({ type: 'patch', key, patch }), []);
  const onRemove = useCallback((key: string) => dispatch({ type: 'remove', key }), []);

  const save = async () => {
    setShowErrors(true);
    if (invalid || uploading) return;
    try {
      await addItems({
        id,
        items: state.items.map((it) => ({
          name: it.name.trim(),
          price: fromMillimes(parseTndInput(it.price) ?? 0),
          commissionPercent: it.commission,
          depositDate: it.depositDate || undefined,
          categoryId: it.categoryId,
          subCategoryId: it.subCategoryId || undefined,
          subSubCategory1Id: it.subSubCategory1Id || undefined,
          photos: it.photos.length ? it.photos : undefined,
        })),
      }).unwrap();
      showToast(`${state.items.length} article(s) ajouté(s) au contrat ${contractNumber}`, 'success');
      navigate(`/depots/${id}`);
    } catch (e) {
      showToast(apiErrorMessage(e), 'error', 6000);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Card className="min-w-0 p-3 sm:p-6">
        <h2 className="text-lg font-black text-bd-ink sm:text-xl">Ajouter des articles</h2>
        <p className="mb-4 break-words text-sm text-bd-muted">
          Contrat {contractNumber} · {deposantName}. Le QR du contrat couvre automatiquement ces nouveaux articles.
        </p>
        <ExistingArticles items={existing} createdAt={createdAt} />
        <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-bd-pink-strong">
          <Plus size={14} aria-hidden /> Nouveaux articles
        </p>
        <ArticlesEditor
          items={state.items}
          errors={errors}
          showErrors={showErrors}
          defaultCommission={state.pct}
          onPatch={onPatch}
          onAdd={() => dispatch({ type: 'add' })}
          onRemove={onRemove}
          onCommissionAll={(pct) => dispatch({ type: 'all', pct })}
        />
      </Card>
      <div className="min-w-0 space-y-3 lg:sticky lg:top-20">
        {existing.length ? (
          <div className="rounded-3xl bg-bd-surface p-4 text-sm font-bold shadow-card">
            <p className="flex justify-between text-bd-muted">
              <span>Déjà dans le contrat</span>
              <span className="tabular-nums">{existing.length} art. · {formatTnd(existing.reduce((t, it) => t + it.priceMillimes, 0))}</span>
            </p>
            <p className="mt-1 flex justify-between text-bd-ink">
              <span>Après ajout</span>
              <span className="tabular-nums">{existing.length + state.items.length} articles</span>
            </p>
          </div>
        ) : null}
        <SummaryCard totals={totals}>
          <Button size="lg" icon={FileSignature} className="mt-4 w-full" loading={isLoading} disabled={uploading} onClick={save}>
            Ajouter au contrat
          </Button>
        </SummaryCard>
      </div>
    </div>
  );
}

export default function DepotContractPage({ mode = 'view' }: { mode?: 'view' | 'add' }) {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useGetDepotQuery(id, { skip: !id });

  return (
    <div className="bd-ui w-full space-y-5">
      <header className={cn('flex flex-wrap items-center justify-between gap-3', mode === 'add' && '-mt-[66px] pl-[54px] pr-[54px] md:mt-0 md:px-0')}>
        <div className="min-w-0">
          <Link to={mode === 'add' ? `/depots/${id}` : '/deposit-requests'} className={buttonClass('ghost', 'sm', '-ml-3 mb-1')}>
            <ArrowLeft size={16} aria-hidden /> {mode === 'add' ? 'Retour au contrat' : 'Demandes de dépôt'}
          </Link>
          <h1 className="truncate text-2xl font-black text-bd-ink sm:text-3xl">{data ? `Contrat ${data.contractNumber}` : 'Contrat'}</h1>
          {data ? (
            <p className="text-sm font-bold text-bd-muted">
              {data.deposant.firstName} {data.deposant.lastName} · déposant n° {data.deposant.number}
            </p>
          ) : null}
        </div>
      </header>
      {isLoading ? (
        <Skeleton className="h-[70vh]" />
      ) : isError || !data ? (
        <Card>
          <EmptyState icon={FileX} title="Contrat introuvable">
            Ce dépôt n'existe pas ou n'est lié à aucun déposant.
          </EmptyState>
        </Card>
      ) : mode === 'add' ? (
        <AddArticles
          id={id}
          contractNumber={data.contractNumber}
          deposantName={`${data.deposant.firstName} ${data.deposant.lastName}`}
          existing={data.items}
          createdAt={data.createdAt}
        />
      ) : (
        <ContractView contract={data} />
      )}
    </div>
  );
}
