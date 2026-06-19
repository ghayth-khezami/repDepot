import { uploadUrl, formatTnd } from '../lib/apiBase';
import type { Product } from '../types';

export function ProductThumb({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const photo = product.photos?.[0]?.photoDoc;
  const src = photo ? uploadUrl(photo) : null;
  const dim = size === 'sm' ? 'h-14 w-14' : size === 'lg' ? 'h-32 w-32' : 'h-20 w-20';
  return (
    <div className={`${dim} shrink-0 overflow-hidden rounded-2xl bg-primary-50 dark:bg-slate-800`}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
      )}
    </div>
  );
}

export function ProductStatusBadge({ product }: { product: Product }) {
  const sold = product.isDispo === false || product.stockQuantity <= 0;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        sold
          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
          : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      }`}
    >
      {sold ? 'Vendu' : 'Disponible'}
    </span>
  );
}

export function ProductPrice({ value }: { value: number }) {
  return <span className="text-lg font-bold text-primary-700 dark:text-primary-300">{formatTnd(value)}</span>;
}

export function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Ajouter',
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 px-4 pt-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
      </div>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
        >
          + {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-4 py-12 text-center text-sm text-gray-500">{message}</p>;
}
