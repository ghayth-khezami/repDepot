import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Check, ChevronDown, Download, Loader2, ChevronLeft, ChevronRight, CreditCard, FileText, Mail, MapPin, MessageCircle, MoreHorizontal, Package, Pencil, Phone, Plus, Trash2, Wallet } from 'lucide-react';
import PersonIllustration from '../../components/PersonIllustration';
import { downloadAuthed } from '../../lib/download';
import ProductDetailSheet from '../products/ProductDetailSheet';
import DeposantEditSheet from './DeposantEditSheet';
import DepotChoiceSheet from './DepotChoiceSheet';
import { useDeleteDepotMutation, useGetDeposantByTokenQuery, useGetDeposantOverviewQuery, type DeposantOverview } from '../../store/api/depotApi';
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

/** "Contrats" tab: every contract as a card with its articles, totals and actions. */
function ContractsPanel({
  d,
  onOpenProduct,
  onOpenContract,
  onAddArticles,
  onDelete,
}: {
  d: DeposantOverview;
  onOpenProduct: (id: string) => void;
  onOpenContract: (id: string) => void;
  onAddArticles: (id: string) => void;
  onDelete: (c: DeposantOverview['contracts'][number]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(d.contracts[0]?.id ?? null);
  if (!d.contracts.length) return <EmptyState icon={FileText} title="Aucun contrat pour ce déposant." />;
  return (
    <ul className="space-y-3">
      {d.contracts.map((c) => {
        const items = d.products.filter((p) => p.contractId === c.id);
        const end = new Date(c.createdAt);
        end.setMonth(end.getMonth() + (c.durationMonths ?? 3));
        const expired = end.getTime() < Date.now();
        const value = items.reduce((t, p) => t + p.priceMillimes, 0);
        const due = items.filter((p) => p.stage === 'VENDU').reduce((t, p) => t + p.depositorMillimes, 0);
        const count = (st: string) => items.filter((p) => p.stage === st).length;
        const open = openId === c.id;
        return (
          <li key={c.id} className="overflow-hidden rounded-3xl border border-bd-line/10 bg-bd-surface shadow-card">
            <button type="button" onClick={() => setOpenId(open ? null : c.id)} aria-expanded={open} className="bd-focus flex w-full items-start gap-3 p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-grad-violet-strong text-white">
                <FileText size={20} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-black tabular-nums text-bd-ink">{c.contractNumber ?? 'Contrat'}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold', expired ? 'bg-rose-100 text-rose-700' : 'bg-bd-success-bg text-bd-success')}>
                    {expired ? 'Terminé' : 'En cours'}
                  </span>
                </span>
                <span className="block text-xs font-bold text-bd-muted">
                  {new Date(c.createdAt).toLocaleDateString('fr-FR')} → {end.toLocaleDateString('fr-FR')} · {c.signedAt ? 'signé' : 'non signé'}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-full bg-bd-bg px-2 py-0.5 text-bd-ink">{items.length} article{items.length > 1 ? 's' : ''} · {formatTnd(value)}</span>
                  {count('EN_VENTE') ? <span className="rounded-full bg-bd-blush px-2 py-0.5 text-bd-pink-strong">{count('EN_VENTE')} en vente</span> : null}
                  {count('VENDU') ? <span className="rounded-full bg-bd-success-bg px-2 py-0.5 text-bd-success">{count('VENDU')} vendu(s) · {formatTnd(due, false)} dû</span> : null}
                  {count('PAYE') ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-bd-violet-strong">{count('PAYE')} payé(s)</span> : null}
                </span>
              </span>
              <ChevronDown size={18} className={cn('mt-1 shrink-0 text-bd-muted transition', open && 'rotate-180')} aria-hidden />
            </button>
            {open ? (
              <div className="border-t border-bd-line/10 px-3 pb-3 pt-2">
                {items.length ? (
                  <ul className="space-y-1.5">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-bd-bg">
                        <button type="button" onClick={() => onOpenProduct(p.id)} className="bd-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/60 text-bd-violet">
                            {p.photo ? <img src={uploadUrl(p.photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={18} aria-hidden />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-extrabold text-bd-muted">{p.ref} · déposé le {shortDate(p.createdAt)}</span>
                            <span className="block truncate text-sm font-extrabold text-bd-ink">{p.name}</span>
                            <span className="block text-xs font-bold tabular-nums text-bd-muted">
                              {formatTnd(p.priceMillimes)} · part <span className="text-bd-success">{formatTnd(p.depositorMillimes, false)}</span>
                            </span>
                          </span>
                        </button>
                        {p.stage !== 'RETIRE' ? <StageControl productId={p.id} stage={p.stage} isDepot size="sm" /> : <span className="text-xs font-bold text-bd-muted">Retiré</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-3 text-sm font-bold text-bd-muted">Aucun article dans ce contrat.</p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => onOpenContract(c.id)} className="bd-focus inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-bd-lilac/70 text-xs font-extrabold text-bd-violet-strong">
                    <FileText size={15} aria-hidden /> Contrat
                  </button>
                  <button type="button" onClick={() => onAddArticles(c.id)} className="bd-focus inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-grad-pink-strong text-xs font-extrabold text-white">
                    <Plus size={15} aria-hidden /> Articles
                  </button>
                  <button type="button" onClick={() => onDelete(c)} className="bd-focus inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-bd-danger/30 text-xs font-extrabold text-bd-danger">
                    <Trash2 size={15} aria-hidden /> Supprimer
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

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
  /** "Contrats" view (cards with their articles) instead of the status tabs. */
  const [showContracts, setShowContracts] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [depotChoice, setDepotChoice] = useState(false);
  const downloadReport = async () => {
    setReportBusy(true);
    try {
      await downloadAuthed(`/deposants/${d.id}/report.pdf`, `deposant-${d.number}-${d.firstName}-${d.lastName}.pdf`.toLowerCase().replace(/\s+/g, '-'));
      showToast('Fiche PDF du déposant téléchargée', 'success');
    } catch (e) {
      showToast((e as Error).message || 'Téléchargement impossible', 'error');
    } finally {
      setReportBusy(false);
    }
  };

  const [deleteDepot] = useDeleteDepotMutation();
  const askDeleteContract = (c: DeposantOverview['contracts'][number]) => {
    const n = d.products.filter((p) => p.contractId === c.id).length;
    setMenu(false);
    confirm({
      title: `Supprimer le contrat ${c.contractNumber ?? ''}`,
      message: n
        ? `Le contrat et ses ${n} article(s) seront supprimés. Impossible si un article est vendu ou en commande.`
        : 'Ce contrat ne contient aucun article. Le supprimer ?',
      confirmLabel: 'Supprimer le contrat',
      onConfirm: async () => {
        try {
          await deleteDepot(c.id).unwrap();
          showToast(`Contrat ${c.contractNumber ?? ''} supprimé`, 'success');
        } catch (e) {
          showToast(apiErrorMessage(e, 'Suppression impossible'), 'error', 7000);
        }
      },
    });
  };

  const askDelete = () => {
    if (d.contracts.length) {
      showToast(`Ce déposant a ${d.contracts.length} contrat(s) : supprimez d'abord ses contrats.`, 'warning', 6000);
      return;
    }
    if (d.totals.total) {
      showToast('Ce déposant a encore des articles.', 'warning');
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
  };

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
          <PersonIllustration gender={d.gender} size={52} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">Déposant N° {d.number}</p>
            <h2 className="truncate text-[22px] font-extrabold leading-tight">
              {d.firstName} {d.lastName}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void downloadReport()}
            disabled={reportBusy}
            aria-label="Télécharger la fiche PDF du déposant"
            title="Fiche PDF : articles, infos manquantes, historique"
            className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 disabled:opacity-60"
          >
            {reportBusy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Download size={20} aria-hidden />}
          </button>
          <button type="button" onClick={() => setMenu(true)} aria-label="Contrats et plus" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
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
          <button type="button" onClick={() => setEditing(true)} className="bd-focus inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-white px-3.5 text-sm font-extrabold text-bd-violet-strong active:scale-95">
            <Pencil size={16} aria-hidden /> Modifier
          </button>
          <button type="button" onClick={askDelete} aria-label="Supprimer le déposant" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 active:scale-95">
            <Trash2 size={18} aria-hidden />
          </button>
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

        <section aria-label="Informations" className="mx-4 mt-3 rounded-3xl bg-bd-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bd-muted">Informations</p>
            <button type="button" onClick={() => setEditing(true)} className="bd-focus inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2 text-xs font-extrabold text-bd-violet hover:bg-bd-lilac/60">
              <Pencil size={13} aria-hidden /> Modifier
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            {[
              { icon: Phone, label: 'Téléphone', value: `+216 ${fmtPhone(d.phone)}` },
              { icon: Mail, label: 'Email', value: d.email },
              { icon: MapPin, label: 'Adresse', value: d.address },
              { icon: CreditCard, label: 'RIB', value: d.rib },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <f.icon size={16} className="mt-0.5 shrink-0 text-bd-violet" aria-hidden />
                <dt className="sr-only">{f.label}</dt>
                <dd className={cn('min-w-0 break-words font-bold', f.value ? 'text-bd-ink' : 'text-bd-muted/70')}>{f.value || `${f.label} non renseigné`}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Articles par statut" className="sticky top-0 z-10 mt-3 flex gap-1 bg-bd-bg/95 px-4 py-2 backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={!showContracts && tab === t.key}
              onClick={() => {
                setShowContracts(false);
                setTab(t.key);
                setSelected(new Set());
              }}
              className={cn('bd-focus flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold transition', !showContracts && tab === t.key ? 'bg-bd-surface text-bd-ink shadow-card' : 'text-bd-muted')}
            >
              {t.label} <span className="text-xs tabular-nums text-bd-violet-strong">{byStage[t.key].length}</span>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={showContracts}
            onClick={() => {
              setShowContracts(true);
              setSelected(new Set());
            }}
            className={cn('bd-focus flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold transition', showContracts ? 'bg-bd-surface text-bd-ink shadow-card' : 'text-bd-muted')}
          >
            Contrats <span className="text-xs tabular-nums text-bd-violet-strong">{d.contracts.length}</span>
          </button>
        </div>

        {/* Rows grouped by lot */}
        <div className="space-y-4 px-4 pb-6 pt-1">
          {showContracts ? (
            <ContractsPanel
              d={d}
              onOpenProduct={setProductId}
              onOpenContract={(id) => {
                onClose();
                navigate(`/depots/${id}`);
              }}
              onAddArticles={(id) => {
                onClose();
                navigate(`/depots/${id}/articles`);
              }}
              onDelete={askDeleteContract}
            />
          ) : groups.length ? (
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
                        <button type="button" onClick={() => setProductId(p.id)} aria-label={`Voir ${p.name}`} className="bd-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left">
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
                          <ChevronRight size={16} className="ml-auto shrink-0 text-bd-muted" aria-hidden />
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

      {!showContracts && tab === 'VENDU' && byStage.VENDU.length ? (
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
            icon={Plus}
            className="flex-1"
            onClick={() => setDepotChoice(true)}
          >
            Dépôt pour {d.firstName}
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
        {d.contracts.map((c) => (
          <SheetAction key={`del-${c.id}`} icon={Trash2} tone="danger" label={`Supprimer le contrat ${c.contractNumber ?? ''}`} hint="Avec ses articles (sauf vendus / en commande)" onClick={() => askDeleteContract(c)} />
        ))}
        <SheetAction icon={Pencil} tone="violet" label="Modifier le déposant" onClick={() => { setMenu(false); setEditing(true); }} />
        <SheetAction
          icon={Trash2}
          tone="danger"
          label="Supprimer le déposant"
          hint={d.contracts.length ? 'Supprimez d’abord ses contrats' : 'Action définitive'}
          onClick={askDelete}
        />
      </BottomSheet>
      <DepotChoiceSheet
        deposantId={d.id}
        name={d.firstName}
        open={depotChoice}
        onClose={() => setDepotChoice(false)}
        onNewContract={() => {
          onClose();
          navigate(`/depots/nouveau?deposant=${d.id}`);
        }}
      />
      {editing ? <DeposantEditSheet d={d} open={editing} onClose={() => setEditing(false)} /> : null}
      {productId ? (
        <ProductDetailSheet
          id={productId}
          onClose={() => setProductId(null)}
          onEdit={(p) => {
            setProductId(null);
            onClose();
            navigate(`/products?edit=${p.id}`);
          }}
        />
      ) : null}
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
