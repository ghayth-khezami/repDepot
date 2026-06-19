import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../store/api/userApi';
import { FormModal } from '../components/FormModal';
import { FieldLabel, TextInput, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import type { User } from '../types';

export default function UsersPage() {
  const [edit, setEdit] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [, setRefresh] = useState(0);

  const openEdit = (u: User) => {
    setEdit(u);
    setEmail(u.email);
    setUsername(u.username ?? '');
    setPassword('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    try {
      await updateUser({
        id: edit.id,
        data: {
          email: email.trim(),
          username: username.trim() || undefined,
          password: password.trim() || undefined,
        },
      }).unwrap();
      showToast('Utilisateur modifié', 'success');
      setEdit(null);
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (u: User) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer ${u.email} ?`, destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteUser(u.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <PaginatedListPage<User>
        title="Utilisateurs"
        useQuery={useGetUsersQuery}
        renderItem={(u) => (
          <ListCard>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.username || u.email}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <ItemActions onEdit={() => openEdit(u)} onDelete={() => void remove(u)} />
          </ListCard>
        )}
      />
      {edit ? (
        <FormModal title="Modifier utilisateur" onClose={() => setEdit(null)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Email *"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Nom d'utilisateur"><TextInput value={username} onChange={(e) => setUsername(e.target.value)} /></FieldLabel>
            <FieldLabel label="Nouveau mot de passe"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" /></FieldLabel>
            <PrimaryButton type="submit" loading={isLoading}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}
