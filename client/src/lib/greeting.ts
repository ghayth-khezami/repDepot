import { useAuth } from '../context/AuthContext';

/** "Mme Khezami" — last word of the admin's username, else the default shop owner. */
function addressee(username?: string) {
  const last = username?.trim().split(/\s+/).pop();
  return `Mme ${last && last.length > 1 && !last.includes('@') ? last.charAt(0).toUpperCase() + last.slice(1) : 'Khezami'}`;
}

const NOUN: Record<'depot' | 'product', string> = { depot: 'un dépôt', product: 'un produit' };

/** "Ajouter une catégorie" → "une catégorie"; "Modifier le produit" → "le produit". */
function nounFromTitle(title?: string) {
  const t = (title ?? '').trim();
  const m = t.match(/^(?:ajouter|nouveau|nouvelle|créer|modifier|éditer)\s+(.*)$/i);
  const rest = (m ? m[1] : t).trim();
  if (!rest) return 'un élément';
  return /^(un|une|le|la|les|l'|des)\b/i.test(rest) ? rest.toLowerCase() : `un ${rest.toLowerCase()}`;
}

/** Opening line, said before the first question: « Salut Mme Khezami, vous venez d'ajouter une catégorie. » */
export function useAssistantGreeting(kind: 'depot' | 'product' | 'generic', _enabled = true, title?: string): string {
  const { user } = useAuth();
  const what = kind === 'generic' ? nounFromTitle(title) : NOUN[kind];
  return `Salut ${addressee(user?.username)}, vous venez d'ajouter ${what}.`;
}
