import { baseApi } from './baseApi';
import { CoClient, PaginatedResponse, CreateCoClientDto, QueryParams } from '../../types';

export interface CoClientProductHistoryItem {
  id: string;
  productName: string;
  description?: string | null;
  PrixVente: number;
  PrixAchat?: number | null;
  stockQuantity: number;
  isDepot: boolean;
  depotPercentage?: number | null;
  surcharge?: number | null;
  gain?: number | null;
  isDispo?: boolean | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; categoryName: string } | null;
  photo?: string | null;
}

export const coClientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Déposants list with infinite scroll; meta.counts = { all, with, without }. */
    getCoClientsFeed: builder.infiniteQuery<PaginatedResponse<CoClient>, { search?: string; articles?: 'all' | 'with' | 'without' }, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/co-clients',
        params: Object.fromEntries(Object.entries({ ...queryArg, page: pageParam, limit: 20 }).filter(([, v]) => v !== undefined && v !== '')),
      }),
      providesTags: ['CoClient'],
    }),
    getCoClients: builder.query<PaginatedResponse<CoClient>, QueryParams>({
      query: (params) => ({
        url: '/co-clients',
        params,
      }),
      providesTags: ['CoClient'],
    }),
    getCoClient: builder.query<CoClient, string>({
      query: (id) => `/co-clients/${id}`,
      providesTags: (result, error, id) => [{ type: 'CoClient', id }],
    }),
    getCoClientProductHistory: builder.query<CoClientProductHistoryItem[], string>({
      query: (id) => `/co-clients/${id}/products`,
      providesTags: (result, error, id) => [{ type: 'CoClient', id }],
    }),
    createCoClient: builder.mutation<CoClient, CreateCoClientDto>({
      query: (data) => ({
        url: '/co-clients',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CoClient'],
    }),
    deleteCoClient: builder.mutation<void, string>({
      query: (id) => ({
        url: `/co-clients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CoClient'],
    }),
  }),
});

export const {
  useGetCoClientsFeedInfiniteQuery,
  useGetCoClientsQuery,
  useGetCoClientQuery,
  useGetCoClientProductHistoryQuery,
  useCreateCoClientMutation,
  useDeleteCoClientMutation,
} = coClientApi;
