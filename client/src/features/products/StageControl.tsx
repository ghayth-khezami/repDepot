import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Clock3, RotateCcw, ShoppingBag, Truck } from 'lucide-react';
import { useCreateSurPlaceCommandMutation } from '../../store/api/commandApi';
import { store } from '../../store/store';
import { productApi, type NotifySummary, type ProductStage } from '../../store/api/productApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { BottomSheet } from '../../components/ui';

export const STAGE_META: Record<ProductStage, { label: string; chip: string; dot: string; hint: string }> = {
  EN_VENTE: { label: 'En vente', chip: 'bg-bd-blush text-bd-pink-strong', dot: 'bg-bd-pink', hint: 'Visible en boutique' },
  VENDU: { label: 'Vendu', chip: 'bg-bd-success-bg text-bd-success', dot: 'bg-bd-success', hint: 'Puis : commande ou achat sur place (le déposant est prévenu)' },
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
      const msg = to === 'VENDU' ? 'Vendu enregistré · le déposant sera prévenu dès que la commande est créée' : notifyMessage(res.notification);
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
  variant = 'chip',
  inOrder,
}: {
  productId: string;
  stage: ProductStage;
  isDepot: boolean;
  size?: 'sm' | 'md';
  onChanged?: (s: ProductStage) => void;
  /** "action": one big button for the next step (Marquer comme vendu → Marquer comme payé). */
  variant?: 'chip' | 'action';
  /** Already part of an order? If not, "Vendu" and "Payé" both ask for the order (commande / sur place). */
  inOrder?: boolean;
}) {
  const [local, setLocal] = useState<ProductStage | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  /** After "Vendu": what kind of sale? (order to deliver / in-shop sale / later) */
  const [nextStep, setNextStep] = useState(false);
  const [nextTitle, setNextTitle] = useState('Article vendu 🎉 Et maintenant ?');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [createSurPlace, { isLoading: creatingSale }] = useCreateSurPlaceCommandMutation();
  const navigate = useNavigate();
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
    // Same flow for "Vendu" and "Payé": the sale must have its order (delivery or in-shop sale).
    if ((to === 'VENDU' || to === 'PAYE') && !inOrder) {
      setNextTitle(to === 'PAYE' ? 'Article payé ✅ Et la vente ?' : 'Article vendu 🎉 Et maintenant ?');
      setNextStep(true);
    }
  };

  const sellInShop = async () => {
    try {
      await createSurPlace({ productIds: [productId], date: new Date(`${saleDate}T12:00:00`).toISOString() }).unwrap();
      showToast('Commande « achat sur place » créée', 'success');
      setNextStep(false);
    } catch (e) {
      showToast(apiErrorMessage(e, 'Création de la commande impossible'), 'error', 6000);
    }
  };

  const options: ProductStage[] = isDepot ? ['EN_VENTE', 'VENDU', 'PAYE', 'RETIRE'] : ['EN_VENTE', 'VENDU', 'RETIRE'];

  const nextAction: { to: ProductStage; label: string; icon: typeof Check } | null =
    current === 'EN_VENTE' ? { to: 'VENDU', label: 'Marquer comme vendu', icon: ShoppingBag } : current === 'VENDU' && isDepot ? { to: 'PAYE', label: 'Marquer comme payé', icon: Check } : null;

  return (
    <>
      {variant === 'action' ? (
        nextAction ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pick(nextAction.to);
            }}
            className={cn(
              'bd-focus inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold text-white transition active:scale-[0.98]',
              nextAction.to === 'VENDU' ? 'bg-grad-green-strong shadow-[0_10px_24px_rgba(22,163,74,0.3)]' : 'bg-grad-violet-strong shadow-glow-violet',
            )}
          >
            <nextAction.icon size={18} aria-hidden /> {nextAction.label}
          </button>
        ) : (
          <span className={cn('inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold', meta.chip)}>
            <Check size={16} aria-hidden /> {meta.label}
          </span>
        )
      ) : (
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
      )}
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

      <BottomSheet open={nextStep} onClose={() => setNextStep(false)} title={nextTitle}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setNextStep(false);
              navigate(`/commands?productId=${productId}`);
            }}
            className="bd-focus flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-grad-pink-strong px-4 text-left text-white shadow-glow-pink active:scale-[0.99]"
          >
            <Truck size={22} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Continuer la commande</span>
              <span className="block text-xs font-semibold text-white/85">Client, adresse et date de livraison</span>
            </span>
          </button>
          <div className="rounded-2xl border border-bd-line/10 bg-bd-bg p-3">
            <p className="flex items-center gap-2 font-extrabold text-bd-ink">
              <ShoppingBag size={20} className="text-bd-violet" aria-hidden /> Achat sur place
            </p>
            <p className="mb-2 text-xs font-semibold text-bd-muted">Client inconnu, vendu en boutique — la commande est créée et marquée livrée.</p>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Date de la vente"
                data-dictation="off"
                value={saleDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSaleDate(e.target.value)}
                className="bd-input min-w-0 flex-1"
              />
              <button
                type="button"
                disabled={creatingSale || !saleDate}
                onClick={() => void sellInShop()}
                className="bd-focus min-h-[44px] shrink-0 rounded-2xl bg-grad-violet-strong px-4 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {creatingSale ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setNextStep(false)} className="bd-focus flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-bd-muted">
            <Clock3 size={16} aria-hidden /> Plus tard
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
