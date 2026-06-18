import { useState } from 'react';
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation } from '../store/api/userApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import { User, UpdateUserDto } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../components/ConfirmDialog';

const UsersPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data, isLoading } = useGetUsersQuery({ page, limit, search });
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: "Supprimer l'utilisateur",
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await deleteUser(id).unwrap();
        showToast('Utilisateur supprimé avec succès', 'success');
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.currentTarget);
    const data: UpdateUserDto = {
      email: formData.get('email') as string,
      username: (formData.get('username') as string) || undefined,
      password: (formData.get('password') as string) || undefined,
    };

    try {
      await updateUser({ id: selectedUser.id, data });
      showToast('Utilisateur modifié avec succès', 'success');
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const columns: Column<User>[] = [
    { header: 'Email', accessor: 'email' },
    { header: 'Username', accessor: 'username' },
    {
      header: 'Date de création',
      accessor: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Gestion des Utilisateurs</h1>
        <p className="bo-muted mt-2">Gérez tous les utilisateurs du système</p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par email ou username..."
        onSearch={setSearch}
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }
            : undefined
        }
        actions={(row) => (
          <>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        title="Modifier l'utilisateur"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="bo-label mb-1 block text-sm font-medium">Email</label>
            <input type="email" name="email" defaultValue={selectedUser?.email} required className="bo-input w-full" />
          </div>
          <div>
            <label className="bo-label mb-1 block text-sm font-medium">Username</label>
            <input type="text" name="username" defaultValue={selectedUser?.username} className="bo-input w-full" />
          </div>
          <div>
            <label className="bo-label mb-1 block text-sm font-medium">Nouveau mot de passe (optionnel)</label>
            <input type="password" name="password" className="bo-input w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedUser(null);
              }}
              className="bo-btn-secondary px-4 py-2"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
};

export default UsersPage;
