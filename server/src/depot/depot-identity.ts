import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

/** D-{déposantNumber}-{seq}, e.g. D-143-01 (seq is zero-padded to 2, grows past 99). */
export function formatDepositorRef(depositorNumber: number, seq: number): string {
  return `D-${depositorNumber}-${String(seq).padStart(2, "0")}`;
}

/** DV-{year}-{seq}, e.g. DV-2026-0143. */
export function formatContractNumber(year: number, seq: number): string {
  return `DV-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * 24-char URL-safe random token (144 bits, same alphabet as nanoid).
 * Never sequential, never derived from ids.
 */
export function generateTrackingToken(): string {
  return randomBytes(18).toString("base64url");
}

type Tx = Prisma.TransactionClient;

/**
 * Reserve `count` consecutive ref sequence numbers for a déposant.
 * `refSeq: { increment }` is a single UPDATE … RETURNING, so concurrent transactions
 * serialize on the row lock and can never receive overlapping ranges.
 */
export async function reserveDepositorRefs(tx: Tx, coClientId: string, count: number): Promise<string[]> {
  if (count <= 0) return [];
  const row = await tx.coClient.update({
    where: { id: coClientId },
    data: { refSeq: { increment: count } },
    select: { number: true, refSeq: true },
  });
  const first = row.refSeq - count + 1;
  return Array.from({ length: count }, (_, i) => formatDepositorRef(row.number, first + i));
}

/** Next contract number from a DB sequence (concurrency-safe, monotonic). */
export async function nextContractNumber(tx: Tx, now = new Date()): Promise<string> {
  const [{ seq }] = await tx.$queryRaw<Array<{ seq: bigint }>>`SELECT nextval('contract_number_seq') AS seq`;
  return formatContractNumber(now.getFullYear(), Number(seq));
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Retry a whole transaction when a unique constraint races (belt-and-braces on top of the counters). */
export async function withUniqueRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
