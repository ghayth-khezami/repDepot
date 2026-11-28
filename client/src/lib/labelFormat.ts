/**
 * Print format of the QR labels, remembered on this device.
 *  - "50x30" (mm): a roll of adhesive labels for the thermal printer (TSC TE200) → one label per PDF page;
 *  - "a4": A4 sheet of 12 cards (normal printer, cut with scissors).
 */
export type LabelFormat = 'a4' | `${number}x${number}`;

export const LABEL_PRESETS: Array<{ value: LabelFormat; hint?: string }> = [
  { value: '40x30' },
  { value: '50x25' },
  { value: '50x30', hint: 'Le plus courant' },
  { value: '60x40' },
  { value: '70x50' },
  { value: '100x50' },
];

export const LABEL_LIMITS = { minW: 25, maxW: 108, minH: 15, maxH: 160 } as const; // TE200: 108 mm print width

const KEY = 'bd-label-format';
export const DEFAULT_LABEL_FORMAT: LabelFormat = '50x30';

export function parseSize(f: string): { w: number; h: number } | null {
  const m = f.match(/^(\d{2,3})x(\d{2,3})$/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

export function getLabelFormat(): LabelFormat {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'a4' || (v && parseSize(v))) return v as LabelFormat;
  } catch {
    /* ignore */
  }
  return DEFAULT_LABEL_FORMAT;
}

export function saveLabelFormat(f: LabelFormat) {
  try {
    localStorage.setItem(KEY, f);
  } catch {
    /* ignore */
  }
}

/** Adds `format=` to an export path (which may already have a query string). */
export function withLabelFormat(path: string, f: LabelFormat = getLabelFormat()) {
  return `${path}${path.includes('?') ? '&' : '?'}format=${f}`;
}

export function labelFormatName(f: LabelFormat) {
  if (f === 'a4') return 'Feuille A4 (12 cartes)';
  const s = parseSize(f);
  return s ? `Étiquette ${s.w} × ${s.h} mm` : f;
}
