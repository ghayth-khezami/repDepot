import { baseApi } from './baseApi';

export interface ProductPhoto {
  id: string;
  photoDoc: string;
  idProduct: string;
  createdAt: string;
  updatedAt: string;
}

export const productPhotoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductPhotos: builder.query<ProductPhoto[], string>({
      query: (productId) => `/product-photos/product/${productId}`,
      providesTags: (result, error, productId) => [{ type: 'Product', id: productId }],
    }),
    addProductPhotos: builder.mutation<void, { productId: string; photoDocs: string[] }>({
      query: (data) => ({
        url: '/product-photos',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),
    deleteProductPhoto: builder.mutation<void, string>({
      query: (id) => ({
        url: `/product-photos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const { useGetProductPhotosQuery, useAddProductPhotosMutation, useDeleteProductPhotoMutation } = productPhotoApi;
