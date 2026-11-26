import { pagedFeed } from './feed';
import { baseApi } from './baseApi';
import { Client, PaginatedResponse, CreateClientDto, QueryParams } from '../../types';

export interface ClientCommandHistoryItem {
  id: string;
  createdAt: string;
  dateLivraison: string | null;
  status: string;
  adresseLivraison: string;
  PrixVente: number;
  PrixAchat: number;
  products: Array<{
    id: string;
    productName: string;
    PrixVente: number;
    PrixAchat?: number | null;
    isDepot: boolean;
  }>;
}

export const clientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientsFeed: pagedFeed<Client, Record<string, unknown>>(builder, '/clients', 'Client'),
    getClients: builder.query<PaginatedResponse<Client>, QueryParams>({
      query: (params) => ({
        url: '/clients',
        params,
      }),
      providesTags: ['Client'],
    }),
    getClient: builder.query<Client, string>({
      query: (id) => `/clients/${id}`,
      providesTags: (result, error, id) => [{ type: 'Client', id }],
    }),
    getClientCommandHistory: builder.query<ClientCommandHistoryItem[], string>({
      query: (id) => `/clients/${id}/commands`,
      providesTags: (result, error, id) => [{ type: 'Client', id }],
    }),
    createClient: builder.mutation<Client, CreateClientDto>({
      query: (data) => ({
        url: '/clients',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Client'],
    }),
    deleteClient: builder.mutation<void, string>({
      query: (id) => ({
        url: `/clients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Client'],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientsFeedInfiniteQuery,
  useGetClientQuery,
  useGetClientCommandHistoryQuery,
  useCreateClientMutation,
  useDeleteClientMutation,
} = clientApi;
