import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, FileText, Loader2, MessageCircle, Package, PackagePlus, Phone, Wallet, X } from 'lucide-react';
import { useGetDeposantByTokenQuery, useGetDeposantOverviewQuery, type DeposantOverview } from '../../store/api/depotApi';
import { useUpdateProductMutation } from '../../store/api/productApi';
import { useToast } from '../../context/ToastContext';
import { uploadUrl } from '../../lib/apiBase';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { Button, Money, Skeleton } from '../../components/ui';
import ProductStatusControl from '../products/ProductStatusControl';

type Filter = 'all' | 'EN_VENTE' | 'VENDU' | 'TO_PAY';

const fmtPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');

function Body({ d, onClose }: { d: DeposantOverview; onClose: () => void }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [update] = useUpdateProductMutation();
  const [paying, setPaying] = useState(false);
  const [filter, setFilter] = useState<Filter>(d.totals.toPayMillimes > 0 ? 'TO_PAY' : 'all');
  const toPay = d.products.filter((p) => p.status === 'VENDU' && p.payoutStatus !== 'PAYE');

  const list = useMemo(
    () =>
      d.products.filter((p) =>
        filter === 'all' ? true : filter === 'TO_PAY' ? p.status === 'VENDU' && p.payoutStatus !== 'PAYE' : p.status === filter,
      ),
    [d.products, filter],
  );

  const payAll = async () => {
    setPaying(true);
    try {
      for (const p of toPay) await update({ id: p.id, data: { payoutStatus: 'PAYE' } as any }).unwrap();
      showToast(`${toPay.length} article(s) marqué(s) payé(s)`, 'success');
    } catch (e) {
      showToast(apiErrorMessage(e, 'Paiement impossible.'), 'error');
    } finally {
      setPaying(false);
    }
  };

  const tabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'TO_PAY', label: 'À payer', count: toPay.length },
    { key: 'EN_VENTE', label: 'En vente', count: d.totals.onSale },
    { key: 'VENDU', label: 'Vendus', count: d.totals.sold },
    { key: 'all', label: 'Tous', count: d.totals.total },
  ];

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#6D28D9_0%,#9333EA_55%,#DB2777_115%)] px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-black ring-2 ring-white/30">
            {d.firstName[0]}
            {d.lastName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">Déposant N° {d.number}</p>
            <h2 className="truncate text-2xl font-black leading-tight">
              {d.firstName} {d.lastName}
            </h2>
            <p className="text-sm font-bold text-white/85 tabular-nums">+216 {fmtPhone(d.phone)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="bd-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 active:scale-95">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="relative mt-4 flex gap-2">
          <a href={`tel:+216${d.phone}`} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-extrabold active:scale-95">
            <Phone size={16} aria-hidden /> Appeler
          </a>
          <a href={`https://wa.me/216${d.phone}`} target="_blank" rel="noreferrer" className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-extrabold active:scale-95">
            <MessageCircle size={16} aria-hidden /> WhatsApp
          </a>
        </div>

        {/* Money hero */}
        <div className="relative mt-5 rounded-3xl bg-white/95 p-4 text-bd-ink shadow-xl dark:bg-bd-surface">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-bd-muted">À payer au déposant</p>
              <Money millimes={d.totals.toPayMillimes} className="text-3xl font-black text-bd-success" />
            </div>
            {toPay.length ? (
              <Button variant="success" size="sm" icon={BadgeCheck} loading={paying} onClick={() => void payAll()}>
                Tout payer
              </Button>
            ) : (
              <span className="rounded-full bg-bd-success-bg px-3 py-1 text-xs font-extrabold text-bd-success">À jour ✓</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'En vente', value: d.totals.onSale, sub: <Money millimes={d.totals.stockValueMillimes} unit={false} /> },
              { label: 'Vendus', value: d.totals.sold, sub: `${d.totals.paid} payé${d.totals.paid > 1 ? 's' : ''}` },
              { label: 'Déjà versé', value: null, sub: <Money millimes={d.totals.paidMillimes} unit={false} /> },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-bd-bg px-2 py-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">{k.label}</p>
                {k.value !== null ? <p className="text-xl font-black tabular-nums">{k.value}</p> : null}
                <p className={cn('text-xs font-bold text-bd-muted tabular-nums', k.value === null && 'mt-1 text-base font-black text-bd-violet-strong')}>{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto border-b border-bd-line/10 bg-bd-surface/95 px-4 py-3 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            aria-pressed={filter === t.key}
            className={cn(
              'bd-focus inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold transition active:scale-95',
              filter === t.key ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'bg-bd-bg text-bd-ink',
            )}
          >
            {t.label}
            <span className={cn('rounded-full px-1.5 text-xs tabular-nums', filter === t.key ? 'bg-white/25' : 'bg-bd-lilac')}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Articles */}
      <ul className="space-y-2.5 p-4">
        {list.length ? (
          list.map((p, i) => (
            <li key={p.id} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }} className="bd-anim-fade-up flex gap-3 rounded-2xl border border-bd-line/10 bg-bd-surface p-3 shadow-card">
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-bd-lilac/60">
                {p.photo ? <img src={uploadUrl(p.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="m-auto mt-5 h-6 w-6 text-bd-violet/60" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-extrabold leading-snug text-bd-ink">{p.name}</p>
                  <Money millimes={p.priceMillimes} className="shrink-0 text-sm font-black text-bd-ink" />
                </div>
                <p className="mt-0.5 text-xs font-bold text-bd-muted tabular-nums">
                  {p.ref}
                  {p.category ? ` · ${p.category}` : ''} · part <span className="text-bd-success">{(p.depositorMillimes / 1000).toFixed(3)}</span>
                  {p.soldAt ? ` · vendu le ${new Date(p.soldAt).toLocaleDateString('fr-FR')}` : ''}
                </p>
                <div className="mt-2">
                  <ProductStatusControl productId={p.id} status={p.status} payoutStatus={p.payoutStatus} isDepot compact />
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="py-10 text-center text-sm font-bold text-bd-muted">Aucun article dans cette liste.</li>
        )}
      </ul>

      {/* Contracts + actions */}
      <div className="space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {d.contracts.length ? (
          <div className="flex flex-wrap gap-2">
            {d.contracts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/depots/${c.id}`);
                }}
                className="bd-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-bd-lilac/70 px-3 text-xs font-extrabold text-bd-violet-strong active:scale-95"
              >
                <FileText size={14} aria-hidden /> {c.contractNumber ?? 'Contrat'} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
              </button>
            ))}
          </div>
        ) : null}
        <Button
          size="lg"
          icon={PackagePlus}
          className="w-full"
          onClick={() => {
            onClose();
            navigate(`/depots/nouveau?deposant=${d.id}`);
          }}
        >
          Nouveau dépôt pour {d.firstName}
        </Button>
      </div>
    </>
  );
}

/** Full-screen (mobile) / side sheet (desktop) "suivi" of one déposant: money due, articles by status, quick pay. */
export default function DeposantSuivi({ id, token, onClose }: { id?: string; token?: string; onClose: () => void }) {
  const byId = useGetDeposantOverviewQuery(id ?? '', { skip: !id });
  const byToken = useGetDeposantByTokenQuery(token ?? '', { skip: !token || !!id });
  const q = id ? byId : byToken;

  return createPortal(
    <div className="bd-ui fixed inset-0 z-[75] flex justify-end bg-bd-ink/45 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Suivi déposant"
        onClick={(e) => e.stopPropagation()}
        className="bd-anim-slide-in h-[100dvh] w-full overflow-y-auto bg-bd-bg shadow-2xl sm:max-w-lg"
      >
        {q.data ? (
          <Body d={q.data} onClose={onClose} />
        ) : q.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <Wallet size={40} className="text-bd-violet" aria-hidden />
            <p className="font-extrabold text-bd-ink">{apiErrorMessage(q.error, 'Déposant introuvable.')}</p>
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-bd-muted">
              <Loader2 size={16} className="animate-spin" aria-hidden /> Chargement du suivi…
            </div>
            <Skeleton className="h-48" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
