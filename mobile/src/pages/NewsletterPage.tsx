import { useGetNewsletterContactsQuery } from '../store/api/newsletterApi';
import { PaginatedListPage } from '../components/PaginatedListPage';
import type { NewsletterContact } from '../store/api/newsletterApi';

function useNewsletterListQuery(args: { page: number; limit: number; search?: string }) {
  return useGetNewsletterContactsQuery({
    page: args.page,
    limit: args.limit,
    search: args.search,
  });
}

export default function NewsletterPage() {
  return (
    <PaginatedListPage<NewsletterContact>
      title="Newsletter"
      useQuery={useNewsletterListQuery}
      renderItem={(c) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-medium">{c.email}</p>
          <p className="text-xs text-gray-400">{c.source}</p>
        </div>
      )}
    />
  );
}
