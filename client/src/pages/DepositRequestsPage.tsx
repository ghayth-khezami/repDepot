import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileSignature, Package, PackagePlus } from 'lucide-react';
import ReusableTable, { Column } from '../components/ReusableTable';
import Modal from '../components/Modal';
import {
  DepositRequest,
  DepositRequestStatus,
  useGetDepositRequestsQuery,
  useGetDepositRequestQuery,
  useUpdateDepositRequestStatusMutation,
} from '../store/api/depositRequestApi';
import { useToast } from '../context/ToastContext';
import { uploadUrl } from '../lib/apiBase';
import { formatTnd, splitCommission, toMillimes } from '../lib/money';
import { StatusChip, buttonClass } from '../components/ui';
import ExcelButton from '../components/ExcelButton';

const statusLabel: Record<DepositRequestStatus, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contacté',
  CONFIRMED: 'Confirmé',
  CLOSED: 'Clos',
};

const statusChip: Record<DepositRequestStatus, string> = {
  PENDING: 'bg-amber-50 text-bd-amber-ink',
  CONTACTED: 'bg-violet-100 text-bd-violet-strong',
  CONFIRMED: 'bg-bd-success-bg text-bd-success',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const tnd = (v: number) => formatTnd(toMillimes(v));

/** Splits "Prénom Nom" from a web demande to prefill the stepper. */
function stepperPrefill(r: Pick<DepositRequest, 'fullName' | 'phoneNumber'>) {
  const [first, ...rest] = r.fullName.trim().split(/\s+/);
  const params = new URLSearchParams({ prenom: first ?? '', nom: rest.join(' '), tel: r.phoneNumber.replace(/\D/g, '').slice(-8) });
  return `/depots/nouveau?${params.toString()}`;
}

const DepositRequestsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { showToast } = useToast();
  const { data, isLoading } = useGetDepositRequestsQuery({
    page,
    limit,
    search,
    status: status || undefined,
  });
  const [updateStatus] = useUpdateDepositRequestStatusMutation();
  const { data: detail, isLoading: detailLoading } = useGetDepositRequestQuery(detailId || '', {
    skip: !detailId,
  });

  const setRequestStatus = async (id: string, next: DepositRequestStatus, msg: string) => {
    try {
      await updateStatus({ id, status: next }).unwrap();
      showToast(msg, 'success');
    } catch {
      showToast('Changement de statut impossible', 'error');
    }
  };

  const columns: Column<DepositRequest>[] = [
    {
      header: 'Contrat',
      accessor: (row) =>
        row.contractNumber && row.coClientId ? (
          <Link to={`/depots/${row.id}`} className="font-extrabold tabular-nums text-bd-violet-strong hover:underline">
            {row.contractNumber}
          </Link>
        ) : (
          <span className="text-xs font-bold text-bd-muted">Demande web</span>
        ),
    },
    { header: 'Nom', accessor: 'fullName' },
    { header: 'Téléphone', accessor: 'phoneNumber' },
    {
      header: 'Prix total',
      accessor: 'proposedPrice',
      render: (value) => <span className="tabular-nums">{tnd(Number(value))}</span>,
    },
    {
      header: 'Articles',
      accessor: (row) => row.products?.length || row.items?.length || (row.photos?.length ? 1 : 0),
      render: (value) => `${value} article(s)`,
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusChip[value as DepositRequestStatus] ?? ''}`}>
          {statusLabel[value as DepositRequestStatus] || value}
        </span>
      ),
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
          <p className="bo-muted mt-2">Demandes web et contrats de dépôt-vente</p>
        </div>
        <Link to="/depots/nouveau" className={buttonClass('primary', 'md', 'bd-ui')}>
          <PackagePlus className="h-4 w-4" aria-hidden />
          Nouveau dépôt
        </Link>
      </div>

      <ReusableTable
        toolbarExtra={<ExcelButton entity="deposit-requests" params={{ search, status }} compact />}
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, téléphone, n° de contrat..."
        onSearch={setSearch}
        filters={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filtrer par statut"
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
              onClick={() => setRequestStatus(row.id, 'CONTACTED', 'Demande marquée comme contactée')}
              className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            >
              Contacté
            </button>
            <button
              onClick={() => setRequestStatus(row.id, 'CONFIRMED', 'Demande confirmée')}
              className="rounded-lg bg-pink-500 px-2 py-1 text-xs text-white hover:bg-pink-600"
            >
              Confirmer
            </button>
            <button
              onClick={() => setRequestStatus(row.id, 'CLOSED', 'Demande clôturée')}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
            >
              Clore
            </button>
          </div>
        )}
      />

      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Détail demande de dépôt" size="xl">
        {detailLoading ? (
          <div className="text-sm text-gray-600">Chargement…</div>
        ) : detail ? (
          <div className="bd-ui space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['Nom', detail.fullName],
                ['Téléphone', detail.phoneNumber],
                ['Prix total', tnd(detail.proposedPrice)],
                ['Statut', statusLabel[detail.status] || detail.status],
                ...(detail.contractNumber ? [['Contrat', `${detail.contractNumber}${detail.durationMonths ? ` · ${detail.durationMonths} mois` : ''}`]] : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{k}</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 tabular-nums dark:text-gray-100">{v}</div>
                </div>
              ))}
            </div>

            {detail.message ? (
              <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Message</div>
                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{detail.message}</div>
              </div>
            ) : null}

            {detail.contractDoc ? (
              <a href={uploadUrl(detail.contractDoc)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-600 hover:underline">
                Télécharger le contrat scanné
              </a>
            ) : null}

            {detail.products?.length ? (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Articles en vente</div>
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/10 dark:border-white/10">
                  {detail.products.map((p) => {
                    const dep = p.depositorAmountMillimes ?? splitCommission(toMillimes(p.PrixVente), p.depotPercentage ?? 0).depositorMillimes;
                    return (
                      <li key={p.id} className="flex items-center gap-3 p-3">
                        {p.photos?.[0] ? (
                          <img src={uploadUrl(p.photos[0].photoDoc)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-bd-lilac/60"><Package className="h-5 w-5 text-bd-violet" aria-hidden /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-bd-ink">{p.productName}</p>
                          <p className="text-xs font-bold text-bd-muted tabular-nums">
                            {p.ref} · {tnd(p.PrixVente)} · déposant {formatTnd(dep)}
                          </p>
                        </div>
                        <StatusChip status={p.status} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {detail.items?.length ? (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Articles proposés</div>
                {detail.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{item.productName}</div>
                    <div className="mt-1 text-sm text-gray-600 tabular-nums dark:text-gray-300">
                      {tnd(item.proposedPrice)}
                      {item.commissionPercent != null ? ` · Commission ${item.commissionPercent}%` : ''}
                      {item.priceAfterCommission != null ? ` · Après commission ${tnd(item.priceAfterCommission)}` : ''}
                    </div>
                    {item.photos?.length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {item.photos.map((p) => (
                          <a key={p} href={uploadUrl(p)} target="_blank" rel="noreferrer">
                            <img src={uploadUrl(p)} alt="" className="h-24 w-full rounded-lg border object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : !detail.products?.length ? (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Photos</div>
                {detail.photos?.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {detail.photos.map((p) => (
                      <a key={p} href={uploadUrl(p)} target="_blank" rel="noreferrer">
                        <img src={uploadUrl(p)} alt="" className="h-28 w-full rounded-lg border object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">Aucune photo</div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {detail.coClientId ? (
                <button
                  type="button"
                  onClick={() => {
                    setDetailId(null);
                    navigate(`/depots/${detail.id}`);
                  }}
                  className={buttonClass('violet', 'md')}
                >
                  <FileSignature className="h-4 w-4" aria-hidden />
                  {detail.contractNumber ? 'Voir le contrat' : 'Générer le contrat'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDetailId(null);
                    navigate(stepperPrefill(detail));
                  }}
                  className={buttonClass('primary', 'md')}
                >
                  <PackagePlus className="h-4 w-4" aria-hidden />
                  Créer le dépôt
                </button>
              )}
              <button type="button" onClick={() => setDetailId(null)} className={buttonClass('secondary', 'md')}>
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
