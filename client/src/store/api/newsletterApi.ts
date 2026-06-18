import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';

export interface NewsletterContact {
  id: string;
  email: string;
  source: 'newsletter' | 'compte';
  createdAt: string;
}

export const newsletterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNewsletterContacts: builder.query<
      PaginatedResponse<NewsletterContact>,
      { page?: number; limit?: number; search?: string }
    >({
      query: ({ page = 1, limit = 10, search }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        return `/newsletter/contacts?${params.toString()}`;
      },
      providesTags: ['Newsletter'],
    }),
  }),
});

export const { useGetNewsletterContactsQuery } = newsletterApi;
