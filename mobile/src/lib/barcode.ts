/** Normalize scanned / typed barcodes for API lookup (EAN-13, UPC-A, CODE-128 digits). */
export function normalizeBarcodeInput(raw: string): string {
  return raw.trim().replace(/\s/g, '');
}

export function barcodeLookupCandidates(raw: string): string[] {
  const trimmed = normalizeBarcodeInput(raw);
  if (!trimmed) return [];

  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set<string>();

  candidates.add(trimmed);
  if (digits) candidates.add(digits);

  if (digits.length === 13 && digits.startsWith('0')) {
    candidates.add(digits.slice(1));
  }
  if (digits.length === 12) {
    candidates.add(`0${digits}`);
  }
  if (digits.length >= 8 && digits.length <= 14) {
    candidates.add(digits.padStart(13, '0').slice(-13));
  }

  return [...candidates].filter(Boolean);
}
