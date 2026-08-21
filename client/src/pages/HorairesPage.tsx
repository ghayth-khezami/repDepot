import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  StoreHourInput,
  Weekday,
  useGetStoreHoursQuery,
  useUpdateStoreHoursMutation,
} from '../store/api/storeHoursApi';
import { useToast } from '../context/ToastContext';

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'MONDAY', label: 'Lundi' },
  { key: 'TUESDAY', label: 'Mardi' },
  { key: 'WEDNESDAY', label: 'Mercredi' },
  { key: 'THURSDAY', label: 'Jeudi' },
  { key: 'FRIDAY', label: 'Vendredi' },
  { key: 'SATURDAY', label: 'Samedi' },
  { key: 'SUNDAY', label: 'Dimanche' },
];

type RowState = {
  isClosed: boolean;
  openTime: string;
  closeTime: string;
};

const HorairesPage = () => {
  const { data, isLoading } = useGetStoreHoursQuery();
  const [updateHours, { isLoading: saving }] = useUpdateStoreHoursMutation();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Record<Weekday, RowState>>({} as Record<Weekday, RowState>);
  const [baseline, setBaseline] = useState('');

  useEffect(() => {
    if (!data?.length) return;
    const next = {} as Record<Weekday, RowState>;
    for (const d of WEEKDAYS) {
      const row = data.find((h) => h.weekday === d.key);
      next[d.key] = {
        isClosed: row?.isClosed ?? false,
        openTime: row?.openTime ?? '09:00',
        closeTime: row?.closeTime ?? '19:00',
      };
    }
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [data]);

  const isDirty = baseline && JSON.stringify(rows) !== baseline;

  const toggleClosed = (weekday: Weekday) => {
    setRows((prev) => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        isClosed: !prev[weekday]?.isClosed,
      },
    }));
  };

  const setTime = (weekday: Weekday, field: 'openTime' | 'closeTime', value: string) => {
    setRows((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], [field]: value },
    }));
  };

  const handleSave = async () => {
    const hours: StoreHourInput[] = WEEKDAYS.map((d) => {
      const r = rows[d.key];
      return {
        weekday: d.key,
        isClosed: r.isClosed,
        openTime: r.isClosed ? undefined : r.openTime,
        closeTime: r.isClosed ? undefined : r.closeTime,
      };
    });
    try {
      await updateHours({ hours }).unwrap();
      setBaseline(JSON.stringify(rows));
      showToast('Horaires enregistrés', 'success');
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  if (isLoading || !Object.keys(rows).length) {
    return <p className="text-gray-600">Chargement des horaires…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-8 w-8 text-purple-700" />
        <div>
          <h1 className="text-2xl font-bold">Horaires du magasin</h1>
          <p className="bo-muted text-sm">
            Cliquez sur <span className="font-semibold">Fermé</span> pour marquer un jour comme fermé (affiché sur la vitrine).
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-purple-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Jour</th>
              <th className="px-4 py-3 font-semibold">Ouverture</th>
              <th className="px-4 py-3 font-semibold">Fermeture</th>
              <th className="px-4 py-3 font-semibold text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((d) => {
              const r = rows[d.key];
              return (
                <tr key={d.key} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.label}</td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={r.openTime}
                      disabled={r.isClosed}
                      onChange={(e) => setTime(d.key, 'openTime', e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={r.closeTime}
                      disabled={r.isClosed}
                      onChange={(e) => setTime(d.key, 'closeTime', e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleClosed(d.key)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                        r.isClosed
                          ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                          : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 hover:bg-red-50 hover:text-red-700'
                      }`}
                    >
                      {r.isClosed ? 'Fermé' : 'Ouvert'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="rounded-xl bg-pink-500 px-6 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-60"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer les horaires'}
      </button>
    </div>
  );
};

export default HorairesPage;
