import { useState } from 'react';
import { useGetCategoriesFeedInfiniteQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation, useGetCategoryQuery } from '../store/api/categoryApi';
import { useInfiniteList } from '../hooks/useInfiniteList';
import Modal from '../components/Modal';
import SubCategoriesPanel from '../components/SubCategoriesPanel';
import SubSubCategoriesPanel from '../components/SubSubCategoriesPanel';
import CropImageModal from '../components/CropImageModal';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';
import { Edit, FolderTree, Trash2, Layers, Plus } from 'lucide-react';
import { EmptyState, Fab, InfiniteSentinel, ListRow, PageHeader, Pager, SearchBar, SegmentedFilter, Skeleton, useDesktopPager, useIsDesktop } from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { uploadUrl } from '../lib/apiBase';
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
  const [tab, setTab] = useState<'categories' | 'subcategories' | 'subsubcategories'>('categories');
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [subsModalId, setSubsModalId] = useState<string | null>(null);

  const { data, isLoading, infinite } = useInfiniteList<Category>(useGetCategoriesFeedInfiniteQuery({ search: search || undefined }));
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
      setCropFile(null);
    } catch {
      showToast('Erreur lors de l\'opération', 'error');
    }
  };


  const openAdd = () => {
    setIsEditMode(false);
    setSelectedCategory(null);
    setSelectedIcon('');
    setCoverFile(null);
    setCoverPreview('');
    setCropFile(null);
    setIsModalOpen(true);
  };
  const openEdit = (row: Category) => {
    setIsEditMode(true);
    setSelectedCategory(row);
    setSelectedIcon(row.icon || '');
    setCoverFile(null);
    setCropFile(null);
    setCoverPreview(row.coverDoc ? uploadUrl(row.coverDoc) : '');
    setIsModalOpen(true);
  };
  const askDelete = (row: Category) =>
    confirm({
      title: 'Supprimer la catégorie',
      message: `Supprimer « ${row.categoryName} » ?`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await deleteCategory(row.id).unwrap();
        showToast('Catégorie supprimée', 'success');
      },
    });

  const rows = data?.data ?? [];
  const isDesktop = useIsDesktop();
  const pager = useDesktopPager({
    items: rows,
    total: infinite.total,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
    fetchNextPage: infinite.fetchNextPage,
    resetKey: search,
  });
  const visible = isDesktop ? pager.pageItems : rows;
  const thumbOf = (row: Category) => {
    const raw = row.coverDoc ? uploadUrl(row.coverDoc) : toStickerUrl(row.icon || '');
    return raw ? <img src={raw} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FolderTree size={22} aria-hidden />;
  };

  return (
    <div className="category-admin space-y-4">
      <div className="bd-ui">
        <PageHeader eyebrow="Catalogue" title="Catégories" subtitle="Rayons, sous-catégories et familles" />
        <div className="space-y-3 md:sticky md:top-16 md:z-20 md:-mx-8 md:bg-bd-bg/90 md:px-8 md:pb-3 md:pt-1 md:backdrop-blur">
          <SegmentedFilter<'categories' | 'subcategories' | 'subsubcategories'>
            label="Niveau"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'categories', label: 'Catégories', count: tab === 'categories' ? infinite.total : undefined },
              { value: 'subcategories', label: 'Sous-cat.' },
              { value: 'subsubcategories', label: 'Sous-sous-cat.' },
            ]}
          />
          {tab === 'categories' ? (
            <div className="flex items-center gap-3">
              <SearchBar value={q} onChange={setQ} placeholder="Rechercher une catégorie" className="flex-1" />
              <button type="button" onClick={openAdd} className="bd-focus hidden min-h-[48px] shrink-0 items-center gap-2 rounded-2xl bg-grad-pink-strong px-5 font-extrabold text-white shadow-glow-pink md:inline-flex">
                <Plus size={18} aria-hidden /> Nouvelle catégorie
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {tab === 'categories' ? (
        <div className="bd-ui pb-24">
          <p className="mb-2 text-sm font-bold text-bd-muted tabular-nums">{infinite.total != null ? `${infinite.total} catégorie${infinite.total > 1 ? 's' : ''}` : ' '}</p>
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] md:h-56" />)}</div>
          ) : rows.length ? (
            <ul className="grid gap-2 md:grid-cols-2 md:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((row) =>
                isDesktop ? (
                  <li key={row.id} className="bd-anim-fade-up group flex flex-col overflow-hidden rounded-3xl border border-bd-line/10 bg-bd-surface shadow-card transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(76,29,149,0.16)]">
                    <button type="button" onClick={() => setSubsModalId(row.id)} className="bd-focus flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-bd-lilac/50 text-bd-violet">
                      {thumbOf(row)}
                    </button>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <p className="truncate text-[15px] font-extrabold text-bd-ink">{row.categoryName}</p>
                      <p className="line-clamp-2 min-h-[2.5em] text-xs font-semibold text-bd-muted">{row.description || 'Sans description'}</p>
                      <div className="mt-auto flex items-center gap-1 pt-2">
                        <button type="button" onClick={() => setSubsModalId(row.id)} className="bd-focus inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-bd-lilac/70 text-sm font-extrabold text-bd-violet-strong">
                          <Layers size={16} aria-hidden /> Sous-catégories
                        </button>
                        <button type="button" aria-label="Modifier" onClick={() => openEdit(row)} className="bd-focus flex h-10 w-10 items-center justify-center rounded-xl text-bd-ink hover:bg-bd-lilac/60"><Edit size={17} aria-hidden /></button>
                        <button type="button" aria-label="Supprimer" onClick={() => askDelete(row)} className="bd-focus flex h-10 w-10 items-center justify-center rounded-xl text-bd-danger hover:bg-bd-blush"><Trash2 size={17} aria-hidden /></button>
                      </div>
                    </div>
                  </li>
                ) : (
                  <ListRow
                    key={row.id}
                    onClick={() => setSubsModalId(row.id)}
                    thumb={thumbOf(row)}
                    meta={new Date(row.createdAt).toLocaleDateString('fr-FR')}
                    title={row.categoryName}
                    subtitle={<span className="truncate">{row.description || 'Sans description'}</span>}
                    trailing={
                      <div className="flex shrink-0 items-center">
                        <button type="button" aria-label="Modifier" onClick={() => openEdit(row)} className="bd-focus flex h-10 w-10 items-center justify-center rounded-xl text-bd-ink"><Edit size={17} aria-hidden /></button>
                        <button type="button" aria-label="Supprimer" onClick={() => askDelete(row)} className="bd-focus flex h-10 w-10 items-center justify-center rounded-xl text-bd-danger"><Trash2 size={17} aria-hidden /></button>
                      </div>
                    }
                  />
                ),
              )}
              <li className="col-span-full list-none">
                {isDesktop ? (
                  <Pager page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} loading={pager.loading} onPage={pager.setPage} />
                ) : (
                  <InfiniteSentinel onReach={() => infinite.hasNextPage && !infinite.isFetchingNextPage && infinite.fetchNextPage()} disabled={!infinite.hasNextPage} loading={infinite.isFetchingNextPage} />
                )}
              </li>
            </ul>
          ) : (
            <EmptyState icon={FolderTree} title={search ? 'Aucune catégorie trouvée' : 'Aucune catégorie pour le moment'}>
              {search ? `Rien ne correspond à « ${search} ».` : 'Créez votre premier rayon.'}
            </EmptyState>
          )}
          <Fab icon={Plus} label="Catégorie" onClick={openAdd} />
        </div>
      ) : tab === 'subcategories' ? (
        <SubCategoriesPanel />
      ) : (
        <SubSubCategoriesPanel />
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
                <span className="text-xs font-bold text-pink-700">
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
          setCropFile(null);
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
                e.target.value = '';
                if (file) setCropFile(file);
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
                  className={`min-h-12 min-w-12 rounded-lg border-2 p-2 ${
                    selectedIcon === path ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-gray-300 bg-white hover:border-pink-300'
                  }`}
                >
                  <img src={toStickerUrl(path)} alt="" className="mx-auto h-8 w-8 object-contain" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 font-semibold text-rose-700 hover:bg-rose-50">
              Annuler
            </button>
            <button type="submit" className="rounded-xl bg-pink-500 px-4 py-2.5 font-semibold text-white hover:bg-pink-600">
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
      <CropImageModal
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCrop={(file, previewUrl) => {
          setCoverFile(file);
          setCoverPreview(previewUrl);
          setCropFile(null);
        }}
      />
      {dialog}
    </div>
  );
};

export default CategoriesPage;
