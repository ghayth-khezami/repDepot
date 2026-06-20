import { baseApi } from './baseApi';
import { PaginatedResponse } from '../../types';

export interface SubSubCategory1 {
  id: string;
  title: string;
  description?: string | null;
  subCategoryId: string;
  subCategory?: {
    id: string;
    title: string;
    category?: { id: string; categoryName: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubSubCategory2 {
  id: string;
  title: string;
  description?: string | null;
  subSubCategory1Id: string;
  subSubCategory1?: {
    id: string;
    title: string;
    subCategory?: { id: string; title: string; category?: { id: string; categoryName: string } };
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubSubCategory3 {
  id: string;
  title: string;
  description?: string | null;
  subSubCategory2Id: string;
  subSubCategory2?: {
    id: string;
    title: string;
    subSubCategory1?: {
      id: string;
      title: string;
      subCategory?: { id: string; title: string; category?: { id: string; categoryName: string } };
    };
  };
  createdAt: string;
  updatedAt: string;
}

function buildParams(args: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(args)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  return params.toString();
}

export const subSubCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubSubCategories1: builder.query<
      PaginatedResponse<SubSubCategory1>,
      { page?: number; limit?: number; search?: string; subCategoryId?: string }
    >({
      query: ({ page = 1, limit = 100, search, subCategoryId }) =>
        `/sub-sub-categories-1?${buildParams({ page, limit, search, subCategoryId })}`,
      providesTags: ['SubSubCategory1'],
    }),
    createSubSubCategory1: builder.mutation<
      SubSubCategory1,
      { title: string; description?: string; subCategoryId: string }
    >({
      query: (body) => ({ url: '/sub-sub-categories-1', method: 'POST', body }),
      invalidatesTags: ['SubSubCategory1'],
    }),
    updateSubSubCategory1: builder.mutation<
      SubSubCategory1,
      { id: string; data: { title?: string; description?: string; subCategoryId?: string } }
    >({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-1/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubSubCategory1'],
    }),
    deleteSubSubCategory1: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-1/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubSubCategory1'],
    }),

    getSubSubCategories2: builder.query<
      PaginatedResponse<SubSubCategory2>,
      { page?: number; limit?: number; search?: string; subSubCategory1Id?: string }
    >({
      query: ({ page = 1, limit = 100, search, subSubCategory1Id }) =>
        `/sub-sub-categories-2?${buildParams({ page, limit, search, subSubCategory1Id })}`,
      providesTags: ['SubSubCategory2'],
    }),
    createSubSubCategory2: builder.mutation<
      SubSubCategory2,
      { title: string; description?: string; subSubCategory1Id: string }
    >({
      query: (body) => ({ url: '/sub-sub-categories-2', method: 'POST', body }),
      invalidatesTags: ['SubSubCategory2'],
    }),
    updateSubSubCategory2: builder.mutation<
      SubSubCategory2,
      { id: string; data: { title?: string; description?: string; subSubCategory1Id?: string } }
    >({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-2/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubSubCategory2'],
    }),
    deleteSubSubCategory2: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-2/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubSubCategory2'],
    }),

    getSubSubCategories3: builder.query<
      PaginatedResponse<SubSubCategory3>,
      { page?: number; limit?: number; search?: string; subSubCategory2Id?: string }
    >({
      query: ({ page = 1, limit = 100, search, subSubCategory2Id }) =>
        `/sub-sub-categories-3?${buildParams({ page, limit, search, subSubCategory2Id })}`,
      providesTags: ['SubSubCategory3'],
    }),
    createSubSubCategory3: builder.mutation<
      SubSubCategory3,
      { title: string; description?: string; subSubCategory2Id: string }
    >({
      query: (body) => ({ url: '/sub-sub-categories-3', method: 'POST', body }),
      invalidatesTags: ['SubSubCategory3'],
    }),
    updateSubSubCategory3: builder.mutation<
      SubSubCategory3,
      { id: string; data: { title?: string; description?: string; subSubCategory2Id?: string } }
    >({
      query: ({ id, data }) => ({ url: `/sub-sub-categories-3/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['SubSubCategory3'],
    }),
    deleteSubSubCategory3: builder.mutation<void, string>({
      query: (id) => ({ url: `/sub-sub-categories-3/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubSubCategory3'],
    }),
  }),
});

export const {
  useGetSubSubCategories1Query,
  useCreateSubSubCategory1Mutation,
  useUpdateSubSubCategory1Mutation,
  useDeleteSubSubCategory1Mutation,
  useGetSubSubCategories2Query,
  useCreateSubSubCategory2Mutation,
  useUpdateSubSubCategory2Mutation,
  useDeleteSubSubCategory2Mutation,
  useGetSubSubCategories3Query,
  useCreateSubSubCategory3Mutation,
  useUpdateSubSubCategory3Mutation,
  useDeleteSubSubCategory3Mutation,
} = subSubCategoryApi;
