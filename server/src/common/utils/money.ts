/**
 * Money helpers. All arithmetic happens in integer millimes (1 TND = 1000 millimes)
 * so the server and the admin preview agree to the millime.
 * The admin client mirrors this file in client/src/lib/money.ts — keep them identical.
 */

export const MILLIMES_PER_TND = 1000;

/** TND (number, possibly float from legacy columns) → integer millimes. */
export function toMillimes(tnd: number): number {
  if (!Number.isFinite(tnd)) return 0;
  // Round through a fixed 3-decimal string first so 0.1 + 0.2 style artefacts never leak.
  return Math.round(Number(tnd.toFixed(6)) * MILLIMES_PER_TND);
}

/** Integer millimes → TND number with at most 3 decimals. */
export function fromMillimes(millimes: number): number {
  return Math.round(millimes) / MILLIMES_PER_TND;
}

export interface CommissionSplit {
  priceMillimes: number;
  shopMillimes: number;
  depositorMillimes: number;
}

/**
 * shopAmount = round(price × commission / 100); depositorAmount = price − shopAmount.
 * Half-up rounding on the millime.
 */
export function splitCommission(priceMillimes: number, commissionPercent: number): CommissionSplit {
  const price = Math.max(0, Math.round(priceMillimes));
  const pct = Math.min(100, Math.max(0, commissionPercent || 0));
  // Work in hundredths of a percent to avoid float error on values like 12.5 %.
  const pctHundredths = Math.round(pct * 100);
  const shop = Math.floor((price * pctHundredths + 5000) / 10000);
  return { priceMillimes: price, shopMillimes: shop, depositorMillimes: price - shop };
}

/** "320.000 TND" */
export function formatTnd(millimes: number): string {
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(millimes));
  const whole = Math.floor(abs / MILLIMES_PER_TND);
  const frac = String(abs % MILLIMES_PER_TND).padStart(3, "0");
  return `${sign}${whole}.${frac} TND`;
}
