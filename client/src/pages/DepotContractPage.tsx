import { useCallback, useMemo, useReducer, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileSignature, FileX } from 'lucide-react';
import { useAddDepotItemsMutation, useGetDepotQuery } from '../store/api/depotApi';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../lib/apiError';
import { fromMillimes, parseTndInput } from '../lib/money';
import { Button, Card, EmptyState, Skeleton, buttonClass } from '../components/ui';
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

/** /depots/:id/articles — add articles to an existing contract (same editor as the stepper). */
function AddArticles({ id, contractNumber, deposantName }: { id: string; contractNumber: string; deposantName: string }) {
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
        <p className="mb-5 text-sm text-bd-muted">
          Contrat {contractNumber} · {deposantName}. Le QR du contrat couvre automatiquement ces nouveaux articles.
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
        <AddArticles id={id} contractNumber={data.contractNumber} deposantName={`${data.deposant.firstName} ${data.deposant.lastName}`} />
      ) : (
        <ContractView contract={data} />
      )}
    </div>
  );
}
