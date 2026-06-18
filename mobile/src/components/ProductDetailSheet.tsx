import { X } from 'lucide-react';
import { formatTnd } from '../lib/apiBase';
import type { Product } from '../types';
import { ProductPrice, ProductStatusBadge, ProductThumb } from './ui';

export function ProductDetailSheet({
  product,
  onClose,
  onMarkSold,
}: {
  product: Product;
  onClose: () => void;
  onMarkSold: () => void;
}) {
  const sold = product.isDispo === false || product.stockQuantity <= 0;

  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} aria-label="Fermer" />
      <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold pr-8">{product.productName}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-4">
          <ProductThumb product={product} size="lg" />
          <div className="flex-1 space-y-2">
            <ProductPrice value={product.PrixVente} />
            <ProductStatusBadge product={product} />
            {product.barcode ? (
              <p className="text-xs text-gray-500">
                Code-barres: <span className="font-mono font-semibold">{product.barcode}</span>
              </p>
            ) : null}
            {product.category ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{product.category.categoryName}</p>
            ) : null}
            {product.coClient ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Déposant: {product.coClient.firstName} {product.coClient.lastName}
              </p>
            ) : null}
            <p className="text-sm text-gray-500">Stock: {product.stockQuantity}</p>
            {product.PrixAchat != null ? (
              <p className="text-xs text-gray-400">Prix achat: {formatTnd(product.PrixAchat)}</p>
            ) : null}
          </div>
        </div>

        {!sold ? (
          <button
            type="button"
            onClick={onMarkSold}
            className="mt-6 w-full rounded-2xl bg-orange-600 py-4 font-bold text-white shadow-lg"
          >
            Marquer comme vendu
          </button>
        ) : (
          <p className="mt-6 rounded-2xl bg-gray-100 py-4 text-center text-sm font-semibold text-gray-600 dark:bg-slate-800">
            Ce produit est déjà vendu / en rupture
          </p>
        )}
      </div>
    </>
  );
}
