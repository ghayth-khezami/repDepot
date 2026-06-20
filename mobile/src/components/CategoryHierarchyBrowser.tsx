import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FolderTree, Plus } from 'lucide-react';
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
} from '../store/api/subCategoryApi';
import {
  useGetSubSubCategories1Query,
  useCreateSubSubCategory1Mutation,
  useUpdateSubSubCategory1Mutation,
  useDeleteSubSubCategory1Mutation,
  useGetSubSubCategories2Query,
  useCreateSubSubCategory2Mutation,
  useUpdateSubSubCategory2Mutation,
  useDeleteSubSubCategory2Mutation,
  useGetSubSubCategories3Query,
  useCreateSubSubCategory3Mutation,
  useUpdateSubSubCategory3Mutation,
  useDeleteSubSubCategory3Mutation,
} from '../store/api/subSubCategoryApi';
import { FormModal } from './FormModal';
import { FileUploadBox } from './FileUploadBox';
import { FieldLabel, TextInput, TextArea, PrimaryButton, ItemActions } from './mobile-forms';
import { useToast } from '../context/ToastContext';
import { useConfirm } from './ConfirmDialog';
import { uploadUrl } from '../lib/apiBase';
import { downloadCategoryHierarchyPdf } from '../lib/download';
import type { Category } from '../types';

type StackItem =
  | { level: 'category'; id: string; label: string }
  | { level: 'subCategory'; id: string; label: string; categoryId: string }
  | { level: 'ss1'; id: string; label: string; subCategoryId: string }
  | { level: 'ss2'; id: string; label: string; subSubCategory1Id: string }
  | { level: 'ss3'; id: string; label: string; subSubCategory2Id: string };

const LEVEL_CHILD_LABEL: Record<StackItem['level'] | 'root', string> = {
  root: 'Sous-catégories',
  category: 'Sous-catégories',
  subCategory: 'Sous-sous-catégories 1',
  ss1: 'Sous-sous-catégories 2',
  ss2: 'Sous-sous-catégories 3',
  ss3: '',
};

export function CategoryHierarchyBrowser() {
  const [stack, setStack] = useState<StackItem[]>([]);
  const [downloading, setDownloading] = useState(false);
  const { showToast } = useToast();
  const current = stack[stack.length - 1] ?? null;

  const popTo = (index: number) => setStack((s) => s.slice(0, index));
  const goBack = () => setStack((s) => s.slice(0, -1));

  const handleDownloadHierarchy = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      showToast('Génération du PDF…', 'success');
      await downloadCategoryHierarchyPdf();
    } catch {
      showToast('Erreur téléchargement PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="mb-4 px-4 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catégories</h1>
        <p className="mt-1 text-sm text-gray-500">Parcourez la hiérarchie en cliquant sur chaque niveau</p>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleDownloadHierarchy()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 py-2.5 text-sm font-semibold text-primary-700 disabled:opacity-60 dark:border-primary-700 dark:text-primary-300"
        >
          <Download size={16} />
          {downloading ? 'Génération…' : 'Télécharger hiérarchie (PDF couleur)'}
        </button>
        {stack.length > 0 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs">
            <button type="button" onClick={() => popTo(0)} className="font-semibold text-primary-600 dark:text-primary-400">
              Racine
            </button>
            {stack.map((item, i) => (
              <span key={`${item.level}-${item.id}`} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-gray-400" />
                <button
                  type="button"
                  onClick={() => popTo(i + 1)}
                  className={`max-w-[8rem] truncate font-semibold ${
                    i === stack.length - 1 ? 'text-gray-900 dark:text-white' : 'text-primary-600 dark:text-primary-400'
                  }`}
                >
                  {item.label}
                </button>
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      {!current ? (
        <CategoryRootLevel onOpen={(item) => setStack([item])} />
      ) : current.level === 'category' ? (
        <SubCategoryLevel
          categoryId={current.id}
          categoryLabel={current.label}
          onBack={goBack}
          onOpen={(item) => setStack((s) => [...s, item])}
        />
      ) : current.level === 'subCategory' ? (
        <Ss1Level parent={current} onBack={goBack} onOpen={(item) => setStack((s) => [...s, item])} />
      ) : current.level === 'ss1' ? (
        <Ss2Level parent={current} onBack={goBack} onOpen={(item) => setStack((s) => [...s, item])} />
      ) : current.level === 'ss2' ? (
        <Ss3Level parent={current} onBack={goBack} onOpen={(item) => setStack((s) => [...s, item])} />
      ) : (
        <Ss3DetailLevel item={current} onBack={goBack} />
      )}
    </div>
  );
}

function BreadcrumbBack({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mx-4 mb-3 flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400"
    >
      <ChevronLeft size={18} />
      Retour — {label}
    </button>
  );
}

function ChildSection({
  title,
  count,
  onAdd,
  addLabel,
  addDisabled,
  loading,
  empty,
  children,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  addDisabled?: boolean;
  loading?: boolean;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title} ({count})
        </h2>
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          className="flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
      ) : count === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 dark:border-slate-700">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

function DrillRow({
  title,
  subtitle,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <div className="flex w-full items-center gap-2 rounded-2xl border border-primary-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{title}</p>
            {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
          </div>
          <ChevronRight className="shrink-0 text-primary-500" size={20} />
        </button>
        <ItemActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}

function CategoryRootLevel({ onOpen }: { onOpen: (item: StackItem) => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useGetCategoriesQuery({ page: 1, limit: 100 });
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const items = data?.data ?? [];

  const openCreate = () => {
    setEdit(null);
    setName('');
    setDescription('');
    setCoverFiles([]);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { categoryName: name.trim(), description: description.trim() || undefined };
      if (edit) await updateCategory({ id: edit.id, data: payload, coverFile: coverFiles[0] ?? null }).unwrap();
      else await createCategory({ data: payload, coverFile: coverFiles[0] ?? null }).unwrap();
      showToast(edit ? 'Catégorie modifiée' : 'Catégorie créée', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <ChildSection
        title="Catégories"
        count={items.length}
        onAdd={openCreate}
        addLabel="Catégorie"
        addDisabled={formOpen}
        loading={isLoading}
        empty="Aucune catégorie — ajoutez la première."
      >
        {items.map((c) => (
          <DrillRow
            key={c.id}
            title={c.categoryName}
            subtitle={c.description ?? 'Voir les sous-catégories'}
            onOpen={() => onOpen({ level: 'category', id: c.id, label: c.categoryName })}
            onEdit={() => { setEdit(c); setName(c.categoryName); setDescription(c.description ?? ''); setCoverFiles([]); setFormOpen(true); }}
            onDelete={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${c.categoryName} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await deleteCategory(c.id).unwrap(); showToast('Supprimé', 'success'); } catch { showToast('Erreur', 'error'); }
            })()}
          />
        ))}
      </ChildSection>
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

function SubCategoryLevel({
  categoryId,
  categoryLabel,
  onBack,
  onOpen,
}: {
  categoryId: string;
  categoryLabel: string;
  onBack: () => void;
  onOpen: (item: StackItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useGetSubCategoriesQuery({ page: 1, limit: 100, categoryId });
  const [createSub, { isLoading: creating }] = useCreateSubCategoryMutation();
  const [updateSub, { isLoading: updating }] = useUpdateSubCategoryMutation();
  const [deleteSub] = useDeleteSubCategoryMutation();
  const items = data?.data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, categoryId };
      if (editId) await updateSub({ id: editId, data: payload }).unwrap();
      else await createSub(payload).unwrap();
      showToast(editId ? 'Modifié' : 'Créé', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <BreadcrumbBack label={categoryLabel} onBack={onBack} />
      <div className="mx-4 mb-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <FolderTree className="text-primary-600" size={20} />
          <div>
            <p className="text-xs font-semibold uppercase text-primary-600">Catégorie</p>
            <p className="text-lg font-bold">{categoryLabel}</p>
          </div>
        </div>
      </div>
      <ChildSection
        title={LEVEL_CHILD_LABEL.category}
        count={items.length}
        onAdd={() => { setEditId(null); setTitle(''); setDescription(''); setFormOpen(true); }}
        addLabel="Sous-cat."
        addDisabled={formOpen}
        loading={isLoading}
        empty="Aucune sous-catégorie — ajoutez-en une."
      >
        {items.map((s) => (
          <DrillRow
            key={s.id}
            title={s.title}
            subtitle={s.description ?? 'Voir SS-cat. 1'}
            onOpen={() => onOpen({ level: 'subCategory', id: s.id, label: s.title, categoryId })}
            onEdit={() => { setEditId(s.id); setTitle(s.title); setDescription(s.description ?? ''); setFormOpen(true); }}
            onDelete={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${s.title} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await deleteSub(s.id).unwrap(); showToast('Supprimé', 'success'); } catch { showToast('Erreur', 'error'); }
            })()}
          />
        ))}
      </ChildSection>
      {formOpen ? (
        <FormModal title={editId ? 'Modifier sous-catégorie' : 'Nouvelle sous-catégorie'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function Ss1Level({
  parent,
  onBack,
  onOpen,
}: {
  parent: Extract<StackItem, { level: 'subCategory' }>;
  onBack: () => void;
  onOpen: (item: StackItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useGetSubSubCategories1Query({ page: 1, limit: 100, subCategoryId: parent.id });
  const [create, { isLoading: creating }] = useCreateSubSubCategory1Mutation();
  const [update, { isLoading: updating }] = useUpdateSubSubCategory1Mutation();
  const [remove] = useDeleteSubSubCategory1Mutation();
  const items = data?.data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, subCategoryId: parent.id };
      if (editId) await update({ id: editId, data: payload }).unwrap();
      else await create(payload).unwrap();
      showToast(editId ? 'Modifié' : 'Créé', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <BreadcrumbBack label={parent.label} onBack={onBack} />
      <CurrentNodeCard label="Sous-catégorie" title={parent.label} />
      <ChildSection
        title={LEVEL_CHILD_LABEL.subCategory}
        count={items.length}
        onAdd={() => { setEditId(null); setTitle(''); setDescription(''); setFormOpen(true); }}
        addLabel="SS-cat. 1"
        addDisabled={formOpen}
        loading={isLoading}
        empty="Aucune SS-cat. 1 — ajoutez-en une."
      >
        {items.map((row) => (
          <DrillRow
            key={row.id}
            title={row.title}
            subtitle={row.description ?? 'Voir SS-cat. 2'}
            onOpen={() => onOpen({ level: 'ss1', id: row.id, label: row.title, subCategoryId: parent.id })}
            onEdit={() => { setEditId(row.id); setTitle(row.title); setDescription(row.description ?? ''); setFormOpen(true); }}
            onDelete={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${row.title} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await remove(row.id).unwrap(); showToast('Supprimé', 'success'); } catch { showToast('Erreur', 'error'); }
            })()}
          />
        ))}
      </ChildSection>
      {formOpen ? (
        <FormModal title={editId ? 'Modifier SS-cat. 1' : 'Nouvelle SS-cat. 1'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function Ss2Level({
  parent,
  onBack,
  onOpen,
}: {
  parent: Extract<StackItem, { level: 'ss1' }>;
  onBack: () => void;
  onOpen: (item: StackItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useGetSubSubCategories2Query({ page: 1, limit: 100, subSubCategory1Id: parent.id });
  const [create, { isLoading: creating }] = useCreateSubSubCategory2Mutation();
  const [update, { isLoading: updating }] = useUpdateSubSubCategory2Mutation();
  const [remove] = useDeleteSubSubCategory2Mutation();
  const items = data?.data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, subSubCategory1Id: parent.id };
      if (editId) await update({ id: editId, data: payload }).unwrap();
      else await create(payload).unwrap();
      showToast(editId ? 'Modifié' : 'Créé', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <BreadcrumbBack label={parent.label} onBack={onBack} />
      <CurrentNodeCard label="SS-catégorie 1" title={parent.label} />
      <ChildSection
        title={LEVEL_CHILD_LABEL.ss1}
        count={items.length}
        onAdd={() => { setEditId(null); setTitle(''); setDescription(''); setFormOpen(true); }}
        addLabel="SS-cat. 2"
        addDisabled={formOpen}
        loading={isLoading}
        empty="Aucune SS-cat. 2 — ajoutez-en une."
      >
        {items.map((row) => (
          <DrillRow
            key={row.id}
            title={row.title}
            subtitle={row.description ?? 'Voir SS-cat. 3'}
            onOpen={() => onOpen({ level: 'ss2', id: row.id, label: row.title, subSubCategory1Id: parent.id })}
            onEdit={() => { setEditId(row.id); setTitle(row.title); setDescription(row.description ?? ''); setFormOpen(true); }}
            onDelete={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${row.title} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await remove(row.id).unwrap(); showToast('Supprimé', 'success'); } catch { showToast('Erreur', 'error'); }
            })()}
          />
        ))}
      </ChildSection>
      {formOpen ? (
        <FormModal title={editId ? 'Modifier SS-cat. 2' : 'Nouvelle SS-cat. 2'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function Ss3Level({
  parent,
  onBack,
  onOpen,
}: {
  parent: Extract<StackItem, { level: 'ss2' }>;
  onBack: () => void;
  onOpen: (item: StackItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useGetSubSubCategories3Query({ page: 1, limit: 100, subSubCategory2Id: parent.id });
  const [create, { isLoading: creating }] = useCreateSubSubCategory3Mutation();
  const [update, { isLoading: updating }] = useUpdateSubSubCategory3Mutation();
  const [remove] = useDeleteSubSubCategory3Mutation();
  const items = data?.data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, subSubCategory2Id: parent.id };
      if (editId) await update({ id: editId, data: payload }).unwrap();
      else await create(payload).unwrap();
      showToast(editId ? 'Modifié' : 'Créé', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <BreadcrumbBack label={parent.label} onBack={onBack} />
      <CurrentNodeCard label="SS-catégorie 2" title={parent.label} />
      <ChildSection
        title={LEVEL_CHILD_LABEL.ss2}
        count={items.length}
        onAdd={() => { setEditId(null); setTitle(''); setDescription(''); setFormOpen(true); }}
        addLabel="SS-cat. 3"
        addDisabled={formOpen}
        loading={isLoading}
        empty="Aucune SS-cat. 3 — ajoutez-en une."
      >
        {items.map((row) => (
          <DrillRow
            key={row.id}
            title={row.title}
            subtitle={row.description ?? 'Niveau final'}
            onOpen={() => onOpen({ level: 'ss3', id: row.id, label: row.title, subSubCategory2Id: parent.id })}
            onEdit={() => { setEditId(row.id); setTitle(row.title); setDescription(row.description ?? ''); setFormOpen(true); }}
            onDelete={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${row.title} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await remove(row.id).unwrap(); showToast('Supprimé', 'success'); } catch { showToast('Erreur', 'error'); }
            })()}
          />
        ))}
      </ChildSection>
      {formOpen ? (
        <FormModal title={editId ? 'Modifier SS-cat. 3' : 'Nouvelle SS-cat. 3'} onClose={() => setFormOpen(false)} busy={creating || updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={creating || updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function Ss3DetailLevel({ item, onBack }: { item: Extract<StackItem, { level: 'ss3' }>; onBack: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState(item.label);
  const [description, setDescription] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { data } = useGetSubSubCategories3Query({ page: 1, limit: 100, subSubCategory2Id: item.subSubCategory2Id });
  const row = useMemo(() => data?.data.find((r) => r.id === item.id), [data, item.id]);
  const [update, { isLoading: updating }] = useUpdateSubSubCategory3Mutation();
  const [remove] = useDeleteSubSubCategory3Mutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update({
        id: item.id,
        data: { title: title.trim(), description: description.trim() || undefined, subSubCategory2Id: item.subSubCategory2Id },
      }).unwrap();
      showToast('Modifié', 'success');
      setFormOpen(false);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <>
      <BreadcrumbBack label={item.label} onBack={onBack} />
      <CurrentNodeCard label="SS-catégorie 3 (niveau final)" title={row?.title ?? item.label} subtitle={row?.description ?? undefined} />
      <div className="px-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setTitle(row?.title ?? item.label); setDescription(row?.description ?? ''); setFormOpen(true); }} className="flex-1 rounded-xl border border-primary-200 py-3 text-sm font-semibold text-primary-700 dark:border-slate-600">
            Modifier
          </button>
          <button
            type="button"
            onClick={() => void (async () => {
              const ok = await confirm({ title: 'Supprimer', message: `Supprimer « ${item.label} » ?`, destructive: true, confirmLabel: 'Supprimer' });
              if (!ok) return;
              try { await remove(item.id).unwrap(); showToast('Supprimé', 'success'); onBack(); } catch { showToast('Erreur', 'error'); }
            })()}
            className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 dark:border-red-900"
          >
            Supprimer
          </button>
        </div>
      </div>
      {formOpen ? (
        <FormModal title="Modifier SS-cat. 3" onClose={() => setFormOpen(false)} busy={updating}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FieldLabel label="Titre *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></FieldLabel>
            <FieldLabel label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></FieldLabel>
            <PrimaryButton type="submit" loading={updating}>Enregistrer</PrimaryButton>
          </form>
        </FormModal>
      ) : null}
    </>
  );
}

function CurrentNodeCard({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase text-primary-600">{label}</p>
      <p className="text-lg font-bold">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
  );
}
