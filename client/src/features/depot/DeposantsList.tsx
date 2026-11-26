import { useMemo, useState } from 'react';
import { ArrowRight, FileSpreadsheet, FileText, UserPlus, Users } from 'lucide-react';
import { useGetCoClientsFeedInfiniteQuery } from '../../store/api/coClientApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { downloadAuthed } from '../../lib/download';
import { cn } from '../../lib/cn';
import { exportPath } from '../../components/ExcelButton';
import { EmptyState, Fab, InfiniteSentinel, ListRow, PageHeader, SearchBar, SegmentedFilter, Skeleton } from '../../components/ui';
import type { DeposantSummary } from '../../store/api/depotApi';
import type { CoClient } from '../../types';
import DeposantSuivi from './DeposantSuivi';

type Row = CoClient & { _count?: { products: number; depositRequests: number } };
type Seg = 'all' | 'with' | 'without';

const fmtPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');
const AVATAR = ['bg-emerald-100 text-emerald-700', 'bg-pink-100 text-pink-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700'];

/**
 * Déposants (first screen of "Dépôt"): search, Tous / Avec articles / Sans article, Excel + PDF,
 * compact rows (tap = suivi, → = new dépôt), infinite scroll, one "Nouveau déposant" button.
 */
export default function DeposantsList({ onPick, onNew, onDictate }: { onPick: (d: DeposantSummary) => void; onNew: () => void; onDictate: () => void }) {
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim(), 300);
  const [seg, setSeg] = useState<Seg>('all');
  const [suiviId, setSuiviId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();
  const feed = useGetCoClientsFeedInfiniteQuery({ search: search || undefined, articles: seg });
  const pages = feed.data?.pages ?? [];
  const rows = useMemo(() => pages.flatMap((p) => p.data) as Row[], [pages]);
  const meta = pages[0]?.meta;

  const pick = (r: Row) =>
    onPick({
      id: r.id,
      number: r.number ?? 0,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phoneNumber,
      productsCount: r._count?.products ?? 0,
      contractsCount: r._count?.depositRequests ?? 0,
    });

  const download = async (key: string, path: string, name: string) => {
    setBusy(key);
    try {
      await downloadAuthed(path, name);
    } catch (e) {
      showToast((e as Error).message || 'Téléchargement impossible', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bd-ui mx-auto max-w-3xl pb-24">
      {suiviId ? <DeposantSuivi id={suiviId} onClose={() => setSuiviId(null)} /> : null}
      <PageHeader eyebrow="Dépôt-vente" title="Déposants" onDictate={onDictate} />

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Nom, téléphone, email ou RIB" />
        <SegmentedFilter<Seg>
          label="Filtrer les déposants"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'all', label: 'Tous', count: meta?.counts?.all },
            { value: 'with', label: 'Avec articles', count: meta?.counts?.with },
            { value: 'without', label: 'Sans article', count: meta?.counts?.without },
          ]}
        />
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-bd-muted tabular-nums">{meta ? `${meta.total} déposant${meta.total > 1 ? 's' : ''}` : ' '}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy === 'xlsx'}
            onClick={() => void download('xlsx', exportPath('co-clients', { search }), 'deposants.xlsx')}
            className="bd-focus inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-bd-success-bg px-3 text-sm font-extrabold text-bd-success disabled:opacity-60"
          >
            <FileSpreadsheet size={16} aria-hidden /> Excel
          </button>
          <button
            type="button"
            disabled={busy === 'pdf'}
            onClick={() => void download('pdf', '/co-clients/export/pdf', 'deposants.pdf')}
            className="bd-focus inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-bd-blush px-3 text-sm font-extrabold text-bd-pink-strong disabled:opacity-60"
          >
            <FileText size={16} aria-hidden /> PDF
          </button>
        </div>
      </div>

      {feed.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
      ) : rows.length ? (
        <ul className={cn('space-y-2 transition-opacity', feed.isFetching && !feed.isFetchingNextPage && 'opacity-60')}>
          {rows.map((r, i) => {
            const n = r._count?.products ?? 0;
            return (
              <ListRow
                key={r.id}
                onClick={() => setSuiviId(r.id)}
                thumb={
                  <span className={cn('flex h-full w-full items-center justify-center rounded-full text-sm font-black', AVATAR[i % AVATAR.length])}>
                    {r.firstName[0]}
                    {r.lastName[0]}
                  </span>
                }
                title={`${r.firstName} ${r.lastName}`}
                subtitle={<span className="tabular-nums">{r.number ? `N° ${r.number} · ` : ''}{fmtPhone(r.phoneNumber)}</span>}
                trailing={
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold', n ? 'bg-violet-100 text-bd-violet-strong dark:bg-violet-500/20' : 'bg-bd-bg text-bd-muted')}>
                      {n ? `${n} art.` : 'Aucun'}
                    </span>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      aria-label={`Nouveau dépôt pour ${r.firstName}`}
                      className="bd-focus flex h-11 w-11 items-center justify-center rounded-xl bg-grad-pink-strong text-white shadow-glow-pink active:scale-90"
                    >
                      <ArrowRight size={18} aria-hidden />
                    </button>
                  </div>
                }
              />
            );
          })}
          <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
        </ul>
      ) : (
        <EmptyState icon={Users} title={search ? 'Aucun déposant trouvé' : seg === 'without' ? 'Tous les déposants ont des articles' : 'Aucun déposant pour le moment'}>
          {search ? `Rien ne correspond à « ${search} ».` : 'Créez-le en 3 champs, ou dictez-le avec ✦ Dicter.'}
        </EmptyState>
      )}

      <Fab icon={UserPlus} label="Nouveau déposant" onClick={onNew} />
    </div>
  );
}
