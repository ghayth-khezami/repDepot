import { baseApi } from './baseApi';

export interface PaymentRequest {
  id: string;
  amountMillimes: number;
  pickupDate: string;
  status: 'PENDING' | 'DONE' | 'CANCELLED';
  createdAt: string;
  handledAt: string | null;
  coClient: { id: string; number: number; firstName: string; lastName: string; phoneNumber: string; gender: 'F' | 'M' | null };
  products: Array<{ id: string; ref: string; name: string; paid: boolean; depositorMillimes: number }>;
}

export const paymentRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentRequests: builder.query<PaymentRequest[], { status?: 'PENDING' | 'DONE' | 'CANCELLED' } | void>({
      query: (args) => ({ url: '/payment-requests', params: args && args.status ? { status: args.status } : {} }),
      providesTags: ['PaymentRequest'],
    }),
    setPaymentRequestStatus: builder.mutation<{ id: string; status: string; paid: number }, { id: string; status: 'DONE' | 'CANCELLED' }>({
      query: ({ id, status }) => ({ url: `/payment-requests/${id}`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['PaymentRequest', 'Product', 'CoClient'],
    }),
  }),
});

export const { useGetPaymentRequestsQuery, useSetPaymentRequestStatusMutation } = paymentRequestApi;
