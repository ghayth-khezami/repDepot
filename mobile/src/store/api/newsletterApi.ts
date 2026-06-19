import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';
import { clampPageSize } from '../../lib/pagination';

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
      query: ({ page = 1, limit, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(clampPageSize(limit)),
        });
        if (search) params.set('search', search);
        return `/newsletter/contacts?${params.toString()}`;
      },
      providesTags: ['Newsletter'],
    }),
  }),
});

export const { useGetNewsletterContactsQuery } = newsletterApi;
