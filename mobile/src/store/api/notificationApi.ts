import { baseApi } from './baseApi';
import { clampPageSize } from '../../lib/pagination';

export type AppNotification = {
  id: string;
  type: 'COMMAND_CREATED' | 'DEPOSIT_REQUEST_CREATED';
  title: string;
  body: string;
  linkPath?: string | null;
  entityId?: string | null;
  read: boolean;
  createdAt: string;
};

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      { data: AppNotification[]; meta: { unreadCount: number; total: number } },
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 10 }) =>
        `/notifications?page=${page}&limit=${clampPageSize(limit)}`,
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<AppNotification, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    getVapidPublicKey: builder.query<{ publicKey: string | null }, void>({
      query: () => '/notifications/push/vapid-public-key',
    }),
    subscribePush: builder.mutation<void, { endpoint: string; keys: { p256dh: string; auth: string } }>({
      query: (body) => ({
        url: '/notifications/push/subscribe',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useLazyGetVapidPublicKeyQuery,
  useSubscribePushMutation,
} = notificationApi;
