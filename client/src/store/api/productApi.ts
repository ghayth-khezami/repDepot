import { baseApi } from './baseApi';
import { Product, PaginatedResponse, UpdateProductDto, QueryParams } from '../../types';

export interface CreateProductDto {
  productName: string;
  description?: string;
  instagramLink?: string;
  facebookLink?: string;
  tiktokLink?: string;
  PrixVente: number;
  PrixAchat?: number;
  stockQuantity: number;
  isDepot: boolean;
  depotPercentage?: number;
  surcharge?: number;
  coclientId?: string;
  categoryId: string;
  categoryIds?: string[];
  subCategoryId?: string;
  subCategoryIds?: string[];
  subSubCategory1Id?: string;
  subSubCategory1Ids?: string[];
  subSubCategory2Id?: string;
  subSubCategory2Ids?: string[];
  subSubCategory3Id?: string;
  subSubCategory3Ids?: string[];
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedResponse<Product>, QueryParams>({
      query: (params) => {
        const safeLimit = Math.min(Math.max(Number(params?.limit ?? 10), 1), 10);
        return {
        url: '/products/admin/list',
        params: { ...params, limit: safeLimit },
      };
      },
      providesTags: ['Product'],
    }),
    getProductsInfinite: builder.query<PaginatedResponse<Product>, QueryParams>({
      query: (params) => {
        const safeLimit = Math.min(Math.max(Number(params?.limit ?? 10), 1), 10);
        return {
        url: '/products/admin/list',
        params: { ...params, limit: safeLimit },
      };
      },
      providesTags: ['Product'],
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { page, ...rest } = queryArgs;
        return `${endpointName}-${JSON.stringify(rest)}`;
      },
      merge: (currentCache, newItems) => {
        if (newItems.meta.page === 1) {
          return newItems;
        }
        return {
          ...newItems,
          data: [...currentCache.data, ...newItems.data],
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
    }),
    lookupProduct: builder.query<Product, string>({
      query: (code) => `/products/lookup/${encodeURIComponent(code)}`,
      providesTags: (result) => (result ? [{ type: 'Product', id: result.id }] : []),
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}/full`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<Product, CreateProductDto>({
      query: (data) => ({
        url: '/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    /** Backoffice list, infinite scroll (RTK infinite query: every loaded page refetches on invalidation). */
    getProductsFeed: builder.infiniteQuery<PaginatedResponse<Product>, ProductFeedArgs, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/products/admin/list',
        params: Object.fromEntries(Object.entries({ ...queryArg, page: pageParam, limit: 20 }).filter(([, v]) => v !== undefined && v !== '')),
      }),
      providesTags: ['Product'],
    }),
    changeLifecycle: builder.mutation<
      { id: string; from: ProductStage; stage: ProductStage; notification: NotifySummary | null },
      { id: string; to: ProductStage }
    >({
      query: ({ id, to }) => ({ url: `/products/${id}/lifecycle`, method: 'PATCH', body: { to } }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Product', id }, 'Product', 'CoClient'],
    }),
    updateProduct: builder.mutation<Product, { id: string; data: UpdateProductDto }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }, 'Product'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export type ProductStage = 'EN_VENTE' | 'VENDU' | 'PAYE' | 'RETIRE';
export interface ProductFeedArgs {
  search?: string;
  isDepot?: boolean;
  categoryId?: string;
  coclientId?: string;
  depositRequestId?: string;
  stage?: ProductStage;
  sort?: 'price_asc' | 'price_desc';
}
export interface NotifySummary {
  sent: number;
  failed: number;
  skipped: number;
  channels: string[];
  errors: string[];
}

export const {
  useChangeLifecycleMutation,
  useGetProductsFeedInfiniteQuery,
  useGetProductsQuery,
  useGetProductsInfiniteQuery,
  useGetProductQuery,
  useLazyLookupProductQuery,
  useLazyGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
