import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { compressImagesForUpload } from '../lib/compressImage';
import { uploadStagingPhoto } from '../lib/uploadStagingPhoto';

export const MAX_PRODUCT_PHOTOS = 4;

export type ExistingPhoto = { id: string; url: string };

export type StagedPhoto = {
  id: string;
  url: string;
  uploading?: boolean;
  error?: string;
};

type Slide =
  | { kind: 'existing'; id: string; url: string }
  | { kind: 'staged'; id: string; url: string; uploading?: boolean };

type Props = {
  label?: string;
  existing: ExistingPhoto[];
  removedIds: string[];
  staged: StagedPhoto[];
  onStagedChange: (next: StagedPhoto[]) => void;
  onRemoveExisting: (id: string) => void;
  onRestoreExisting?: (id: string) => void;
  disabled?: boolean;
};

export function ProductPhotoPicker({
  label = 'Photos',
  existing,
  removedIds,
  staged,
  onStagedChange,
  onRemoveExisting,
  onRestoreExisting,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleExisting = existing.filter((p) => !removedIds.includes(p.id));
  const uploadingCount = staged.filter((p) => p.uploading).length;

  const slides: Slide[] = [
    ...visibleExisting.map((p) => ({ kind: 'existing' as const, id: p.id, url: p.url })),
    ...staged.map((p) => ({ kind: 'staged' as const, id: p.id, url: p.url, uploading: p.uploading })),
  ];

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(Math.max(0, slides.length - 1));
  }, [slides.length, activeIndex]);

  const total = slides.length;
  const canAdd = total < MAX_PRODUCT_PHOTOS && !disabled && uploadingCount === 0;
  const active = slides[activeIndex];

  const stagedRef = useRef(staged);
  stagedRef.current = staged;

  const pick = (list: FileList | null) => {
    if (!list?.length || !canAdd) return;
    const room = MAX_PRODUCT_PHOTOS - total;
    const incoming = Array.from(list).slice(0, room);
    if (inputRef.current) inputRef.current.value = '';

    void compressImagesForUpload(incoming).then(async (optimized) => {
      let nextStaged = [...stagedRef.current];
      for (const file of optimized) {
        const tempId = `staged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const preview = URL.createObjectURL(file);
        nextStaged = [...nextStaged, { id: tempId, url: preview, uploading: true }];
        onStagedChange(nextStaged);
        try {
          const url = await uploadStagingPhoto(file);
          URL.revokeObjectURL(preview);
          nextStaged = nextStaged.map((p) => (p.id === tempId ? { id: tempId, url } : p));
          onStagedChange(nextStaged);
        } catch {
          nextStaged = nextStaged.map((p) =>
            p.id === tempId ? { ...p, uploading: false, error: 'Échec envoi' } : p,
          );
          onStagedChange(nextStaged);
        }
      }
      setActiveIndex(visibleExisting.length + nextStaged.length - 1);
    });
  };

  const removeStaged = (id: string) => {
    onStagedChange(staged.filter((p) => p.id !== id));
  };

  const busy = uploadingCount > 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <span className="text-xs text-gray-500">{total}/{MAX_PRODUCT_PHOTOS}</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/40 dark:border-slate-700 dark:bg-slate-800/40">
        {active ? (
          <>
            <img src={active.url} alt="" className="aspect-[4/3] w-full bg-white object-contain dark:bg-slate-900" />
            {activeIndex === 0 && total > 0 ? (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                <Star size={10} fill="currentColor" />
                Principale
              </span>
            ) : null}
            {active.kind === 'staged' && active.uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 dark:bg-slate-900/70">
                <Loader2 className="animate-spin text-primary-600" size={32} />
                <span className="text-xs text-gray-600">Envoi Cloudinary…</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-sm text-gray-400">
            Aucune photo
          </div>
        )}
      </div>

      {slides.length > 0 ? (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, index) => (
            <li key={slide.id} className="relative shrink-0">
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => setActiveIndex(index)}
                className={`block h-16 w-16 overflow-hidden rounded-xl border-2 ${
                  index === activeIndex ? 'border-primary-600' : 'border-gray-200 dark:border-slate-600'
                }`}
              >
                <img src={slide.url} alt="" className="h-full w-full bg-white object-contain dark:bg-slate-900" />
              </button>
              {!disabled && !busy ? (
                <button
                  type="button"
                  onClick={() => {
                    if (slide.kind === 'existing') onRemoveExisting(slide.id);
                    else removeStaged(slide.id);
                  }}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                  aria-label="Retirer"
                >
                  <X size={12} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {removedIds.length > 0 && onRestoreExisting ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {removedIds.map((id) => {
            const photo = existing.find((p) => p.id === id);
            if (!photo) return null;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled || busy || total >= MAX_PRODUCT_PHOTOS}
                onClick={() => onRestoreExisting(id)}
                className="rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600"
              >
                Restaurer
              </button>
            );
          })}
        </div>
      ) : null}

      {canAdd ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-white px-4 py-3 text-sm font-medium text-primary-700 dark:border-slate-600 dark:bg-slate-900"
          >
            <ImagePlus size={18} />
            Ajouter une photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />
        </>
      ) : null}

      <p className="mt-1 text-xs text-gray-500">
        Photos envoyées immédiatement. La 1ère est la principale. Max {MAX_PRODUCT_PHOTOS}.
      </p>
    </div>
  );
}
