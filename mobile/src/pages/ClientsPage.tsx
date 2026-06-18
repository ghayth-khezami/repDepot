import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetClientsQuery } from '../store/api/clientApi';
import type { Client } from '../types';

export default function ClientsPage() {
  return (
    <PaginatedListPage<Client>
      title="Clients"
      useQuery={useGetClientsQuery}
      renderItem={(c) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold">
            {c.firstName} {c.lastName}
          </p>
          <p className="text-sm text-gray-500">{c.email}</p>
          <p className="text-sm text-gray-500">{c.phoneNumber}</p>
        </div>
      )}
    />
  );
}
