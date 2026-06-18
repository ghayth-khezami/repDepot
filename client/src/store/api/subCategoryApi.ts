import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';

export interface SubCategory {
  id: string;
  title: string;
  description?: string | null;
  categoryId: string;
  category?: { id: string; categoryName: string };
  _count?: { products: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubCategoryDto {
  title: string;
  description?: string;
  categoryId: string;
}

export interface UpdateSubCategoryDto {
  title?: string;
  description?: string;
  categoryId?: string;
}

export const subCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubCategories: builder.query<
      PaginatedResponse<SubCategory>,
      { page?: number; limit?: number; search?: string; categoryId?: string }
    >({
      query: ({ page = 1, limit = 10, search, categoryId }) => {
        const safeLimit = Math.min(Math.max(Number(limit ?? 10), 1), 10);
        const params = new URLSearchParams({ page: String(page), limit: String(safeLimit) });
        if (search) params.set('search', search);
        if (categoryId) params.set('categoryId', categoryId);
        return `/sub-categories?${params.toString()}`;
      },
      providesTags: ['SubCategory'],
    }),
    getSubCategory: builder.query<SubCategory, string>({
      query: (id) => `/sub-categories/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'SubCategory', id }],
    }),
    createSubCategory: builder.mutation<SubCategory, CreateSubCategoryDto>({
      query: (body) => ({ url: '/sub-categories', method: 'POST', body }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    updateSubCategory: builder.mutation<SubCategory, { id: string; data: UpdateSubCategoryDto }>({
      query: ({ id, data }) => ({ url: `/sub-categories/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    deleteSubCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
  }),
});

export const {
  useGetSubCategoriesQuery,
  useCreateSubCategoryMutation,
  useUpdateSubCategoryMutation,
  useDeleteSubCategoryMutation,
} = subCategoryApi;
