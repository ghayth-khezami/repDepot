/**
 * Allowed dépôt commissions (%). Single source of truth for the API.
 * MIRROR: client/src/lib/commission.ts — keep both lists identical.
 */
export const COMMISSION_VALUES = [5, 10, 15, 25, 30, 35, 40, 45, 50] as const;
export const DEFAULT_COMMISSION = 25;

export function isAllowedCommission(value: unknown): boolean {
  return typeof value === "number" && (COMMISSION_VALUES as readonly number[]).includes(value);
}

export const COMMISSION_MESSAGE = `Commission autorisée : ${COMMISSION_VALUES.join(", ")} %.`;
