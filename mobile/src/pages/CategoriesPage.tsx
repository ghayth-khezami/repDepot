import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetCategoriesQuery } from '../store/api/categoryApi';
import type { Category } from '../types';

export default function CategoriesPage() {
  return (
    <PaginatedListPage<Category>
      title="Catégories"
      useQuery={useGetCategoriesQuery}
      renderItem={(c) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold">{c.categoryName}</p>
          {c.description ? <p className="mt-1 text-sm text-gray-500 line-clamp-2">{c.description}</p> : null}
        </div>
      )}
    />
  );
}
