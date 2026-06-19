import { useState } from 'react';
import { uploadUrl, formatTnd } from '../lib/apiBase';
import type { Product } from '../types';

function productPhotoSrc(product: Product): string | null {
  const doc = product.photos?.[0]?.photoDoc;
  return doc ? uploadUrl(doc) : null;
}

export function ProductThumb({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const src = productPhotoSrc(product);
  const dim = size === 'sm' ? 'h-14 w-14' : size === 'lg' ? 'h-32 w-32' : 'h-20 w-20';
  return (
    <div className={`${dim} shrink-0 overflow-hidden rounded-2xl bg-primary-50 dark:bg-slate-800`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
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
  addDisabled = false,
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
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
          disabled={addDisabled}
          className="shrink-0 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
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

export function ListSkeleton({ count = 5, withThumb = true }: { count?: number; withThumb?: boolean }) {
  return (
    <ul className="mt-4 space-y-2 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-2xl border border-primary-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          {withThumb ? <div className="h-20 w-20 shrink-0 rounded-2xl bg-gray-200 dark:bg-slate-700" /> : null}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="h-3 w-1/3 rounded-lg bg-gray-100 dark:bg-slate-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Product list row skeleton — matches ProductsPage card layout */
export function ProductCardSkeleton({ count = 6 }: { count?: number }) {
  return <ListSkeleton count={count} withThumb />;
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="mt-3 h-6 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}
