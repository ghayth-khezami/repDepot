import { useAuth } from '../context/AuthContext';
import { useGetLatestDepotQuery } from '../store/api/depotApi';
import { useGetProductsQuery } from '../store/api/productApi';

/** "Mme Khezami" — last word of the admin's username, else the default shop owner. */
function addressee(username?: string) {
  const last = username?.trim().split(/\s+/).pop();
  return `Mme ${last && last.length > 1 && !last.includes('@') ? last.charAt(0).toUpperCase() + last.slice(1) : 'Khezami'}`;
}

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} jours`;
}

/**
 * Opening line of every assistant, said before the first question:
 * « Salut Mme Khezami, vous venez d'ajouter le dépôt de Karim Ben Ahmed (4 articles), il y a 2 heures. »
 */
/** Returns null while the latest activity is still loading (assistants wait for it before speaking). */
export function useAssistantGreeting(kind: 'depot' | 'product' | 'generic', enabled = true, title?: string): string | null {
  const { user } = useAuth();
  const latestDepot = useGetLatestDepotQuery(undefined, { skip: !enabled || kind !== 'depot', refetchOnMountOrArgChange: true });
  const latestProduct = useGetProductsQuery({ page: 1, limit: 1 }, { skip: !enabled || kind !== 'product' });
  const hello = `Salut ${addressee(user?.username)}`;

  if (kind === 'depot') {
    if (latestDepot.isLoading || (latestDepot.isFetching && latestDepot.data === undefined)) return null;
    const c = latestDepot.data;
    if (!c) return `${hello}, on commence un nouveau dépôt.`;
    const who = c.deposant ? `le dépôt de ${c.deposant}` : `le contrat ${c.contractNumber ?? ''}`.trim();
    return `${hello}, vous venez d'ajouter ${who} (${c.items} article${c.items > 1 ? 's' : ''}), ${ago(c.createdAt)}. On passe au suivant.`;
  }
  if (kind === 'product') {
    if (latestProduct.isLoading) return null;
    const p = latestProduct.data?.data?.[0];
    if (!p) return `${hello}, on ajoute un premier produit.`;
    return `${hello}, vous venez d'ajouter « ${p.productName} », ${ago(p.createdAt)}. On passe au suivant.`;
  }
  return `${hello}, on remplit ensemble : ${title ?? 'ce formulaire'}.`;
}
