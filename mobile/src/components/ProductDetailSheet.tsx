import { Download, Edit2, Trash2, X } from 'lucide-react';
import { formatTnd } from '../lib/apiBase';
import { downloadProductLabel } from '../lib/download';
import type { Product } from '../types';
import { ProductPrice, ProductStatusBadge, ProductThumb } from './ui';
import { useToast } from '../context/ToastContext';

export function ProductDetailSheet({
  product,
  onClose,
  onMarkSold,
  onEdit,
  onDelete,
}: {
  product: Product;
  onClose: () => void;
  onMarkSold: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const sold = product.isDispo === false || product.stockQuantity <= 0;
  const { showToast } = useToast();

  const handleDownloadLabel = async () => {
    try {
      await downloadProductLabel(product.id, product.productName);
      showToast('Étiquette PDF téléchargée', 'success');
    } catch {
      showToast('Erreur téléchargement PDF', 'error');
    }
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} aria-label="Fermer" />
      <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold pr-8">{product.productName}</h2>
          <div className="flex gap-1">
            {onEdit ? (
              <button type="button" onClick={onEdit} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Modifier">
                <Edit2 size={18} />
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" onClick={onDelete} className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800" aria-label="Supprimer">
                <Trash2 size={18} />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>
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

        <button
          type="button"
          onClick={() => void handleDownloadLabel()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-200 py-3 font-semibold text-primary-700 dark:border-slate-600 dark:text-primary-300"
        >
          <Download size={18} />
          Télécharger étiquette PDF (code-barres)
        </button>

        {!sold ? (
          <button
            type="button"
            onClick={onMarkSold}
            className="mt-3 w-full rounded-2xl bg-orange-600 py-4 font-bold text-white shadow-lg"
          >
            Marquer comme vendu
          </button>
        ) : (
          <p className="mt-3 rounded-2xl bg-gray-100 py-4 text-center text-sm font-semibold text-gray-600 dark:bg-slate-800">
            Ce produit est déjà vendu / en rupture
          </p>
        )}
      </div>
    </>
  );
}
