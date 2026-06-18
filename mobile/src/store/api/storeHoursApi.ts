import { baseApi } from './baseApi';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface StoreHour {
  id: string;
  weekday: Weekday;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface StoreHourInput {
  weekday: Weekday;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

export const storeHoursApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStoreHours: builder.query<StoreHour[], void>({
      query: () => '/store-hours',
      providesTags: ['StoreHours'],
    }),
    updateStoreHours: builder.mutation<StoreHour[], { hours: StoreHourInput[] }>({
      query: (body) => ({
        url: '/store-hours',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['StoreHours'],
    }),
  }),
});

export const { useGetStoreHoursQuery, useUpdateStoreHoursMutation } = storeHoursApi;
