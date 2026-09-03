import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';
import { getApiBaseUrl } from '../../lib/apiBase';

async function uploadHeroSlide(
  path: string,
  method: string,
  body: FormData,
): Promise<HeroCarouselSlide> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${getApiBaseUrl()}${path}`, { method, headers, body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface HeroCarouselSlide {
  id: string;
  imageDoc: string;
  imageDocMobile?: string | null;
  imageAlt: string;
  sortOrder: number;
  isPublished: boolean;
  imageOnly: boolean;
  arabicWelcome?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaType?: string | null;
  align?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const heroCarouselApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHeroCarouselSlidesAdmin: builder.query<
      PaginatedResponse<HeroCarouselSlide>,
      { page?: number; limit?: number; search?: string }
    >({
      query: ({ page = 1, limit = 10, search }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        return `/hero-carousel-slides/admin?${params.toString()}`;
      },
      providesTags: ['HeroCarouselSlide'],
    }),
    createHeroCarouselSlide: builder.mutation<HeroCarouselSlide, FormData>({
      queryFn: (body) =>
        uploadHeroSlide('/hero-carousel-slides', 'POST', body)
          .then((data) => ({ data }))
          .catch((e) => ({ error: { status: 'CUSTOM_ERROR', error: String(e) } })),
      invalidatesTags: ['HeroCarouselSlide'],
    }),
    updateHeroCarouselSlide: builder.mutation<HeroCarouselSlide, { id: string; body: FormData }>({
      queryFn: ({ id, body }) =>
        uploadHeroSlide(`/hero-carousel-slides/${id}`, 'PATCH', body)
          .then((data) => ({ data }))
          .catch((e) => ({ error: { status: 'CUSTOM_ERROR', error: String(e) } })),
      invalidatesTags: ['HeroCarouselSlide'],
    }),
    deleteHeroCarouselSlide: builder.mutation<void, string>({
      query: (id) => ({ url: `/hero-carousel-slides/${id}`, method: 'DELETE' }),
      invalidatesTags: ['HeroCarouselSlide'],
    }),
  }),
});

export const {
  useGetHeroCarouselSlidesAdminQuery,
  useCreateHeroCarouselSlideMutation,
  useUpdateHeroCarouselSlideMutation,
  useDeleteHeroCarouselSlideMutation,
} = heroCarouselApi;
