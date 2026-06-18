import { baseApi } from './baseApi';
import { User, PaginatedResponse, CreateUserDto, UpdateUserDto, QueryParams } from '../../types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedResponse<User>, QueryParams>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['User'],
    }),
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<User, { id: string; data: UpdateUserDto }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetUsersQuery, useGetUserQuery, useUpdateUserMutation, useDeleteUserMutation } = userApi;
