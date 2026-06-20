import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl } from '../../lib/apiBase';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    'User', 'Client', 'CoClient', 'Category', 'SubCategory', 'SubSubCategory1', 'SubSubCategory2', 'SubSubCategory3', 'Product', 'Command',
    'DepositRequest', 'StoreHours', 'ClientFeedback', 'Mark', 'Newsletter', 'FeaturedProduct',
    'Notification',
  ],
  endpoints: () => ({}),
});
