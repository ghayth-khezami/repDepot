import { useEffect, useMemo, useRef } from 'react';
import { Camera, ImagePlus, Loader2, Star, X } from 'lucide-react';
import { cn } from '../lib/cn';

export const MAX_PHOTOS = 4;

export interface PhotoSlot {
  key: string;
  /** URL (existing photo) or object URL (new file). */
  src: string;
}

/**
 * Four clear photo boxes. Filled boxes show the photo with a remove button; empty boxes open the camera /
 * gallery. The first photo is the cover. Never more than MAX_PHOTOS.
 */
export default function PhotoSlots({
  slots,
  onAdd,
  onRemove,
  busy,
  label = 'Photos du produit',
}: {
  slots: PhotoSlot[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  busy?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const free = Math.max(0, MAX_PHOTOS - slots.length);

  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-extrabold text-bd-ink">
        <span>{label}</span>
        <span className="text-xs font-bold text-bd-muted tabular-nums">
          {slots.length}/{MAX_PHOTOS}
        </span>
      </legend>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const s = slots[i];
          if (s) {
            return (
              <div key={s.key} className="group relative aspect-square overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-lilac/40 shadow-card">
                <img src={s.src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    <Star size={10} fill="currentColor" aria-hidden /> Couverture
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(s.key)}
                  aria-label={`Retirer la photo ${i + 1}`}
                  className="bd-focus absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-bd-surface/95 text-bd-danger shadow active:scale-90"
                >
                  <X size={16} strokeWidth={2.6} aria-hidden />
                </button>
              </div>
            );
          }
          const first = i === slots.length;
          return (
            <button
              key={`empty-${i}`}
              type="button"
              disabled={busy || !free}
              onClick={() => input.current?.click()}
              className={cn(
                'bd-focus flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-center transition active:scale-[0.97] disabled:opacity-60',
                first ? 'border-bd-pink/60 bg-bd-blush/50 text-bd-pink-strong' : 'border-bd-line/20 bg-bd-surface text-bd-muted',
              )}
            >
              {busy && first ? (
                <Loader2 size={22} className="animate-spin" aria-hidden />
              ) : first ? (
                <>
                  <ImagePlus size={24} aria-hidden />
                  <span className="text-[11px] font-extrabold leading-tight">Ajouter</span>
                </>
              ) : (
                <Camera size={20} aria-hidden />
              )}
              <span className="sr-only">Ajouter une photo</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-bd-muted">
        {free ? `Jusqu'à ${MAX_PHOTOS} photos · la première est la photo de couverture.` : 'Maximum atteint : retirez une photo pour en ajouter une autre.'}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onAdd(files.slice(0, free));
        }}
      />
    </fieldset>
  );
}

/** Object URLs for new File photos, revoked when they go away. */
export function useFileUrls(files: Array<string | File>) {
  const urls = useMemo(() => files.map((f) => (f instanceof File ? URL.createObjectURL(f) : f)), [files]);
  useEffect(() => () => urls.forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u)), [urls]);
  return urls;
}
