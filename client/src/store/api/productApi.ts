import { baseApi } from './baseApi';
import { Product, PaginatedResponse, UpdateProductDto, QueryParams } from '../../types';

export interface CreateProductDto {
  productName: string;
  description?: string;
  PrixVente: number;
  PrixAchat?: number;
  stockQuantity: number;
  isDepot: boolean;
  depotPercentage?: number;
  surcharge?: number;
  coclientId?: string;
  categoryId: string;
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedResponse<Product>, QueryParams>({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    getProductsInfinite: builder.query<PaginatedResponse<Product>, QueryParams>({
      query: (params) => ({
        url: '/products',
        params: { ...params, limit: 10 },
      }),
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
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
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

export const {
  useGetProductsQuery,
  useGetProductsInfiniteQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
