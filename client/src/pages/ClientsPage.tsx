import { useState } from 'react';
import { useGetClientsQuery, useCreateClientMutation, useDeleteClientMutation, useGetClientCommandHistoryQuery } from '../store/api/clientApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import AddressMapSelector from '../components/AddressMapSelector';
import { Client, CreateClientDto } from '../types';
import { Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ClientsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [address, setAddress] = useState('');

  const { data, isLoading } = useGetClientsQuery({ page, limit, search });
  const [createClient] = useCreateClientMutation();
  const [deleteClient] = useDeleteClientMutation();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const { showToast } = useToast();
  const { data: clientHistory, isLoading: clientHistoryLoading } = useGetClientCommandHistoryQuery(
    viewClient?.id || '',
    { skip: !viewClient?.id }
  );

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedClient(null);
    setAddress('');
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setIsEditMode(true);
    setSelectedClient(client);
    setAddress(client.address);
    setIsModalOpen(true);
  };

  const handleView = (client: Client) => {
    setViewClient(client);
    setViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await deleteClient(id);
        showToast('Client supprimé avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/clients/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clients.csv';
        a.click();
        showToast('Export CSV réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export CSV', 'error'));
  };

  const handleExportPdf = () => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/clients/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clients.pdf';
        a.click();
        showToast('Export PDF réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export PDF', 'error'));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: CreateClientDto = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      address: address || (formData.get('address') as string),
      email: formData.get('email') as string,
      phoneNumber: formData.get('phoneNumber') as string,
    };

    try {
      if (isEditMode && selectedClient) {
        // Update not available in API, only create and delete
        showToast('La mise à jour des clients n\'est pas disponible', 'warning');
      } else {
        await createClient(data);
        showToast('Client créé avec succès', 'success');
      }
      setIsModalOpen(false);
      setSelectedClient(null);
      setAddress('');
    } catch (error) {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const columns: Column<Client>[] = [
    { header: 'Prénom', accessor: 'firstName' },
    { header: 'Nom', accessor: 'lastName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Téléphone', accessor: 'phoneNumber' },
    { header: 'Adresse', accessor: 'address' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Clients</h1>
        <p className="text-gray-600 mt-2">Gérez tous les clients</p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, email ou téléphone..."
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
          <>
            <button
              onClick={() => handleView(row)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Voir les détails"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        onAdd={handleAdd}
        addButtonLabel="Ajouter un client"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
        }}
        title={isEditMode ? "Modifier le client" : "Ajouter un client"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                name="firstName"
                defaultValue={selectedClient?.firstName}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                name="lastName"
                defaultValue={selectedClient?.lastName}
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
              defaultValue={selectedClient?.email}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              name="phoneNumber"
              defaultValue={selectedClient?.phoneNumber}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <AddressMapSelector
              value={address || selectedClient?.address || ''}
              onChange={(addr) => setAddress(addr)}
              onPositionConfirm={(lat, lng) => {
                console.log('Position confirmed:', lat, lng);
              }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedClient(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isEditMode ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewClient(null);
        }}
        title="Détails du client"
        size="xl"
      >
        {viewClient && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewClient.firstName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewClient.lastName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewClient.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewClient.phoneNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{viewClient.address || '-'}</p>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Historique des commandes</label>
              {clientHistoryLoading ? (
                <div className="text-sm text-gray-500">Chargement...</div>
              ) : !clientHistory || clientHistory.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune commande trouvée.</div>
              ) : (
                <div className="space-y-3">
                  {clientHistory.map((cmd) => (
                    <div key={cmd.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900">
                          Commande #{cmd.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(cmd.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Adresse:</span> {cmd.adresseLivraison || '-'}
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="font-medium text-gray-800 mb-1">Produits:</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {cmd.products.map((p) => (
                            <li key={p.id} className="text-sm text-gray-700">
                              {p.productName} — {p.PrixVente} TND
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setViewClient(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientsPage;
