import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetUsersQuery } from '../store/api/userApi';

interface UserRow {
  id: string;
  email: string;
  username?: string;
}

export default function UsersPage() {
  return (
    <PaginatedListPage<UserRow>
      title="Utilisateurs"
      useQuery={useGetUsersQuery}
      renderItem={(u) => (
        <div className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold">{u.username || u.email}</p>
          <p className="text-sm text-gray-500">{u.email}</p>
        </div>
      )}
    />
  );
}
