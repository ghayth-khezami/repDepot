import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetClientFeedbacksAdminQuery,
  useCreateClientFeedbackMutation,
  useUpdateClientFeedbackMutation,
  useDeleteClientFeedbackMutation,
  type ClientFeedback,
} from '../store/api/clientFeedbackApi';
import { BottomSheet } from '../components/BottomSheet';
import { FabAdd, FieldLabel, TextInput, TextArea, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

export default function ClientFeedbacksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<ClientFeedback | null>(null);
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState('5');
  const [isPublished, setIsPublished] = useState(true);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [createFeedback, { isLoading: creating }] = useCreateClientFeedbackMutation();
  const [updateFeedback, { isLoading: updating }] = useUpdateClientFeedbackMutation();
  const [deleteFeedback] = useDeleteClientFeedbackMutation();
  const [, setRefresh] = useState(0);

  const openCreate = () => {
    setEdit(null);
    setClientName('');
    setDescription('');
    setRating('5');
    setIsPublished(true);
    setFormOpen(true);
  };

  const openEdit = (f: ClientFeedback) => {
    setEdit(f);
    setClientName(f.clientName);
    setDescription(f.description);
    setRating(String(f.rating));
    setIsPublished(f.isPublished);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      clientName: clientName.trim(),
      description: description.trim(),
      rating: parseInt(rating, 10),
      isPublished,
    };
    try {
      if (edit) {
        await updateFeedback({ id: edit.id, data: body }).unwrap();
        showToast('Avis modifié', 'success');
      } else {
        await createFeedback(body).unwrap();
        showToast('Avis créé', 'success');
      }
      setFormOpen(false);
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (f: ClientFeedback) => {
    const ok = await confirm({ title: 'Supprimer', message: 'Supprimer cet avis ?', destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteFeedback(f.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <PaginatedListPage<ClientFeedback>
        title="Avis clients"
        useQuery={useGetClientFeedbacksAdminQuery}
        renderItem={(f) => (
          <ListCard>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{f.clientName}</p>
                <span className="text-amber-500">{'★'.repeat(f.rating)}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{f.description}</p>
              <p className="mt-1 text-xs text-gray-400">{f.isPublished ? 'Publié' : 'Brouillon'}</p>
            </div>
            <ItemActions onEdit={() => openEdit(f)} onDelete={() => void remove(f)} />
          </ListCard>
        )}
      />
      <FabAdd onClick={openCreate} label="Avis" />
      {formOpen ? (
        <BottomSheet title={edit ? 'Modifier avis' : 'Nouvel avis'} onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Nom client *"><TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description *"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Note (1-5) *">
              <TextInput type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} required />
            </FieldLabel>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Publié sur le site
            </label>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </BottomSheet>
      ) : null}
    </>
  );
}
