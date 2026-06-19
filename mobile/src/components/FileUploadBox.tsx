import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

type Props = {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  existingUrls?: string[];
};

export function FileUploadBox({
  label,
  files,
  onChange,
  accept = 'image/*',
  multiple = false,
  existingUrls = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [previews],
  );

  const pick = (list: FileList | null) => {
    if (!list?.length) return;
    const next = multiple ? [...files, ...Array.from(list)] : [list[0]];
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="file-upload-box flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-4 py-6 text-center transition hover:border-primary-400 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800/50"
      >
        <ImagePlus className="text-primary-500" size={28} />
        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
          Appuyer pour choisir {multiple ? 'des fichiers' : 'un fichier'}
        </span>
        <span className="text-xs text-gray-500">PNG, JPG — aperçu ci-dessous</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      {existingUrls.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {existingUrls.map((url) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <p className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[9px] text-white">Actuel</p>
            </li>
          ))}
        </ul>
      ) : null}
      {previews.length > 0 ? (
        <ul className={`grid grid-cols-3 gap-2 ${existingUrls.length ? 'mt-2' : 'mt-3'}`}>
          {previews.map(({ file, url }, index) => (
            <li key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600">
              <img src={url} alt={file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                aria-label="Retirer"
              >
                <X size={14} />
              </button>
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[9px] text-white">
                {file.name}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
