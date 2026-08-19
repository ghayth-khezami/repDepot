import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl } from '../../lib/apiBase';

const baseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Client', 'CoClient', 'Category', 'SubCategory', 'Product', 'Command', 'DepositRequest', 'StoreHours', 'ClientFeedback', 'Mark', 'Newsletter', 'FeaturedProduct', 'HeroCarouselSlide', 'SiteSettings'],
  endpoints: () => ({}),
});
