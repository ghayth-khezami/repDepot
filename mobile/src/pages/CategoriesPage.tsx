import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../store/api/categoryApi';
import { FormModal } from '../components/FormModal';
import { FileUploadBox } from '../components/FileUploadBox';
import { FieldLabel, TextInput, TextArea, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { uploadUrl } from '../lib/apiBase';
import type { Category } from '../types';

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [, setRefresh] = useState(0);

  const openCreate = () => {
    setEdit(null);
    setName('');
    setDescription('');
    setCoverFiles([]);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEdit(c);
    setName(c.categoryName);
    setDescription(c.description ?? '');
    setCoverFiles([]);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coverFile = coverFiles[0] ?? null;
    try {
      const data = { categoryName: name.trim(), description: description.trim() || undefined };
      if (edit) {
        await updateCategory({ id: edit.id, data, coverFile }).unwrap();
        showToast('Catégorie modifiée', 'success');
      } else {
        await createCategory({ data, coverFile }).unwrap();
        showToast('Catégorie créée', 'success');
      }
      setFormOpen(false);
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (c: Category) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${c.categoryName} » ?`, destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteCategory(c.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur suppression', 'error');
    }
  };

  return (
    <>
      <PaginatedListPage<Category>
        title="Catégories"
        onAdd={openCreate}
        addLabel="Catégorie"
        useQuery={useGetCategoriesQuery}
        renderItem={(c) => (
          <ListCard>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.categoryName}</p>
              {c.description ? <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p> : null}
            </div>
            <ItemActions onEdit={() => openEdit(c)} onDelete={() => void remove(c)} />
          </ListCard>
        )}
      />
      {formOpen ? (
        <FormModal title={edit ? 'Modifier catégorie' : 'Nouvelle catégorie'} onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Nom *"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <FileUploadBox
              label="Photo de couverture"
              files={coverFiles}
              onChange={setCoverFiles}
              existingUrls={edit?.coverDoc ? [uploadUrl(edit.coverDoc)] : []}
            />
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}
