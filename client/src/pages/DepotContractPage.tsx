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

/** Articles already in the contract, shown above the editor (read-only). */
function ExistingArticles({ items, createdAt }: { items: DepotContract['items']; createdAt: string }) {
  const [open, setOpen] = useState(true);
  if (!items.length) {
    return (
      <p className="mb-5 rounded-2xl bg-bd-bg px-4 py-3 text-sm font-bold text-bd-muted">Ce contrat ne contient encore aucun article.</p>
    );
  }
  const total = items.reduce((t, it) => t + it.priceMillimes, 0);
  return (
    <section aria-label="Articles déjà dans le contrat" className="mb-6 overflow-hidden rounded-3xl border border-bd-line/10 bg-bd-bg">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="bd-focus flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grad-violet-strong text-white">
          <Package size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-bd-ink">Déjà dans ce contrat · {items.length} article{items.length > 1 ? 's' : ''}</span>
          <span className="block text-xs font-bold text-bd-muted">Valeur {formatTnd(total)}</span>
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-bd-muted transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <ul className="grid gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-bd-surface p-2.5 shadow-card">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/60 text-bd-violet">
                {it.photo ? <img src={uploadUrl(it.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={18} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold text-bd-muted">
                  {it.ref} · déposé le {new Date(it.depositedAt ?? createdAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="block truncate text-sm font-extrabold text-bd-ink">{it.name}</span>
                <span className="block text-xs font-bold tabular-nums text-bd-muted">
                  {formatTnd(it.priceMillimes)} · {it.commissionPercent}% · part <span className="text-bd-success">{formatTnd(it.depositorMillimes, false)}</span>
                </span>
              </span>
              <StatusChip status={it.status} payout={it.payoutStatus} />
            </li>
          ))}
        </ul>
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Card className="p-4 sm:p-6">
        <h2 className="text-xl font-black text-bd-ink">Ajouter des articles</h2>
        <p className="mb-4 text-sm text-bd-muted">
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
      <div className="space-y-3 lg:sticky lg:top-6">
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={mode === 'add' ? `/depots/${id}` : '/deposit-requests'} className={buttonClass('ghost', 'sm', '-ml-3 mb-1')}>
            <ArrowLeft size={16} aria-hidden /> {mode === 'add' ? 'Retour au contrat' : 'Demandes de dépôt'}
          </Link>
          <h1 className="text-3xl font-black text-bd-ink">{data ? `Contrat ${data.contractNumber}` : 'Contrat'}</h1>
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
