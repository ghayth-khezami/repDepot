/**
 * Allowed dépôt commissions (%).
 * MIRROR: server/src/common/commission.ts — keep both lists identical.
 */
export const COMMISSION_VALUES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export const DEFAULT_COMMISSION = 25;

export function isAllowedCommission(v: number) {
  return (COMMISSION_VALUES as readonly number[]).includes(v);
}

/** Closest allowed value (for spoken / legacy numbers). */
export function nearestCommission(v: number) {
  return COMMISSION_VALUES.reduce((best, c) => (Math.abs(c - v) < Math.abs(best - v) ? c : best), DEFAULT_COMMISSION as number);
}
