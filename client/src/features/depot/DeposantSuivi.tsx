import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Check, ChevronLeft, FileText, MessageCircle, MoreHorizontal, Package, PackagePlus, Phone, Trash2, Wallet } from 'lucide-react';
import { useGetDeposantByTokenQuery, useGetDeposantOverviewQuery, type DeposantOverview } from '../../store/api/depotApi';
import { useChangeLifecycleMutation } from '../../store/api/productApi';
import { useDeleteCoClientMutation } from '../../store/api/coClientApi';
import { useToast } from '../../context/ToastContext';
import { uploadUrl } from '../../lib/apiBase';
import { apiErrorMessage } from '../../lib/apiError';
import { formatTnd } from '../../lib/money';
import { cn } from '../../lib/cn';
import { BottomSheet, Button, EmptyState, SheetAction, Skeleton, StickyActionBar } from '../../components/ui';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import StageControl from '../products/StageControl';

type Tab = 'EN_VENTE' | 'VENDU' | 'PAYE';
type Item = DeposantOverview['products'][number];

const fmtPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');
const shortDate = (x: string) => new Date(x).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const TABS: Array<{ key: Tab; label: string; empty: string }> = [
  { key: 'EN_VENTE', label: 'En vente', empty: 'Aucun article en vente pour le moment.' },
  { key: 'VENDU', label: 'Vendus', empty: 'Aucun article vendu à payer. 🎉' },
  { key: 'PAYE', label: 'Payés', empty: 'Aucun paiement enregistré.' },
];

function Body({ d, onClose }: { d: DeposantOverview; onClose: () => void }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [changeLifecycle] = useChangeLifecycleMutation();
  const [removeDeposant] = useDeleteCoClientMutation();
  const byStage = useMemo(() => {
    const m: Record<Tab, Item[]> = { EN_VENTE: [], VENDU: [], PAYE: [] };
    d.products.forEach((p) => p.stage !== 'RETIRE' && m[p.stage as Tab].push(p));
    return m;
  }, [d.products]);
  const [tab, setTab] = useState<Tab>(byStage.VENDU.length ? 'VENDU' : 'EN_VENTE');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [menu, setMenu] = useState(false);

  // Group the tab's articles by lot (DV-xxxx).
  const groups = useMemo(() => {
    const lotName = new Map(d.contracts.map((c) => [c.id, c]));
    const g = new Map<string, Item[]>();
    byStage[tab].forEach((p) => {
      const k = p.contractId ?? 'sans-lot';
      g.set(k, [...(g.get(k) ?? []), p]);
    });
    return [...g.entries()].map(([k, items]) => ({ id: k, lot: lotName.get(k), items }));
  }, [byStage, tab, d.contracts]);

  const selectedItems = byStage.VENDU.filter((p) => selected.has(p.id));
  const selectedTotal = selectedItems.reduce((t, p) => t + p.depositorMillimes, 0);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const payAll = async () => {
    setPaying(true);
    let ok = 0;
    let notified = 0;
    const errors: string[] = [];
    for (const p of selectedItems) {
      try {
        const r = await changeLifecycle({ id: p.id, to: 'PAYE' }).unwrap();
        ok += 1;
        notified += r.notification?.sent ?? 0;
      } catch (e) {
        errors.push(`${p.ref} : ${apiErrorMessage(e)}`);
      }
    }
    setPaying(false);
    setSelected(new Set());
    if (ok) showToast(`${ok} article${ok > 1 ? 's' : ''} payé${ok > 1 ? 's' : ''}${notified ? ' · déposant notifié ✅' : ' · aucun canal pour prévenir le déposant'}`, 'success', 6000);
    if (errors.length) showToast(errors[0], 'error', 7000);
  };

  return (
    <div className="flex h-full flex-col">
      {dialog}
      {/* Header */}
      <header className="bg-[linear-gradient(135deg,#6D28D9_0%,#9333EA_60%,#DB2777_120%)] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Retour" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">Déposant N° {d.number}</p>
            <h2 className="truncate text-[22px] font-extrabold leading-tight">
              {d.firstName} {d.lastName}
            </h2>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Plus d'actions" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <MoreHorizontal size={20} aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="mr-auto text-sm font-bold tabular-nums text-white/90">+216 {fmtPhone(d.phone)}</span>
          <a href={`tel:+216${d.phone}`} aria-label="Appeler" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 active:scale-95">
            <Phone size={18} aria-hidden />
          </a>
          <a href={`https://wa.me/216${d.phone}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 active:scale-95">
            <MessageCircle size={18} aria-hidden />
          </a>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Summary */}
        <section className="mx-4 -mt-0 mt-3 rounded-3xl bg-bd-surface p-4 shadow-card">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-bd-muted">
                <Wallet size={14} aria-hidden /> Dû au déposant
              </p>
              <p className="text-[28px] font-black leading-tight tabular-nums text-bd-success">{formatTnd(d.totals.toPayMillimes)}</p>
            </div>
            <p className="text-right text-xs font-bold text-bd-muted">
              Déjà versé
              <br />
              <span className="font-black text-bd-violet-strong">{formatTnd(d.totals.paidMillimes)}</span>
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'En vente', n: byStage.EN_VENTE.length },
              { label: 'Vendus', n: byStage.VENDU.length },
              { label: 'Payés', n: byStage.PAYE.length },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-bd-bg py-2">
                <p className="text-xl font-black tabular-nums text-bd-ink">{k.n}</p>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">{k.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Articles par statut" className="sticky top-0 z-10 mt-3 flex gap-1 bg-bd-bg/95 px-4 py-2 backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setSelected(new Set());
              }}
              className={cn('bd-focus flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold transition', tab === t.key ? 'bg-bd-surface text-bd-ink shadow-card' : 'text-bd-muted')}
            >
              {t.label} <span className="text-xs tabular-nums text-bd-violet-strong">{byStage[t.key].length}</span>
            </button>
          ))}
        </div>

        {/* Rows grouped by lot */}
        <div className="space-y-4 px-4 pb-6 pt-1">
          {groups.length ? (
            groups.map((g) => (
              <section key={g.id}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-bd-muted">
                  <FileText size={13} aria-hidden />
                  {g.lot ? `Lot ${g.lot.contractNumber ?? ''} · ${shortDate(g.lot.createdAt)}` : 'Sans lot'}
                </p>
                <ul className="space-y-2">
                  {g.items.map((p) => {
                    const sel = selected.has(p.id);
                    return (
                      <li key={p.id} className={cn('flex min-h-[72px] items-center gap-3 rounded-2xl border bg-bd-surface p-2.5 shadow-card', sel ? 'border-bd-violet ring-2 ring-bd-violet/20' : 'border-bd-line/10')}>
                        {tab === 'VENDU' ? (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={sel}
                            aria-label={`Sélectionner ${p.name}`}
                            onClick={() => toggle(p.id)}
                            className={cn('bd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2', sel ? 'border-bd-violet bg-bd-violet text-white' : 'border-bd-line/30')}
                          >
                            {sel ? <Check size={16} strokeWidth={3} aria-hidden /> : null}
                          </button>
                        ) : null}
                        <button type="button" onClick={() => tab === 'VENDU' ? toggle(p.id) : undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/60 text-bd-violet">
                            {p.photo ? <img src={uploadUrl(p.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={20} aria-hidden />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-extrabold text-bd-muted">{p.ref}</span>
                            <span className="block truncate text-[15px] font-extrabold text-bd-ink">{p.name}</span>
                            <span className="block text-xs font-bold text-bd-muted tabular-nums">
                              {formatTnd(p.priceMillimes)} · part <span className="text-bd-success">{formatTnd(p.depositorMillimes, false)}</span>
                            </span>
                          </span>
                        </button>
                        <StageControl productId={p.id} stage={p.stage} isDepot size="sm" />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            <EmptyState icon={Package} title={TABS.find((t) => t.key === tab)!.empty} />
          )}
        </div>
      </div>

      {tab === 'VENDU' && byStage.VENDU.length ? (
        <StickyActionBar>
          <button
            type="button"
            onClick={() => setSelected((s) => (s.size === byStage.VENDU.length ? new Set() : new Set(byStage.VENDU.map((p) => p.id))))}
            className="bd-focus min-h-[52px] shrink-0 rounded-2xl border border-bd-line/15 px-3 text-sm font-extrabold text-bd-ink"
          >
            {selected.size === byStage.VENDU.length ? 'Aucun' : 'Tout'}
          </button>
          <Button size="lg" icon={BadgeCheck} className="flex-1" disabled={!selected.size} loading={paying} onClick={() => void payAll()}>
            {selected.size ? `Marquer comme payé · ${formatTnd(selectedTotal)}` : 'Sélectionnez les articles payés'}
          </Button>
        </StickyActionBar>
      ) : (
        <StickyActionBar>
          <Button
            size="lg"
            icon={PackagePlus}
            className="flex-1"
            onClick={() => {
              onClose();
              navigate(`/depots/nouveau?deposant=${d.id}`);
            }}
          >
            Nouveau dépôt pour {d.firstName}
          </Button>
        </StickyActionBar>
      )}

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="Actions déposant">
        {d.contracts.map((c) => (
          <SheetAction
            key={c.id}
            icon={FileText}
            tone="violet"
            label={`Contrat ${c.contractNumber ?? ''}`}
            hint={`Créé le ${new Date(c.createdAt).toLocaleDateString('fr-FR')}`}
            onClick={() => {
              onClose();
              navigate(`/depots/${c.id}`);
            }}
          />
        ))}
        <SheetAction
          icon={Trash2}
          tone="danger"
          label="Supprimer le déposant"
          hint={d.totals.total ? 'Impossible tant qu’il a des articles' : 'Action définitive'}
          onClick={() => {
            if (d.totals.total) {
              showToast('Ce déposant a des articles : retirez-les d’abord.', 'warning');
              return;
            }
            setMenu(false);
            confirm({
              title: 'Supprimer le déposant',
              message: `Supprimer ${d.firstName} ${d.lastName} ? Cette action est définitive.`,
              confirmLabel: 'Supprimer',
              onConfirm: async () => {
                await removeDeposant(d.id).unwrap();
                showToast('Déposant supprimé', 'success');
                onClose();
              },
            });
          }}
        />
      </BottomSheet>
    </div>
  );
}

/** Suivi of one déposant (after a scan or from the list): money due, articles by status and lot, quick pay. */
export default function DeposantSuivi({ id, token, onClose }: { id?: string; token?: string; onClose: () => void }) {
  const byId = useGetDeposantOverviewQuery(id ?? '', { skip: !id });
  const byToken = useGetDeposantByTokenQuery(token ?? '', { skip: !token || !!id });
  const q = id ? byId : byToken;

  return createPortal(
    <div className="bd-ui fixed inset-0 z-[75] flex justify-end bg-bd-ink/45 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Suivi déposant" onClick={(e) => e.stopPropagation()} className="bd-anim-slide-in h-[100dvh] w-full bg-bd-bg shadow-2xl sm:max-w-lg">
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
            <Skeleton className="h-28" />
            <Skeleton className="h-32" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
