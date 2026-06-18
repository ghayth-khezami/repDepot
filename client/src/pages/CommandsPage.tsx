import { useState, useEffect } from 'react';
import {
  useGetCommandsQuery,
  useGetCommandQuery,
  useCreateCommandMutation,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  CreateCommandDto,
  UpdateCommandDto,
} from '../store/api/commandApi';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useGetProductsQuery } from '../store/api/productApi';
import { useGetClientsQuery } from '../store/api/clientApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import AddressMapSelector from '../components/AddressMapSelector';
import InfiniteSelect from '../components/InfiniteSelect';
import MultiSelectCheckbox from '../components/MultiSelectCheckbox';
import DatePicker from 'react-datepicker';
import { Edit, Eye, Trash2 } from 'lucide-react';
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
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCommandId, setViewCommandId] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [statusDate, setStatusDate] = useState<Date | null>(null);
  const [newStatus, setNewStatus] = useState<'NOT_DELIVERED' | 'DELIVERED'>('NOT_DELIVERED');

  const { data, isLoading } = useGetCommandsQuery({
    page,
    limit,
    search,
    status: statusFilter || undefined,
  });
  const { data: viewCommand, isLoading: viewLoading } = useGetCommandQuery(viewCommandId || '', {
    skip: !viewCommandId,
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
  const isWebCommand = (command: Command | null) => {
    if (!command) return false;
    const details = (command as any).commandDetails || [];
    return details.length > 0 && details.some((d: any) => !!d.clientId) && details.every((d: any) => !d.coClientId);
  };

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedCommand(null);
    setSelectedProducts([]);
    setSelectedClient('');
    setDeliveryAddress('');
    setDeliveryDate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (command: Command) => {
    setIsEditMode(true);
    setSelectedCommand(command);
    const details = (command as any).commandDetails || [];
    const productIds = details.map((d: any) => d.productId).filter(Boolean);
    const clientId = details.find((d: any) => d.clientId)?.clientId || '';
    setSelectedProducts(productIds);
    setSelectedClient(clientId);
    setDeliveryAddress(command.adresseLivraison);
    setDeliveryDate(command.dateLivraison ? new Date(command.dateLivraison) : null);
    setIsModalOpen(true);
  };

  const handleView = (command: Command) => {
    setViewCommandId(command.id);
    setSelectedCommand(command);
    setViewOpen(true);
  };

  const handleStatusChange = (command: Command) => {
    setSelectedCommand(command);
    setNewStatus(command.status);
    setStatusDate(command.dateLivraison ? new Date(command.dateLivraison) : null);
    setIsStatusModalOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: 'Supprimer la commande',
      message: 'Êtes-vous sûr de vouloir supprimer cette commande ?',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await deleteCommand(id).unwrap();
        showToast('Commande supprimée avec succès', 'success');
      },
    });
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

    const selectedProductsData = selectedProducts
      .map((productId) => allProducts.find((p) => p.id === productId))
      .filter((p) => !!p) as any[];

    const totalPrixVente = selectedProductsData.reduce(
      (sum, product) => sum + (product.PrixVente || 0),
      0,
    );

    const totalPrixAchat = selectedProductsData.reduce((sum, product) => {
      if (product.isDepot) return sum;
      return sum + (product.PrixAchat || 0);
    }, 0);

    // Infer coClientId from selected products (first product with coClientId wins)
    const inferredCoClientId =
      selectedProductsData.find((product) => product.coclientId)?.coclientId ||
      undefined;

    const data: CreateCommandDto = {
      productsNumber: selectedProducts.length,
      PrixVente: totalPrixVente,
      PrixAchat: totalPrixAchat,
      productIds: selectedProducts,
      clientId: selectedClient,
      coClientId: inferredCoClientId,
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
          coClientId: inferredCoClientId,
          productIds: selectedProducts,
          clientId: selectedClient,
        };
        await updateCommand({ id: selectedCommand.id, data: updateData });
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
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/commands/export/csv`, {
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
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/commands/export/pdf`, {
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
    { header: 'Total', accessor: 'PrixVente', render: (value) => `${value} TND` },
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
        <h1 className="text-2xl font-bold sm:text-3xl">Gestion des Commandes</h1>
        <p className="bo-muted mt-2">Gérez toutes les commandes</p>
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
              onClick={() => handleView(row)}
              className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Voir"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStatusChange(row)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier statut
            </button>
            <button
              onClick={() => handleEdit(row)}
              disabled={isWebCommand(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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

      {dialog}

      <Modal
        isOpen={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewCommandId(null);
          setSelectedCommand(null);
        }}
        title="Détail commande"
        size="xl"
      >
        {viewLoading ? (
          <div className="text-sm text-gray-600">Chargement…</div>
        ) : viewCommand ? (
          <div className="space-y-4">
            {(() => {
              const firstClient = (viewCommand as any).commandDetails?.find((d: any) => d.client)?.client;
              return firstClient ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Client</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {firstClient.firstName} {firstClient.lastName}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Téléphone</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{firstClient.phoneNumber || '—'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Nb produits</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {(viewCommand as any).commandDetails?.length ?? 0} / {viewCommand.productsNumber}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Adresse</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewCommand.adresseLivraison}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Statut</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewCommand.status}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Total</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewCommand.PrixVente} TND</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Date livraison</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {viewCommand.dateLivraison ? new Date(viewCommand.dateLivraison).toLocaleDateString('fr-FR') : '-'}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Origine</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{isWebCommand(viewCommand) ? 'Web' : 'Backoffice'}</div>
              </div>
            </div>

            {(viewCommand as any).commandDetails?.length ? (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b px-4 py-3 text-sm font-bold text-gray-900">
                  Produits ({(viewCommand as any).commandDetails.length})
                </div>
                <div className="divide-y">
                  {(viewCommand as any).commandDetails.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {d.product?.photos?.[0]?.photoDoc ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${d.product.photos[0].photoDoc.startsWith('/') ? '' : '/'}${d.product.photos[0].photoDoc}`}
                            alt={d.product?.productName || ''}
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg border bg-gray-100" />
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{d.product?.productName || d.productId}</div>
                          <div className="text-xs text-gray-500">
                            {d.client ? `${d.client.firstName} ${d.client.lastName} - ${d.client.phoneNumber || ''}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-700">{d.product?.PrixVente ? `${d.product.PrixVente} TND` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setViewOpen(false);
                  setViewCommandId(null);
                  if (viewCommand) handleEdit(viewCommand);
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Modifier
              </button>
              <button
                onClick={() => {
                  setViewOpen(false);
                  setViewCommandId(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Commande introuvable</div>
        )}
      </Modal>

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
        {isEditMode && isWebCommand(selectedCommand) ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Commande créée depuis le web: modification limitée au statut.
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produits</label>
            {isEditMode && isWebCommand(selectedCommand) ? (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {(selectedCommand.commandDetails || []).map((d: any) => d.product?.productName || d.productId).join(', ')}
              </div>
            ) : (
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
            )}
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
                disabled={!!(isEditMode && isWebCommand(selectedCommand))}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison</label>
            <DatePicker
              selected={deliveryDate}
              onChange={(date) => setDeliveryDate(date)}
              dateFormat="dd/MM/yyyy"
              disabled={!!(isEditMode && isWebCommand(selectedCommand))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholderText="Sélectionner une date"
            />
          </div>

          <AddressMapSelector
            value={deliveryAddress}
            onChange={(address) => {
              if (isEditMode && isWebCommand(selectedCommand)) return;
              setDeliveryAddress(address);
            }}
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
              disabled={!!(isEditMode && isWebCommand(selectedCommand))}
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
