import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useGetCommandQuery,
  useCreateCommandMutation,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useDeleteAllCommandsMutation,
  CreateCommandDto,
  UpdateCommandDto,
  type CommandStatus,
} from '../store/api/commandApi';
import CommandsList, { OrderStatusControl } from '../features/commands/CommandsList';
import { uploadUrl } from '../lib/apiBase';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useLazyGetProductQuery } from '../store/api/productApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import Modal from '../components/Modal';
import AddressMapSelector from '../components/AddressMapSelector';
import ClientCombobox from '../features/commands/ClientCombobox';
import ProductMultiPicker from '../features/commands/ProductMultiPicker';
import DatePicker from 'react-datepicker';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Command } from '../store/api/commandApi';
import ExcelButton from '../components/ExcelButton';

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
  const [newStatus, setNewStatus] = useState<CommandStatus>('NOT_DELIVERED');


  const { data: viewCommand, isLoading: viewLoading } = useGetCommandQuery(viewCommandId || '', {
    skip: !viewCommandId,
  });

  // Infinite scroll for products
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [getProduct] = useLazyGetProductQuery();
  const { showToast } = useToast();


  // Infinite scroll for co-clients
  const [coClientsPage, setCoClientsPage] = useState(1);
  const { data: coClientsData, isLoading: coClientsLoading } = useGetCoClientsQuery({ limit: 10, page: coClientsPage });
  const [allCoClients, setAllCoClients] = useState<any[]>([]);


  // From a notification: /commands?id=<order> opens that order's detail.
  const [params, setParams] = useSearchParams();
  const openId = params.get('id');
  useEffect(() => {
    if (!openId) return;
    setViewCommandId(openId);
    setViewOpen(true);
    const next = new URLSearchParams(params);
    next.delete('id');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get('productId');
    if (!productId) return;
    void getProduct(productId).unwrap().then((product) => {
      setAllProducts((previous) => previous.some((item) => item.id === product.id) ? previous : [product, ...previous]);
      setIsEditMode(false);
      setSelectedCommand(null);
      setSelectedProducts([product.id]);
      setIsModalOpen(true);
      window.history.replaceState({}, '', '/commands');
    }).catch(() => showToast('Produit introuvable', 'error'));
  }, [getProduct, showToast]);


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
  const [deleteAllCommands] = useDeleteAllCommandsMutation();
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
    // Full product rows for the chips and the totals.
    void Promise.all(productIds.map((pid: string) => getProduct(pid).unwrap().catch(() => null))).then((rows) =>
      setAllProducts((prev) => [...prev.filter((x) => !productIds.includes(x.id)), ...(rows.filter(Boolean) as any[])]),
    );
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
      if (isEditMode && selectedCommand && isWebCommand(selectedCommand)) {
        await updateCommand({ id: selectedCommand.id, data: { adresseLivraison: deliveryAddress, dateLivraison: deliveryDate ? deliveryDate.toISOString() : undefined } }).unwrap();
        showToast('Commande modifiée', 'success');
      } else if (isEditMode && selectedCommand) {
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



  return (
    <div>
      <CommandsList
        onOpen={handleView}
        onAdd={handleAdd}
        headerExtra={
          <div className="hidden items-center gap-2 md:flex">
            <ExcelButton entity="commands" params={{ search, status: statusFilter }} compact />
            <button type="button" onClick={handleExportCsv} className="bd-focus min-h-[44px] rounded-2xl border border-bd-line/10 bg-bd-surface px-3 text-sm font-extrabold text-bd-ink shadow-card">CSV</button>
            <button type="button" onClick={handleExportPdf} className="bd-focus min-h-[44px] rounded-2xl border border-bd-line/10 bg-bd-surface px-3 text-sm font-extrabold text-bd-ink shadow-card">PDF</button>
          </div>
        }
      />

      {dialog}

      <Modal
        isOpen={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewCommandId(null);
          setSelectedCommand(null);
        }}
        title="Détail de la commande"
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
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Articles</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {(viewCommand as any).commandDetails?.length ?? 0} / {viewCommand.productsNumber}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Adresse de livraison</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewCommand.adresseLivraison || 'Non renseignée'}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Statut</div>
                <div className="bd-ui mt-1"><OrderStatusControl command={viewCommand} /></div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Total</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{viewCommand.PrixVente} TND</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Date de livraison</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {viewCommand.dateLivraison ? new Date(viewCommand.dateLivraison).toLocaleDateString('fr-FR') : '-'}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Origine</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{isWebCommand(viewCommand) ? 'Site web' : 'Boutique (backoffice)'}</div>
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
                            src={uploadUrl(d.product.photos[0].photoDoc)}
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

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const id = viewCommand.id;
                  setViewOpen(false);
                  setViewCommandId(null);
                  handleDelete(id);
                }}
                className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <button
                onClick={() => {
                  setViewOpen(false);
                  setViewCommandId(null);
                  if (viewCommand) handleEdit(viewCommand);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" /> Modifier
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
          setCoClientsPage(1);
          setAllProducts([]);
          setAllCoClients([]);
        }}
        title={isEditMode ? 'Modifier la commande' : 'Ajouter une commande'}
        size="xl"
      >
        {isEditMode && isWebCommand(selectedCommand) ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Commande passée sur le site : seuls le statut, la date et l'adresse de livraison sont modifiables.
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
              <ProductMultiPicker
                value={selectedProducts}
                selectedProducts={allProducts}
                onChange={(ids, picked) => {
                  setSelectedProducts(ids);
                  setAllProducts((prev) => [...prev.filter((x) => !picked.some((p) => p.id === x.id)), ...picked]);
                }}
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedProducts.length} produit(s) sélectionné(s)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <ClientCombobox
                value={selectedClient}
                onChange={(id) => setSelectedClient(id)}
                address={deliveryAddress}
                disabled={!!(isEditMode && isWebCommand(selectedCommand))}
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
            marker="order"
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
              {isEditMode ? 'Enregistrer' : 'Créer la commande'}
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
              <option value="NOT_DELIVERED">Reçue</option>
              <option value="ACCEPTED">Acceptée</option>
              <option value="DELIVERED">Livrée</option>
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
