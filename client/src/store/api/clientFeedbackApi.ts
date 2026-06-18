import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams } from '../../types';

export interface ClientFeedback {
  id: string;
  clientName: string;
  description: string;
  rating: number;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientFeedbackDto {
  clientName: string;
  description: string;
  rating: number;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface UpdateClientFeedbackDto extends Partial<CreateClientFeedbackDto> {}

export const clientFeedbackApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientFeedbacksAdmin: builder.query<PaginatedResponse<ClientFeedback>, QueryParams>({
      query: (params) => ({
        url: '/client-feedbacks/admin',
        params,
      }),
      providesTags: ['ClientFeedback'],
    }),
    createClientFeedback: builder.mutation<ClientFeedback, CreateClientFeedbackDto>({
      query: (body) => ({ url: '/client-feedbacks', method: 'POST', body }),
      invalidatesTags: ['ClientFeedback'],
    }),
    updateClientFeedback: builder.mutation<
      ClientFeedback,
      { id: string; data: UpdateClientFeedbackDto }
    >({
      query: ({ id, data }) => ({ url: `/client-feedbacks/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['ClientFeedback'],
    }),
    deleteClientFeedback: builder.mutation<void, string>({
      query: (id) => ({ url: `/client-feedbacks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ClientFeedback'],
    }),
  }),
});

export const {
  useGetClientFeedbacksAdminQuery,
  useCreateClientFeedbackMutation,
  useUpdateClientFeedbackMutation,
  useDeleteClientFeedbackMutation,
} = clientFeedbackApi;
