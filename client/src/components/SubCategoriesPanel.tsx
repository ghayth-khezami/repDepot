import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import {
  SubCategory,
  useCreateSubCategoryMutation,
  useDeleteSubCategoryMutation,
  useGetSubCategoriesQuery,
  useUpdateSubCategoryMutation,
} from '../store/api/subCategoryApi';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import InfiniteSelect from './InfiniteSelect';
import Modal from './Modal';
import ReusableTable, { Column } from './ReusableTable';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from './ConfirmDialog';

const PAGE_SIZE = 10;

const SubCategoriesPanel = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [accumulated, setAccumulated] = useState<SubCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selected, setSelected] = useState<SubCategory | null>(null);
  const [formCategoryId, setFormCategoryId] = useState('');

  const [categoriesPage, setCategoriesPage] = useState(1);
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery({
    limit: PAGE_SIZE,
    page: categoriesPage,
  });
  const [allCategories, setAllCategories] = useState<Array<{ id: string; categoryName: string }>>([]);

  useEffect(() => {
    if (categoriesData?.data) {
      setAllCategories((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const next = categoriesData.data.filter((c) => !ids.has(c.id));
        return categoriesPage === 1
          ? categoriesData.data.map((c) => ({ id: c.id, categoryName: c.categoryName }))
          : [...prev, ...next.map((c) => ({ id: c.id, categoryName: c.categoryName }))];
      });
    }
  }, [categoriesData, categoriesPage]);

  const { data, isLoading, isFetching } = useGetSubCategoriesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    categoryId: filterCategoryId || undefined,
  });

  const [createSub] = useCreateSubCategoryMutation();
  const [updateSub] = useUpdateSubCategoryMutation();
  const [deleteSub] = useDeleteSubCategoryMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const isAllMode = !filterCategoryId;
  const hasMore = Boolean(data?.meta && page < data.meta.totalPages);

  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [search, filterCategoryId]);

  useEffect(() => {
    if (!data?.data) return;
    setAccumulated((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      const next = data.data.filter((s) => !ids.has(s.id));
      return page === 1 ? data.data : [...prev, ...next];
    });
  }, [data, page]);

  const tableData = isAllMode ? accumulated : data?.data || [];

  const loadMore = () => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = fd.get('title') as string;
    const description = (fd.get('description') as string) || undefined;
    const categoryId = formCategoryId;
    if (!categoryId) {
      showToast('Sélectionnez une catégorie', 'error');
      return;
    }
    try {
      if (isEditMode && selected) {
        await updateSub({ id: selected.id, data: { title, description, categoryId } }).unwrap();
        showToast('Sous-catégorie modifiée', 'success');
      } else {
        await createSub({ title, description, categoryId }).unwrap();
        showToast('Sous-catégorie créée', 'success');
      }
      setIsModalOpen(false);
      setSelected(null);
      setFormCategoryId('');
      setPage(1);
      setAccumulated([]);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const columns: Column<SubCategory>[] = [
    { header: 'Titre', accessor: 'title' },
    {
      header: 'Catégorie',
      accessor: 'category',
      render: (_v, row) => row.category?.categoryName ?? '—',
    },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Produits',
      accessor: '_count',
      render: (_v, row) => row._count?.products ?? 0,
    },
  ];

  return (
    <>
      {dialog}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Filtrer par catégorie
          </label>
          <InfiniteSelect
            items={[{ id: '', categoryName: 'Toutes les catégories' }, ...allCategories]}
            getOptionLabel={(c) => c.categoryName}
            getOptionValue={(c) => c.id}
            value={filterCategoryId}
            onChange={(v) => setFilterCategoryId(v as string)}
            onLoadMore={() => {
              if (categoriesData?.meta && categoriesPage < categoriesData.meta.totalPages) {
                setCategoriesPage((p) => p + 1);
              }
            }}
            hasMore={categoriesData?.meta ? categoriesPage < categoriesData.meta.totalPages : false}
            isLoading={categoriesLoading}
            placeholder="Toutes les catégories"
          />
        </div>
      </div>

      <ReusableTable
        data={tableData}
        columns={columns}
        isLoading={isLoading && page === 1}
        searchPlaceholder="Rechercher une sous-catégorie..."
        onSearch={(v) => {
          setSearch(v);
        }}
        pagination={
          !isAllMode && data?.meta
            ? {
                page: data.meta.page,
                limit: PAGE_SIZE,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
                onLimitChange: () => {},
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
                setFormCategoryId(row.categoryId);
                setIsModalOpen(true);
              }}
              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                confirm({
                  title: 'Supprimer la sous-catégorie',
                  message: 'Supprimer cette sous-catégorie ?',
                  confirmLabel: 'Supprimer',
                  onConfirm: async () => {
                    await deleteSub(row.id).unwrap();
                    showToast('Supprimée', 'success');
                    setPage(1);
                    setAccumulated([]);
                  },
                })
              }
              className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        onAdd={() => {
          setIsEditMode(false);
          setSelected(null);
          setFormCategoryId(filterCategoryId);
          setIsModalOpen(true);
        }}
        addButtonLabel="Ajouter une sous-catégorie"
      />

      {isAllMode && hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isFetching}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
          >
            {isFetching ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      ) : null}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
        }}
        title={isEditMode ? 'Modifier la sous-catégorie' : 'Nouvelle sous-catégorie'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre</label>
            <input
              name="title"
              defaultValue={selected?.title}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              name="description"
              defaultValue={selected?.description ?? ''}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie</label>
            <InfiniteSelect
              items={allCategories}
              getOptionLabel={(c) => c.categoryName}
              getOptionValue={(c) => c.id}
              value={formCategoryId}
              onChange={(v) => setFormCategoryId(v as string)}
              onLoadMore={() => {
                if (categoriesData?.meta && categoriesPage < categoriesData.meta.totalPages) {
                  setCategoriesPage((p) => p + 1);
                }
              }}
              hasMore={categoriesData?.meta ? categoriesPage < categoriesData.meta.totalPages : false}
              isLoading={categoriesLoading}
              placeholder="Choisir une catégorie..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600 dark:text-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default SubCategoriesPanel;
