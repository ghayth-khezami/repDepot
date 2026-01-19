import { baseApi } from './baseApi';

export interface StatsQueryParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  period?: 'month' | 'year' | 'all';
  limit?: number;
}

export interface KPIs {
  totalProducts: number;
  totalCommands: number;
  totalClients: number;
  totalCoClients: number;
  totalRevenue: number;
  totalPurchaseCost: number;
  totalProfit: number;
  deliveredCommands: number;
  profitCommands: number;
  avgOrderValue: number;
}

export interface ProductByCategory {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface CommandByStatus {
  status: string;
  count: number;
}

export interface MonthlyData {
  month: string;
  revenue?: number;
  profit?: number;
  cost?: number;
}

export interface TopProduct {
  rank?: number;
  productId: string;
  productName: string;
  categoryName: string;
  count: number;
  totalValue?: number;
  PrixVente?: number;
  photo?: string | null;
}

export interface TotalSurcharge {
  totalSurcharge: number;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  buyingRevenue: number;
  depotRevenue: number;
}

export interface MonthlySoldProducts {
  month: string;
  count: number;
}

export interface DepotVsBuying {
  depot: number;
  buying: number;
  total: number;
}

export interface CommandLocation {
  id: string;
  address: string;
  revenue: number;
  date: string;
  client: string;
}

export const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKPIs: builder.query<KPIs, StatsQueryParams>({
      query: (params) => ({
        url: '/stats/kpis',
        params,
      }),
      providesTags: ['Command', 'Product', 'Client', 'CoClient'],
    }),
    getProductsByCategory: builder.query<ProductByCategory[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/products-by-category',
        params,
      }),
      providesTags: ['Product'],
    }),
    getCommandsByStatus: builder.query<CommandByStatus[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/commands-by-status',
        params,
      }),
      providesTags: ['Command'],
    }),
    getMonthlyRevenue: builder.query<MonthlyData[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/monthly-revenue',
        params,
      }),
      providesTags: ['Command'],
    }),
    getMonthlyProfit: builder.query<MonthlyData[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/monthly-profit',
        params,
      }),
      providesTags: ['Command'],
    }),
    getTopProducts: builder.query<TopProduct[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/top-products',
        params: { ...params, limit: params.limit || 10 },
      }),
      providesTags: ['Command', 'Product'],
    }),
    getRevenueBreakdown: builder.query<RevenueBreakdown, StatsQueryParams>({
      query: (params) => ({
        url: '/stats/revenue-breakdown',
        params,
      }),
      providesTags: ['Command'],
    }),
    getMonthlySoldProducts: builder.query<MonthlySoldProducts[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/monthly-sold-products',
        params,
      }),
      providesTags: ['Command'],
    }),
    getDepotVsBuying: builder.query<DepotVsBuying, StatsQueryParams>({
      query: (params) => ({
        url: '/stats/depot-vs-buying',
        params,
      }),
      providesTags: ['Product'],
    }),
    getCommandLocations: builder.query<CommandLocation[], StatsQueryParams>({
      query: (params) => ({
        url: '/stats/command-locations',
        params,
      }),
      providesTags: ['Command'],
    }),
    getTotalSurcharge: builder.query<TotalSurcharge, StatsQueryParams>({
      query: (params) => ({
        url: '/stats/total-surcharge',
        params,
      }),
      providesTags: ['Product'],
    }),
  }),
});

export const {
  useGetKPIsQuery,
  useGetProductsByCategoryQuery,
  useGetCommandsByStatusQuery,
  useGetMonthlyRevenueQuery,
  useGetMonthlyProfitQuery,
  useGetTopProductsQuery,
  useGetRevenueBreakdownQuery,
  useGetMonthlySoldProductsQuery,
  useGetDepotVsBuyingQuery,
  useGetCommandLocationsQuery,
  useGetTotalSurchargeQuery,
} = statsApi;
