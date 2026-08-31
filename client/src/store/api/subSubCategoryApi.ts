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

export interface SubSubCategoryInput {
  title: string;
  description?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
  subSubCategory2Id?: string;
}

const query = (url: string, params: Record<string, string | number | undefined>) => ({
  url,
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
});

export const subSubCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubSubCategories1: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; search?: string; subCategoryId?: string }>({
      query: ({ page = 1, limit = 10, subCategoryId }) => query('/sub-sub-categories-1', { page, limit, subCategoryId }),
      providesTags: ['SubCategory'],
    }),
    getSubSubCategories2: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; search?: string; subSubCategory1Id?: string }>({
      query: ({ page = 1, limit = 10, subSubCategory1Id }) => query('/sub-sub-categories-2', { page, limit, subSubCategory1Id }),
      providesTags: ['SubCategory'],
    }),
    getSubSubCategories3: builder.query<PaginatedResponse<SubSubCategory>, { page?: number; limit?: number; search?: string; subSubCategory2Id?: string }>({
      query: ({ page = 1, limit = 10, subSubCategory2Id }) => query('/sub-sub-categories-3', { page, limit, subSubCategory2Id }),
      providesTags: ['SubCategory'],
    }),
    createSubSubCategory1: builder.mutation<SubSubCategory, SubSubCategoryInput>({
      query: (body) => ({ url: '/sub-sub-categories-1', method: 'POST', body }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    updateSubSubCategory1: builder.mutation<SubSubCategory, { id: string; data: SubSubCategoryInput }>({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-1/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    deleteSubSubCategory1: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-1/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    createSubSubCategory2: builder.mutation<SubSubCategory, SubSubCategoryInput>({
      query: (body) => ({ url: '/sub-sub-categories-2', method: 'POST', body }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    updateSubSubCategory2: builder.mutation<SubSubCategory, { id: string; data: SubSubCategoryInput }>({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-2/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    deleteSubSubCategory2: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-2/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    createSubSubCategory3: builder.mutation<SubSubCategory, SubSubCategoryInput>({
      query: (body) => ({ url: '/sub-sub-categories-3', method: 'POST', body }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    updateSubSubCategory3: builder.mutation<SubSubCategory, { id: string; data: SubSubCategoryInput }>({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-3/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
    deleteSubSubCategory3: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-3/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubCategory', 'Category'],
    }),
  }),
});

export const {
  useGetSubSubCategories1Query,
  useGetSubSubCategories2Query,
  useGetSubSubCategories3Query,
  useCreateSubSubCategory1Mutation,
  useUpdateSubSubCategory1Mutation,
  useDeleteSubSubCategory1Mutation,
  useCreateSubSubCategory2Mutation,
  useUpdateSubSubCategory2Mutation,
  useDeleteSubSubCategory2Mutation,
  useCreateSubSubCategory3Mutation,
  useUpdateSubSubCategory3Mutation,
  useDeleteSubSubCategory3Mutation,
} = subSubCategoryApi;
