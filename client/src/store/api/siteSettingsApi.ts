import { baseApi } from './baseApi';

export interface SiteSettings {
  id: string;
  youtubeUrl: string | null;
  shopPhone: string | null;
  shopWhatsapp: string | null;
  shopAddress: string | null;
  shopMapsUrl: string | null;
  /** One condition per line, printed on dépôt contracts. */
  contractTerms: string | null;
  updatedAt: string;
}

export type SiteSettingsPatch = Partial<Omit<SiteSettings, 'id' | 'updatedAt'>>;

/** Same default as server/src/depot/contract-pdf.ts (used until the admin edits the terms). */
export const DEFAULT_CONTRACT_TERMS = [
  'Une commission de {commission} du prix de vente réalisé sera reversée au dépositaire par le déposant.',
  'Les articles ayant dépassé {duree} mois de dépôt seront retournés au déposant et ne seront plus maintenus en dépôt.',
  "Les articles d'une valeur supérieure à 50 TND verront leur prix réduit de 50 % après {dureeReduction} mois de dépôt, et seront retournés au déposant à l'issue de {duree} mois.",
].join('\n');

export const siteSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSiteSettingsAdmin: builder.query<SiteSettings, void>({
      query: () => '/site-settings/admin',
      providesTags: ['SiteSettings'],
    }),
    updateSiteSettings: builder.mutation<SiteSettings, SiteSettingsPatch>({
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
