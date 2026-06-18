import { PaginatedListPage } from '../components/PaginatedListPage';
import { useGetMarksInfiniteQuery } from '../store/api/markApi';
import { uploadUrl } from '../lib/apiBase';

interface Mark {
  id: string;
  name: string;
  logoDoc: string;
}

export default function MarksPage() {
  return (
    <PaginatedListPage<Mark>
      title="Marques"
      useQuery={useGetMarksInfiniteQuery}
      renderItem={(m) => (
        <div className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {m.logoDoc ? (
            <img src={uploadUrl(m.logoDoc)} alt="" className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary-50" />
          )}
          <p className="font-semibold">{m.name}</p>
        </div>
      )}
    />
  );
}
