import { baseApi } from './baseApi';
import { Category, PaginatedResponse, CreateCategoryDto, UpdateCategoryDto, QueryParams } from '../../types';

function buildCategoryFormData(
  data: CreateCategoryDto | UpdateCategoryDto,
  coverFile?: File | null,
): FormData | CreateCategoryDto | UpdateCategoryDto {
  if (!coverFile) return data;
  const fd = new FormData();
  if ('categoryName' in data && data.categoryName) fd.append('categoryName', data.categoryName);
  if (data.description) fd.append('description', data.description);
  if (data.icon) fd.append('icon', data.icon);
  fd.append('cover', coverFile);
  return fd;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<PaginatedResponse<Category>, QueryParams>({
      query: (params) => ({
        url: '/categories',
        params,
      }),
      providesTags: ['Category'],
    }),
    getCategory: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'Category', id }],
    }),
    createCategory: builder.mutation<
      Category,
      { data: CreateCategoryDto; coverFile?: File | null }
    >({
      query: ({ data, coverFile }) => {
        const body = buildCategoryFormData(data, coverFile);
        return {
          url: '/categories',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<
      Category,
      { id: string; data: UpdateCategoryDto; coverFile?: File | null }
    >({
      query: ({ id, data, coverFile }) => {
        const body = buildCategoryFormData(data, coverFile);
        return {
          url: `/categories/${id}`,
          method: 'PATCH',
          body,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Category', id }, 'Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
