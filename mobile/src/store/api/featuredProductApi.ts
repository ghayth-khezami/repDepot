import { baseApi } from './baseApi';
import { Product } from '../../types';

export const featuredProductApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeaturedProductIds: builder.query<string[], void>({
      query: () => '/products/featured/ids',
      providesTags: ['FeaturedProduct'],
    }),
    getFeaturedProducts: builder.query<Product[], void>({
      query: () => '/products/featured',
      providesTags: ['FeaturedProduct'],
    }),
    setFeaturedProducts: builder.mutation<Product[], string[]>({
      query: (productIds) => ({
        url: '/products/featured',
        method: 'PUT',
        body: { productIds },
      }),
      invalidatesTags: ['FeaturedProduct'],
    }),
  }),
});

export const {
  useGetFeaturedProductIdsQuery,
  useGetFeaturedProductsQuery,
  useSetFeaturedProductsMutation,
} = featuredProductApi;
