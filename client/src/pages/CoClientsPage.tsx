import { useState } from 'react';
import { useGetCoClientsQuery, useCreateCoClientMutation, useDeleteCoClientMutation } from '../store/api/coClientApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import AddressMapSelector from '../components/AddressMapSelector';
import { CoClient, CreateCoClientDto } from '../types';
import { Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CoClientsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoClient, setSelectedCoClient] = useState<CoClient | null>(null);
  const [address, setAddress] = useState('');

  const { data, isLoading } = useGetCoClientsQuery({ page, limit, search });
  const [createCoClient] = useCreateCoClientMutation();
  const [deleteCoClient] = useDeleteCoClientMutation();
  const { showToast } = useToast();

  const handleAdd = () => {
    setSelectedCoClient(null);
    setAddress('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce co-client ?')) {
      try {
        await deleteCoClient(id);
        showToast('Co-client supprimé avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/co-clients/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'co-clients.csv';
        a.click();
        showToast('Export CSV réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export CSV', 'error'));
  };

  const handleExportPdf = () => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/co-clients/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'co-clients.pdf';
        a.click();
        showToast('Export PDF réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export PDF', 'error'));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: CreateCoClientDto = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      address: address || (formData.get('address') as string),
      email: formData.get('email') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      RIB: formData.get('RIB') as string,
    };

    try {
      await createCoClient(data);
      showToast('Co-client créé avec succès', 'success');
      setIsModalOpen(false);
      setSelectedCoClient(null);
    } catch (error) {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const columns: Column<CoClient>[] = [
    { header: 'Prénom', accessor: 'firstName' },
    { header: 'Nom', accessor: 'lastName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Téléphone', accessor: 'phoneNumber' },
    { header: 'RIB', accessor: 'RIB' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Co-Clients</h1>
        <p className="text-gray-600 mt-2">Gérez tous les co-clients</p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, email, téléphone ou RIB..."
        onSearch={setSearch}
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
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        onAdd={handleAdd}
        addButtonLabel="Ajouter un co-client"
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCoClient(null);
          setAddress('');
        }}
        title="Ajouter un co-client"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                name="firstName"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                name="lastName"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              name="phoneNumber"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <AddressMapSelector
              value={address}
              onChange={(addr) => setAddress(addr)}
              onPositionConfirm={(lat, lng) => {
                console.log('Position confirmed:', lat, lng);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RIB</label>
            <input
              type="text"
              name="RIB"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedCoClient(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CoClientsPage;
