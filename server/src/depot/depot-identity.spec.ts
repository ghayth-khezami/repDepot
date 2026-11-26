import { Prisma } from "@prisma/client";
import {
  formatContractNumber,
  formatDepositorRef,
  generateTrackingToken,
  reserveDepositorRefs,
  withUniqueRetry,
} from "./depot-identity";

/**
 * Fake transaction client whose `coClient.update({ refSeq: { increment } })` behaves like
 * Postgres' UPDATE … RETURNING under a row lock: the read-modify-write is atomic, but callers
 * are interleaved at every await (random latency), exactly like concurrent HTTP requests.
 */
function fakeDb(number: number, start = 0) {
  const row = { number, refSeq: start };
  const delay = () => new Promise((r) => setTimeout(r, Math.random() * 5));
  const tx = {
    coClient: {
      update: async ({ data }: any) => {
        await delay();
        row.refSeq += data.refSeq.increment; // atomic step
        const snapshot = { number: row.number, refSeq: row.refSeq };
        await delay();
        return snapshot;
      },
    },
  };
  return { tx: tx as any, row };
}

describe("ref generation", () => {
  it("formats D-{déposant}-{seq}", () => {
    expect(formatDepositorRef(143, 1)).toBe("D-143-01");
    expect(formatDepositorRef(143, 12)).toBe("D-143-12");
    expect(formatDepositorRef(7, 123)).toBe("D-7-123");
  });

  it("formats contract numbers", () => {
    expect(formatContractNumber(2026, 143)).toBe("DV-2026-0143");
    expect(formatContractNumber(2026, 12345)).toBe("DV-2026-12345");
  });

  it("reserves a contiguous block continuing the déposant counter", async () => {
    const { tx, row } = fakeDb(143, 4);
    await expect(reserveDepositorRefs(tx, "x", 3)).resolves.toEqual(["D-143-05", "D-143-06", "D-143-07"]);
    expect(row.refSeq).toBe(7);
    await expect(reserveDepositorRefs(tx, "x", 0)).resolves.toEqual([]);
  });

  it("never hands out the same ref under concurrency", async () => {
    const { tx, row } = fakeDb(9);
    const counts = Array.from({ length: 40 }, () => 1 + Math.floor(Math.random() * 6));
    const batches = await Promise.all(counts.map((n) => reserveDepositorRefs(tx, "x", n)));
    const all = batches.flat();
    const total = counts.reduce((a, b) => a + b, 0);
    expect(all).toHaveLength(total);
    expect(new Set(all).size).toBe(total);
    // Contiguous 1..total, no gaps
    const seqs = all.map((r) => Number(r.split("-")[2])).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    expect(row.refSeq).toBe(total);
    // Each batch itself is contiguous
    for (const b of batches) {
      const s = b.map((r) => Number(r.split("-")[2]));
      s.forEach((v, i) => i && expect(v).toBe(s[i - 1] + 1));
    }
  });

  it("retries the whole transaction on a unique violation, then gives up", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });
    let calls = 0;
    await expect(
      withUniqueRetry(async () => {
        calls++;
        if (calls < 3) throw p2002;
        return "ok";
      }),
    ).resolves.toBe("ok");
    expect(calls).toBe(3);

    calls = 0;
    await expect(withUniqueRetry(async () => { calls++; throw p2002; })).rejects.toBe(p2002);
    expect(calls).toBe(3);

    const other = new Error("boom");
    calls = 0;
    await expect(withUniqueRetry(async () => { calls++; throw other; })).rejects.toBe(other);
    expect(calls).toBe(1);
  });
});

describe("tracking token", () => {
  it("is ≥ 22 url-safe chars, random and non-sequential", () => {
    const tokens = Array.from({ length: 2000 }, generateTrackingToken);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});
