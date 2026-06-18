import { useGetStoreHoursQuery } from '../store/api/storeHoursApi';
import { PageHeader, EmptyState } from '../components/ui';

const dayLabels: Record<string, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche',
};

export default function HorairesPage() {
  const { data, isLoading } = useGetStoreHoursQuery();

  return (
    <div className="pb-6">
      <PageHeader title="Horaires" subtitle="Horaires d'ouverture boutique" />
      {isLoading ? (
        <EmptyState message="Chargement…" />
      ) : (
        <ul className="space-y-2 px-4">
          {(data ?? []).map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-2xl border border-primary-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="font-medium">{dayLabels[h.weekday] ?? h.weekday}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {h.isClosed ? 'Fermé' : `${h.openTime?.slice(0, 5)} – ${h.closeTime?.slice(0, 5)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
