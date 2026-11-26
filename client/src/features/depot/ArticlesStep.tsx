import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, FileSignature, SkipForward, UserCheck } from 'lucide-react';
import { Button, Card, Field, InfoNote, SegmentedControl, Money } from '../../components/ui';
import ArticlesEditor, { SummaryCard } from './ArticlesEditor';
import { useItemTotals, validateItem, type DepotDraft, type DraftDispatch, type DraftItem, type ItemErrors } from './draft';

export default function ArticlesStep({
  draft,
  dispatch,
  onBack,
  onSubmit,
  submitting,
}: {
  draft: DepotDraft;
  dispatch: DraftDispatch;
  onBack: () => void;
  /** withItems=false → "Passer" (contract with 0 items). */
  onSubmit: (withItems: boolean) => void;
  submitting: 'items' | 'skip' | null;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const totals = useItemTotals(draft.items);
  const errors = useMemo(() => {
    const map: Record<string, ItemErrors> = {};
    draft.items.forEach((it) => (map[it.key] = validateItem(it)));
    return map;
  }, [draft.items]);
  const invalidCount = Object.values(errors).filter((e) => Object.keys(e).length).length;
  const uploading = draft.items.some((it) => it.uploading > 0);

  const onPatch = useCallback(
    (key: string, patch: Partial<DraftItem> | ((it: DraftItem) => Partial<DraftItem>)) => dispatch({ type: 'item', key, patch }),
    [dispatch],
  );
  const onRemove = useCallback((key: string) => dispatch({ type: 'removeItem', key }), [dispatch]);

  const who = draft.mode === 'existing' && draft.existing
    ? `${draft.existing.firstName} ${draft.existing.lastName}`
    : `${draft.deposant.firstName} ${draft.deposant.lastName}`;

  const generate = () => {
    setShowErrors(true);
    if (invalidCount || uploading) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit(true);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Card className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-bd-ink">Articles déposés</h2>
            <p className="flex items-center gap-1.5 text-sm text-bd-muted">
              <UserCheck size={15} aria-hidden /> Pour <strong className="text-bd-ink">{who.trim() || '—'}</strong> · photos facultatives
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
            Déposant
          </Button>
        </div>

        <ArticlesEditor
          items={draft.items}
          errors={errors}
          showErrors={showErrors}
          defaultCommission={draft.defaultCommission}
          onPatch={onPatch}
          onAdd={() => dispatch({ type: 'addItem' })}
          onRemove={onRemove}
          onCommissionAll={(commission) => dispatch({ type: 'commissionAll', commission })}
        />

        <div className="mt-6 grid gap-4 border-t border-bd-line/10 pt-5 sm:grid-cols-2">
          <Field label="Durée du dépôt">
            <SegmentedControl
              label="Durée du dépôt"
              value={draft.durationMonths}
              onChange={(months) => dispatch({ type: 'duration', months })}
              options={[
                { value: 1, label: '1 mois' },
                { value: 3, label: '3 mois' },
                { value: 6, label: '6 mois' },
              ]}
              className="w-full"
            />
          </Field>
          <Field label="Note interne" hint="Visible uniquement par la boutique." htmlFor="depot-note">
            <textarea
              id="depot-note"
              rows={2}
              maxLength={2000}
              value={draft.internalNote}
              onChange={(e) => dispatch({ type: 'note', note: e.target.value })}
              className="bd-input min-h-[44px] resize-y py-2.5"
            />
          </Field>
        </div>

        {showErrors && invalidCount ? (
          <InfoNote tone="danger" className="mt-4">
            {invalidCount} article{invalidCount > 1 ? 's' : ''} à compléter (nom, catégorie et prix sont requis).
          </InfoNote>
        ) : null}
      </Card>

      <div className="space-y-3 lg:sticky lg:top-6">
        <SummaryCard totals={totals} className="hidden lg:block" />
        <div className="hidden flex-col gap-2 lg:flex">
          <Button size="lg" icon={FileSignature} loading={submitting === 'items'} disabled={!!submitting || uploading} onClick={generate}>
            Générer le contrat
          </Button>
          <Button variant="secondary" icon={SkipForward} loading={submitting === 'skip'} disabled={!!submitting} onClick={() => onSubmit(false)}>
            Passer, pas d'articles maintenant
          </Button>
        </div>
      </div>

      {/* Mobile: compact sticky summary + actions above the bottom nav */}
      <div className="sticky bottom-24 z-20 -mx-1 lg:hidden">
        <div className="rounded-3xl border border-bd-line/10 bg-bd-surface/95 p-3 shadow-[0_12px_40px_rgba(76,29,149,0.18)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs font-bold">
            <span className="text-bd-muted tabular-nums">{totals.count} art. · <Money millimes={totals.priceMillimes} /></span>
            <span className="text-bd-muted">
              Marge <Money millimes={totals.shopMillimes} className="font-extrabold text-bd-pink-strong" />
            </span>
            <span className="text-bd-muted">
              Déposant <Money millimes={totals.depositorMillimes} className="font-extrabold text-bd-success" />
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="secondary" size="icon" aria-label="Passer, pas d'articles maintenant" loading={submitting === 'skip'} disabled={!!submitting} onClick={() => onSubmit(false)}>
              {submitting === 'skip' ? null : <SkipForward size={18} aria-hidden />}
            </Button>
            <Button icon={FileSignature} loading={submitting === 'items'} disabled={!!submitting || uploading} onClick={generate}>
              Générer le contrat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
