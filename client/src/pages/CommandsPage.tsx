import { useState, useEffect } from 'react';
import {
  useGetCommandsQuery,
  useCreateCommandMutation,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  CreateCommandDto,
  UpdateCommandDto,
} from '../store/api/commandApi';
import { useGetProductsQuery } from '../store/api/productApi';
import { useGetClientsQuery } from '../store/api/clientApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import AddressMapSelector from '../components/AddressMapSelector';
import InfiniteSelect from '../components/InfiniteSelect';
import MultiSelectCheckbox from '../components/MultiSelectCheckbox';
import DatePicker from 'react-datepicker';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Command } from '../store/api/commandApi';

const CommandsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedCoClient, setSelectedCoClient] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [statusDate, setStatusDate] = useState<Date | null>(null);
  const [newStatus, setNewStatus] = useState<'NOT_DELIVERED' | 'DELIVERED' | 'GOT_PROFIT'>('NOT_DELIVERED');

  const { data, isLoading } = useGetCommandsQuery({
    page,
    limit,
    search,
    status: statusFilter || undefined,
  });

  // Infinite scroll for products
  const [productsPage, setProductsPage] = useState(1);
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ limit: 10, page: productsPage });
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // Infinite scroll for clients
  const [clientsPage, setClientsPage] = useState(1);
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({ limit: 10, page: clientsPage });
  const [allClients, setAllClients] = useState<any[]>([]);

  // Infinite scroll for co-clients
  const [coClientsPage, setCoClientsPage] = useState(1);
  const { data: coClientsData, isLoading: coClientsLoading } = useGetCoClientsQuery({ limit: 10, page: coClientsPage });
  const [allCoClients, setAllCoClients] = useState<any[]>([]);

  // Accumulate products
  useEffect(() => {
    if (productsData?.data) {
      setAllProducts((prev) => {
        const newItems = productsData.data.filter((item) => !prev.find((p) => p.id === item.id));
        return [...prev, ...newItems];
      });
    }
  }, [productsData]);

  // Accumulate clients
  useEffect(() => {
    if (clientsData?.data) {
      setAllClients((prev) => {
        const newItems = clientsData.data.filter((item) => !prev.find((p) => p.id === item.id));
        return [...prev, ...newItems];
      });
    }
  }, [clientsData]);

  // Accumulate co-clients
  useEffect(() => {
    if (coClientsData?.data) {
      setAllCoClients((prev) => {
        const newItems = coClientsData.data.filter((item) => !prev.find((p) => p.id === item.id));
        return [...prev, ...newItems];
      });
    }
  }, [coClientsData]);
  const [createCommand] = useCreateCommandMutation();
  const [updateCommand] = useUpdateCommandMutation();
  const [deleteCommand] = useDeleteCommandMutation();
  const { showToast } = useToast();

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedCommand(null);
    setSelectedProducts([]);
    setSelectedClient('');
    setSelectedCoClient('');
    setDeliveryAddress('');
    setDeliveryDate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (command: Command) => {
    setIsEditMode(true);
    setSelectedCommand(command);
    setDeliveryAddress(command.adresseLivraison);
    setDeliveryDate(command.dateLivraison ? new Date(command.dateLivraison) : null);
    setIsModalOpen(true);
  };

  const handleStatusChange = (command: Command) => {
    setSelectedCommand(command);
    setNewStatus(command.status);
    setStatusDate(command.dateLivraison ? new Date(command.dateLivraison) : null);
    setIsStatusModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        await deleteCommand(id);
        showToast('Commande supprimée avec succès', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      showToast('Veuillez sélectionner au moins un produit', 'error');
      return;
    }
    
    if (!selectedClient) {
      showToast('Veuillez sélectionner un client', 'error');
      return;
    }

    const formData = new FormData(e.currentTarget);

    const totalPrixVente = selectedProducts.reduce((sum, productId) => {
      const product = allProducts.find((p) => p.id === productId);
      return sum + (product?.PrixVente || 0);
    }, 0);

    const totalPrixAchat = selectedProducts.reduce((sum, productId) => {
      const product = allProducts.find((p) => p.id === productId);
      // If product is depot, PrixAchat is not applicable (should be 0 or undefined)
      if (product?.isDepot) {
        return sum + 0;
      }
      return sum + (product?.PrixAchat || 0);
    }, 0);

    const data: CreateCommandDto = {
      productsNumber: selectedProducts.length,
      PrixVente: totalPrixVente,
      PrixAchat: totalPrixAchat,
      productIds: selectedProducts,
      clientId: selectedClient,
      coClientId: selectedCoClient || undefined,
      adresseLivraison: deliveryAddress,
      dateLivraison: deliveryDate ? deliveryDate.toISOString() : undefined,
      status: 'NOT_DELIVERED',
    };

    try {
      if (isEditMode && selectedCommand) {
        const updateData: UpdateCommandDto = {
          productsNumber: selectedProducts.length,
          PrixVente: totalPrixVente,
          PrixAchat: totalPrixAchat,
          adresseLivraison: deliveryAddress,
          dateLivraison: deliveryDate ? deliveryDate.toISOString() : undefined,
        };
        await updateCommand({ id: selectedCommand.id, data });
        showToast('Commande modifiée avec succès', 'success');
      } else {
        await createCommand(data);
        showToast('Commande créée avec succès', 'success');
      }
      setIsModalOpen(false);
      setSelectedCommand(null);
      setSelectedProducts([]);
      setDeliveryAddress('');
      setDeliveryDate(null);
    } catch (error) {
      showToast('Erreur lors de l\'opération', 'error');
    }
  };

  const handleStatusSubmit = async () => {
    if (!selectedCommand) return;

    try {
      const updateData: UpdateCommandDto = {
        status: newStatus,
        dateLivraison: statusDate ? statusDate.toISOString() : undefined,
      };
      await updateCommand({ id: selectedCommand.id, data: updateData });
      showToast('Statut modifié avec succès', 'success');
      setIsStatusModalOpen(false);
      setSelectedCommand(null);
      setStatusDate(null);
    } catch (error) {
      showToast('Erreur lors de la modification du statut', 'error');
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/commands/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'commands.csv';
        a.click();
        showToast('Export CSV réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export CSV', 'error'));
  };

  const handleExportPdf = () => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/commands/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'commands.pdf';
        a.click();
        showToast('Export PDF réussi', 'success');
      })
      .catch(() => showToast('Erreur lors de l\'export PDF', 'error'));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      NOT_DELIVERED: { label: 'Non livré', color: 'bg-orange-100 text-orange-800' },
      DELIVERED: { label: 'Livré', color: 'bg-blue-100 text-blue-800' },
      GOT_PROFIT: { label: 'Profit obtenu', color: 'bg-green-100 text-green-800' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.NOT_DELIVERED;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const columns: Column<Command>[] = [
    { header: 'N° Produits', accessor: 'productsNumber' },
    { header: 'Prix Vente', accessor: 'PrixVente', render: (value) => `${value} TND` },
    { header: 'Prix Achat', accessor: 'PrixAchat', render: (value) => `${value} TND` },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value) => getStatusBadge(value),
    },
    {
      header: 'Date Livraison',
      accessor: 'dateLivraison',
      render: (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-'),
    },
    { header: 'Adresse', accessor: 'adresseLivraison' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Commandes</h1>
        <p className="text-gray-600 mt-2">Gérez toutes les commandes</p>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par adresse..."
        onSearch={setSearch}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="NOT_DELIVERED">Non livré</option>
            <option value="DELIVERED">Livré</option>
            <option value="GOT_PROFIT">Profit obtenu</option>
          </select>
        }
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
              onClick={() => handleStatusChange(row)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier statut
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        onAdd={handleAdd}
        addButtonLabel="Ajouter une commande"
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCommand(null);
          setSelectedProducts([]);
          setDeliveryAddress('');
          setDeliveryDate(null);
          setProductsPage(1);
          setClientsPage(1);
          setCoClientsPage(1);
          setAllProducts([]);
          setAllClients([]);
          setAllCoClients([]);
        }}
        title={isEditMode ? 'Modifier la commande' : 'Ajouter une commande'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produits</label>
            <MultiSelectCheckbox
              items={allProducts}
              getOptionLabel={(product) => {
                const depotInfo = product.isDepot && product.depotPercentage
                  ? ` - Dépôt ${product.depotPercentage}%`
                  : '';
                const soldBadge = (product as any).isSold ? ' 🔴 VENDU' : '';
                return `${product.productName} - ${product.PrixVente} TND${depotInfo}${soldBadge}`;
              }}
              getOptionValue={(product) => product.id}
              selectedValues={selectedProducts}
              onChange={setSelectedProducts}
              onLoadMore={() => {
                if (productsData?.meta && productsPage < productsData.meta.totalPages) {
                  setProductsPage((prev) => prev + 1);
                }
              }}
              hasMore={productsData?.meta ? productsPage < productsData.meta.totalPages : false}
              isLoading={productsLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {selectedProducts.length} produit(s) sélectionné(s)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <InfiniteSelect
                items={allClients}
                getOptionLabel={(client) => `${client.firstName} ${client.lastName}`}
                getOptionValue={(client) => client.id}
                value={selectedClient}
                onChange={(value) => setSelectedClient(value as string)}
                onLoadMore={() => {
                  if (clientsData?.meta && clientsPage < clientsData.meta.totalPages) {
                    setClientsPage((prev) => prev + 1);
                  }
                }}
                hasMore={clientsData?.meta ? clientsPage < clientsData.meta.totalPages : false}
                isLoading={clientsLoading}
                placeholder="Sélectionner un client..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Co-Client (Optionnel)</label>
              <InfiniteSelect
                items={allCoClients}
                getOptionLabel={(coClient) => `${coClient.firstName} ${coClient.lastName}`}
                getOptionValue={(coClient) => coClient.id}
                value={selectedCoClient}
                onChange={(value) => setSelectedCoClient(value as string)}
                onLoadMore={() => {
                  if (coClientsData?.meta && coClientsPage < coClientsData.meta.totalPages) {
                    setCoClientsPage((prev) => prev + 1);
                  }
                }}
                hasMore={coClientsData?.meta ? coClientsPage < coClientsData.meta.totalPages : false}
                isLoading={coClientsLoading}
                placeholder="Sélectionner un co-client (optionnel)..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison</label>
            <DatePicker
              selected={deliveryDate}
              onChange={(date) => setDeliveryDate(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholderText="Sélectionner une date"
            />
          </div>

          <AddressMapSelector
            value={deliveryAddress}
            onChange={(address) => setDeliveryAddress(address)}
            onPositionConfirm={(lat, lng) => {
              console.log('Position confirmed:', lat, lng);
            }}
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedCommand(null);
                setSelectedProducts([]);
                setDeliveryAddress('');
                setDeliveryDate(null);
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

      {/* Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedCommand(null);
          setStatusDate(null);
        }}
        title="Modifier le statut"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau statut</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="NOT_DELIVERED">Non livré</option>
              <option value="DELIVERED">Livré</option>
              <option value="GOT_PROFIT">Profit obtenu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <DatePicker
              selected={statusDate}
              onChange={(date) => setStatusDate(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholderText="Sélectionner une date"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsStatusModalOpen(false);
                setSelectedCommand(null);
                setStatusDate(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleStatusSubmit}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CommandsPage;
