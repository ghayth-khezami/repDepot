import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetDepositRequestsQuery } from '../store/api/depositRequestApi';
import type { DepositRequest } from '../store/api/depositRequestApi';
import { formatTnd } from '../lib/apiBase';

const statusLabel: Record<string, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contacté',
  CONFIRMED: 'Confirmé',
  CLOSED: 'Clôturé',
};

export default function DepositRequestsPage() {
  return (
    <PaginatedListPage<DepositRequest>
      title="Demandes de dépôt"
      useQuery={useGetDepositRequestsQuery}
      renderItem={(r) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex justify-between gap-2">
            <p className="font-semibold">{r.fullName}</p>
            <span className="text-xs font-bold uppercase text-primary-600">{statusLabel[r.status] ?? r.status}</span>
          </div>
          <p className="text-sm text-gray-500">{r.phoneNumber}</p>
          <p className="text-sm font-medium text-primary-700">{formatTnd(r.proposedPrice)}</p>
        </div>
      )}
    />
  );
}
