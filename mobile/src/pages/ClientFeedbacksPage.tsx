import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetClientFeedbacksAdminQuery } from '../store/api/clientFeedbackApi';
import type { ClientFeedback } from '../store/api/clientFeedbackApi';

export default function ClientFeedbacksPage() {
  return (
    <PaginatedListPage<ClientFeedback>
      title="Avis clients"
      useQuery={useGetClientFeedbacksAdminQuery}
      renderItem={(f) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex justify-between">
            <p className="font-semibold">{f.clientName}</p>
            <span className="text-amber-500">{'★'.repeat(f.rating)}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 line-clamp-3">{f.description}</p>
          <p className="mt-2 text-xs text-gray-400">{f.isPublished ? 'Publié' : 'Brouillon'}</p>
        </div>
      )}
    />
  );
}
