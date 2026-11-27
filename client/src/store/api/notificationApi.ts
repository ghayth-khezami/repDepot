import { baseApi } from './baseApi';

export interface AdminNotification {
  id: string;
  type: 'COMMAND_CREATED' | 'DEPOSIT_REQUEST_CREATED' | string;
  title: string;
  body: string;
  linkPath: string | null;
  entityId: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  orderAddress?: string | null;
  productName?: string | null;
  productImage?: string | null;
  orderPrice?: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  data: AdminNotification[];
  meta: { total: number; page: number; limit: number; totalPages: number; unreadCount: number };
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationPage, void>({
      query: () => ({ url: '/notifications', params: { page: 1, limit: 40 } }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const n = draft.data.find((x) => x.id === id);
            if (n && !n.read) {
              n.read = true;
              draft.meta.unreadCount = Math.max(0, draft.meta.unreadCount - 1);
            }
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            draft.data.forEach((n) => (n.read = true));
            draft.meta.unreadCount = 0;
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } = notificationApi;
