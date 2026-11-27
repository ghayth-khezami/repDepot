import { useState } from 'react';
import HeartButton from './HeartButton';
import OrderBadge from './OrderBadge';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, MoreHorizontal, Package, Pencil, Printer, QrCode, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useGetProductQuery } from '../../store/api/productApi';
import { uploadUrl } from '../../lib/apiBase';
import { downloadAuthed } from '../../lib/download';
import { formatTnd, splitCommission, toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { useToast } from '../../context/ToastContext';
import { BottomSheet, SheetAction, Skeleton, StickyActionBar } from '../../components/ui';
import StageControl, { stageFrom } from './StageControl';
import DeposantSuivi from '../depot/DeposantSuivi';
import type { Product } from '../../types';

type FullProduct = Product & {
  barcode?: string | null;
  description?: string | null;
  paidAt?: string | null;
  subSubCategory1?: { id: string; title: string } | null;
  orders?: Array<{
    command: { id: string; createdAt: string; status: string; PrixVente: number; adresseLivraison: string };
    client: { firstName: string; lastName: string } | null;
    coClient: { firstName: string; lastName: string } | null;
  }>;
  likesCount?: number;
};

const ORDER_STATUS: Record<string, string> = { NOT_DELIVERED: 'Reçue', ACCEPTED: 'Acceptée', DELIVERED: 'Livrée', GOT_PROFIT: 'Livrée', CANCELLED: 'Annulée' };
const d = (x?: string | null) => (x ? new Date(x).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 py-2">
      <span className="text-sm font-bold text-bd-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-extrabold text-bd-ink">{children}</span>
    </div>
  );
}

/** Product detail (full screen on mobile): everything about one product, primary action in a sticky bar. */
export default function ProductDetailSheet({
  id,
  onClose,
  onEdit,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDelete?: (id: string) => void;
}) {
  const { data, isLoading, isError } = useGetProductQuery(id);
  const p = data as FullProduct | undefined;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [photo, setPhoto] = useState(0);
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [suivi, setSuivi] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const priceM = toMillimes(p?.PrixVente ?? 0);
  const split = p?.isDepot ? splitCommission(priceM, p.depotPercentage ?? 0) : null;

  const download = async (key: string, path: string, name: string) => {
    setBusy(key);
    try {
      await downloadAuthed(path, name);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const extraRows = p
    ? [
        p.barcode ? { label: 'Code-barres', value: p.barcode } : null,
        p.soldAt ? { label: 'Vendu le', value: d(p.soldAt) } : null,
        p.paidAt ? { label: 'Payé le', value: d(p.paidAt) } : null,
        p.isDepot ? { label: 'Commission', value: `${p.depotPercentage ?? 0} %` } : null,
        { label: 'Coups de cœur', value: String(p.likesCount ?? 0) },
      ].filter(Boolean) as Array<{ label: string; value: string }>
    : [];

  return createPortal(
    <div className="bd-ui fixed inset-0 z-[78] flex justify-end bg-bd-ink/45 backdrop-blur-sm" onClick={onClose}>
      {suivi ? <DeposantSuivi id={suivi} onClose={() => setSuivi(null)} /> : null}
      <aside role="dialog" aria-modal="true" aria-label="Fiche produit" onClick={(e) => e.stopPropagation()} className="bd-anim-slide-in flex h-[100dvh] w-full flex-col bg-bd-bg shadow-2xl sm:max-w-lg">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} aria-label="Retour" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface shadow-card">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-bd-muted">Produit</p>
            <p className="truncate text-sm font-black text-bd-violet-strong">{p?.ref ?? '…'}</p>
          </div>
          {p ? <HeartButton productId={p.id} name={p.productName} className="h-11 w-11 rounded-2xl border border-bd-line/10 bg-bd-surface shadow-card" /> : null}
          <button type="button" onClick={() => setMenu(true)} aria-label="Plus d'actions" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface shadow-card">
            <MoreHorizontal size={20} aria-hidden />
          </button>
        </header>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="aspect-[4/3]" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : isError || !p ? (
          <p className="p-8 text-center font-bold text-bd-muted">Produit introuvable.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {/* Photo */}
              <div className="relative overflow-hidden rounded-3xl bg-bd-lilac/50">
                {p.photos?.length ? (
                  <img src={uploadUrl(p.photos[photo]?.photoDoc ?? p.photos[0].photoDoc)} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-bd-violet">
                    <Package size={44} strokeWidth={1.6} aria-hidden />
                    <button type="button" onClick={() => onEdit(p)} className="bd-focus inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-bd-surface px-4 text-sm font-extrabold text-bd-ink shadow-card">
                      <Camera size={16} aria-hidden /> Ajouter une photo
                    </button>
                  </div>
                )}
                {(p.photos?.length ?? 0) > 1 ? (
                  <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                    {p.photos!.map((ph, i) => (
                      <button key={ph.id} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} className={cn('h-2.5 rounded-full transition-all', i === photo ? 'w-6 bg-white' : 'w-2.5 bg-white/60')} />
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Identity + status */}
              <section className="rounded-3xl bg-bd-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold', p.isDepot ? 'bg-violet-100 text-bd-violet-strong dark:bg-violet-500/20' : 'bg-bd-blush text-bd-pink-strong')}>
                    {p.isDepot ? 'Dépôt' : 'Achat'}
                  </span>
                  <StageControl productId={p.id} stage={stageFrom(p)} isDepot={p.isDepot} size="sm" />
                  <OrderBadge status={p.orders?.[0]?.command.status} />
                </div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-tight text-bd-ink">{p.productName}</h2>
                {p.depositRequest ? (
                  <button type="button" onClick={() => navigate(`/depots/${p.depositRequest!.id}`)} className="mt-0.5 text-sm font-bold text-bd-muted">
                    Lot de dépôt <span className="font-extrabold text-bd-violet-strong underline-offset-2 hover:underline">{p.depositRequest.contractNumber ?? 'voir'}</span>
                  </button>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-bd-blush/70 p-3">
                    <p className="text-xs font-extrabold text-bd-pink-strong">Prix de vente</p>
                    <p className="text-xl font-black tabular-nums text-bd-ink">
                      {formatTnd(priceM, false)} <span className="text-xs">TND</span>
                    </p>
                  </div>
                  {split ? (
                    <div className="rounded-2xl bg-bd-success-bg/70 p-3">
                      <p className="text-xs font-extrabold text-bd-success">Part déposant</p>
                      <p className="text-xl font-black tabular-nums text-bd-ink">
                        {formatTnd(p.depositorAmountMillimes ?? split.depositorMillimes, false)} <span className="text-xs">TND</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-bd-lilac/60 p-3">
                      <p className="text-xs font-extrabold text-bd-violet-strong">Prix d'achat</p>
                      <p className="text-xl font-black tabular-nums text-bd-ink">{p.PrixAchat != null ? formatTnd(toMillimes(p.PrixAchat), false) : '—'}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Informations */}
              <section className="rounded-3xl bg-bd-surface px-4 py-2 shadow-card">
                <h3 className="pt-2 text-sm font-black text-bd-ink">Informations</h3>
                <div className="divide-y divide-bd-line/10">
                  <InfoRow label="Référence">{p.ref ?? '—'}</InfoRow>
                  <InfoRow label="Catégorie">{[p.category?.categoryName, p.subCategory?.title, p.subSubCategory1?.title].filter(Boolean).join(' › ') || '—'}</InfoRow>
                  {p.isDepot ? (
                    <InfoRow label="Déposant">
                      {p.coClient ? (
                        <button type="button" onClick={() => setSuivi(p.coClient!.id)} className="font-extrabold text-bd-violet-strong underline-offset-2 hover:underline">
                          {p.coClient.firstName} {p.coClient.lastName}
                        </button>
                      ) : (
                        '—'
                      )}
                    </InfoRow>
                  ) : null}
                  <InfoRow label="Ajouté le">{d(p.createdAt)}</InfoRow>
                  {more ? extraRows.map((r) => <InfoRow key={r.label} label={r.label}>{r.value}</InfoRow>) : null}
                </div>
                {extraRows.length ? (
                  <button type="button" onClick={() => setMore((m) => !m)} className="bd-focus my-2 min-h-[44px] w-full rounded-2xl bg-bd-lilac/50 text-sm font-extrabold text-bd-violet-strong">
                    {more ? 'Moins de détails' : `Voir les ${extraRows.length} autres champs`}
                  </button>
                ) : null}
              </section>

              {p.description ? (
                <section className="rounded-3xl bg-bd-surface p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-black text-bd-ink">Description</h3>
                  <p className="whitespace-pre-line text-sm text-bd-ink">{p.description}</p>
                </section>
              ) : null}

              {p.orders?.length ? (
                <section className="rounded-3xl bg-bd-surface p-4 shadow-card">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-bd-ink">
                    <Truck size={15} aria-hidden /> Commandes
                  </h3>
                  <ul className="space-y-2">
                    {p.orders.map((o) => {
                      const who = o.client ?? o.coClient;
                      return (
                        <li key={o.command.id} className="rounded-2xl bg-bd-bg px-3 py-2">
                          <p className="flex justify-between gap-2 text-sm font-extrabold text-bd-ink">
                            <span className="truncate">{who ? `${who.firstName} ${who.lastName}` : 'Client'}</span>
                            <span className="shrink-0 text-xs text-bd-muted">{ORDER_STATUS[o.command.status] ?? o.command.status}</span>
                          </p>
                          <p className="truncate text-xs font-bold text-bd-muted">
                            {d(o.command.createdAt)} · {o.command.adresseLivraison}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>

            <StickyActionBar>
              {/* Not deletable once sold / paid / delivered or part of an order */}
              {onDelete && p.status !== 'VENDU' && !(p.orders?.length) ? (
                <button type="button" onClick={() => onDelete(p.id)} aria-label="Supprimer le produit" className="bd-focus flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-bd-danger/30 text-bd-danger">
                  <Trash2 size={20} aria-hidden />
                </button>
              ) : null}
              <button type="button" onClick={() => onEdit(p)} aria-label="Modifier le produit" title="Modifier le produit" className="bd-focus flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-bd-line/15 bg-bd-surface px-4 text-[15px] font-extrabold text-bd-ink active:scale-[0.98]">
                <Pencil size={18} aria-hidden /> <span className="hidden sm:inline">Modifier</span>
              </button>
              {/* Next step: Marquer comme vendu (→ créer la commande / vendu en boutique) → Marquer comme payé */}
              <StageControl variant="action" productId={p.id} stage={stageFrom(p)} isDepot={p.isDepot} />
            </StickyActionBar>

            <BottomSheet open={menu} onClose={() => setMenu(false)} title="Actions">
              <SheetAction icon={QrCode} tone="violet" label="Carte QR" hint="PDF prêt à imprimer" loading={busy === 'qr'} onClick={() => void download('qr', `/products/${p.id}/qr-card/pdf`, `qr-${p.ref ?? p.id}.pdf`)} />
              {p.depositRequest ? (
                <SheetAction icon={Printer} label="Étiquettes du lot" hint={p.depositRequest.contractNumber ?? undefined} loading={busy === 'labels'} onClick={() => void download('labels', `/depots/${p.depositRequest!.id}/labels.pdf`, 'etiquettes.pdf')} />
              ) : null}
              <SheetAction icon={ShoppingCart} tone="green" label="Créer une commande" onClick={() => navigate(`/commands?productId=${encodeURIComponent(p.id)}`)} />
            </BottomSheet>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
