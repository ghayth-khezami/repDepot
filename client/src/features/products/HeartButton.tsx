import { Heart } from 'lucide-react';
import { useGetFeaturedProductIdsQuery, useSetFeaturedProductsMutation } from '../../store/api/featuredProductApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';

export const MAX_FAVORITES = 8;

/** A liked product = a "coup de cœur" shown on the boutique home page (max 8). */
export function useFavorites() {
  const { data: ids = [] } = useGetFeaturedProductIdsQuery();
  const [save, { isLoading }] = useSetFeaturedProductsMutation();
  const { showToast } = useToast();
  const toggle = async (id: string, name?: string) => {
    const liked = ids.includes(id);
    if (!liked && ids.length >= MAX_FAVORITES) {
      showToast(`Maximum ${MAX_FAVORITES} coups de cœur : retirez-en un avant d'en ajouter.`, 'warning', 5000);
      return;
    }
    try {
      await save(liked ? ids.filter((x) => x !== id) : [...ids, id]).unwrap();
      showToast(liked ? `${name ?? 'Produit'} retiré des coups de cœur` : `${name ?? 'Produit'} ajouté aux coups de cœur 💖`, 'success');
    } catch (e) {
      showToast(apiErrorMessage(e, 'Coup de cœur impossible'), 'error');
    }
  };
  return { ids, isLiked: (id: string) => ids.includes(id), toggle, saving: isLoading };
}

export default function HeartButton({ productId, name, className }: { productId: string; name?: string; className?: string }) {
  const { isLiked, toggle, saving } = useFavorites();
  const liked = isLiked(productId);
  return (
    <button
      type="button"
      disabled={saving}
      aria-pressed={liked}
      aria-label={liked ? `Retirer ${name ?? ''} des coups de cœur` : `Ajouter ${name ?? ''} aux coups de cœur`}
      title={liked ? 'Coup de cœur' : 'Ajouter aux coups de cœur'}
      onClick={(e) => {
        e.stopPropagation();
        void toggle(productId, name);
      }}
      className={cn('bd-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-90', liked ? 'text-bd-pink-strong' : 'text-bd-muted hover:text-bd-pink', className)}
    >
      <Heart size={19} fill={liked ? 'currentColor' : 'none'} aria-hidden className={cn(liked && 'bd-heart-pop')} />
    </button>
  );
}
