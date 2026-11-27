import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FilePlus2, FileText, Package } from 'lucide-react';
import { useGetDeposantOverviewQuery } from '../../store/api/depotApi';
import { uploadUrl } from '../../lib/apiBase';
import { formatTnd } from '../../lib/money';
import { BottomSheet, Skeleton } from '../../components/ui';

const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const addMonths = (iso: string, m: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + m);
  return d;
};

/**
 * "+" on a déposant: start a new contract, or swipe through the existing contracts (shown like little
 * contract sheets) and pick one to add articles to it, next to the articles already deposited.
 */
export default function DepotChoiceSheet({
  deposantId,
  name,
  open,
  onClose,
  onNewContract,
}: {
  deposantId: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onNewContract: () => void;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useGetDeposantOverviewQuery(deposantId, { skip: !open });
  const contracts = useMemo(() => {
    if (!data) return [];
    return data.contracts
      .filter((c) => c.contractNumber)
      .map((c) => {
        const items = data.products.filter((p) => p.contractId === c.id);
        return {
          ...c,
          items,
          value: items.reduce((t, p) => t + p.priceMillimes, 0),
          sold: items.filter((p) => p.stage === 'VENDU' || p.stage === 'PAYE').length,
          expired: addMonths(c.createdAt, c.durationMonths ?? 3).getTime() < Date.now(),
        };
      });
  }, [data]);

  return (
    <BottomSheet open={open} onClose={onClose} title={`Dépôt pour ${name}`}>
      <button
        type="button"
        onClick={() => {
          onClose();
          onNewContract();
        }}
        className="bd-focus flex min-h-[68px] w-full items-center gap-3 rounded-2xl bg-grad-pink-strong px-4 text-left text-white shadow-glow-pink active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <FilePlus2 size={22} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Nouveau contrat</span>
          <span className="block text-xs font-semibold text-white/85">Nouveau QR de suivi, nouvelle fiche de dépôt</span>
        </span>
        <ChevronRight size={20} aria-hidden />
      </button>

      <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.14em] text-bd-muted">
        Ou ajouter à un contrat existant {contracts.length > 1 ? '· glissez →' : ''}
      </p>
      {isLoading ? (
        <div className="flex gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-56 w-56 shrink-0" />)}</div>
      ) : contracts.length ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {contracts.map((c) => (
            <li key={c.id} className="w-[78%] max-w-[260px] shrink-0 snap-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/depots/${c.id}/articles`);
                }}
                className="bd-focus group relative block w-full overflow-hidden rounded-2xl border border-bd-line/15 bg-white p-4 text-left shadow-[0_14px_34px_rgba(76,29,149,0.14)] transition active:scale-[0.98] dark:bg-bd-surface"
              >
                {/* paper look: folded corner + ruled lines */}
                <span aria-hidden className="absolute right-0 top-0 h-7 w-7 bg-gradient-to-bl from-bd-lilac to-transparent" />
                <span className="flex items-center gap-2 text-bd-violet-strong">
                  <FileText size={18} aria-hidden />
                  <span className="text-sm font-black tabular-nums">{c.contractNumber}</span>
                </span>
                <span className="mt-1 block text-[11px] font-bold text-bd-muted">
                  Déposé le {frDate(c.createdAt)} · {c.durationMonths ?? 3} mois
                </span>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${c.expired ? 'bg-rose-100 text-rose-700' : 'bg-bd-success-bg text-bd-success'}`}>
                  {c.expired ? 'Terminé' : 'En cours'}
                </span>
                <span className="mt-3 block space-y-1.5">
                  {c.items.slice(0, 3).map((p) => (
                    <span key={p.id} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bd-lilac/60 text-bd-violet">
                        {p.photo ? <img src={uploadUrl(p.photo)} alt="" className="h-full w-full object-cover" /> : <Package size={13} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-bd-ink">{p.name}</span>
                        <span className="block text-[10px] font-bold text-bd-muted">{p.ref} · {formatTnd(p.priceMillimes)}</span>
                      </span>
                    </span>
                  ))}
                  {c.items.length > 3 ? <span className="block text-[11px] font-extrabold text-bd-violet">+ {c.items.length - 3} autre(s) article(s)</span> : null}
                  {!c.items.length ? <span className="block rounded-lg border border-dashed border-bd-line/25 py-3 text-center text-[11px] font-bold text-bd-muted">Aucun article</span> : null}
                </span>
                <span className="mt-3 block space-y-1 border-t border-dashed border-bd-line/20 pt-2 text-xs font-bold text-bd-ink">
                  <span className="flex justify-between"><span>Articles</span><span className="tabular-nums">{c.items.length}{c.sold ? ` · ${c.sold} vendu(s)` : ''}</span></span>
                  <span className="flex justify-between"><span>Valeur</span><span className="tabular-nums">{formatTnd(c.value)}</span></span>
                </span>
                <span className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-bd-lilac/70 py-2 text-xs font-extrabold text-bd-violet-strong">
                  Ajouter des articles <ChevronRight size={14} aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-bd-bg p-4 text-center text-sm font-bold text-bd-muted">Aucun contrat pour l'instant : créez le premier.</p>
      )}
    </BottomSheet>
  );
}
