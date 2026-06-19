/** Standard page size for all infinite-scroll lists — never request more than 10 per page. */
export const PAGE_SIZE = 10;

export function clampPageSize(limit?: number): number {
  const n = Number(limit ?? PAGE_SIZE);
  if (!Number.isFinite(n) || n < 1) return PAGE_SIZE;
  return Math.min(Math.round(n), PAGE_SIZE);
}

export function paginateArgs<T extends { page?: number; limit?: number }>(
  args: T,
): T & { limit: number } {
  return { ...args, limit: clampPageSize(args.limit) };
}
