import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import ReusableTable, { Column } from '../components/ReusableTable';
import {
  Mark,
  useCreateMarkMutation,
  useDeleteMarkMutation,
  useGetMarksQuery,
  useUpdateMarkMutation,
} from '../store/api/markApi';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../components/ConfirmDialog';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MarksPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selected, setSelected] = useState<Mark | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data, isLoading } = useGetMarksQuery({ page, limit, search: search || undefined });
  const [createMark] = useCreateMarkMutation();
  const [updateMark] = useUpdateMarkMutation();
  const [deleteMark] = useDeleteMarkMutation();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const logoUrl = (path: string) =>
    path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const columns: Column<Mark>[] = [
    {
      header: 'Logo',
      accessor: 'logoDoc',
      render: (v) => (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl(String(v))} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      ),
    },
    { header: 'Nom', accessor: 'name' },
    { header: 'Ordre', accessor: 'sortOrder' },
    {
      header: 'Produits',
      accessor: '_count',
      render: (_v, row) => row._count?.products ?? 0,
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim();
    if (!name) {
      showToast('Le nom est requis', 'error');
      return;
    }
    if (!isEditMode && !logoFile) {
      showToast('Le logo est requis', 'error');
      return;
    }
    const body = new FormData();
    body.append('name', name);
    body.append('sortOrder', String(fd.get('sortOrder') || 0));
    if (logoFile) body.append('logo', logoFile);

    try {
      if (isEditMode && selected) {
        await updateMark({ id: selected.id, body }).unwrap();
        showToast('Marque modifiée', 'success');
      } else {
        await createMark(body).unwrap();
        showToast('Marque créée', 'success');
      }
      setIsModalOpen(false);
      setSelected(null);
      setLogoFile(null);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Marques</h1>
        <p className="bo-muted mt-2">
          Logos affichés sur la vitrine (section Nos marques). Formats image recommandés.
        </p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher une marque..."
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
                setLogoFile(null);
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
                  title: 'Supprimer la marque',
                  message: 'Supprimer cette marque ?',
                  confirmLabel: 'Supprimer',
                  onConfirm: async () => {
                    await deleteMark(row.id).unwrap();
                    showToast('Supprimée', 'success');
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
          setLogoFile(null);
          setIsModalOpen(true);
        }}
        addButtonLabel="Ajouter une marque"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
          setLogoFile(null);
        }}
        title={isEditMode ? 'Modifier la marque' : 'Nouvelle marque'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom de la marque</label>
            <input
              name="name"
              defaultValue={selected?.name}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ordre d&apos;affichage</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={selected?.sortOrder ?? 0}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Logo {isEditMode ? '(optionnel)' : '(requis)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                if (!raw) {
                  setLogoFile(null);
                  return;
                }
                const { compressImageForUpload } = await import('../lib/compressImage');
                setLogoFile(await compressImageForUpload(raw));
              }}
              className="w-full text-sm"
            />
            {(logoFile || selected?.logoDoc) && (
              <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-lg border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    logoFile
                      ? URL.createObjectURL(logoFile)
                      : logoUrl(selected?.logoDoc || '')
                  }
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>
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
      {dialog}
    </div>
  );
};

export default MarksPage;
