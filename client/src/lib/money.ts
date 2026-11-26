/**
 * Money helpers — integer millimes (1 TND = 1000 millimes).
 * MIRROR of server/src/common/utils/money.ts: the stepper preview must match the
 * server to the millime, so keep both files identical in behaviour.
 */

export const MILLIMES_PER_TND = 1000;

export function toMillimes(tnd: number): number {
  if (!Number.isFinite(tnd)) return 0;
  return Math.round(Number(tnd.toFixed(6)) * MILLIMES_PER_TND);
}

export function fromMillimes(millimes: number): number {
  return Math.round(millimes) / MILLIMES_PER_TND;
}

export interface CommissionSplit {
  priceMillimes: number;
  shopMillimes: number;
  depositorMillimes: number;
}

export function splitCommission(priceMillimes: number, commissionPercent: number): CommissionSplit {
  const price = Math.max(0, Math.round(priceMillimes));
  const pct = Math.min(100, Math.max(0, commissionPercent || 0));
  const pctHundredths = Math.round(pct * 100);
  const shop = Math.floor((price * pctHundredths + 5000) / 10000);
  return { priceMillimes: price, shopMillimes: shop, depositorMillimes: price - shop };
}

/** "320.000 TND" (or without unit). */
export function formatTnd(millimes: number, withUnit = true): string {
  const sign = millimes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(millimes));
  const whole = Math.floor(abs / MILLIMES_PER_TND);
  const frac = String(abs % MILLIMES_PER_TND).padStart(3, '0');
  return `${sign}${whole}.${frac}${withUnit ? ' TND' : ''}`;
}

/** Parses user input like "320", "320,5", "12.345" → millimes, or null when invalid. */
export function parseTndInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{0,3})?$/.test(cleaned)) return null;
  return toMillimes(Number(cleaned));
}
