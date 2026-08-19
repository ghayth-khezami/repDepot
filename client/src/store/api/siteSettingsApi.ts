import { baseApi } from './baseApi';

export interface SiteSettings {
  id: string;
  youtubeUrl: string | null;
  updatedAt: string;
}

export const siteSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSiteSettingsAdmin: builder.query<SiteSettings, void>({
      query: () => '/site-settings/admin',
      providesTags: ['SiteSettings'],
    }),
    updateSiteSettings: builder.mutation<SiteSettings, { youtubeUrl: string | null }>({
      query: (body) => ({
        url: '/site-settings',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['SiteSettings'],
    }),
  }),
});

export const { useGetSiteSettingsAdminQuery, useUpdateSiteSettingsMutation } = siteSettingsApi;
