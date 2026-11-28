import { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, ChevronDown, FileText, Printer, Ruler } from 'lucide-react';
import { BottomSheet } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { downloadAuthed } from '../../lib/download';
import { cn } from '../../lib/cn';
import { LABEL_LIMITS, LABEL_PRESETS, getLabelFormat, labelFormatName, parseSize, saveLabelFormat, withLabelFormat, type LabelFormat } from '../../lib/labelFormat';

export interface LabelSample {
  name: string;
  description?: string | null;
  price: string;
  ref?: string | null;
}

const DEFAULT_SAMPLE: LabelSample = { name: 'Poussette Chicco Liteway', description: 'Pliable, habillage pluie, très bon état', price: '185,00 TND', ref: 'D-12-03' };

/** Real QR (same payload as the printed one) drawn as SVG squares. */
function QrSvg({ value, className, size }: { value: string; className?: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = QRCode.create(value || '-', { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const out: Array<[number, number]> = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) out.push([c, r]);
    return { n, out };
  }, [value]);
  return (
    <svg viewBox={`0 0 ${cells.n} ${cells.n}`} className={className} style={size ? { width: size, height: size } : undefined} shapeRendering="crispEdges" aria-hidden>
      {cells.out.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#000" />
      ))}
    </svg>
  );
}

/** Miniature of the printed label, at the real proportions. */
function LabelPreview({ format, sample }: { format: LabelFormat; sample: LabelSample }) {
  const size = parseSize(format);
  if (!size) {
    // A4 sheet of 12 cards
    return (
      <div className="mx-auto grid aspect-[210/297] w-[150px] grid-cols-3 grid-rows-4 gap-[3px] rounded-md bg-white p-[7px] shadow-lg ring-1 ring-black/10">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-[2px] rounded-[2px] border border-dashed border-violet-200">
            <QrSvg value={sample.ref || 'BD'} className="h-[18px] w-[18px]" />
            <span className="h-[2px] w-3/4 rounded bg-slate-800" />
            <span className="h-[2px] w-1/2 rounded bg-pink-600" />
          </div>
        ))}
      </div>
    );
  }
  const px = Math.min(250 / size.w, 140 / size.h); // px per mm
  const pad = Math.min(3, Math.max(1.5, size.h * 0.07));
  const qr = Math.min(size.h - 2 * pad, size.w * 0.46);
  const nameFs = Math.min(14, Math.max(6.5, size.h * 0.3)) * 0.3528 * px;
  return (
    <div
      className="relative flex overflow-hidden rounded-[6px] bg-white text-black shadow-[0_10px_24px_rgba(15,10,40,0.22)] ring-1 ring-black/10"
      style={{ width: size.w * px, height: size.h * px, padding: pad * px, gap: Math.min(3, size.w * 0.04) * px }}
    >
      <QrSvg value={sample.ref || 'BD'} size={qr * px} className="shrink-0 self-center" />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.15]" style={{ fontSize: nameFs }}>
        {size.h >= 24 ? <span className="truncate font-black" style={{ fontSize: nameFs * 0.62 }}>BÉBÉ-DÉPÔT</span> : null}
        <span className="line-clamp-2 font-extrabold">{sample.name}</span>
        {sample.description ? (
          <span className="line-clamp-2 text-black/75" style={{ fontSize: nameFs * 0.72 }}>
            {sample.description}
          </span>
        ) : null}
        <span className="mt-auto truncate font-black" style={{ fontSize: nameFs * 1.3 }}>
          {sample.price}
        </span>
        {sample.ref ? <span style={{ fontSize: nameFs * 0.62 }}>{sample.ref}</span> : null}
      </div>
    </div>
  );
}

/**
 * « Imprimer les étiquettes »: choose the label size of the roll in the TSC printer (or an A4 sheet),
 * see the result, download the PDF ready to print (one label per page, exact size).
 */
export default function LabelPrintSheet({
  open,
  onClose,
  path,
  filename,
  subtitle,
  sample,
}: {
  open: boolean;
  onClose: () => void;
  /** Export path without `format` (may already contain the list filters). */
  path: string;
  filename: string;
  subtitle?: string;
  sample?: LabelSample;
}) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<LabelFormat>(getLabelFormat);
  const isPreset = format === 'a4' || LABEL_PRESETS.some((p) => p.value === format);
  const [custom, setCustom] = useState(() => parseSize(isPreset ? '50x30' : format) ?? { w: 50, h: 30 });
  const [showCustom, setShowCustom] = useState(!isPreset);
  const [busy, setBusy] = useState(false);
  const s = sample ?? DEFAULT_SAMPLE;

  const pick = (f: LabelFormat) => {
    setFormat(f);
    saveLabelFormat(f);
  };
  const applyCustom = (w: number, h: number) => {
    const cw = Math.round(Math.min(LABEL_LIMITS.maxW, Math.max(LABEL_LIMITS.minW, w || 0)));
    const ch = Math.round(Math.min(LABEL_LIMITS.maxH, Math.max(LABEL_LIMITS.minH, h || 0)));
    setCustom({ w: cw, h: ch });
    pick(`${cw}x${ch}`);
  };

  const download = async () => {
    setBusy(true);
    try {
      const name = format === 'a4' ? `${filename}.pdf` : `${filename}-${format}.pdf`;
      await downloadAuthed(withLabelFormat(path, format), name);
      showToast(format === 'a4' ? 'Feuille A4 prête à imprimer' : 'PDF prêt : imprimez sur la TSC en « Taille réelle »', 'success', 6000);
      onClose();
    } catch (e) {
      showToast((e as Error).message || 'Téléchargement impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  const size = parseSize(format);

  return (
    <BottomSheet open={open} onClose={onClose} title="Imprimer les étiquettes QR" wide>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Printer + label coming out */}
        <div className="flex flex-col items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_70%)] px-3 pb-4 pt-2">
          <div className="relative z-10 flex h-14 w-[210px] items-end justify-center rounded-t-2xl rounded-b-md bg-gradient-to-b from-slate-700 to-slate-900 shadow-lg">
            <span className="absolute left-4 top-3 text-[9px] font-black tracking-[0.2em] text-white/70">TSC</span>
            <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)] motion-safe:animate-pulse" aria-hidden />
            <span className="mb-1.5 h-1.5 w-[180px] rounded-full bg-black/80" aria-hidden />
          </div>
          <div className="-mt-1 overflow-hidden px-4 pb-4 pt-1">
            <div key={format} className="bd-label-feed">
              <LabelPreview format={format} sample={s} />
            </div>
          </div>
          <p className="text-center text-xs font-extrabold text-bd-ink">{labelFormatName(format)}</p>
          {subtitle ? <p className="text-center text-[11px] font-bold text-bd-muted">{subtitle}</p> : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-bd-muted">
              <Printer size={13} aria-hidden /> Rouleau d'étiquettes (imprimante TSC)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LABEL_PRESETS.map((p) => {
                const ps = parseSize(p.value)!;
                const active = format === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => (setShowCustom(false), pick(p.value))}
                    aria-pressed={active}
                    className={cn(
                      'bd-focus relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 text-bd-ink transition active:scale-[0.97]',
                      active ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/15 bg-bd-surface hover:border-bd-violet/40',
                    )}
                  >
                    <span aria-hidden className="rounded-[3px] border-2 border-current opacity-60" style={{ width: ps.w / 3.2, height: ps.h / 3.2 }} />
                    <span className="text-[13px] font-extrabold tabular-nums">
                      {ps.w}×{ps.h}
                    </span>
                    {p.hint ? <span className="absolute -top-2 rounded-full bg-bd-pink-strong px-1.5 text-[9px] font-black text-white">{p.hint}</span> : null}
                    {active ? <Check size={13} className="absolute right-1.5 top-1.5 text-bd-violet" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              aria-expanded={showCustom}
              className={cn('bd-focus mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-2xl border-2 px-3 text-sm font-extrabold text-bd-ink', !isPreset ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/15')}
            >
              <Ruler size={16} className="text-bd-violet" aria-hidden /> Autre taille {!isPreset && size ? `· ${size.w}×${size.h} mm` : ''}
              <ChevronDown size={16} className={cn('ml-auto transition', showCustom && 'rotate-180')} aria-hidden />
            </button>
            {showCustom ? (
              <form
                className="bd-anim-pop mt-2 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCustom(custom.w, custom.h);
                }}
              >
                {(['w', 'h'] as const).map((k) => (
                  <label key={k} className="min-w-0 flex-1 text-xs font-extrabold text-bd-muted">
                    {k === 'w' ? 'Largeur (mm)' : 'Hauteur (mm)'}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={k === 'w' ? LABEL_LIMITS.minW : LABEL_LIMITS.minH}
                      max={k === 'w' ? LABEL_LIMITS.maxW : LABEL_LIMITS.maxH}
                      value={custom[k]}
                      onChange={(e) => setCustom((c) => ({ ...c, [k]: Number(e.target.value) }))}
                      className="bd-focus mt-1 block min-h-[44px] w-full rounded-xl border border-bd-line/20 bg-bd-surface px-3 text-base font-bold text-bd-ink"
                    />
                  </label>
                ))}
                <button type="submit" className="bd-focus min-h-[44px] rounded-xl bg-bd-violet px-4 text-sm font-extrabold text-white">
                  OK
                </button>
              </form>
            ) : null}
            <p className="mt-2 text-[11px] font-bold text-bd-muted">La taille est écrite sur le rouleau. Sinon mesurez une étiquette (sans l'espace entre deux).</p>
          </div>

          <button
            type="button"
            onClick={() => (setShowCustom(false), pick('a4'))}
            aria-pressed={format === 'a4'}
            className={cn('bd-focus flex min-h-[48px] w-full items-center gap-2 rounded-2xl border-2 px-3 text-left text-sm font-extrabold text-bd-ink', format === 'a4' ? 'border-bd-violet bg-bd-lilac/50' : 'border-bd-line/15')}
          >
            <FileText size={17} className="text-bd-pink-strong" aria-hidden />
            <span className="min-w-0 flex-1">
              Feuille A4 (12 cartes)
              <span className="block text-[11px] font-bold text-bd-muted">Imprimante normale, à découper</span>
            </span>
            {format === 'a4' ? <Check size={16} className="text-bd-violet" aria-hidden /> : null}
          </button>

          {format !== 'a4' ? (
            <details className="group rounded-2xl bg-bd-lilac/40 p-3 text-[13px] font-semibold text-bd-ink">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold">
                <Printer size={15} className="text-bd-violet" aria-hidden /> Comment imprimer avec la TSC TE200
                <ChevronDown size={15} className="ml-auto transition group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="mt-2 space-y-1">
                <li>1. Ouvrez le PDF → <strong>Imprimer</strong> → imprimante <strong>TSC TE200</strong>.</li>
                <li>
                  2. <strong>Préférences</strong> → Papier : <strong>{size ? `${size.w} × ${size.h} mm` : ''}</strong> (une seule fois, Windows s'en souvient).
                </li>
                <li>3. Échelle : <strong>« Taille réelle »</strong> (100 %), pas « Ajuster ».</li>
                <li>4. Une étiquette par page : chaque produit tombe sur son autocollant.</li>
                <li>Si l'impression se décale : lancez le calibrage du rouleau (bouton FEED / « Calibrer » dans les préférences TSC).</li>
              </ol>
            </details>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="bd-focus inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-violet-strong px-4 text-[15px] font-extrabold text-white shadow-glow-violet transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : <Printer size={19} aria-hidden />}
            {busy ? 'Préparation…' : 'Télécharger le PDF à imprimer'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
