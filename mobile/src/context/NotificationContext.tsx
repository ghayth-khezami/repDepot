import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useLazyGetVapidPublicKeyQuery,
  useSubscribePushMutation,
  type AppNotification,
} from '../store/api/notificationApi';
import {
  getWsOrigin,
  hasActivePushSubscription,
  registerPushSubscription,
  showSystemNotification,
} from '../lib/pushNotifications';
import { PAGE_SIZE } from '../lib/pagination';

type NotificationContextValue = {
  unreadCount: number;
  notifications: AppNotification[];
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  pushEnabled: boolean;
  enablePush: () => Promise<void>;
  connected: boolean;
  loadMore: () => Promise<boolean>;
  hasMore: boolean;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [liveItems, setLiveItems] = useState<AppNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [extraItems, setExtraItems] = useState<AppNotification[]>([]);
  const [notificationPage, setNotificationPage] = useState(1);
  const socketRef = useRef<Socket | null>(null);

  const { data: listData, refetch: refetchList } = useGetNotificationsQuery(
    { page: 1, limit: PAGE_SIZE },
    { skip: !isAuthenticated },
  );
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [markReadMutation] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();
  const [fetchVapid] = useLazyGetVapidPublicKeyQuery();
  const [subscribePush] = useSubscribePushMutation();
  const [fetchNotifications] = useLazyGetNotificationsQuery();

  const serverItems = listData?.data ?? [];
  const notifications = useMemo(() => {
    const ids = new Set([...serverItems, ...extraItems].map((n) => n.id));
    const merged = [...liveItems.filter((n) => !ids.has(n.id)), ...extraItems, ...serverItems];
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [extraItems, liveItems, serverItems]);

  const unreadCount = unreadData?.count ?? listData?.meta.unreadCount ?? 0;

  const handleIncoming = useCallback(
    (n: AppNotification) => {
      setLiveItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
      void refetchUnread();
      showToast(n.title, 'info');
      showSystemNotification(n.title, n.body, n.linkPath ?? undefined);
    },
    [refetchUnread, showToast],
  );

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setLiveItems([]);
      setExtraItems([]);
      setNotificationPage(1);
      setPushEnabled(false);
      return;
    }

    const socket = io(`${getWsOrigin()}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (payload: AppNotification) => handleIncoming(payload));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, handleIncoming]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void hasActivePushSubscription().then(setPushEnabled);
  }, [isAuthenticated]);

  const enablePush = useCallback(async () => {
    try {
      const { publicKey } = await fetchVapid().unwrap();
      if (!publicKey) {
        showToast('Push non configuré sur le serveur (clés VAPID manquantes sur Render)', 'error');
        return;
      }

      const result = await registerPushSubscription(publicKey, (sub) => subscribePush(sub).unwrap());
      if (result.ok) {
        setPushEnabled(true);
        showToast('Notifications téléphone activées', 'success');
        return;
      }

      setPushEnabled(false);
      showToast(result.message, result.reason === 'denied' ? 'info' : 'error');
    } catch (err) {
      setPushEnabled(false);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.includes('403')) {
        showToast('Session expirée — reconnectez-vous', 'error');
      } else if (msg.includes('Failed to fetch') || msg.includes('Network')) {
        showToast('API inaccessible — vérifiez VITE_API_URL', 'error');
      } else {
        showToast(msg || 'Erreur activation push — vérifiez VAPID sur Render et réessayez', 'error');
      }
    }
  }, [fetchVapid, subscribePush, showToast]);

  const markRead = useCallback(
    async (id: string) => {
      await markReadMutation(id).unwrap();
      setLiveItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      void refetchUnread();
    },
    [markReadMutation, refetchUnread],
  );

  const markAllRead = useCallback(async () => {
    await markAllReadMutation().unwrap();
    setLiveItems((prev) => prev.map((n) => ({ ...n, read: true })));
    void refetchList();
    void refetchUnread();
  }, [markAllReadMutation, refetchList, refetchUnread]);

  const loadMore = useCallback(async () => {
    const nextPage = notificationPage + 1;
    const result = await fetchNotifications({ page: nextPage, limit: PAGE_SIZE }).unwrap();
    setExtraItems((prev) => [...prev, ...result.data.filter((item: AppNotification) => !prev.some((old) => old.id === item.id))]);
    setNotificationPage(nextPage);
    return nextPage < result.meta.totalPages;
  }, [fetchNotifications, notificationPage]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        panelOpen,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
        markRead,
        markAllRead,
        pushEnabled,
        enablePush,
        connected,
        loadMore,
        hasMore: notificationPage < (listData?.meta.totalPages ?? 1),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
