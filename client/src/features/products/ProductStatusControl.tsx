import { useId } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { useUpdateProductMutation } from '../../store/api/productApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { StatusChip, productStatusMeta, type PayoutStatusValue, type ProductStatusValue } from '../../components/ui';

/**
 * Inline product lifecycle control used in Produits (table + mobile cards):
 * status select (En vente / Vendu / Retiré) and, for sold dépôt items, a "Payé" toggle.
 * The server keeps isDispo / soldAt / payoutStatus consistent, so the public suivi page
 * reflects the change on its next revalidation (≤ 60 s).
 */
export default function ProductStatusControl({
  productId,
  status,
  payoutStatus,
  isDepot,
  compact,
}: {
  productId: string;
  status: ProductStatusValue;
  payoutStatus?: PayoutStatusValue | null;
  isDepot?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const [update, { isLoading }] = useUpdateProductMutation();
  const { showToast } = useToast();

  const save = async (data: { status?: ProductStatusValue; payoutStatus?: PayoutStatusValue }, msg: string) => {
    try {
      await update({ id: productId, data: data as any }).unwrap();
      showToast(msg, 'success');
    } catch (e) {
      showToast(apiErrorMessage(e, 'Changement de statut impossible.'), 'error');
    }
  };

  return (
    <div className={cn('bd-ui flex flex-wrap items-center gap-1.5', compact && 'gap-1')}>
      <label htmlFor={id} className="sr-only">Statut</label>
      <div className="relative">
        <select
          id={id}
          value={status}
          disabled={isLoading}
          onChange={(e) => {
            const next = e.target.value as ProductStatusValue;
            void save({ status: next }, `Statut : ${productStatusMeta[next].label}`);
          }}
          className={cn(
            'bd-focus min-h-[36px] appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-xs font-extrabold',
            productStatusMeta[status].chip,
          )}
        >
          {(Object.keys(productStatusMeta) as ProductStatusValue[]).map((s) => (
            <option key={s} value={s}>
              {productStatusMeta[s].label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">▾</span>
      </div>
      {status === 'VENDU' && isDepot ? (
        payoutStatus === 'PAYE' ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void save({ payoutStatus: 'A_PERCEVOIR' }, 'Paiement annulé : à percevoir')}
            title="Annuler le paiement"
            className="bd-focus min-h-[36px] rounded-full"
          >
            <StatusChip status="VENDU" payout="PAYE" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void save({ payoutStatus: 'PAYE' }, 'Déposant marqué payé')}
            className="bd-focus inline-flex min-h-[36px] items-center gap-1 rounded-full border border-bd-violet/30 px-2.5 text-xs font-extrabold text-bd-violet-strong transition hover:bg-violet-50 dark:hover:bg-violet-500/10"
          >
            <BadgeCheck size={14} aria-hidden /> Marquer payé
          </button>
        )
      ) : null}
      {isLoading ? <Loader2 size={14} className="animate-spin text-bd-muted" aria-label="Enregistrement" /> : null}
    </div>
  );
}
