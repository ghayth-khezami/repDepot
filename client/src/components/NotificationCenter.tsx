import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, BellRing, CheckCheck, ChevronRight, Inbox, MapPin, Package, PackagePlus, Phone, ShoppingCart, Smartphone, UserRound, Wallet, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { adminPushState, disableAdminPush, enableAdminPush, type PushState } from '../lib/adminPush';
import { useDispatch } from 'react-redux';
import {
  notificationApi,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AdminNotification,
} from '../store/api/notificationApi';
import { baseApi } from '../store/api/baseApi';
import { uploadUrl } from '../lib/apiBase';
import { acquireAdminSocket, releaseAdminSocket } from '../lib/adminSocket';
import { cn } from '../lib/cn';

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

function KindIcon({ n, className }: { n: AdminNotification; className?: string }) {
  if (n.productImage) return <img src={uploadUrl(n.productImage)} alt="" className={cn('h-full w-full object-cover', className)} />;
  const Icon = n.type === 'COMMAND_CREATED' ? ShoppingCart : n.type === 'PAYMENT_REQUEST' ? Wallet : PackagePlus;
  return <Icon size={20} aria-hidden className={className} />;
}

/** Live admin socket: new notifications are prepended to the list and shown as a top-right pop-up. */
function useLiveNotifications(onIncoming: (n: AdminNotification) => void) {
  const dispatch = useDispatch();
  const cb = useRef(onIncoming);
  cb.current = onIncoming;
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const socket = acquireAdminSocket(); // shared: one connection for the whole app
    const onNotification = (n: AdminNotification) => {
      dispatch(
        notificationApi.util.updateQueryData('getNotifications', undefined, (draft) => {
          if (draft.data.some((x) => x.id === n.id)) return;
          draft.data.unshift(n);
          draft.meta.total += 1;
          if (!n.read) draft.meta.unreadCount += 1;
        }) as never,
      );
      // The lists behind the notification are stale now.
      dispatch(baseApi.util.invalidateTags(n.type === 'COMMAND_CREATED' ? ['Command', 'Product'] : n.type === 'PAYMENT_REQUEST' ? ['PaymentRequest'] : ['DepositRequest']));
      cb.current(n);
    };
    // After a reconnection (phone asleep, network back), resync once whatever was missed.
    const onReconnect = () => dispatch(baseApi.util.invalidateTags(['Notification', 'PaymentRequest']));
    socket.on('notification', onNotification);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('notification', onNotification);
      socket.io.off('reconnect', onReconnect);
      releaseAdminSocket();
    };
  }, [dispatch]);
}

function Row({ n, onOpen }: { n: AdminNotification; onOpen: (n: AdminNotification) => void }) {
  const isOrder = n.type === 'COMMAND_CREATED';
  return (
    <li className={cn('rounded-2xl p-3 transition', !n.read ? 'bg-bd-blush/60' : 'hover:bg-bd-lilac/40')}>
      <button type="button" onClick={() => onOpen(n)} className="bd-focus flex w-full items-start gap-3 rounded-xl text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac text-bd-violet">
          <KindIcon n={n} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-extrabold text-bd-ink">{n.title}</span>
            {!n.read ? <span aria-label="Non lue" className="h-2 w-2 shrink-0 rounded-full bg-bd-pink-strong" /> : null}
          </span>
          {isOrder ? null : <span className="line-clamp-2 text-[13px] font-semibold text-bd-muted">{n.body}</span>}
          <span className="mt-0.5 block text-[11px] font-bold text-bd-violet">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      {isOrder ? (
        <div className="ml-14 mt-2 space-y-1.5 text-[13px]">
          <p className="flex items-center gap-1.5 font-extrabold text-bd-ink">
            <UserRound size={14} className="shrink-0 text-bd-violet" aria-hidden /> {n.clientName ?? 'Client'}
            {n.clientPhone ? (
              <a href={`tel:+216${n.clientPhone}`} onClick={(e) => e.stopPropagation()} className="ml-1 inline-flex items-center gap-1 font-bold text-bd-violet-strong underline-offset-2 hover:underline">
                <Phone size={12} aria-hidden /> {n.clientPhone}
              </a>
            ) : null}
          </p>
          {n.productName ? (
            <p className="flex items-start gap-1.5 font-semibold text-bd-ink">
              <Package size={14} className="mt-0.5 shrink-0 text-bd-violet" aria-hidden /> <span className="line-clamp-2">{n.productName}</span>
            </p>
          ) : null}
          {n.orderAddress ? (
            <p className="flex items-start gap-1.5 font-semibold text-bd-muted">
              <MapPin size={14} className="mt-0.5 shrink-0 text-bd-violet" aria-hidden /> <span className="line-clamp-2">{n.orderAddress}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-1">
            {n.orderPrice != null ? <span className="text-base font-black tabular-nums text-bd-pink-strong">{Number(n.orderPrice).toFixed(3)} TND</span> : <span />}
            <button type="button" onClick={() => onOpen(n)} className="bd-focus inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-grad-pink-strong px-3 text-xs font-extrabold text-white shadow-glow-pink active:scale-95">
              Voir la commande <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Phone reminders: VAPID subscription of this device. */
function PushToggle() {
  const [state, setState] = useState<PushState | 'busy'>('off');
  const { showToast } = useToast();
  useEffect(() => {
    void adminPushState().then(setState).catch(() => setState('unsupported'));
  }, []);
  if (state === 'unsupported') return null;
  const on = state === 'on';
  return (
    <button
      type="button"
      disabled={state === 'busy' || state === 'denied'}
      onClick={async () => {
        setState('busy');
        try {
          const next = on ? await disableAdminPush() : await enableAdminPush();
          setState(next);
          if (next === 'on') showToast('Rappels activés : une commande non vue depuis 2 h arrivera sur ce téléphone', 'success', 6000);
          if (next === 'denied') showToast('Notifications bloquées : autorisez-les dans les réglages du navigateur', 'warning', 6000);
        } catch (e) {
          setState('off');
          showToast((e as Error).message || 'Activation impossible', 'error');
        }
      }}
      className={cn('bd-focus mx-2 mb-2 flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-left text-sm font-extrabold transition disabled:opacity-60', on ? 'bg-bd-success-bg text-bd-success' : 'bg-bd-lilac/60 text-bd-violet-strong')}
    >
      {on ? <BellRing size={16} aria-hidden /> : <Smartphone size={16} aria-hidden />}
      <span className="flex-1">
        {state === 'denied' ? 'Notifications bloquées sur ce téléphone' : on ? 'Rappels activés sur ce téléphone' : 'Recevoir les rappels sur ce téléphone'}
      </span>
      <span className="text-[11px] font-bold opacity-80">{on ? 'Désactiver' : 'Activer'}</span>
    </button>
  );
}

/**
 * Bell (always top-right) + notification panel + live pop-ups.
 * Tapping the bell opens the list (it no longer jumps to another page); tapping an item marks it read
 * and then opens what it is about.
 */
export default function NotificationCenter({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [popups, setPopups] = useState<AdminNotification[]>([]);
  // Loaded once; then kept up to date by the websocket (no polling).
  const { data, isLoading, isError } = useGetNotificationsQuery(undefined, { refetchOnFocus: false, refetchOnReconnect: false });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();
  const unread = data?.meta.unreadCount ?? 0;
  const panelRef = useRef<HTMLDivElement>(null);

  useLiveNotifications((n) => {
    setPopups((p) => [n, ...p.filter((x) => x.id !== n.id)].slice(0, 3));
    window.setTimeout(() => setPopups((p) => p.filter((x) => x.id !== n.id)), 7000);
    try {
      navigator.vibrate?.(60);
    } catch {
      /* not supported */
    }
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (window.matchMedia('(min-width: 768px)').matches && !panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const openItem = (n: AdminNotification) => {
    if (!n.read) void markRead(n.id);
    setOpen(false);
    setPopups((p) => p.filter((x) => x.id !== n.id));
    if (n.linkPath) navigate(n.linkPath);
  };

  const list = data?.data ?? [];

  return (
    <div ref={panelRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications : ${unread} non lue(s)` : 'Notifications'}
        aria-expanded={open}
        className="bd-focus relative flex h-11 w-11 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface text-bd-violet shadow-card transition hover:text-bd-pink-strong active:scale-95"
      >
        <Bell size={20} aria-hidden className={cn(unread && 'bd-bell-ring')} />
        {unread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-grad-pink-strong px-1 text-[11px] font-black text-white ring-2 ring-bd-surface tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-[80] bg-bd-ink/40 backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)} aria-hidden />
          <section
            role="dialog"
            aria-label="Notifications"
            className="bd-ui bd-sheet-in fixed inset-x-0 bottom-0 z-[85] flex max-h-[85dvh] flex-col rounded-t-[28px] bg-bd-surface shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-14 md:max-h-[70vh] md:w-[400px] md:rounded-3xl md:border md:border-bd-line/10"
          >
            <header className="flex items-center gap-2 border-b border-bd-line/10 px-4 py-3">
              <h2 className="flex-1 text-lg font-extrabold text-bd-ink">Notifications</h2>
              {unread ? (
                <button type="button" onClick={() => void markAll()} className="bd-focus inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-sm font-extrabold text-bd-violet hover:bg-bd-lilac/60">
                  <CheckCheck size={16} aria-hidden /> Tout lire
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="bd-focus flex h-10 w-10 items-center justify-center rounded-full bg-bd-bg text-bd-ink">
                <X size={18} aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <PushToggle />
              {isLoading ? (
                <ul className="space-y-2 p-1">{[0, 1, 2].map((i) => <li key={i} className="h-16 animate-pulse rounded-2xl bg-bd-lilac/60" />)}</ul>
              ) : isError ? (
                <p className="flex flex-col items-center gap-2 p-8 text-center text-sm font-bold text-bd-muted">
                  <BellOff size={28} aria-hidden /> Notifications indisponibles pour le moment.
                </p>
              ) : list.length ? (
                <ul className="space-y-1">{list.map((n) => <Row key={n.id} n={n} onOpen={openItem} />)}</ul>
              ) : (
                <p className="flex flex-col items-center gap-2 p-10 text-center text-sm font-bold text-bd-muted">
                  <Inbox size={32} className="text-bd-violet" aria-hidden /> Aucune notification pour le moment.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {popups.length
        ? createPortal(
            <div className="bd-ui pointer-events-none fixed right-3 top-[68px] z-[90] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2 md:right-6 md:top-20" aria-live="polite">
              {popups.map((n) => (
                <div key={n.id} className="bd-notif-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-bd-line/10 bg-bd-surface p-3 shadow-[0_18px_50px_rgba(76,29,149,0.25)]">
                  <button type="button" onClick={() => openItem(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grad-pink-strong text-white">
                      <KindIcon n={n} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-bd-ink">{n.title}</span>
                      <span className="line-clamp-2 text-[13px] font-semibold text-bd-muted">{n.body}</span>
                    </span>
                  </button>
                  <button type="button" aria-label="Masquer" onClick={() => setPopups((p) => p.filter((x) => x.id !== n.id))} className="bd-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bd-muted hover:bg-bd-bg">
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
