import { useState } from 'react';
import { Edit, Star, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useConfirmDialog } from '../components/ConfirmDialog';
import ReusableTable, { Column } from '../components/ReusableTable';
import {
  ClientFeedback,
  useCreateClientFeedbackMutation,
  useDeleteClientFeedbackMutation,
  useGetClientFeedbacksAdminQuery,
  useUpdateClientFeedbackMutation,
} from '../store/api/clientFeedbackApi';
import { useToast } from '../context/ToastContext';

const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-4 w-4 ${n <= count ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

const ClientFeedbacksPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetClientFeedbacksAdminQuery({
    page,
    limit,
    search: search || undefined,
  });
  const [createFeedback] = useCreateClientFeedbackMutation();
  const [updateFeedback] = useUpdateClientFeedbackMutation();
  const [deleteFeedback] = useDeleteClientFeedbackMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selected, setSelected] = useState<ClientFeedback | null>(null);
  const [rating, setRating] = useState(5);

  const columns: Column<ClientFeedback>[] = [
    { header: 'Nom', accessor: 'clientName' },
    {
      header: 'Note',
      accessor: 'rating',
      render: (v) => <Stars count={Number(v)} />,
    },
    { header: 'Description', accessor: 'description' },
    { header: 'Ordre', accessor: 'sortOrder' },
    {
      header: 'Publié',
      accessor: 'isPublished',
      render: (v) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            v ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {v ? 'Oui' : 'Non'}
        </span>
      ),
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      clientName: fd.get('clientName') as string,
      description: fd.get('description') as string,
      rating,
      sortOrder: Number(fd.get('sortOrder') || 0),
      isPublished: fd.get('isPublished') === 'on',
    };
    try {
      if (isEditMode && selected) {
        await updateFeedback({ id: selected.id, data: payload }).unwrap();
        showToast('Avis modifié', 'success');
      } else {
        await createFeedback(payload).unwrap();
        showToast('Avis ajouté', 'success');
      }
      setIsModalOpen(false);
      setSelected(null);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div>
      {dialog}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Avis clients</h1>
        <p className="bo-muted mt-2">
          Gérez les témoignages affichés sur la vitrine (note de 1 à 5).
        </p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom ou description..."
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
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
              type="button"
              onClick={() => {
                setIsEditMode(true);
                setSelected(row);
                setRating(row.rating);
                setIsModalOpen(true);
              }}
              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                confirm({
                  title: 'Supprimer l\'avis',
                  message: 'Supprimer cet avis client ?',
                  confirmLabel: 'Supprimer',
                  onConfirm: async () => {
                    await deleteFeedback(row.id).unwrap();
                    showToast('Supprimé', 'success');
                  },
                })
              }
              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        onAdd={() => {
          setIsEditMode(false);
          setSelected(null);
          setRating(5);
          setIsModalOpen(true);
        }}
        addButtonLabel="Ajouter un avis"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
        }}
        title={isEditMode ? 'Modifier l\'avis' : 'Nouvel avis client'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom du client</label>
            <input
              name="clientName"
              defaultValue={selected?.clientName}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              defaultValue={selected?.description}
              rows={4}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Note (1 à 5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    rating === n
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ordre d&apos;affichage</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={selected?.sortOrder ?? 0}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              name="isPublished"
              type="checkbox"
              defaultChecked={selected?.isPublished ?? true}
              className="rounded border-gray-300"
            />
            Publié sur la vitrine
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2"
            >
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientFeedbacksPage;
