import { useState } from 'react';
import { PaginatedListPage } from '../components/PaginatedListPage';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../store/api/categoryApi';
import {
  useGetSubCategoriesQuery,
  useCreateSubCategoryMutation,
  useUpdateSubCategoryMutation,
  useDeleteSubCategoryMutation,
  type SubCategory,
} from '../store/api/subCategoryApi';
import { FormModal } from '../components/FormModal';
import { FileUploadBox } from '../components/FileUploadBox';
import { FieldLabel, TextInput, TextArea, PrimaryButton, ItemActions, ListCard, SelectInput } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { uploadUrl } from '../lib/apiBase';
import type { Category } from '../types';

export default function CategoriesPage() {
  const [tab, setTab] = useState<'categories' | 'subcategories'>('categories');

  return (
    <div className="pb-6">
      <div className="mb-4 px-4 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catégories</h1>
        <p className="mt-1 text-sm text-gray-500">Organisez produits et sous-catégories</p>
        <div className="mt-3 flex gap-2 rounded-xl bg-primary-50 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTab('categories')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              tab === 'categories' ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-900 dark:text-primary-300' : 'text-gray-600'
            }`}
          >
            Catégories
          </button>
          <button
            type="button"
            onClick={() => setTab('subcategories')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              tab === 'subcategories' ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-900 dark:text-primary-300' : 'text-gray-600'
            }`}
          >
            Sous-catégories
          </button>
        </div>
      </div>
      {tab === 'categories' ? <CategoriesTab /> : <SubCategoriesTab />}
    </div>
  );
}

function CategoriesTab() {
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
    if (formOpen) return;
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
        title=""
        hideHeader
        onAdd={openCreate}
        addLabel="Catégorie"
        addDisabled={formOpen}
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
        <FormModal title={edit ? 'Modifier catégorie' : 'Nouvelle catégorie'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Nom *"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <FileUploadBox label="Photo de couverture" files={coverFiles} onChange={setCoverFiles} existingUrls={edit?.coverDoc ? [uploadUrl(edit.coverDoc)] : []} />
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function SubCategoriesTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<SubCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data: categories } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const [createSub, { isLoading: creating }] = useCreateSubCategoryMutation();
  const [updateSub, { isLoading: updating }] = useUpdateSubCategoryMutation();
  const [deleteSub] = useDeleteSubCategoryMutation();
  const [, setRefresh] = useState(0);

  const useFilteredQuery = (args: { page: number; limit: number; search?: string }) => {
    const result = useGetSubCategoriesQuery({
      ...args,
      categoryId: filterCategoryId || undefined,
    });
    return result;
  };

  const openCreate = () => {
    if (formOpen) return;
    setEdit(null);
    setTitle('');
    setDescription('');
    setCategoryId(filterCategoryId);
    setFormOpen(true);
  };

  const openEdit = (s: SubCategory) => {
    setEdit(s);
    setTitle(s.title);
    setDescription(s.description ?? '');
    setCategoryId(s.categoryId);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      showToast('Catégorie requise', 'error');
      return;
    }
    try {
      const data = { title: title.trim(), description: description.trim() || undefined, categoryId };
      if (edit) {
        await updateSub({ id: edit.id, data }).unwrap();
        showToast('Sous-catégorie modifiée', 'success');
      } else {
        await createSub(data).unwrap();
        showToast('Sous-catégorie créée', 'success');
      }
      setFormOpen(false);
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const remove = async (s: SubCategory) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${s.title} » ?`, destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await deleteSub(s.id).unwrap();
      showToast('Supprimé', 'success');
      setRefresh((n) => n + 1);
    } catch {
      showToast('Erreur suppression', 'error');
    }
  };

  return (
    <>
      <div className="mb-3 px-4">
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">Toutes les catégories</option>
          {(categories?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </select>
      </div>
      <PaginatedListPage<SubCategory>
        key={filterCategoryId}
        title=""
        hideHeader
        onAdd={openCreate}
        addLabel="Sous-cat."
        addDisabled={formOpen}
        useQuery={useFilteredQuery}
        renderItem={(s) => (
          <ListCard>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-primary-600">{s.category?.categoryName ?? '—'}</p>
              {s.description ? <p className="text-sm text-gray-500 line-clamp-2">{s.description}</p> : null}
            </div>
            <ItemActions onEdit={() => openEdit(s)} onDelete={() => void remove(s)} />
          </ListCard>
        )}
      />
      {formOpen ? (
        <FormModal title={edit ? 'Modifier sous-catégorie' : 'Nouvelle sous-catégorie'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Catégorie *">
              <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Choisir…</option>
                {(categories?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.categoryName}</option>
                ))}
              </SelectInput>
            </FieldLabel>
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}
