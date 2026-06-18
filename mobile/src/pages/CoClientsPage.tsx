import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetCoClientsQuery } from '../store/api/coClientApi';
import type { CoClient } from '../types';

export default function CoClientsPage() {
  return (
    <PaginatedListPage<CoClient>
      title="Déposants"
      useQuery={useGetCoClientsQuery}
      renderItem={(c) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold">
            {c.firstName} {c.lastName}
          </p>
          <p className="text-sm text-gray-500">{c.phoneNumber}</p>
          <p className="text-xs text-gray-400 truncate">RIB: {c.RIB}</p>
        </div>
      )}
    />
  );
}
