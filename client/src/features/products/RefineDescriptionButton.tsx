import { useState, type RefObject } from 'react';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';
import { useRefineDescriptionMutation } from '../../store/api/productApi';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { setNativeValue } from '../../lib/speech';
import { cn } from '../../lib/cn';

/**
 * « ✨ Améliorer » next to a description field: corrects spelling, accents, grammar and punctuation (free
 * service, no key), or rewrites it with Claude when the server has ANTHROPIC_API_KEY. The field is replaced in place; « Annuler » brings the
 * previous text back. Nothing is saved until the form is.
 */
export default function RefineDescriptionButton({
  target,
  productName,
  category,
  className,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  productName?: () => string | undefined;
  category?: string;
  className?: string;
}) {
  const [refine, { isLoading }] = useRefineDescriptionMutation();
  const { showToast } = useToast();
  const [previous, setPrevious] = useState<string | null>(null);

  const run = async () => {
    const el = target.current;
    const text = el?.value.trim() ?? '';
    if (!el) return;
    if (text.length < 3) {
      showToast("Écrivez d'abord quelques mots, puis touchez « Améliorer »", 'info');
      el.focus();
      return;
    }
    try {
      const res = await refine({ text, productName: productName?.()?.trim() || undefined, category: category || undefined }).unwrap();
      if (res.text.trim() === text) {
        showToast('Aucune faute trouvée ✅', 'success');
        return;
      }
      setPrevious(el.value);
      setNativeValue(el, res.text);
      el.classList.remove('bd-refined');
      void el.offsetWidth; // restart the highlight animation
      el.classList.add('bd-refined');
      showToast(
        res.engine === 'claude'
          ? 'Description améliorée ✨ Vérifiez-la avant d’enregistrer'
          : `Description corrigée ✨ ${res.changes ? `(${res.changes} correction${res.changes > 1 ? 's' : ''}) ` : ''}Vérifiez avant d’enregistrer`,
        'success',
      );
    } catch (e) {
      showToast(apiErrorMessage(e, 'Amélioration impossible pour le moment.'), 'error');
    }
  };

  const undo = () => {
    const el = target.current;
    if (el && previous !== null) setNativeValue(el, previous);
    setPrevious(null);
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {previous !== null && !isLoading ? (
        <button type="button" onClick={undo} className="bd-focus inline-flex min-h-[34px] items-center gap-1 rounded-full px-2.5 text-xs font-extrabold text-bd-muted hover:bg-bd-lilac/60 hover:text-bd-ink">
          <Undo2 size={14} aria-hidden /> Annuler
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void run()}
        disabled={isLoading}
        aria-label="Améliorer la description (orthographe, accents, grammaire)"
        title="Corrige l'orthographe, les accents, la grammaire et la ponctuation"
        className="bd-focus inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,#7C3AED,#DB2777)] px-3 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)] transition active:scale-95 disabled:opacity-70"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
        {isLoading ? 'Correction…' : 'Améliorer'}
      </button>
    </span>
  );
}
