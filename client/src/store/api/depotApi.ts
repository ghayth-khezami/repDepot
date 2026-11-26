import { baseApi } from './baseApi';
import type { PayoutStatusValue, ProductStatusValue } from '../../components/ui';

export interface DeposantSummary {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  phone: string;
  productsCount: number;
  contractsCount: number;
}

export interface NewDeposantInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  lat?: number;
  lng?: number;
  rib?: string;
}

export interface DepotItemInput {
  name: string;
  price: number;
  commissionPercent: number;
  categoryId: string;
  photos?: string[];
}

export interface CreateDepotInput {
  deposantId?: string;
  deposant?: NewDeposantInput;
  durationMonths: 1 | 3 | 6;
  internalNote?: string;
  items: DepotItemInput[];
}

export interface ContractItem {
  id: string;
  ref: string;
  name: string;
  photo: string | null;
  category: { id: string; categoryName: string } | null;
  commissionPercent: number;
  priceMillimes: number;
  shopMillimes: number;
  depositorMillimes: number;
  status: ProductStatusValue;
  soldAt: string | null;
  payoutStatus: PayoutStatusValue | null;
}

export interface DepotContract {
  id: string;
  contractNumber: string;
  trackingToken: string;
  trackingUrl: string;
  durationMonths: number;
  createdAt: string;
  expiresAt: string;
  signedAt: string | null;
  internalNote: string | null;
  status: string;
  deposant: {
    id: string;
    number: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address: string | null;
    rib: string | null;
  };
  items: ContractItem[];
  legacyItems: Array<{ id: string; name: string; priceMillimes: number }>;
  totals: { priceMillimes: number; shopMillimes: number; depositorMillimes: number };
}

export type PhoneCheck =
  | { exists: false }
  | { exists: true; deposant: { id: string; number: number; firstName: string; lastName: string } };

export interface DeposantOverview {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  rib: string | null;
  createdAt: string;
  contracts: Array<{ id: string; contractNumber: string | null; createdAt: string; durationMonths: number | null; signedAt: string | null; status: string; hasTracking: boolean }>;
  products: Array<{
    id: string;
    ref: string;
    name: string;
    category: string | null;
    priceMillimes: number;
    depositorMillimes: number;
    status: 'EN_VENTE' | 'VENDU' | 'RETIRE';
    payoutStatus: 'A_PERCEVOIR' | 'PAYE' | null;
    stage: 'EN_VENTE' | 'VENDU' | 'PAYE' | 'RETIRE';
    paidAt: string | null;
    soldAt: string | null;
    createdAt: string;
    contractId: string | null;
    photo: string | null;
  }>;
  totals: { total: number; onSale: number; sold: number; removed: number; paid: number; toPayMillimes: number; paidMillimes: number; stockValueMillimes: number };
}

export const depotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLatestDepot: builder.query<{ id: string; contractNumber: string | null; createdAt: string; deposant: string | null; items: number } | null, void>({
      query: () => '/depots/latest',
      providesTags: ['DepositRequest'],
    }),
    getDeposantOverview: builder.query<DeposantOverview, string>({
      query: (id) => `/deposants/${id}/overview`,
      providesTags: ['CoClient', 'Product'],
    }),
    getDeposantByToken: builder.query<DeposantOverview, string>({
      query: (token) => `/deposants/by-token/${encodeURIComponent(token)}`,
      providesTags: ['CoClient', 'Product'],
    }),
    searchDeposants: builder.query<DeposantSummary[], string>({
      query: (q) => ({ url: '/deposants/search', params: q ? { q } : {} }),
      providesTags: ['CoClient'],
    }),
    checkDeposantPhone: builder.query<PhoneCheck, string>({
      query: (phone) => `/deposants/by-phone/${phone}`,
    }),
    createDepot: builder.mutation<DepotContract, CreateDepotInput>({
      query: (body) => ({ url: '/depots', method: 'POST', body }),
      invalidatesTags: ['DepositRequest', 'Product', 'CoClient'],
    }),
    getDepot: builder.query<DepotContract, string>({
      query: (id) => `/depots/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'DepositRequest', id }],
    }),
    addDepotItems: builder.mutation<DepotContract, { id: string; items: DepotItemInput[] }>({
      query: ({ id, items }) => ({ url: `/depots/${id}/items`, method: 'POST', body: { items } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'DepositRequest', id }, 'DepositRequest', 'Product'],
    }),
    markDepotSigned: builder.mutation<DepotContract, string>({
      query: (id) => ({ url: `/depots/${id}/signed`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'DepositRequest', id }, 'DepositRequest'],
    }),
    uploadMedia: builder.mutation<{ url: string }, File>({
      query: (file) => {
        const body = new FormData();
        body.append('file', file);
        return { url: '/media/upload', method: 'POST', body };
      },
    }),
  }),
});

export const {
  useSearchDeposantsQuery,
  useLazySearchDeposantsQuery,
  useGetDeposantOverviewQuery,
  useGetLatestDepotQuery,
  useLazyGetDeposantByTokenQuery,
  useGetDeposantByTokenQuery,
  useLazyCheckDeposantPhoneQuery,
  useCreateDepotMutation,
  useGetDepotQuery,
  useAddDepotItemsMutation,
  useMarkDepotSignedMutation,
  useUploadMediaMutation,
} = depotApi;
