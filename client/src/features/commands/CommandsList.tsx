import { useMemo, useState } from 'react';
import { Check, ChevronDown, ClipboardCheck, MapPin, PackageCheck, Plus, ShoppingCart, Truck } from 'lucide-react';
import { useGetCommandsFeedInfiniteQuery, useUpdateCommandMutation, type Command, type CommandStatus } from '../../store/api/commandApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { uploadUrl } from '../../lib/apiBase';
import { formatTnd, toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { orderSvg } from '../../components/mapPins';
import {
  BottomSheet,
  EmptyState,
  Fab,
  InfiniteSentinel,
  PageHeader,
  Pager,
  SearchBar,
  SegmentedFilter,
  Skeleton,
  useDesktopPager,
  useIsDesktop,
} from '../../components/ui';

export const ORDER_STATUS: Record<CommandStatus, { label: string; chip: string; dot: string; icon: typeof Check; hint: string }> = {
  NOT_DELIVERED: { label: 'Reçue', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500', icon: ClipboardCheck, hint: 'Nouvelle commande, à traiter' },
  ACCEPTED: { label: 'Acceptée', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500', icon: PackageCheck, hint: 'En préparation / en route' },
  DELIVERED: { label: 'Livrée', chip: 'bg-bd-success-bg text-bd-success', dot: 'bg-bd-success', icon: Truck, hint: 'Remise au client' },
  GOT_PROFIT: { label: 'Livrée', chip: 'bg-bd-success-bg text-bd-success', dot: 'bg-bd-success', icon: Truck, hint: 'Remise au client' },
};
const STATUS_ORDER: CommandStatus[] = ['NOT_DELIVERED', 'ACCEPTED', 'DELIVERED'];

export function orderClient(c: Command) {
  const d = c.commandDetails?.find((x) => x.client) ?? c.commandDetails?.[0];
  const cl = d?.client ?? d?.coClient;
  return cl ? `${cl.firstName} ${cl.lastName}`.trim() : 'Client';
}

/** Status chip → sheet with Reçue / Acceptée / Livrée (the web customer sees it in "Mes commandes"). */
export function OrderStatusControl({ command, size = 'md' }: { command: Command; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const [update, { isLoading }] = useUpdateCommandMutation();
  const { showToast } = useToast();
  const meta = ORDER_STATUS[command.status] ?? ORDER_STATUS.NOT_DELIVERED;
  const set = async (status: CommandStatus) => {
    setOpen(false);
    if (status === command.status) return;
    try {
      await update({ id: command.id, data: { status } }).unwrap();
      showToast(`Commande ${ORDER_STATUS[status].label.toLowerCase()} — le client voit la mise à jour`, 'success');
    } catch (e) {
      showToast(apiErrorMessage(e, 'Changement de statut impossible'), 'error');
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn('bd-focus inline-flex shrink-0 items-center gap-1.5 rounded-full font-extrabold transition active:scale-95 disabled:opacity-60', size === 'sm' ? 'min-h-[32px] px-2.5 text-xs' : 'min-h-[40px] px-3.5 text-sm', meta.chip)}
        aria-label={`Statut : ${meta.label}. Changer`}
      >
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <ChevronDown size={size === 'sm' ? 12 : 14} aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Statut de la commande">
        <ul className="space-y-2">
          {STATUS_ORDER.map((s) => {
            const m = ORDER_STATUS[s];
            const current = s === command.status || (s === 'DELIVERED' && command.status === 'GOT_PROFIT');
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => void set(s)}
                  className={cn('bd-focus flex min-h-[60px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition', current ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/10 hover:bg-bd-bg')}
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', m.chip)}>
                    <m.icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-bd-ink">{m.label}</span>
                    <span className="block text-xs font-semibold text-bd-muted">{m.hint}</span>
                  </span>
                  {current ? <Check size={18} className="text-bd-violet" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

type Seg = 'all' | 'NOT_DELIVERED' | 'ACCEPTED' | 'DELIVERED';

function OrderCard({ c, onOpen }: { c: Command; onOpen: (c: Command) => void }) {
  const photo = c.commandDetails?.find((d) => d.product?.photos?.[0])?.product?.photos?.[0]?.photoDoc as string | undefined;
  const n = c.commandDetails?.length ?? c.productsNumber;
  const names = (c.commandDetails ?? []).map((d) => d.product?.productName).filter(Boolean).join(', ');
  return (
    <li className="bd-anim-fade-up flex items-stretch gap-3 rounded-2xl border border-bd-line/10 bg-bd-surface p-2.5 shadow-card md:flex-col md:rounded-3xl md:p-0">
      <button type="button" onClick={() => onOpen(c)} className="bd-focus relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/50 md:aspect-[4/3] md:h-auto md:w-full md:rounded-none md:rounded-t-3xl">
        {photo ? <img src={uploadUrl(photo)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span dangerouslySetInnerHTML={{ __html: orderSvg(48) }} />}
        {n > 1 ? <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 text-[10px] font-black text-white">{n} art.</span> : null}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:p-4 md:pt-1">
        <button type="button" onClick={() => onOpen(c)} className="bd-focus min-w-0 rounded-lg text-left">
          <span className="block truncate text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">
            #{c.id.slice(0, 8).toUpperCase()} · {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
          <span className="block truncate text-[15px] font-extrabold text-bd-ink">{orderClient(c)}</span>
          {names ? <span className="block truncate text-xs font-semibold text-bd-muted">{names}</span> : null}
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs font-bold text-bd-muted">
            <MapPin size={12} className="shrink-0" aria-hidden /> <span className="truncate">{c.adresseLivraison || 'Adresse non renseignée'}</span>
          </span>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <OrderStatusControl command={c} size="sm" />
          <span className="text-[15px] font-black tabular-nums text-bd-ink">{formatTnd(toMillimes(c.PrixVente))}</span>
        </div>
      </div>
    </li>
  );
}

/** Orders: search, Toutes / Reçues / Acceptées / Livrées, cards (phone: infinite scroll, desktop: pages). */
export default function CommandsList({ onOpen, onAdd, headerExtra }: { onOpen: (c: Command) => void; onAdd: () => void; headerExtra?: React.ReactNode }) {
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim());
  const [seg, setSeg] = useState<Seg>('all');
  const feed = useGetCommandsFeedInfiniteQuery({ search: search || undefined, status: seg === 'all' ? undefined : seg });
  const pages = feed.data?.pages as Array<{ data: Command[]; meta: { total: number; counts?: Record<string, number> } }> | undefined;
  const rows = useMemo(() => (pages ?? []).flatMap((p) => p.data), [pages]);
  const meta = pages?.[0]?.meta;
  const isDesktop = useIsDesktop();
  const pager = useDesktopPager({ items: rows, total: meta?.total, hasNextPage: !!feed.hasNextPage, isFetchingNextPage: feed.isFetchingNextPage, fetchNextPage: () => void feed.fetchNextPage(), resetKey: `${search}|${seg}` });
  const visible = isDesktop ? pager.pageItems : rows;

  return (
    <div className="bd-ui w-full pb-24">
      <PageHeader eyebrow="Ventes" title="Commandes" subtitle="Web, boutique et livraisons" actions={headerExtra} />
      <div className="space-y-3 md:sticky md:top-16 md:z-20 md:-mx-8 md:bg-bd-bg/90 md:px-8 md:pb-3 md:pt-1 md:backdrop-blur">
        <div className="flex items-center gap-3">
          <SearchBar value={q} onChange={setQ} placeholder="Client, téléphone, article, adresse ou N°" className="flex-1" />
          <button type="button" onClick={onAdd} className="bd-focus hidden min-h-[48px] shrink-0 items-center gap-2 rounded-2xl bg-grad-pink-strong px-5 font-extrabold text-white shadow-glow-pink md:inline-flex">
            <Plus size={18} aria-hidden /> Nouvelle commande
          </button>
        </div>
        <SegmentedFilter<Seg>
          label="Statut des commandes"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'all', label: 'Toutes', count: meta?.counts?.all },
            { value: 'NOT_DELIVERED', label: 'Reçues', count: meta?.counts?.NOT_DELIVERED },
            { value: 'ACCEPTED', label: 'Acceptées', count: meta?.counts?.ACCEPTED },
            { value: 'DELIVERED', label: 'Livrées', count: meta?.counts?.DELIVERED },
          ]}
        />
      </div>

      <p className="mb-2 mt-4 text-sm font-bold text-bd-muted tabular-nums">{meta ? `${meta.total} commande${meta.total > 1 ? 's' : ''}` : ' '}</p>

      {feed.isLoading ? (
        <div className="grid gap-2 md:grid-cols-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] md:h-72" />)}</div>
      ) : rows.length ? (
        <ul className={cn('grid gap-2 transition-opacity md:grid-cols-2 md:gap-4 lg:grid-cols-3 2xl:grid-cols-4', feed.isFetching && !feed.isFetchingNextPage && 'opacity-60')}>
          {visible.map((c) => (
            <OrderCard key={c.id} c={c} onOpen={onOpen} />
          ))}
          <li className="col-span-full list-none">
            {isDesktop ? (
              <Pager page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} loading={pager.loading} onPage={pager.setPage} />
            ) : (
              <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
            )}
          </li>
        </ul>
      ) : (
        <EmptyState icon={ShoppingCart} title={search || seg !== 'all' ? 'Aucune commande pour ces filtres' : 'Aucune commande pour le moment'}>
          {search ? `Rien ne correspond à « ${search} ».` : 'Les commandes du site et de la boutique apparaîtront ici.'}
        </EmptyState>
      )}

      <Fab icon={Plus} label="Commande" onClick={onAdd} />
    </div>
  );
}
