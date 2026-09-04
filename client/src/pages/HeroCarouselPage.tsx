import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import CropImageModal from '../components/CropImageModal';
import ReusableTable, { Column } from '../components/ReusableTable';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../components/ConfirmDialog';
import {
  HeroCarouselSlide,
  useCreateHeroCarouselSlideMutation,
  useDeleteHeroCarouselSlideMutation,
  useGetHeroCarouselSlidesAdminQuery,
  useUpdateHeroCarouselSlideMutation,
} from '../store/api/heroCarouselApi';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const HeroCarouselPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selected, setSelected] = useState<HeroCarouselSlide | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const { data, isLoading } = useGetHeroCarouselSlidesAdminQuery({
    page,
    limit,
    search: search || undefined,
  });
  const [createSlide] = useCreateHeroCarouselSlideMutation();
  const [updateSlide] = useUpdateHeroCarouselSlideMutation();
  const [deleteSlide] = useDeleteHeroCarouselSlideMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const imageUrl = (path: string) =>
    path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const columns: Column<HeroCarouselSlide>[] = [
    {
      header: 'Image',
      accessor: 'imageDoc',
      render: (v) => (
        <div className="h-16 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(String(v))} alt="" className="h-full w-full bg-gray-50 object-contain" />
        </div>
      ),
    },
    { header: 'Alt', accessor: 'imageAlt' },
    { header: 'Ordre', accessor: 'sortOrder' },
    {
      header: 'Publié',
      accessor: 'isPublished',
      render: (v) => (v ? 'Oui' : 'Non'),
    },
    {
      header: 'Image seule',
      accessor: 'imageOnly',
      render: (v) => (v ? 'Oui' : 'Non'),
    },
  ];

  const appendFormFields = (fd: FormData, form: HTMLFormElement) => {
    const data = new FormData(form);
    fd.append('imageAlt', String(data.get('imageAlt') || ''));
    fd.append('sortOrder', String(data.get('sortOrder') || 0));
    fd.append('isPublished', data.get('isPublished') === 'on' ? 'true' : 'false');
    fd.append('imageOnly', data.get('imageOnly') === 'on' ? 'true' : 'false');
    fd.append('arabicWelcome', String(data.get('arabicWelcome') || ''));
    fd.append('title', String(data.get('title') || ''));
    fd.append('subtitle', String(data.get('subtitle') || ''));
    fd.append('description', String(data.get('description') || ''));
    fd.append('ctaLabel', String(data.get('ctaLabel') || ''));
    fd.append('ctaHref', String(data.get('ctaHref') || ''));
    fd.append('ctaType', String(data.get('ctaType') || ''));
    fd.append('align', String(data.get('align') || ''));
    if (imageFile) fd.append('image', imageFile);
    if (mobileImageFile) fd.append('imageMobile', mobileImageFile);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEditMode && !imageFile) {
      showToast('La photo est requise', 'error');
      return;
    }
    const body = new FormData();
    appendFormFields(body, e.currentTarget);
    try {
      if (isEditMode && selected) {
        await updateSlide({ id: selected.id, body }).unwrap();
        showToast('Slide modifié', 'success');
      } else {
        await createSlide(body).unwrap();
        showToast('Slide ajouté', 'success');
      }
      setIsModalOpen(false);
      setSelected(null);
      setImageFile(null);
      setMobileImageFile(null);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div>
      {dialog}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Carrousel accueil</h1>
        <p className="bo-muted mt-2">
          Ajoutez une ou plusieurs photos pour le carrousel de la page d&apos;accueil (upload Cloudinary).
        </p>
      </div>

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
              onClick={() => {
                setIsEditMode(true);
                setSelected(row);
                setImageFile(null);
                setMobileImageFile(null);
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
                  title: 'Supprimer le slide',
                  message: 'Supprimer cette photo du carrousel ?',
                  confirmLabel: 'Supprimer',
                  onConfirm: async () => {
                    await deleteSlide(row.id).unwrap();
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
          setImageFile(null);
          setIsModalOpen(true);
        }}
        addButtonLabel="Ajouter une photo"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
          setImageFile(null);
          setCropFile(null);
        }}
        title={isEditMode ? 'Modifier le slide' : 'Nouveau slide carrousel'}
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Photo {isEditMode ? '(optionnel)' : '(requis)'}
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                if (!raw) {
                  setImageFile(null);
                  return;
                }
                const { compressImageForUpload } = await import('../lib/compressImage');
                setCropFile(await compressImageForUpload(raw));
              }}
              className="w-full text-sm"
            />
            {(imageFile || selected?.imageDoc) && (
              <div className="mt-3 h-32 w-full overflow-hidden rounded-lg border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    imageFile
                      ? URL.createObjectURL(imageFile)
                      : imageUrl(selected?.imageDoc || '')
                  }
                  alt=""
                  className="h-full w-full bg-gray-50 object-contain"
                />
              </div>
            )}
          </div>
          <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-700">Image mobile (optionnel)</p>
            <p className="mt-1 text-xs">Choisissez la photo source puis enregistrez la version mobile dans le recadrage.</p>
            {mobileImageFile || selected?.imageDocMobile ? <p className="mt-2 text-xs text-green-700">Version mobile prête</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Texte alternatif</label>
            <input
              name="imageAlt"
              defaultValue={selected?.imageAlt}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ordre</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={selected?.sortOrder ?? 0}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input name="isPublished" type="checkbox" defaultChecked={selected?.isPublished ?? true} />
            Publié
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input name="imageOnly" type="checkbox" defaultChecked={selected?.imageOnly ?? true} />
            Photo seule (sans texte)
          </label>
          <details className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Texte optionnel</summary>
            <div className="mt-3 space-y-3">
              <input name="arabicWelcome" placeholder="Accueil arabe" defaultValue={selected?.arabicWelcome ?? ''} className="w-full rounded-lg border px-3 py-2" />
              <input name="title" placeholder="Titre" defaultValue={selected?.title ?? ''} className="w-full rounded-lg border px-3 py-2" />
              <input name="subtitle" placeholder="Sous-titre" defaultValue={selected?.subtitle ?? ''} className="w-full rounded-lg border px-3 py-2" />
              <textarea name="description" placeholder="Description" defaultValue={selected?.description ?? ''} rows={3} className="w-full rounded-lg border px-3 py-2" />
              <input name="ctaLabel" placeholder="Bouton" defaultValue={selected?.ctaLabel ?? ''} className="w-full rounded-lg border px-3 py-2" />
              <input name="ctaHref" placeholder="Lien bouton" defaultValue={selected?.ctaHref ?? ''} className="w-full rounded-lg border px-3 py-2" />
              <select name="ctaType" defaultValue={selected?.ctaType ?? ''} className="w-full rounded-lg border px-3 py-2">
                <option value="">Type CTA</option>
                <option value="link">Lien</option>
                <option value="phone">Téléphone</option>
              </select>
              <select name="align" defaultValue={selected?.align ?? ''} className="w-full rounded-lg border px-3 py-2">
                <option value="">Alignement</option>
                <option value="start">Gauche</option>
                <option value="center">Centre</option>
              </select>
            </div>
          </details>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2">
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
      <CropImageModal
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCrop={(file, _preview, preset) => {
          if (preset === 'mobile') {
            setMobileImageFile(file);
          } else {
            setImageFile(file);
          }
        }}
      />
    </div>
  );
};

export default HeroCarouselPage;
