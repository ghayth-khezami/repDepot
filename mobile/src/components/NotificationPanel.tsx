import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ShoppingBag, Package, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { uploadUrl } from '../lib/apiBase';

function iconFor(type: string) {
  if (type === 'COMMAND_CREATED') return ShoppingBag;
  if (type === 'DEPOSIT_REQUEST_CREATED') return Package;
  return Bell;
}

export function NotificationPanel() {
  const navigate = useNavigate();
  const {
    panelOpen,
    closePanel,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    connected,
    pushEnabled,
    enablePush,
    loadMore,
    hasMore,
  } = useNotifications();

  if (!panelOpen) return null;

  const openItem = (n: (typeof notifications)[0]) => {
    if (!n.read) void markRead(n.id);
    closePanel();
    if (n.linkPath) navigate(n.linkPath);
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-[100] bg-black/30" onClick={closePanel} aria-label="Fermer" />
      <div className="fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[110] mx-auto max-w-md overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Notifications</h2>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est lu'}
              {connected ? ' · en direct' : ' · hors ligne'}
            </p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 ? (
              <button type="button" onClick={() => void markAllRead()} className="rounded-lg p-2 text-primary-600" aria-label="Tout marquer lu">
                <CheckCheck size={18} />
              </button>
            ) : null}
            <button type="button" onClick={closePanel} className="rounded-lg p-2 text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {!pushEnabled ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 dark:border-amber-900 dark:bg-amber-950/40">
            <button type="button" onClick={() => void enablePush()} className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Activer les notifications sur le téléphone
            </button>
          </div>
        ) : null}

        <ul className="max-h-[60dvh] overflow-y-auto">
          {notifications.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-gray-500">Aucune notification</li>
          ) : (
            notifications.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left dark:border-slate-800 ${
                      n.read ? 'opacity-70' : 'bg-primary-50/40 dark:bg-primary-950/20'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      n.type === 'COMMAND_CREATED' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                    }`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                      {n.productImage ? <img src={uploadUrl(n.productImage)} alt="" className="mt-2 h-14 w-14 rounded-xl object-cover" /> : null}
                      <p className="text-xs text-gray-600 dark:text-gray-400">{n.body}</p>
                      {n.clientName ? <p className="mt-1 text-xs text-gray-500">{n.clientName} · {n.orderAddress}</p> : null}
                      {n.orderPrice != null ? <p className="mt-1 text-xs font-semibold text-primary-700">{n.orderPrice.toFixed(3)} TND</p> : null}
                      <p className="mt-1 text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </span>
                    {!n.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {hasMore ? <button type="button" onClick={() => void loadMore()} className="w-full border-t border-primary-100 py-3 text-sm font-semibold text-primary-700">Charger plus</button> : null}
      </div>
    </>
  );
}
