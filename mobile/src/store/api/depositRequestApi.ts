import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams } from '../../types';

export interface DepositRequestItem {
  id: string;
  productName: string;
  proposedPrice: number;
  commissionPercent?: number | null;
  priceAfterCommission?: number | null;
  photos: string[];
}

export interface DepositRequest {
  id: string;
  fullName: string;
  phoneNumber: string;
  proposedPrice: number;
  message?: string | null;
  photos: string[];
  contractDoc?: string | null;
  coClientId?: string | null;
  status: 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED';
  items?: DepositRequestItem[];
  coClient?: { id: string; firstName: string; lastName: string; phoneNumber?: string };
  createdAt: string;
  updatedAt: string;
}

export type DepositRequestStatus = DepositRequest['status'];

export const depositRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDepositRequests: builder.query<PaginatedResponse<DepositRequest>, QueryParams>({
      query: (params) => ({
        url: '/deposit-requests',
        params,
      }),
      providesTags: ['DepositRequest'],
    }),
    getDepositRequest: builder.query<DepositRequest, string>({
      query: (id) => `/deposit-requests/${id}`,
      providesTags: (result, error, id) => [{ type: 'DepositRequest', id }, 'DepositRequest'],
    }),
    updateDepositRequestStatus: builder.mutation<
      DepositRequest,
      { id: string; status: DepositRequestStatus }
    >({
      query: ({ id, status }) => ({
        url: `/deposit-requests/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['DepositRequest'],
    }),
    createDepositRequestAdmin: builder.mutation<DepositRequest, FormData>({
      query: (body) => ({
        url: '/deposit-requests/admin',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DepositRequest'],
    }),
  }),
});

export const {
  useGetDepositRequestsQuery,
  useGetDepositRequestQuery,
  useUpdateDepositRequestStatusMutation,
  useCreateDepositRequestAdminMutation,
} = depositRequestApi;
