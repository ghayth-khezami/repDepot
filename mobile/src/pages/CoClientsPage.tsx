import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetCoClientsQuery,
  useCreateCoClientMutation,
  useDeleteCoClientMutation,
} from '../store/api/coClientApi';
import { FormModal } from '../components/FormModal';
import { FieldLabel, TextInput, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import type { CoClient } from '../types';

export default function CoClientsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [fields, setFields] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '', address: '', RIB: '',
  });
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [createCoClient, { isLoading }] = useCreateCoClientMutation();
  const [deleteCoClient] = useDeleteCoClientMutation();
  const [, setRefresh] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCoClient(fields).unwrap();
      showToast('Déposant créé', 'success');
      setFormOpen(false);
      setFields({ firstName: '', lastName: '', email: '', phoneNumber: '', address: '', RIB: '' });
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (c: CoClient) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer ${c.firstName} ${c.lastName} ?`, destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteCoClient(c.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PaginatedListPage<CoClient>
        title="Déposants"
        onAdd={() => setFormOpen(true)}
        addLabel="Déposant"
        useQuery={useGetCoClientsQuery}
        renderItem={(c) => (
          <ListCard>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.firstName} {c.lastName}</p>
              <p className="text-sm text-gray-500">{c.email}</p>
              <p className="text-xs text-gray-400">RIB: {c.RIB}</p>
            </div>
            <ItemActions onDelete={() => void remove(c)} />
          </ListCard>
        )}
      />
      {formOpen ? (
        <FormModal title="Nouveau déposant" onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Prénom *"><TextInput value={fields.firstName} onChange={set('firstName')} required /></FieldLabel>
            <FieldLabel label="Nom *"><TextInput value={fields.lastName} onChange={set('lastName')} required /></FieldLabel>
            <FieldLabel label="Email *"><TextInput type="email" value={fields.email} onChange={set('email')} required /></FieldLabel>
            <FieldLabel label="Téléphone *"><TextInput value={fields.phoneNumber} onChange={set('phoneNumber')} required /></FieldLabel>
            <FieldLabel label="Adresse *"><TextInput value={fields.address} onChange={set('address')} required /></FieldLabel>
            <FieldLabel label="RIB *"><TextInput value={fields.RIB} onChange={set('RIB')} required /></FieldLabel>
            <PrimaryButton type="submit" loading={isLoading}>Créer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}
