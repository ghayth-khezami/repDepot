import { ClipboardCheck, PackageCheck, Truck } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * State of the product's order. "Livrée" = the client has paid and received it → « Payé & livré ».
 * (Paying the déposant his share is the separate « Payé » stage of dépôt articles.)
 */
export default function OrderBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status || status === 'CANCELLED') return null;
  const m =
    status === 'DELIVERED' || status === 'GOT_PROFIT'
      ? { label: 'Payé & livré', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', Icon: Truck }
      : status === 'ACCEPTED'
        ? { label: 'Commande acceptée', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', Icon: PackageCheck }
        : { label: 'Commande reçue', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', Icon: ClipboardCheck };
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold', m.cls, className)} title={m.label}>
      <m.Icon size={12} aria-hidden /> {m.label}
    </span>
  );
}
