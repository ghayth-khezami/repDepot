import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../store/api/categoryApi';
import { BottomSheet } from '../components/BottomSheet';
import { FabAdd, FieldLabel, TextInput, TextArea, PrimaryButton, ItemActions, ListCard } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import type { Category } from '../types';

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
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
    setCoverFile(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEdit(c);
    setName(c.categoryName);
    setDescription(c.description ?? '');
    setCoverFile(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <FabAdd onClick={openCreate} label="Catégorie" />
      {formOpen ? (
        <BottomSheet title={edit ? 'Modifier catégorie' : 'Nouvelle catégorie'} onClose={() => setFormOpen(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Nom *"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <FieldLabel label="Photo de couverture">
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" />
            </FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </BottomSheet>
      ) : null}
    </>
  );
}
