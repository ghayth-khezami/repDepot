import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';
import { getApiBaseUrl } from '../../lib/apiBase';
import { clampPageSize } from '../../lib/pagination';

async function uploadMark(
  path: string,
  method: string,
  body: FormData,
): Promise<Mark> {
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

export interface Mark {
  id: string;
  name: string;
  logoDoc: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export const markApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMarks: builder.query<
      PaginatedResponse<Mark>,
      { page?: number; limit?: number; search?: string }
    >({
      query: ({ page = 1, limit, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(clampPageSize(limit)),
        });
        if (search) params.set('search', search);
        return `/marks?${params.toString()}`;
      },
      providesTags: ['Mark'],
    }),
    getMarksInfinite: builder.query<PaginatedResponse<Mark>, { page?: number; limit?: number; search?: string }>({
      query: ({ page = 1, limit, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(clampPageSize(limit)),
        });
        if (search) params.set('search', search);
        return `/marks?${params.toString()}`;
      },
      providesTags: ['Mark'],
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { page, ...rest } = queryArgs;
        return `${endpointName}-${JSON.stringify(rest)}`;
      },
      merge: (currentCache, newItems) => {
        if (newItems.meta.page === 1) return newItems;
        return { ...newItems, data: [...currentCache.data, ...newItems.data] };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
    }),
    createMark: builder.mutation<Mark, FormData>({
      queryFn: (body) =>
        uploadMark('/marks', 'POST', body)
          .then((data) => ({ data }))
          .catch((e) => ({ error: { status: 'CUSTOM_ERROR', error: String(e) } })),
      invalidatesTags: ['Mark'],
    }),
    updateMark: builder.mutation<Mark, { id: string; body: FormData }>({
      queryFn: ({ id, body }) =>
        uploadMark(`/marks/${id}`, 'PATCH', body)
          .then((data) => ({ data }))
          .catch((e) => ({ error: { status: 'CUSTOM_ERROR', error: String(e) } })),
      invalidatesTags: ['Mark'],
    }),
    deleteMark: builder.mutation<void, string>({
      query: (id) => ({ url: `/marks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Mark'],
    }),
  }),
});

export const {
  useGetMarksQuery,
  useGetMarksInfiniteQuery,
  useCreateMarkMutation,
  useUpdateMarkMutation,
  useDeleteMarkMutation,
} = markApi;
