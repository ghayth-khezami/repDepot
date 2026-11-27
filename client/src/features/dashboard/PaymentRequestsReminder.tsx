import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarClock, Phone, Wallet, X } from 'lucide-react';
import { useGetPaymentRequestsQuery, useSetPaymentRequestStatusMutation, type PaymentRequest } from '../../store/api/paymentRequestApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { formatTnd } from '../../lib/money';
import { cn } from '../../lib/cn';
import PersonIllustration from '../../components/PersonIllustration';

const SEEN_KEY = 'bd-payment-reminder-seen';
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86_400_000);
  const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (diff === 0) return { text: `Aujourd'hui · ${date}`, tone: 'today' as const };
  if (diff === 1) return { text: `Demain · ${date}`, tone: 'soon' as const };
  if (diff < 0) return { text: `En retard · ${date}`, tone: 'late' as const };
  return { text: date, tone: 'later' as const };
};

function RequestCard({ r }: { r: PaymentRequest }) {
  const [setStatus, { isLoading }] = useSetPaymentRequestStatusMutation();
  const { showToast } = useToast();
  const day = dayLabel(r.pickupDate);
  const act = async (status: 'DONE' | 'CANCELLED') => {
    try {
      const res = await setStatus({ id: r.id, status }).unwrap();
      showToast(status === 'DONE' ? `Paiement remis à ${r.coClient.firstName} · ${res.paid} article(s) passés en « Payé »` : 'Demande annulée', 'success', 6000);
    } catch (e) {
      showToast(apiErrorMessage(e, 'Action impossible'), 'error');
    }
  };
  return (
    <li className="rounded-3xl border border-bd-line/10 bg-bd-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <PersonIllustration gender={r.coClient.gender} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-bd-ink">
            {r.coClient.firstName} {r.coClient.lastName} <span className="text-xs font-bold text-bd-muted">· N° {r.coClient.number}</span>
          </p>
          <a href={`tel:+216${r.coClient.phoneNumber}`} className="inline-flex items-center gap-1 text-xs font-bold text-bd-violet-strong">
            <Phone size={12} aria-hidden /> {r.coClient.phoneNumber}
          </a>
        </div>
        <p className="shrink-0 text-right text-xl font-black tabular-nums text-bd-success">{formatTnd(r.amountMillimes)}</p>
      </div>
      <p
        className={cn(
          'mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-extrabold capitalize',
          day.tone === 'today' ? 'bg-bd-blush text-bd-pink-strong' : day.tone === 'late' ? 'bg-rose-100 text-rose-700' : day.tone === 'soon' ? 'bg-amber-100 text-amber-800' : 'bg-bd-lilac/60 text-bd-violet-strong',
        )}
      >
        <CalendarClock size={16} aria-hidden /> {day.text}
      </p>
      <ul className="mt-2 space-y-1 text-xs font-semibold text-bd-ink">
        {r.products.map((p) => (
          <li key={p.id} className="flex justify-between gap-2">
            <span className="truncate">
              {p.ref} · {p.name}
            </span>
            <span className="shrink-0 tabular-nums text-bd-muted">{formatTnd(p.depositorMillimes)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={isLoading} onClick={() => void act('CANCELLED')} className="bd-focus min-h-[44px] rounded-2xl border border-bd-line/15 px-3 text-sm font-extrabold text-bd-muted disabled:opacity-50">
          Annuler
        </button>
        <button type="button" disabled={isLoading} onClick={() => void act('DONE')} className="bd-focus inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-grad-green-strong text-sm font-extrabold text-white disabled:opacity-50">
          <BadgeCheck size={17} aria-hidden /> Paiement remis
        </button>
      </div>
    </li>
  );
}

/**
 * Popup on the dashboard (once per session, and when a "Demande de paiement" notification is opened):
 * the déposants coming to collect their money, by date.
 */
export default function PaymentRequestsReminder() {
  // Loaded once; a new request arrives through the websocket notification (which refreshes this list).
  const { data = [] } = useGetPaymentRequestsQuery({ status: 'PENDING' });
  const [params, setParams] = useSearchParams();
  const forced = params.get('paiement');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forced) {
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete('paiement');
      setParams(next, { replace: true });
      return;
    }
    if (!data.length) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode */
    }
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced, data.length]);

  const total = data.reduce((t, r) => t + r.amountMillimes, 0);
  // Banner on the dashboard to reopen the list.
  const banner = data.length ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="bd-focus mb-4 flex w-full items-center gap-3 rounded-3xl bg-[linear-gradient(120deg,#15803d,#16a34a_60%,#6D28D9)] p-4 text-left text-white shadow-card active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Wallet size={22} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{data.length} demande(s) de paiement</span>
        <span className="block truncate text-sm font-semibold text-white/85">
          {formatTnd(total)} à remettre · prochaine : {dayLabel(data[0].pickupDate).text}
        </span>
      </span>
    </button>
  ) : null;
  if (!open) return banner;
  return <>{banner}{createPortal(
    <div className="bd-ui fixed inset-0 z-[92] flex items-end justify-center bg-bd-ink/50 p-3 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Demandes de paiement" className="bd-sheet-in flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-bd-bg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="relative overflow-hidden bg-[linear-gradient(135deg,#15803d_0%,#16a34a_55%,#6D28D9_130%)] px-5 pb-5 pt-6 text-white">
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="bd-focus absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <X size={18} aria-hidden />
          </button>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Wallet size={24} aria-hidden />
          </span>
          <h2 className="mt-3 text-2xl font-black">Demandes de paiement</h2>
          <p className="text-sm font-bold text-white/85">
            {data.length ? `${data.length} déposant(s) viendront récupérer ${formatTnd(total)} au total.` : 'Aucune demande en attente 🎉'}
          </p>
        </header>
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {data.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
        </ul>
        <div className="border-t border-bd-line/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => setOpen(false)} className="bd-focus min-h-[48px] w-full rounded-2xl font-extrabold text-bd-muted">
            Plus tard
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )}</>;
}
