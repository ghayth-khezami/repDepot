import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import InfiniteSelect from '../components/InfiniteSelect';
import {
  DepositRequest,
  DepositRequestStatus,
  useCreateDepositRequestAdminMutation,
  useGetDepositRequestsQuery,
  useGetDepositRequestQuery,
  useUpdateDepositRequestStatusMutation,
} from '../store/api/depositRequestApi';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import { useToast } from '../context/ToastContext';

type DraftItem = {
  productName: string;
  proposedPrice: string;
  commissionPercent: string;
  priceAfterCommission: string;
  photos: File[];
};

const emptyItem = (): DraftItem => ({
  productName: '',
  proposedPrice: '',
  commissionPercent: '',
  priceAfterCommission: '',
  photos: [],
});

const statusLabel: Record<DepositRequestStatus, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contacté',
  CONFIRMED: 'Confirmé',
  CLOSED: 'Clos',
};

const DepositRequestsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [coClientId, setCoClientId] = useState('');
  const [message, setMessage] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [coClientsPage, setCoClientsPage] = useState(1);
  const [allCoClients, setAllCoClients] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const { showToast } = useToast();
  const { data, isLoading } = useGetDepositRequestsQuery({
    page,
    limit,
    search,
    status: status || undefined,
  });
  const [updateStatus] = useUpdateDepositRequestStatusMutation();
  const [createAdmin, { isLoading: creating }] = useCreateDepositRequestAdminMutation();
  const { data: detail, isLoading: detailLoading } = useGetDepositRequestQuery(detailId || '', {
    skip: !detailId,
  });
  const { data: coClientsData, isLoading: coClientsLoading } = useGetCoClientsQuery({
    page: coClientsPage,
    limit: 10,
  });

  useEffect(() => {
    if (coClientsData?.data) {
      setAllCoClients((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const next = [...prev];
        for (const c of coClientsData.data) {
          if (!ids.has(c.id)) next.push(c);
        }
        return next;
      });
    }
  }, [coClientsData]);

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_URL || 'http://localhost:3000') as string,
    []
  );

  const photoUrl = (p: string) =>
    p.startsWith('http') ? p : `${apiBaseUrl}${p.startsWith('/') ? '' : '/'}${p}`;

  const resetCreate = () => {
    setCoClientId('');
    setMessage('');
    setContractFile(null);
    setItems([emptyItem()]);
    setCoClientsPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coClientId) {
      showToast('Sélectionnez un déposant', 'error');
      return;
    }
    const payloadItems = items
      .map((it) => ({
        productName: it.productName.trim(),
        proposedPrice: Number(it.proposedPrice),
        commissionPercent: it.commissionPercent ? Number(it.commissionPercent) : undefined,
        priceAfterCommission: it.priceAfterCommission ? Number(it.priceAfterCommission) : undefined,
      }))
      .filter((it) => it.productName && !Number.isNaN(it.proposedPrice));
    if (!payloadItems.length) {
      showToast('Ajoutez au moins un produit', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('coClientId', coClientId);
    if (message.trim()) fd.append('message', message.trim());
    fd.append('items', JSON.stringify(payloadItems));
    if (contractFile) fd.append('contract', contractFile);
    items.forEach((it, index) => {
      it.photos.forEach((file) => fd.append(`itemPhotos_${index}`, file));
    });

    try {
      await createAdmin(fd).unwrap();
      showToast('Demande créée avec succès', 'success');
      setCreateOpen(false);
      resetCreate();
    } catch {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const columns: Column<DepositRequest>[] = [
    { header: 'Nom', accessor: 'fullName' },
    { header: 'Téléphone', accessor: 'phoneNumber' },
    {
      header: 'Prix total',
      accessor: 'proposedPrice',
      render: (value) => `${value} TND`,
    },
    {
      header: 'Articles',
      accessor: (row) => row.items?.length ?? (row.photos?.length ? 1 : 0),
      render: (value) => `${value} article(s)`,
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value) => statusLabel[value as DepositRequestStatus] || value,
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Demandes de dépôt</h1>
          <p className="bo-muted mt-2">Demandes web et créations administrateur</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetCreate();
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Créer une demande
        </button>
      </div>

      <ReusableTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, téléphone, message..."
        onSearch={setSearch}
        filters={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="CONTACTED">Contacté</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="CLOSED">Clos</option>
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDetailId(row.id)}
              className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800"
            >
              Voir
            </button>
            <button
              onClick={async () => {
                await updateStatus({ id: row.id, status: 'CONTACTED' });
                showToast('Demande marquée comme contactée', 'success');
              }}
              className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            >
              Contacté
            </button>
            <button
              onClick={async () => {
                await updateStatus({ id: row.id, status: 'CONFIRMED' });
                showToast('Demande confirmée', 'success');
              }}
              className="rounded-lg bg-pink-500 px-2 py-1 text-xs text-white hover:bg-pink-600"
            >
              Confirmer
            </button>
            <button
              onClick={async () => {
                await updateStatus({ id: row.id, status: 'CLOSED' });
                showToast('Demande clôturée', 'success');
              }}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
            >
              Clore
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreate();
        }}
        title="Créer une demande de dépôt"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Déposant</label>
            <InfiniteSelect
              items={allCoClients}
              getOptionLabel={(c) => `${c.firstName} ${c.lastName}`}
              getOptionValue={(c) => c.id}
              value={coClientId}
              onChange={(v) => setCoClientId(v as string)}
              onLoadMore={() => {
                if (coClientsData?.meta && coClientsPage < coClientsData.meta.totalPages) {
                  setCoClientsPage((p) => p + 1);
                }
              }}
              hasMore={coClientsData?.meta ? coClientsPage < coClientsData.meta.totalPages : false}
              isLoading={coClientsLoading}
              placeholder="Sélectionner un déposant…"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message (optionnel)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contrat (PDF ou image)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Produits</h3>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                + Ajouter un produit
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Produit {index + 1}
                  </span>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <input
                  required
                  placeholder="Nom du produit"
                  value={item.productName}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === index ? { ...it, productName: e.target.value } : it)),
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Prix proposé (TND)"
                    value={item.proposedPrice}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) => (i === index ? { ...it, proposedPrice: e.target.value } : it)),
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Commission %"
                    value={item.commissionPercent}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, commissionPercent: e.target.value } : it,
                        ),
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Prix après commission"
                    value={item.priceAfterCommission}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, priceAfterCommission: e.target.value } : it,
                        ),
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setItems((prev) =>
                      prev.map((it, i) => (i === index ? { ...it, photos: files } : it)),
                    );
                  }}
                  className="text-sm"
                />
                {item.photos.length > 0 ? (
                  <p className="text-xs text-gray-500">{item.photos.length} photo(s) sélectionnée(s)</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetCreate();
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {creating ? 'Création…' : 'Créer la demande'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        title="Détail demande de dépôt"
        size="xl"
      >
        {detailLoading ? (
          <div className="text-sm text-gray-600">Chargement…</div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Nom</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{detail.fullName}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Téléphone</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{detail.phoneNumber}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Prix total</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{detail.proposedPrice} TND</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Statut</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {statusLabel[detail.status] || detail.status}
                </div>
              </div>
            </div>

            {detail.message ? (
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Message</div>
                <div className="mt-1 text-sm text-gray-900">{detail.message}</div>
              </div>
            ) : null}

            {detail.contractDoc ? (
              <div>
                <a
                  href={photoUrl(detail.contractDoc)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary-600 hover:underline"
                >
                  Télécharger le contrat
                </a>
              </div>
            ) : null}

            {detail.items?.length ? (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Articles</div>
                {detail.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="font-semibold text-gray-900">{item.productName}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {item.proposedPrice} TND
                      {item.commissionPercent != null ? ` · Commission ${item.commissionPercent}%` : ''}
                      {item.priceAfterCommission != null
                        ? ` · Après commission ${item.priceAfterCommission} TND`
                        : ''}
                    </div>
                    {item.photos?.length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {item.photos.map((p) => (
                          <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                            <img src={photoUrl(p)} alt="" className="h-24 w-full rounded-lg border object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Photos</div>
                {detail.photos?.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {detail.photos.map((p) => (
                      <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                        <img src={photoUrl(p)} alt="" className="h-28 w-full rounded-lg border object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">Aucune photo</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (!detailId) return;
                  setDetailId(null);
                  navigate(`/products?fromRequest=${encodeURIComponent(detailId)}`);
                }}
                className="rounded-lg bg-pink-500 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-600"
              >
                Passer au produit
              </button>
              <button
                onClick={() => setDetailId(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Introuvable</div>
        )}
      </Modal>
    </div>
  );
};

export default DepositRequestsPage;
