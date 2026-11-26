import { FormEvent, useEffect, useState } from 'react';
import { FileText, MapPin, MessageCircle, Phone, Save, Store, Youtube } from 'lucide-react';
import {
  DEFAULT_CONTRACT_TERMS,
  useGetSiteSettingsAdminQuery,
  useUpdateSiteSettingsMutation,
  type SiteSettingsPatch,
} from '../store/api/siteSettingsApi';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../lib/apiError';
import { Button, Card, CardTitle, Field, Skeleton, TextField } from '../components/ui';

type Form = Required<{ [K in keyof SiteSettingsPatch]: string }>;

const empty: Form = { youtubeUrl: '', shopPhone: '', shopWhatsapp: '', shopAddress: '', shopMapsUrl: '', contractTerms: '' };

const SiteSettingsPage = () => {
  const { data, isLoading } = useGetSiteSettingsAdminQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSiteSettingsMutation();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (!data) return;
    setForm({
      youtubeUrl: data.youtubeUrl ?? '',
      shopPhone: data.shopPhone ?? '',
      shopWhatsapp: data.shopWhatsapp ?? '',
      shopAddress: data.shopAddress ?? '',
      shopMapsUrl: data.shopMapsUrl ?? '',
      contractTerms: data.contractTerms ?? '',
    });
  }, [data]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const patch = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])) as SiteSettingsPatch;
    try {
      await updateSettings(patch).unwrap();
      showToast('Paramètres enregistrés', 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Erreur'), 'error', 6000);
    }
  };

  return (
    <div className="bd-ui mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-bd-ink">Boutique & YouTube</h1>
        <p className="mt-1 text-bd-muted">Coordonnées affichées sur la page de suivi des déposants et sur les contrats.</p>
      </header>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Card className="p-5 sm:p-6">
            <CardTitle icon={Store} title="Contact boutique" subtitle="Laisser vide pour utiliser les valeurs par défaut (55 863 578, Manouba)." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Téléphone" icon={Phone} inputMode="tel" value={form.shopPhone} onChange={set('shopPhone')} placeholder="55 863 578" />
              <TextField label="WhatsApp" icon={MessageCircle} inputMode="tel" value={form.shopWhatsapp} onChange={set('shopWhatsapp')} placeholder="Même numéro si vide" />
              <TextField label="Adresse" icon={MapPin} value={form.shopAddress} onChange={set('shopAddress')} placeholder="Route Campus universitaire, Manouba" fieldClassName="sm:col-span-2" />
              <TextField
                label="Lien Google Maps (itinéraire)"
                icon={MapPin}
                type="url"
                value={form.shopMapsUrl}
                onChange={set('shopMapsUrl')}
                placeholder="https://maps.app.goo.gl/…"
                fieldClassName="sm:col-span-2"
              />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardTitle icon={FileText} tone="violet" title="Termes du contrat" subtitle="Une condition par ligne. Imprimées sur chaque contrat de dépôt-vente." />
            <Field label="Conditions" htmlFor="contract-terms" hint="Vide = conditions par défaut (25 %, 3 mois, −50 % après 2 mois au-delà de 50 TND).">
              <textarea
                id="contract-terms"
                rows={6}
                value={form.contractTerms}
                onChange={set('contractTerms')}
                placeholder={DEFAULT_CONTRACT_TERMS}
                className="bd-input resize-y py-3 leading-relaxed"
              />
            </Field>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardTitle icon={Youtube} tone="rose" title="Vidéo YouTube" subtitle="Affichée sous les avis clients et en tête de la page Magasin." />
            <TextField
              label="URL YouTube"
              type="url"
              value={form.youtubeUrl}
              onChange={set('youtubeUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
              hint="Formats acceptés : youtube.com/watch, youtu.be, youtube.com/shorts"
            />
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" icon={Save} loading={saving} className="w-full sm:w-auto">
              Enregistrer
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SiteSettingsPage;
