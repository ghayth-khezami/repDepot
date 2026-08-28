import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';

export interface SubSubCategory {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: string | null | undefined;
}

const query = (url: string, params: Record<string, string | number | undefined>) => ({
  url,
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
});

export const subSubCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubSubCategories1: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; subCategoryId?: string }>({
      query: ({ page = 1, limit = 10, subCategoryId }) => query('/sub-sub-categories-1', { page, limit, subCategoryId }),
      providesTags: ['SubCategory'],
    }),
    getSubSubCategories2: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; subSubCategory1Id?: string }>({
      query: ({ page = 1, limit = 10, subSubCategory1Id }) => query('/sub-sub-categories-2', { page, limit, subSubCategory1Id }),
      providesTags: ['SubCategory'],
    }),
    getSubSubCategories3: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; subSubCategory2Id?: string }>({
      query: ({ page = 1, limit = 10, subSubCategory2Id }) => query('/sub-sub-categories-3', { page, limit, subSubCategory2Id }),
      providesTags: ['SubCategory'],
    }),
  }),
});

export const {
  useGetSubSubCategories1Query,
  useGetSubSubCategories2Query,
  useGetSubSubCategories3Query,
} = subSubCategoryApi;
