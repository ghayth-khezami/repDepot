import { useState } from 'react';
import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { store } from '../../store/store';
import { productApi, type NotifySummary, type ProductStage } from '../../store/api/productApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { BottomSheet } from '../../components/ui';

export const STAGE_META: Record<ProductStage, { label: string; chip: string; dot: string; hint: string }> = {
  EN_VENTE: { label: 'En vente', chip: 'bg-bd-blush text-bd-pink-strong', dot: 'bg-bd-pink', hint: 'Visible en boutique' },
  VENDU: { label: 'Vendu', chip: 'bg-bd-success-bg text-bd-success', dot: 'bg-bd-success', hint: 'Le déposant est prévenu' },
  PAYE: { label: 'Payé', chip: 'bg-violet-100 text-bd-violet-strong dark:bg-violet-500/20', dot: 'bg-bd-violet', hint: 'Paiement prêt — déposant prévenu' },
  RETIRE: { label: 'Retiré', chip: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200', dot: 'bg-gray-400', hint: 'Rendu au déposant' },
};

/** Same rules as the API (server/src/product/lifecycle.ts). */
export function canGo(from: ProductStage, to: ProductStage, isDepot: boolean) {
  if (from === to) return false;
  if (to === 'PAYE' && !isDepot) return false;
  return (from === 'EN_VENTE' && to === 'VENDU') || (from === 'VENDU' && to === 'PAYE') || (from === 'EN_VENTE' && to === 'RETIRE') || to === 'EN_VENTE';
}

export function stageFrom(p: { status?: string | null; payoutStatus?: string | null; stage?: string | null }): ProductStage {
  if (p.stage) return p.stage as ProductStage;
  if (p.status === 'VENDU') return p.payoutStatus === 'PAYE' ? 'PAYE' : 'VENDU';
  if (p.status === 'RETIRE') return 'RETIRE';
  return 'EN_VENTE';
}

export function notifyMessage(n: NotifySummary | null | undefined) {
  if (!n) return null;
  if (n.sent > 0) return `Déposant notifié ✅ (${n.channels.join(' + ')})`;
  if (n.failed > 0) return `Notification échouée : ${n.errors[0] ?? 'erreur inconnue'}`;
  return 'Statut enregistré — aucun canal pour prévenir le déposant (ni alerte app, ni email).';
}

/* Commits 5 s after the tap, unless "Annuler" — survives leaving the screen. */
const pendingCommits = new Map<string, number>();

export function scheduleStage(
  id: string,
  from: ProductStage,
  to: ProductStage,
  ui: { showToast: ReturnType<typeof useToast>['showToast']; onRollback: () => void; onDone?: () => void },
) {
  window.clearTimeout(pendingCommits.get(id));
  const commit = async () => {
    pendingCommits.delete(id);
    try {
      const res = await store.dispatch(productApi.endpoints.changeLifecycle.initiate({ id, to })).unwrap();
      const msg = notifyMessage(res.notification);
      if (msg) ui.showToast(msg, res.notification && res.notification.failed > 0 && res.notification.sent === 0 ? 'error' : 'success', 6000);
      ui.onDone?.();
    } catch (e) {
      ui.onRollback();
      ui.showToast(apiErrorMessage(e, 'Changement de statut impossible.'), 'error', 6000);
    }
  };
  pendingCommits.set(id, window.setTimeout(() => void commit(), 5000));
  ui.showToast(`${STAGE_META[from].label} → ${STAGE_META[to].label}`, 'info', 5000, {
    label: 'Annuler',
    onClick: () => {
      window.clearTimeout(pendingCommits.get(id));
      pendingCommits.delete(id);
      ui.onRollback();
    },
  });
}

/**
 * Status chip → bottom sheet picker (2 taps). Optimistic, 5 s undo, rollback on error,
 * confirmation before putting a sold/paid article back on sale.
 */
export default function StageControl({
  productId,
  stage,
  isDepot,
  size = 'md',
  onChanged,
}: {
  productId: string;
  stage: ProductStage;
  isDepot: boolean;
  size?: 'sm' | 'md';
  onChanged?: (s: ProductStage) => void;
}) {
  const [local, setLocal] = useState<ProductStage | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { showToast } = useToast();
  const current = local ?? stage;
  const meta = STAGE_META[current];

  const pick = (to: ProductStage) => {
    if (to === 'EN_VENTE' && (current === 'VENDU' || current === 'PAYE') && !confirmReset) {
      setConfirmReset(true);
      return;
    }
    const from = current;
    setOpen(false);
    setConfirmReset(false);
    setLocal(to);
    onChanged?.(to);
    scheduleStage(productId, from, to, {
      showToast,
      onRollback: () => {
        setLocal(from);
        onChanged?.(from);
      },
      onDone: () => setLocal(null),
    });
  };

  const options: ProductStage[] = isDepot ? ['EN_VENTE', 'VENDU', 'PAYE', 'RETIRE'] : ['EN_VENTE', 'VENDU', 'RETIRE'];

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Statut : ${meta.label}. Changer`}
        className={cn(
          'bd-focus inline-flex shrink-0 items-center gap-1.5 rounded-full font-extrabold transition active:scale-95',
          size === 'sm' ? 'min-h-[32px] px-2.5 text-xs' : 'min-h-[40px] px-3.5 text-sm',
          meta.chip,
        )}
      >
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <ChevronDown size={size === 'sm' ? 12 : 14} aria-hidden />
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirmReset(false);
        }}
        title={confirmReset ? 'Remettre en vente ?' : "Statut de l'article"}
      >
        {confirmReset ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-bd-muted">
              L'article redevient disponible en boutique. La date de vente{current === 'PAYE' ? ' et le paiement' : ''} seront effacés.
            </p>
            <button type="button" onClick={() => pick('EN_VENTE')} className="bd-focus flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-pink-strong font-extrabold text-white">
              <RotateCcw size={18} aria-hidden /> Oui, remettre en vente
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="bd-focus min-h-[48px] w-full rounded-2xl font-extrabold text-bd-ink">
              Annuler
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {options.map((s) => {
              const allowed = s === current || canGo(current, s, isDepot);
              const m = STAGE_META[s];
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={!allowed || s === current}
                    onClick={() => pick(s)}
                    className={cn(
                      'bd-focus flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition',
                      s === current ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/10 hover:bg-bd-bg',
                      !allowed && 'opacity-40',
                    )}
                  >
                    <span aria-hidden className={cn('h-3 w-3 shrink-0 rounded-full', m.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-bd-ink">{m.label}</span>
                      <span className="block text-xs font-semibold text-bd-muted">{allowed || s === current ? m.hint : 'Étape suivante uniquement : En vente → Vendu → Payé'}</span>
                    </span>
                    {s === current ? <Check size={18} className="text-bd-violet" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>
    </>
  );
}
