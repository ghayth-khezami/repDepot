import { useState } from 'react';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation, useGetCategoryQuery } from '../store/api/categoryApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import SubCategoriesPanel from '../components/SubCategoriesPanel';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';
import { Edit, Image as ImageIcon, Trash2, Layers } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../components/ConfirmDialog';

const STICKER_OPTIONS = [
  '/sticker 4.png',
  '/sticker 2.png',
  '/sticker 3.png',
  '/sticker 5.png',
  '/sticker 7.png',
  '/sticker 11.png',
  '/sticker 6.png',
  '/sticker 9.png',
  '/sticker 10.png',
  '/sticket 1 .png',
  '/stiker 8.png',
];

const toStickerUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return encodeURI(path);
};

const CategoriesPage = () => {
  const [tab, setTab] = useState<'categories' | 'subcategories'>('categories');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [subsModalId, setSubsModalId] = useState<string | null>(null);

  const { data, isLoading } = useGetCategoriesQuery({ page, limit, search });
  const { data: categoryDetail } = useGetCategoryQuery(subsModalId ?? '', { skip: !subsModalId });
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      if (isEditMode && selectedCategory) {
        const data: UpdateCategoryDto = {
          categoryName: formData.get('categoryName') as string,
          description: (formData.get('description') as string) || undefined,
          icon: selectedIcon || undefined,
        };
        await updateCategory({
          id: selectedCategory.id,
          data,
          coverFile,
        });
        showToast('Catégorie modifiée avec succès', 'success');
      } else {
        const data: CreateCategoryDto = {
          categoryName: formData.get('categoryName') as string,
          description: (formData.get('description') as string) || undefined,
          icon: selectedIcon || undefined,
        };
        await createCategory({ data, coverFile });
        showToast('Catégorie créée avec succès', 'success');
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
      setSelectedIcon('');
      setCoverFile(null);
      setCoverPreview('');
    } catch {
      showToast('Erreur lors de l\'opération', 'error');
    }
  };

  const columns: Column<Category>[] = [
    {
      header: 'Photo carte',
      accessor: 'coverDoc',
      render: (value, row) => {
        const raw = value ? String(value) : row.icon?.startsWith('/uploads') ? row.icon : '';
        const src = toStickerUrl(raw);
        return src ? (
          <img src={src} alt="" className="h-10 w-14 rounded-lg object-cover" />
        ) : (
          <span className="inline-flex h-10 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <ImageIcon className="h-4 w-4" />
          </span>
        );
      },
    },
    {
      header: 'Icône',
      accessor: 'icon',
      render: (value) => {
        const src = toStickerUrl(value ? String(value) : '');
        return src ? (
          <img src={src} alt="" className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <ImageIcon className="h-4 w-4" />
          </span>
        );
      },
    },
    { header: 'Nom', accessor: 'categoryName' },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Catégories & sous-catégories</h1>
        <p className="bo-muted mt-2">Organisez la boutique par catégories et sous-catégories</p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === 'categories'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Catégories
        </button>
        <button
          type="button"
          onClick={() => setTab('subcategories')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === 'subcategories'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Sous-catégories
        </button>
      </div>

      {tab === 'categories' ? (
        <ReusableTable
          data={data?.data || []}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Rechercher..."
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
                title="Sous-catégories"
                onClick={() => setSubsModalId(row.id)}
                className="rounded-lg p-2 text-violet-600 hover:bg-violet-50"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(true);
                  setSelectedCategory(row);
                  setSelectedIcon(row.icon || '');
                  setCoverFile(null);
                  setCoverPreview(
                    row.coverDoc
                      ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${row.coverDoc}`
                      : '',
                  );
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
                    title: 'Supprimer la catégorie',
                    message: 'Supprimer cette catégorie ?',
                    confirmLabel: 'Supprimer',
                    onConfirm: async () => {
                      await deleteCategory(row.id).unwrap();
                      showToast('Catégorie supprimée', 'success');
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
            setSelectedCategory(null);
            setSelectedIcon('');
            setCoverFile(null);
            setCoverPreview('');
            setIsModalOpen(true);
          }}
          addButtonLabel="Ajouter une catégorie"
        />
      ) : (
        <SubCategoriesPanel />
      )}

      <Modal
        isOpen={Boolean(subsModalId)}
        onClose={() => setSubsModalId(null)}
        title={`Sous-catégories — ${categoryDetail?.categoryName ?? ''}`}
      >
        {categoryDetail?.subCategories?.length ? (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {categoryDetail.subCategories.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{sub.title}</p>
                  {sub.description ? (
                    <p className="text-xs text-gray-600">{sub.description}</p>
                  ) : null}
                </div>
                <span className="text-xs font-bold text-violet-700">
                  {sub._count?.products ?? 0} produit(s)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Aucune sous-catégorie pour cette catégorie.</p>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
          setSelectedIcon('');
          setCoverFile(null);
          setCoverPreview('');
        }}
        title={isEditMode ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Photo de la carte (vitrine web)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCoverFile(file);
                if (file) setCoverPreview(URL.createObjectURL(file));
              }}
              className="w-full text-sm"
            />
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Aperçu"
                className="mt-3 h-36 w-full rounded-xl object-cover"
              />
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              name="categoryName"
              defaultValue={selectedCategory?.categoryName}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              defaultValue={selectedCategory?.description}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Icône</label>
            <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto rounded-lg border bg-gray-50 p-2 sm:grid-cols-6">
              {STICKER_OPTIONS.map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => setSelectedIcon(path)}
                  className={`rounded-lg border p-2 ${
                    selectedIcon === path ? 'border-violet-600 bg-violet-100' : 'border-gray-200 bg-white'
                  }`}
                >
                  <img src={toStickerUrl(path)} alt="" className="mx-auto h-8 w-8 object-contain" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2">
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
};

export default CategoriesPage;
