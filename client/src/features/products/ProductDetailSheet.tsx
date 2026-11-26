import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Barcode,
  CalendarDays,
  ExternalLink,
  FileText,
  Heart,
  Package,
  Pencil,
  Printer,
  QrCode,
  ShoppingCart,
  Tag,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { useGetProductQuery } from '../../store/api/productApi';
import { uploadUrl } from '../../lib/apiBase';
import { downloadAuthed } from '../../lib/download';
import { formatTnd, splitCommission, toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { useToast } from '../../context/ToastContext';
import { Button, Skeleton } from '../../components/ui';
import ProductStatusControl from './ProductStatusControl';
import DeposantSuivi from '../depot/DeposantSuivi';
import type { Product } from '../../types';

type FullProduct = Product & {
  barcode?: string | null;
  description?: string | null;
  subSubCategory1?: { id: string; title: string } | null;
  subSubCategory2?: { id: string; title: string } | null;
  orders?: Array<{
    command: { id: string; createdAt: string; status: string; PrixVente: number; adresseLivraison: string; dateLivraison: string | null };
    client: { firstName: string; lastName: string; phoneNumber: string } | null;
    coClient: { firstName: string; lastName: string; phoneNumber: string } | null;
  }>;
  likesCount?: number;
};

const STATUS_LABEL: Record<string, string> = { NOT_DELIVERED: 'Non livrée', DELIVERED: 'Livrée', GOT_PROFIT: 'Encaissée' };
const d = (x?: string | null) => (x ? new Date(x).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Row({ icon: Icon, label, children }: { icon: typeof Tag; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bd-lilac/70 text-bd-violet">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">{label}</p>
        <div className="text-sm font-bold text-bd-ink">{children}</div>
      </div>
    </div>
  );
}

/** Everything about one product in a single smooth sheet (replaces the old "Aperçu" modal). */
export default function ProductDetailSheet({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (p: Product) => void }) {
  const { data, isLoading } = useGetProductQuery(id);
  const p = data as FullProduct | undefined;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [photo, setPhoto] = useState(0);
  const [suivi, setSuivi] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const priceM = toMillimes(p?.PrixVente ?? 0);
  const split = p?.isDepot ? splitCommission(priceM, p.depotPercentage ?? 0) : null;
  const margin = !p?.isDepot && p?.PrixAchat != null ? priceM - toMillimes(p.PrixAchat) : null;

  const download = async (path: string, name: string) => {
    setBusy(true);
    try {
      await downloadAuthed(path, name);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="bd-ui fixed inset-0 z-[70] flex justify-end bg-bd-ink/45 backdrop-blur-sm" onClick={onClose}>
      {suivi ? <DeposantSuivi id={suivi} onClose={() => setSuivi(null)} /> : null}
      <aside role="dialog" aria-modal="true" aria-label="Fiche produit" onClick={(e) => e.stopPropagation()} className="bd-anim-slide-in flex h-[100dvh] w-full flex-col bg-bd-bg shadow-2xl sm:max-w-xl">
        {isLoading || !p ? (
          <div className="space-y-4 p-5">
            <Skeleton className="aspect-[4/3]" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Gallery */}
              <div className="relative bg-bd-lilac/50">
                {p.photos?.length ? (
                  <img src={uploadUrl(p.photos[photo]?.photoDoc ?? p.photos[0].photoDoc)} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-bd-violet/60">
                    <Package size={64} aria-hidden />
                  </div>
                )}
                <button type="button" onClick={onClose} aria-label="Fermer" className="bd-focus absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur active:scale-95">
                  <X size={20} aria-hidden />
                </button>
                <span className={cn('absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-full px-3 py-1.5 text-xs font-black text-white shadow', p.isDepot ? 'bg-grad-pink-strong' : 'bg-grad-violet-strong')}>
                  {p.isDepot ? 'Dépôt' : 'Achat'}
                </span>
                {(p.photos?.length ?? 0) > 1 ? (
                  <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 px-3">
                    {p.photos!.map((ph, i) => (
                      <button key={ph.id} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} className={cn('h-12 w-12 overflow-hidden rounded-xl ring-2 transition', i === photo ? 'ring-white' : 'opacity-70 ring-transparent')}>
                        <img src={uploadUrl(ph.photoDoc)} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {/* Title + price */}
                <div className="bd-anim-fade-up">
                  <p className="text-xs font-extrabold text-bd-muted tabular-nums">{p.ref}</p>
                  <h2 className="text-2xl font-black leading-tight text-bd-ink">{p.productName}</h2>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-3xl font-black text-bd-pink-strong tabular-nums">{formatTnd(priceM)}</p>
                    {p.status ? <ProductStatusControl productId={p.id} status={p.status} payoutStatus={p.payoutStatus} isDepot={p.isDepot} /> : null}
                  </div>
                </div>

                {/* Money split */}
                <div className="bd-anim-fade-up grid grid-cols-2 gap-2">
                  {split ? (
                    <>
                      <div className="rounded-2xl bg-bd-surface p-3 shadow-card">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">Marge boutique · {p.depotPercentage ?? 0} %</p>
                        <p className="text-lg font-black text-bd-pink-strong tabular-nums">{formatTnd(p.shopAmountMillimes ?? split.shopMillimes)}</p>
                      </div>
                      <div className="rounded-2xl bg-bd-surface p-3 shadow-card">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">Part déposant</p>
                        <p className="text-lg font-black text-bd-success tabular-nums">{formatTnd(p.depositorAmountMillimes ?? split.depositorMillimes)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl bg-bd-surface p-3 shadow-card">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">Prix d'achat</p>
                        <p className="text-lg font-black text-bd-ink tabular-nums">{p.PrixAchat != null ? formatTnd(toMillimes(p.PrixAchat)) : '—'}</p>
                      </div>
                      <div className="rounded-2xl bg-bd-surface p-3 shadow-card">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">Marge</p>
                        <p className={cn('text-lg font-black tabular-nums', margin != null && margin < 0 ? 'text-bd-danger' : 'text-bd-success')}>{margin != null ? formatTnd(margin) : '—'}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="bd-anim-fade-up divide-y divide-bd-line/10 rounded-2xl bg-bd-surface px-4 shadow-card">
                  <Row icon={Tag} label="Catégorie">
                    {[p.category?.categoryName, p.subCategory?.title, p.subSubCategory1?.title, p.subSubCategory2?.title].filter(Boolean).join(' › ') || '—'}
                  </Row>
                  {p.isDepot ? (
                    <Row icon={UserRound} label="Déposant">
                      {p.coClient ? (
                        <button type="button" onClick={() => setSuivi(p.coClient!.id)} className="inline-flex items-center gap-1.5 text-bd-violet-strong hover:underline">
                          {p.coClient.firstName} {p.coClient.lastName} <Activity size={14} aria-hidden />
                        </button>
                      ) : (
                        '—'
                      )}
                    </Row>
                  ) : null}
                  {p.depositRequest ? (
                    <Row icon={FileText} label="Contrat de dépôt">
                      <button type="button" onClick={() => navigate(`/depots/${p.depositRequest!.id}`)} className="inline-flex items-center gap-1.5 text-bd-violet-strong hover:underline">
                        {p.depositRequest.contractNumber ?? 'Voir le contrat'} <ExternalLink size={13} aria-hidden />
                      </button>
                    </Row>
                  ) : null}
                  <Row icon={Barcode} label="Code-barres">
                    <span className="tabular-nums">{p.barcode || '—'}</span>
                  </Row>
                  <Row icon={CalendarDays} label="Dates">
                    Ajouté le {d(p.createdAt)}
                    {p.soldAt ? ` · vendu le ${d(p.soldAt)}` : ''}
                  </Row>
                  <Row icon={Heart} label="Coups de cœur clients">
                    {p.likesCount ?? 0}
                  </Row>
                </div>

                {p.description ? (
                  <div className="bd-anim-fade-up rounded-2xl bg-bd-surface p-4 shadow-card">
                    <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">Description</p>
                    <p className="whitespace-pre-line text-sm text-bd-ink">{p.description}</p>
                  </div>
                ) : null}

                {/* Orders */}
                <div className="bd-anim-fade-up rounded-2xl bg-bd-surface p-4 shadow-card">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-bd-muted">
                    <Truck size={14} aria-hidden /> Commandes
                  </p>
                  {p.orders?.length ? (
                    <ul className="space-y-2">
                      {p.orders.map((o) => {
                        const who = o.client ?? o.coClient;
                        return (
                          <li key={o.command.id} className="rounded-xl bg-bd-bg px-3 py-2">
                            <div className="flex items-center justify-between gap-2 text-sm font-extrabold text-bd-ink">
                              <span className="truncate">{who ? `${who.firstName} ${who.lastName}` : 'Client'}</span>
                              <span className="shrink-0 rounded-full bg-bd-lilac px-2 py-0.5 text-[11px]">{STATUS_LABEL[o.command.status] ?? o.command.status}</span>
                            </div>
                            <p className="truncate text-xs font-bold text-bd-muted">
                              {d(o.command.createdAt)} · {formatTnd(toMillimes(o.command.PrixVente))} · {o.command.adresseLivraison}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm font-bold text-bd-muted">Pas encore commandé.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 border-t border-bd-line/10 bg-bd-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button variant="secondary" icon={Pencil} onClick={() => onEdit(p)}>
                Modifier
              </Button>
              {p.isDepot ? (
                p.depositRequest ? (
                  <Button variant="secondary" icon={Printer} loading={busy} onClick={() => void download(`/depots/${p.depositRequest!.id}/labels.pdf`, `etiquettes-${p.depositRequest!.contractNumber ?? 'contrat'}.pdf`)} title="Le QR de cet article a été créé avec son contrat de dépôt">
                    Étiquettes du contrat
                  </Button>
                ) : (
                  <span className="flex items-center justify-center rounded-full bg-bd-bg px-3 text-center text-xs font-bold text-bd-muted">QR créé avec le dépôt</span>
                )
              ) : (
                <Button variant="secondary" icon={QrCode} loading={busy} onClick={() => void download(`/products/${p.id}/label/pdf`, `etiquette-${p.ref ?? p.id}.pdf`)}>
                  Étiquette QR
                </Button>
              )}
              <Button icon={ShoppingCart} disabled={p.status === 'VENDU'} className="col-span-2" onClick={() => navigate(`/commands?productId=${encodeURIComponent(p.id)}`)}>
                Créer une commande
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
