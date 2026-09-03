import { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Minus, Plus, X } from 'lucide-react';
import Modal from './Modal';

type CropImageModalProps = {
  file: File | null;
  onCancel: () => void;
  onCrop: (file: File, previewUrl: string, preset: 'web' | 'mobile') => void;
};

type Point = { x: number; y: number };
type Selection = { x: number; y: number; width: number; height: number };
type Interaction =
  | { type: 'move'; start: Point; selection: Selection }
  | { type: 'resize'; handle: string; start: Point; selection: Selection };

type CropPreset = {
  id: 'web' | 'mobile';
  label: string;
  width: number;
  height: number;
  outputWidth: number;
  outputHeight: number;
};

const MIN_SELECTION = 48;
const PRESETS: CropPreset[] = [
  { id: 'web', label: 'Web', width: 560, height: 315, outputWidth: 1600, outputHeight: 900 },
  { id: 'mobile', label: 'Mobile', width: 420, height: 560, outputWidth: 900, outputHeight: 1200 },
];

export default function CropImageModal({ file, onCancel, onCrop }: CropImageModalProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [step, setStep] = useState<'web' | 'mobile'>('web');
  const [selection, setSelection] = useState<Selection>({ x: 70, y: 45, width: 420, height: 220 });

  const preset = PRESETS.find((item) => item.id === step) ?? PRESETS[0];
  const viewWidth = preset.width;
  const viewHeight = preset.height;

  useEffect(() => {
    if (!file) {
      setSourceUrl('');
      setZoom(1);
      setStep('web');
      setSelection({ x: 70, y: 45, width: 420, height: 220 });
      return;
    }

    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setZoom(1);
    setStep('web');
    setSelection({ x: 70, y: 45, width: 420, height: 220 });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;

    const nextSelection =
      preset.id === 'web'
        ? { x: 70, y: 45, width: 420, height: 220 }
        : { x: 45, y: 70, width: 330, height: 420 };

    setSelection(nextSelection);
  }, [preset.id, file]);

  if (!file || !sourceUrl) return null;

  const image = imageRef.current;
  const naturalWidth = image?.naturalWidth ?? 1;
  const naturalHeight = image?.naturalHeight ?? 1;
  const baseScale = Math.max(viewWidth / naturalWidth, viewHeight / naturalHeight);
  const renderedWidth = naturalWidth * baseScale * zoom;
  const renderedHeight = naturalHeight * baseScale * zoom;

  const clampSelection = (next: Selection): Selection => ({
    x: Math.max(0, Math.min(viewWidth - next.width, next.x)),
    y: Math.max(0, Math.min(viewHeight - next.height, next.y)),
    width: Math.max(MIN_SELECTION, Math.min(viewWidth, next.width)),
    height: Math.max(MIN_SELECTION, Math.min(viewHeight, next.height)),
  });

  const getPoint = (event: React.PointerEvent<HTMLElement>): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * viewWidth,
      y: ((event.clientY - rect.top) / rect.height) * viewHeight,
    };
  };

  const startInteraction = (event: React.PointerEvent<HTMLElement>, type: Interaction['type'], handle = '') => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = type === 'move'
      ? { type, start: getPoint(event), selection }
      : { type, handle, start: getPoint(event), selection };
  };

  const moveInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const point = getPoint(event);
    const dx = point.x - interaction.start.x;
    const dy = point.y - interaction.start.y;

    if (interaction.type === 'move') {
      setSelection(clampSelection({ ...interaction.selection, x: interaction.selection.x + dx, y: interaction.selection.y + dy }));
      return;
    }

    const original = interaction.selection;
    const right = original.x + original.width;
    const bottom = original.y + original.height;
    const next: Selection = { ...original };

    if (interaction.handle.includes('w')) {
      next.x = Math.min(Math.max(0, original.x + dx), right - MIN_SELECTION);
      next.width = right - next.x;
    }
    if (interaction.handle.includes('e')) {
      next.width = Math.max(MIN_SELECTION, Math.min(viewWidth - original.x, original.width + dx));
    }
    if (interaction.handle.includes('n')) {
      next.y = Math.min(Math.max(0, original.y + dy), bottom - MIN_SELECTION);
      next.height = bottom - next.y;
    }
    if (interaction.handle.includes('s')) {
      next.height = Math.max(MIN_SELECTION, Math.min(viewHeight - original.y, original.height + dy));
    }

    setSelection(clampSelection(next));
  };

  const finishInteraction = () => {
    interactionRef.current = null;
  };

  const saveCrop = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = preset.outputWidth;
    canvas.height = preset.outputHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    const sourceWidth = selection.width / (baseScale * zoom);
    const sourceHeight = selection.height / (baseScale * zoom);
    const imageLeft = (viewWidth - renderedWidth) / 2;
    const imageTop = (viewHeight - renderedHeight) / 2;
    const sourceX = (selection.x - imageLeft) / (baseScale * zoom);
    const sourceY = (selection.y - imageTop) / (baseScale * zoom);

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], `carousel-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCrop(croppedFile, URL.createObjectURL(blob), preset.id);
    }, 'image/jpeg', 0.9);
  };

  const handles = [
    ['nw', 'left-[-6px] top-[-6px] cursor-nwse-resize'],
    ['n', 'left-1/2 top-[-6px] -translate-x-1/2 cursor-ns-resize'],
    ['ne', 'right-[-6px] top-[-6px] cursor-nesw-resize'],
    ['w', 'left-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize'],
    ['e', 'right-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize'],
    ['sw', 'bottom-[-6px] left-[-6px] cursor-nesw-resize'],
    ['s', 'bottom-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize'],
    ['se', 'bottom-[-6px] right-[-6px] cursor-nwse-resize'],
  ];

  return (
    <Modal isOpen={Boolean(file)} onClose={onCancel} title="Recadrer la photo pour le carrousel" size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <ImageIcon className="h-5 w-5 shrink-0 text-pink-500" />
          <span>Étape 1 : aperçu web • Étape 2 : aperçu mobile. Ajustez la zone pour éviter les zooms et les coupures.</span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 p-1">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                step === item.id ? 'bg-pink-500 text-white shadow-sm' : 'text-rose-700 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          ref={viewportRef}
          className="relative mx-auto w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-rose-200"
          style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
          onPointerMove={moveInteraction}
          onPointerUp={finishInteraction}
          onPointerCancel={finishInteraction}
        >
          <img
            ref={imageRef}
            src={sourceUrl}
            alt="Image à recadrer"
            onLoad={() => setSelection((current) => clampSelection(current))}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{ width: renderedWidth, height: renderedHeight, transform: 'translate(-50%, -50%)' }}
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
          <div
            className="absolute border-2 border-pink-500 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
            style={{
              left: `${(selection.x / viewWidth) * 100}%`,
              top: `${(selection.y / viewHeight) * 100}%`,
              width: `${(selection.width / viewWidth) * 100}%`,
              height: `${(selection.height / viewHeight) * 100}%`,
            }}
            onPointerDown={(event) => startInteraction(event, 'move')}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, transparent 33%, white 33%, white 33.3%, transparent 33.3%, transparent 66%, white 66%, white 66.3%, transparent 66.3%), linear-gradient(0deg, transparent 33%, white 33%, white 33%, transparent 33.3%, transparent 66%, white 66%, white 66.3%, transparent 66.3%)',
              }}
            />
            {handles.map(([handle, className]) => (
              <span
                key={handle}
                className={`absolute h-3 w-3 rounded-full border-2 border-white bg-pink-500 shadow ${className}`}
                onPointerDown={(event) => startInteraction(event, 'resize', handle)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3">
          <Minus className="h-4 w-4 text-rose-400" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-pink-500"
            aria-label="Zoom"
          />
          <Plus className="h-4 w-4 text-rose-400" />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-rose-100 pt-4">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
            <X className="h-4 w-4" />
            Annuler
          </button>
          <button type="button" onClick={saveCrop} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600">
            <Check className="h-4 w-4" />
            Utiliser cette photo
          </button>
        </div>
      </div>
    </Modal>
  );
}

