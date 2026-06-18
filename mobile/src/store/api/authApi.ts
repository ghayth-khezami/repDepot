import { baseApi } from './baseApi';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    username?: string;
    role?: 'CLIENT' | 'DEPOSER' | 'ADMIN';
  };
}

interface MeResponse {
  user: {
    id: string;
    email: string;
    username?: string;
    role?: 'CLIENT' | 'DEPOSER' | 'ADMIN';
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useLazyGetMeQuery } = authApi;
