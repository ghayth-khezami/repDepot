import { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Minus, Plus, X } from 'lucide-react';
import Modal from './Modal';

type CropImageModalProps = {
  file: File | null;
  onCancel: () => void;
  onCrop: (file: File, previewUrl: string) => void;
};

  type Point = { x: number; y: number };
  type Selection = { x: number; y: number; width: number; height: number };
  type Interaction =
    | { type: 'move'; start: Point; selection: Selection }
    | { type: 'resize'; handle: string; start: Point; selection: Selection };

  const VIEW_WIDTH = 560;
  const VIEW_HEIGHT = 420;
  const MIN_SELECTION = 48;

  export default function CropImageModal({ file, onCancel, onCrop }: CropImageModalProps) {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const interactionRef = useRef<Interaction | null>(null);
    const [sourceUrl, setSourceUrl] = useState('');
    const [zoom, setZoom] = useState(1);
    const [selection, setSelection] = useState<Selection>({ x: 70, y: 45, width: 420, height: 330 });

    useEffect(() => {
      if (!file) {
        setSourceUrl('');
        return;
      }
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
      setZoom(1);
      setSelection({ x: 70, y: 45, width: 420, height: 330 });
      return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!file || !sourceUrl) return null;

    const image = imageRef.current;
    const naturalWidth = image?.naturalWidth ?? 1;
    const naturalHeight = image?.naturalHeight ?? 1;
    const baseScale = Math.max(VIEW_WIDTH / naturalWidth, VIEW_HEIGHT / naturalHeight);
    const renderedWidth = naturalWidth * baseScale * zoom;
    const renderedHeight = naturalHeight * baseScale * zoom;

    const clampSelection = (next: Selection): Selection => ({
      x: Math.max(0, Math.min(VIEW_WIDTH - next.width, next.x)),
      y: Math.max(0, Math.min(VIEW_HEIGHT - next.height, next.y)),
      width: Math.max(MIN_SELECTION, Math.min(VIEW_WIDTH, next.width)),
      height: Math.max(MIN_SELECTION, Math.min(VIEW_HEIGHT, next.height)),
    });

    const getPoint = (event: React.PointerEvent<HTMLElement>): Point => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
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
      let next = { ...original };
      if (interaction.handle.includes('w')) {
        next.x = Math.min(Math.max(0, original.x + dx), right - MIN_SELECTION);
        next.width = right - next.x;
      }
      if (interaction.handle.includes('e')) next.width = Math.max(MIN_SELECTION, Math.min(VIEW_WIDTH - original.x, original.width + dx));
      if (interaction.handle.includes('n')) {
        next.y = Math.min(Math.max(0, original.y + dy), bottom - MIN_SELECTION);
        next.height = bottom - next.y;
      }
      if (interaction.handle.includes('s')) next.height = Math.max(MIN_SELECTION, Math.min(VIEW_HEIGHT - original.y, original.height + dy));
      setSelection(clampSelection(next));
    };

    const finishInteraction = () => {
      interactionRef.current = null;
    };

    const saveCrop = () => {
      if (!image) return;
      const canvas = document.createElement('canvas');
      const sourceWidth = selection.width / (baseScale * zoom);
      const sourceHeight = selection.height / (baseScale * zoom);
      canvas.width = 1200;
      canvas.height = Math.max(1, Math.round(1200 * (sourceHeight / sourceWidth)));
      const context = canvas.getContext('2d');
      if (!context) return;

      const imageLeft = (VIEW_WIDTH - renderedWidth) / 2;
      const imageTop = (VIEW_HEIGHT - renderedHeight) / 2;
      const sourceX = (selection.x - imageLeft) / (baseScale * zoom);
      const sourceY = (selection.y - imageTop) / (baseScale * zoom);
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `category-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCrop(croppedFile, URL.createObjectURL(blob));
      }, 'image/jpeg', 0.9);
    };

    const handles = [
      ['nw', 'left-[-6px] top-[-6px] cursor-nwse-resize'], ['n', 'left-1/2 top-[-6px] -translate-x-1/2 cursor-ns-resize'],
      ['ne', 'right-[-6px] top-[-6px] cursor-nesw-resize'], ['w', 'left-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize'],
      ['e', 'right-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize'], ['sw', 'bottom-[-6px] left-[-6px] cursor-nesw-resize'],
      ['s', 'bottom-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize'], ['se', 'bottom-[-6px] right-[-6px] cursor-nwse-resize'],
    ];

    return (
      <Modal isOpen={Boolean(file)} onClose={onCancel} title="Choisir et recadrer la photo" size="lg">
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <ImageIcon className="h-5 w-5 shrink-0 text-pink-500" />
            <span>Redimensionnez librement la zone rose, puis déplacez-la pour garder exactement la partie souhaitée.</span>
          </div>
          <div
            ref={viewportRef}
            className="relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-rose-200"
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
              style={{ left: `${(selection.x / VIEW_WIDTH) * 100}%`, top: `${(selection.y / VIEW_HEIGHT) * 100}%`, width: `${(selection.width / VIEW_WIDTH) * 100}%`, height: `${(selection.height / VIEW_HEIGHT) * 100}%` }}
              onPointerDown={(event) => startInteraction(event, 'move')}
            >
              <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(90deg, transparent 33%, white 33%, white 33.3%, transparent 33.3%, transparent 66%, white 66%, white 66.3%, transparent 66.3%), linear-gradient(0deg, transparent 33%, white 33%, white 33%, transparent 33.3%, transparent 66%, white 66%, white 66.3%, transparent 66.3%)' }} />
              {handles.map(([handle, className]) => (
                <span key={handle} className={`absolute h-3 w-3 rounded-full border-2 border-white bg-pink-500 shadow ${className}`} onPointerDown={(event) => startInteraction(event, 'resize', handle)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3">
            <Minus className="h-4 w-4 text-rose-400" />
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-pink-500" aria-label="Zoom" />
            <Plus className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-rose-100 pt-4">
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><X className="h-4 w-4" />Annuler</button>
            <button type="button" onClick={saveCrop} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600"><Check className="h-4 w-4" />Utiliser cette photo</button>
          </div>
        </div>
      </Modal>
    );
  }

