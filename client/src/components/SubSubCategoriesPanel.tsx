import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import InfiniteSelect from './InfiniteSelect';
import Modal from './Modal';
import ReusableTable, { Column } from './ReusableTable';
import { useConfirmDialog } from './ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import { useGetSubCategoriesQuery } from '../store/api/subCategoryApi';
import {
  SubSubCategory,
  useCreateSubSubCategory1Mutation,
  useCreateSubSubCategory2Mutation,
  useCreateSubSubCategory3Mutation,
  useDeleteSubSubCategory1Mutation,
  useDeleteSubSubCategory2Mutation,
  useDeleteSubSubCategory3Mutation,
  useGetSubSubCategories1Query,
  useGetSubSubCategories2Query,
  useGetSubSubCategories3Query,
  useUpdateSubSubCategory1Mutation,
  useUpdateSubSubCategory2Mutation,
  useUpdateSubSubCategory3Mutation,
} from '../store/api/subSubCategoryApi';

const PAGE_SIZE = 10;
type Level = 1 | 2 | 3;

export default function SubSubCategoriesPanel() {
  const [level, setLevel] = useState<Level>(1);
  const [parentId, setParentId] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SubSubCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const { data: subCategoriesData } = useGetSubCategoriesQuery({ page: 1, limit: 100, categoryId: level === 1 ? undefined : undefined });
  const { data: data1, isLoading: loading1, isFetching: fetching1 } = useGetSubSubCategories1Query({ page, limit: PAGE_SIZE, search, subCategoryId: level === 1 ? parentId || undefined : undefined });
  const { data: data2, isLoading: loading2, isFetching: fetching2 } = useGetSubSubCategories2Query({ page, limit: PAGE_SIZE, search, subSubCategory1Id: level === 2 ? parentId || undefined : undefined });
  const { data: data3, isLoading: loading3, isFetching: fetching3 } = useGetSubSubCategories3Query({ page, limit: PAGE_SIZE, search, subSubCategory2Id: level === 3 ? parentId || undefined : undefined });
  const [create1] = useCreateSubSubCategory1Mutation();
  const [update1] = useUpdateSubSubCategory1Mutation();
  const [delete1] = useDeleteSubSubCategory1Mutation();
  const [create2] = useCreateSubSubCategory2Mutation();
  const [update2] = useUpdateSubSubCategory2Mutation();
  const [delete2] = useDeleteSubSubCategory2Mutation();
  const [create3] = useCreateSubSubCategory3Mutation();
  const [update3] = useUpdateSubSubCategory3Mutation();
  const [delete3] = useDeleteSubSubCategory3Mutation();

  useEffect(() => { setPage(1); setParentId(''); }, [level]);
  const result = level === 1 ? data1 : level === 2 ? data2 : data3;
  const rows = result?.data ?? [];
  const loading = level === 1 ? loading1 : level === 2 ? loading2 : loading3;
  const fetching = level === 1 ? fetching1 : level === 2 ? fetching2 : fetching3;
  const parents = (level === 1 ? (subCategoriesData?.data ?? []) : level === 2 ? (data1?.data ?? []) : (data2?.data ?? [])) as Array<{ id: string; title: string }>;
  const parentLabel = level === 1 ? 'Sous-catégorie' : `Sous-sous-catégorie niveau ${level - 1}`;
  const columns: Column<SubSubCategory>[] = [
    { header: 'Titre', accessor: 'title' },
    { header: 'Description', accessor: 'description' },
    { header: 'Produits', accessor: '_count', render: (_v, row) => (row as SubSubCategory & { _count?: { products: number } })._count?.products ?? 0 },
  ];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parentId) return showToast(`Sélectionnez un parent (${parentLabel})`, 'error');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const input = { title: String(form.get('title') || ''), description: String(form.get('description') || '') || undefined, ...(level === 1 ? { subCategoryId: parentId } : level === 2 ? { subSubCategory1Id: parentId } : { subSubCategory2Id: parentId }) };
    try {
      if (level === 1) selected ? await update1({ id: selected.id, data: input }).unwrap() : await create1(input).unwrap();
      if (level === 2) selected ? await update2({ id: selected.id, data: input }).unwrap() : await create2(input).unwrap();
      if (level === 3) selected ? await update3({ id: selected.id, data: input }).unwrap() : await create3(input).unwrap();
      showToast(selected ? 'Sous-sous-catégorie modifiée' : 'Sous-sous-catégorie créée', 'success');
      setModalOpen(false); setSelected(null); setPage(1);
    } catch { showToast('Erreur lors de l’opération', 'error'); } finally { setIsSubmitting(false); }
  };

  const remove = (row: SubSubCategory) => confirm({ title: 'Supprimer', message: 'Supprimer cette sous-sous-catégorie ?', confirmLabel: 'Supprimer', onConfirm: async () => {
    if (level === 1) await delete1(row.id).unwrap();
    if (level === 2) await delete2(row.id).unwrap();
    if (level === 3) await delete3(row.id).unwrap();
    setPage(1); showToast('Sous-sous-catégorie supprimée', 'success');
  }});

  return <>
    {dialog}
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div><label className="mb-1 block text-xs font-medium text-gray-600">Niveau</label><select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)} className="rounded-lg border border-gray-300 px-3 py-2"><option value="1">Niveau 1</option><option value="2">Niveau 2</option><option value="3">Niveau 3</option></select></div>
      <div className="min-w-[240px] flex-1"><label className="mb-1 block text-xs font-medium text-gray-600">{parentLabel}</label><InfiniteSelect items={parents} getOptionLabel={(item) => item.title} getOptionValue={(item) => item.id} value={parentId} onChange={(value) => setParentId(value as string)} placeholder={`Choisir ${parentLabel.toLowerCase()}...`} /></div>
    </div>
    <ReusableTable data={rows} columns={columns} isLoading={loading} searchPlaceholder="Rechercher..." onSearch={setSearch} actions={(row) => <><button type="button" onClick={() => { setSelected(row); setModalOpen(true); }} className="rounded-lg p-2 text-blue-600"><Edit className="h-4 w-4" /></button><button type="button" onClick={() => remove(row)} className="rounded-lg p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></>} onAdd={() => { setSelected(null); setModalOpen(true); }} addButtonLabel="Ajouter une sous-sous-catégorie" pagination={result?.meta ? { page: result.meta.page, limit: result.meta.limit, total: result.meta.total, totalPages: result.meta.totalPages, onPageChange: setPage, onLimitChange: () => {} } : undefined} />
    {result?.meta && page < result.meta.totalPages ? <div className="mt-3 text-center"><button type="button" disabled={fetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{fetching ? 'Chargement…' : 'Charger plus'}</button></div> : null}
    <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Modifier une sous-sous-catégorie' : 'Nouvelle sous-sous-catégorie'}><form onSubmit={submit} className="space-y-4"><input name="title" required defaultValue={selected?.title} placeholder="Titre" className="w-full rounded-lg border border-gray-300 px-4 py-2" /><textarea name="description" defaultValue={selected?.description ?? ''} placeholder="Description" className="w-full rounded-lg border border-gray-300 px-4 py-2" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2">Annuler</button><button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-600 px-4 py-2 text-white disabled:opacity-60">{isSubmitting ? 'Chargement…' : selected ? 'Enregistrer' : 'Créer'}</button></div></form></Modal>
  </>;
}
