import { baseApi } from './baseApi';
import { CoClient, PaginatedResponse, CreateCoClientDto, QueryParams } from '../../types';

export const coClientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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

export const { useGetCoClientsQuery, useGetCoClientQuery, useCreateCoClientMutation, useDeleteCoClientMutation } = coClientApi;
