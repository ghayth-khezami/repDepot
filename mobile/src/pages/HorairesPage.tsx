import { useEffect, useState } from 'react';
import {
  useGetStoreHoursQuery,
  useUpdateStoreHoursMutation,
  type StoreHourInput,
  type Weekday,
} from '../store/api/storeHoursApi';
import { PageHeader, EmptyState } from '../components/ui';
import { PrimaryButton } from '../components/mobile-forms';
import { useToast } from '../context/ToastContext';

const dayLabels: Record<string, string> = {
  MONDAY: 'Lundi', TUESDAY: 'Mardi', WEDNESDAY: 'Mercredi', THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi', SATURDAY: 'Samedi', SUNDAY: 'Dimanche',
};

export default function HorairesPage() {
  const { data, isLoading } = useGetStoreHoursQuery();
  const [hours, setHours] = useState<StoreHourInput[]>([]);
  const [updateStoreHours, { isLoading: saving }] = useUpdateStoreHoursMutation();
  const { showToast } = useToast();

  useEffect(() => {
    if (data) {
      setHours(
        data.map((h) => ({
          weekday: h.weekday,
          isClosed: h.isClosed,
          openTime: h.openTime?.slice(0, 5) ?? '09:00',
          closeTime: h.closeTime?.slice(0, 5) ?? '18:00',
        })),
      );
    }
  }, [data]);

  const updateDay = (weekday: Weekday, patch: Partial<StoreHourInput>) => {
    setHours((prev) => prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));
  };

  const save = async () => {
    try {
      await updateStoreHours({ hours }).unwrap();
      showToast('Horaires enregistrés', 'success');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title="Horaires" subtitle="Horaires d'ouverture boutique" />
      {isLoading ? <EmptyState message="Chargement…" /> : (
        <>
          <ul className="space-y-3 px-4">
            {hours.map((h) => (
              <li key={h.weekday} className="rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dayLabels[h.weekday]}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={h.isClosed}
                      onChange={(e) => updateDay(h.weekday, { isClosed: e.target.checked })}
                    />
                    Fermé
                  </label>
                </div>
                {!h.isClosed ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="time"
                      value={h.openTime ?? '09:00'}
                      onChange={(e) => updateDay(h.weekday, { openTime: e.target.value })}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <input
                      type="time"
                      value={h.closeTime ?? '18:00'}
                      onChange={(e) => updateDay(h.weekday, { closeTime: e.target.value })}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] inset-x-4 z-40 mt-6">
            <PrimaryButton type="button" onClick={() => void save()} loading={saving}>
              Enregistrer les horaires
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
