import { pagedFeed } from './feed';
import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams } from '../../types';

/** NOT_DELIVERED = Reçue, ACCEPTED = Acceptée, DELIVERED = Livrée (GOT_PROFIT = legacy, shown as Livrée). */
export type CommandStatus = 'NOT_DELIVERED' | 'ACCEPTED' | 'DELIVERED' | 'GOT_PROFIT';

export interface Command {
  id: string;
  productsNumber: number;
  PrixVente: number;
  PrixAchat: number;
  status: CommandStatus;
  dateLivraison?: string;
  adresseLivraison: string;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  commandDetails?: any[];
}

export interface CreateCommandDto {
  productsNumber: number;
  PrixVente: number;
  PrixAchat: number;
  productIds: string[];
  clientId: string;
  coClientId?: string;
  status?: CommandStatus;
  dateLivraison?: string;
  adresseLivraison: string;
}

export interface UpdateCommandDto {
  productsNumber?: number;
  PrixVente?: number;
  PrixAchat?: number;
  coClientId?: string;
  status?: CommandStatus;
  adresseLivraison?: string;
  dateLivraison?: string;
  productIds?: string[];
  clientId?: string;
}

export const commandApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommandsFeed: pagedFeed<Command, Record<string, unknown>>(builder, '/commands', 'Command'),
    getCommands: builder.query<PaginatedResponse<Command>, QueryParams>({
      query: (params) => ({
        url: '/commands',
        params,
      }),
      providesTags: ['Command'],
    }),
    getCommand: builder.query<Command, string>({
      query: (id) => `/commands/${id}`,
      providesTags: (result, error, id) => [{ type: 'Command', id }],
    }),
    createCommand: builder.mutation<Command, CreateCommandDto>({
      query: (data) => ({
        url: '/commands',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Command'],
    }),
    /** In-shop sale: "Client sur place", shop address, delivered at once. */
    createSurPlaceCommand: builder.mutation<Command, { productIds: string[]; date?: string }>({
      query: (body) => ({ url: '/commands/sur-place', method: 'POST', body }),
      invalidatesTags: ['Command', 'Product'],
    }),
    updateCommand: builder.mutation<Command, { id: string; data: UpdateCommandDto }>({
      query: ({ id, data }) => ({
        url: `/commands/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Command', id }, 'Command'],
    }),
    deleteCommand: builder.mutation<void, string>({
      query: (id) => ({
        url: `/commands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Command'],
    }),
    deleteAllCommands: builder.mutation<{ deleted: number }, void>({
      query: () => ({ url: '/commands/admin/all', method: 'DELETE' }),
      invalidatesTags: ['Command'],
    }),
  }),
});

export const {
  useGetCommandsQuery,
  useGetCommandsFeedInfiniteQuery,
  useGetCommandQuery,
  useCreateCommandMutation,
  useCreateSurPlaceCommandMutation,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useDeleteAllCommandsMutation,
} = commandApi;
