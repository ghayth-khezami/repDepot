import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Globe, Instagram, Loader2, Share2 } from 'lucide-react';
import { BottomSheet } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { usePublishProductsMutation } from '../../store/api/productApi';
import { saveBlob } from '../../lib/download';
import { uploadUrl } from '../../lib/apiBase';
import { toMillimes } from '../../lib/money';
import { cn } from '../../lib/cn';
import { renderStory, STORY_THEMES, type StoryTheme } from './storyImage';
import type { Product } from '../../types';

/** Storefront address of a product (the link to put on the story's « Lien » sticker). */
export function productPublicUrl(id: string) {
  const site = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || 'https://bebedepot.tn';
  return `${site}/products/${id}`;
}

/**
 * « Story Instagram »: a 1080×1920 visual of the product (photo, name, price, QR), 3 colour themes,
 * then Instagram via the share sheet + the product link copied for the « Lien » sticker.
 */
export default function InstagramStorySheet({
  product: p,
  open,
  onClose,
}: {
  product: Pick<Product, 'id' | 'productName' | 'PrixVente' | 'ref' | 'isDepot' | 'isPublished' | 'status'> & {
    photos?: Array<{ photoDoc: string }>;
    category?: { categoryName: string } | null;
  };
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<StoryTheme>('rose');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(!!p.isPublished);
  const [publish, { isLoading: publishing }] = usePublishProductsMutation();
  const url = productPublicUrl(p.id);
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  useEffect(() => setPublished(!!p.isPublished), [p.isPublished]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true);
    renderStory(
      {
        name: p.productName,
        priceMillimes: toMillimes(p.PrixVente),
        ref: p.ref,
        category: p.category?.categoryName ?? null,
        photoUrl: p.photos?.[0]?.photoDoc ? uploadUrl(p.photos[0].photoDoc) : null,
        url,
        isDepot: p.isDepot,
      },
      theme,
    )
      .then((b) => alive && setBlob(b))
      .catch(() => alive && showToast("Création de l'image impossible", 'error'))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, theme, p.id, p.PrixVente, p.productName]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      showToast(url, 'info', 8000);
      return false;
    }
  };

  const filename = `story-${p.ref ?? p.id}.png`;
  const share = async () => {
    if (!blob) return;
    await copyLink(); // ready to paste in the « Lien » sticker
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        showToast('Dans Instagram : Story → autocollant « Lien » → collez le lien (déjà copié)', 'success', 8000);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') showToast('Partage impossible : téléchargez l’image', 'warning');
      }
    } else {
      await saveBlob(blob, filename);
      showToast('Image téléchargée · le lien du produit est copié', 'success', 6000);
    }
  };

  const doPublish = async () => {
    try {
      await publish({ ids: [p.id], published: true }).unwrap();
      setPublished(true);
      showToast('Produit publié sur le site : le lien fonctionne', 'success');
    } catch (e) {
      showToast((e as Error).message || 'Publication impossible', 'error');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Story Instagram" wide>
      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="mx-auto w-[180px] sm:w-[200px]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-bd-lilac/50 shadow-[0_18px_40px_rgba(76,29,149,0.25)] ring-4 ring-bd-surface">
            {preview ? <img src={preview} alt="Aperçu de la story" className="h-full w-full object-cover" /> : null}
            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-bd-surface/60">
                <Loader2 size={26} className="animate-spin text-bd-violet" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-[0.14em] text-bd-muted">Style</p>
            <div className="flex gap-2">
              {(Object.keys(STORY_THEMES) as StoryTheme[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTheme(k)}
                  aria-pressed={theme === k}
                  className={cn('bd-focus flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-2 text-sm font-extrabold text-bd-ink', theme === k ? 'border-bd-violet' : 'border-bd-line/15')}
                >
                  <span aria-hidden className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: STORY_THEMES[k].swatch }} />
                  {STORY_THEMES[k].label}
                </button>
              ))}
            </div>
          </div>

          {!published ? (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
              <p className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> Ce produit n'est pas en ligne : le lien de la story ne fonctionnera pas.
              </p>
              <button type="button" disabled={publishing} onClick={() => void doPublish()} className="bd-focus mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-grad-green-strong px-3 text-sm font-extrabold text-white disabled:opacity-60">
                <Globe size={15} aria-hidden /> {publishing ? 'Publication…' : 'Publier sur le site'}
              </button>
            </div>
          ) : null}
          {p.status === 'VENDU' ? (
            <p className="rounded-2xl bg-bd-blush px-3 py-2 text-sm font-bold text-bd-pink-strong">Attention : ce produit est déjà vendu.</p>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-[0.14em] text-bd-muted">Lien du produit</p>
            <button type="button" onClick={() => void copyLink()} className="bd-focus flex min-h-[44px] w-full items-center gap-2 rounded-2xl bg-bd-bg px-3 text-left text-sm font-bold text-bd-ink">
              <span className="min-w-0 flex-1 truncate">{url.replace(/^https?:\/\//, '')}</span>
              {copied ? <Check size={16} className="shrink-0 text-bd-success" aria-hidden /> : <Copy size={16} className="shrink-0 text-bd-violet" aria-hidden />}
            </button>
          </div>

          <ol className="space-y-1 rounded-2xl bg-bd-lilac/40 p-3 text-[13px] font-semibold text-bd-ink">
            <li>1. Touchez « Partager en story » → choisissez <strong>Instagram → Story</strong>.</li>
            <li>2. Ajoutez l'autocollant <strong>« Lien »</strong> et collez le lien (déjà copié).</li>
            <li>3. Placez-le en bas, sur « Disponible en ligne », puis publiez 💖</li>
          </ol>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              disabled={!blob || busy}
              onClick={() => void share()}
              className="bd-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(120deg,#F58529,#DD2A7B_45%,#8134AF_75%,#515BD4)] px-4 text-[15px] font-extrabold text-white shadow-glow-pink disabled:opacity-60 active:scale-[0.98]"
            >
              <Instagram size={19} aria-hidden /> Partager en story
            </button>
            <button
              type="button"
              disabled={!blob}
              onClick={() => blob && void saveBlob(blob, filename)}
              aria-label="Télécharger l'image"
              title="Télécharger l'image"
              className="bd-focus flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-bd-line/15 bg-bd-surface text-bd-ink disabled:opacity-60"
            >
              <Download size={19} aria-hidden />
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-bd-muted">
            <Share2 size={12} aria-hidden /> Sur ordinateur : l'image est téléchargée, publiez-la depuis votre téléphone.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
