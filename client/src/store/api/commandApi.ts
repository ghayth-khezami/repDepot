import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams } from '../../types';

export interface Command {
  id: string;
  productsNumber: number;
  PrixVente: number;
  PrixAchat: number;
  status: 'NOT_DELIVERED' | 'DELIVERED' | 'GOT_PROFIT';
  dateLivraison?: string;
  adresseLivraison: string;
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
  status?: 'NOT_DELIVERED' | 'DELIVERED' | 'GOT_PROFIT';
  dateLivraison?: string;
  adresseLivraison: string;
}

export interface UpdateCommandDto {
  productsNumber?: number;
  PrixVente?: number;
  PrixAchat?: number;
  status?: 'NOT_DELIVERED' | 'DELIVERED' | 'GOT_PROFIT';
  dateLivraison?: string;
  adresseLivraison?: string;
}

export const commandApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const {
  useGetCommandsQuery,
  useGetCommandQuery,
  useCreateCommandMutation,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
} = commandApi;
