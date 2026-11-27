import { useState } from 'react';
import { Save } from 'lucide-react';
import { useUpdateCoClientMutation } from '../../store/api/coClientApi';
import type { DeposantOverview } from '../../store/api/depotApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { BottomSheet, Button, PhoneField, TextField } from '../../components/ui';
import { GenderPicker } from '../../components/PersonIllustration';

/** Edit a déposant: name, Femme/Homme illustration, phone, email, address, RIB. */
export default function DeposantEditSheet({ d, open, onClose }: { d: DeposantOverview; open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [update, { isLoading }] = useUpdateCoClientMutation();
  const [form, setForm] = useState({
    firstName: d.firstName,
    lastName: d.lastName,
    gender: (d.gender ?? undefined) as 'F' | 'M' | undefined,
    phone: d.phone,
    email: d.email ?? '',
    address: d.address ?? '',
    rib: d.rib ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Le prénom est obligatoire.';
    if (!form.lastName.trim()) e.lastName = 'Le nom est obligatoire.';
    if (!/^\d{8}$/.test(form.phone)) e.phone = 'Le téléphone doit contenir 8 chiffres.';
    const rib = form.rib.replace(/\s/g, '');
    if (rib && !/^\d{20}$/.test(rib)) e.rib = 'Le RIB doit contenir 20 chiffres.';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Email invalide.';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await update({
        id: d.id,
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phoneNumber: form.phone,
          email: form.email.trim(),
          address: form.address.trim(),
          RIB: rib || undefined,
          ...(form.gender ? { gender: form.gender } : {}),
        },
      }).unwrap();
      showToast('Déposant mis à jour', 'success');
      onClose();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Modification impossible'), 'error', 6000);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier le déposant">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Prénom" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
          <TextField label="Nom" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
        </div>
        <div>
          <p className="mb-2 text-sm font-extrabold text-bd-ink">Illustration</p>
          <GenderPicker value={form.gender} onChange={(gender) => setForm((f) => ({ ...f, gender }))} />
        </div>
        <PhoneField label="Téléphone" required value={form.phone} onChange={(phone) => setForm((f) => ({ ...f, phone }))} error={errors.phone} />
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <TextField label="Adresse" value={form.address} onChange={set('address')} autoComplete="street-address" />
        <TextField label="RIB" inputMode="numeric" value={form.rib} onChange={set('rib')} error={errors.rib} hint="20 chiffres" />
        <Button type="submit" size="lg" icon={Save} loading={isLoading} className="w-full">
          Enregistrer
        </Button>
      </form>
    </BottomSheet>
  );
}
