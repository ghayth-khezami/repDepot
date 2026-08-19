import { FormEvent, useEffect, useState } from 'react';
import { useGetSiteSettingsAdminQuery, useUpdateSiteSettingsMutation } from '../store/api/siteSettingsApi';
import { useToast } from '../context/ToastContext';

const SiteSettingsPage = () => {
  const { data, isLoading } = useGetSiteSettingsAdminQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSiteSettingsMutation();
  const { showToast } = useToast();
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    if (data) setYoutubeUrl(data.youtubeUrl ?? '');
  }, [data]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ youtubeUrl: youtubeUrl.trim() || null }).unwrap();
      showToast('Paramètres enregistrés', 'success');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Lien YouTube</h1>
        <p className="bo-muted mt-2">
          Vidéo affichée sous les avis clients sur l&apos;accueil et en tête de la page Magasin.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">URL YouTube</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            <p className="mt-2 text-xs text-gray-500">
              Formats acceptés : youtube.com/watch, youtu.be, youtube.com/shorts
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-white disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </div>
  );
};

export default SiteSettingsPage;
