import { ConflictException } from "@nestjs/common";
import { DepotService } from "./depot.service";
import { CreateDepotDto } from "./dto/create-depot.dto";
import { buildContractPdf, DEFAULT_CONTRACT_TERMS } from "./contract-pdf";

/** Minimal in-memory Prisma double, enough for DepotService.create / getContract. */
function makePrisma() {
  const db = {
    coClients: [] as any[],
    contracts: [] as any[],
    products: [] as any[],
    contractSeq: 142,
  };
  let id = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`;

  const tx: any = {
    $queryRaw: async () => [{ seq: BigInt(++db.contractSeq) }],
    coClient: {
      findUnique: async ({ where }: any) =>
        db.coClients.find((c) => (where.id ? c.id === where.id : where.phoneNumber ? c.phoneNumber === where.phoneNumber : c.email === where.email)) ?? null,
      create: async ({ data }: any) => {
        const row = { id: uuid(), number: 143, refSeq: 0, ...data };
        db.coClients.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = db.coClients.find((c) => c.id === where.id);
        row.refSeq += data.refSeq.increment;
        return { number: row.number, refSeq: row.refSeq };
      },
    },
    category: { count: async ({ where }: any) => where.id.in.length },
    depositRequest: {
      create: async ({ data }: any) => {
        const row = { id: uuid(), createdAt: new Date("2026-11-26T09:00:00Z"), signedAt: null, status: "CONFIRMED", ...data };
        db.contracts.push(row);
        return row;
      },
      update: async ({ where, data }: any) => Object.assign(db.contracts.find((c) => c.id === where.id), data),
      findUnique: async ({ where }: any) => db.contracts.find((c) => c.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: any) => {
        const c = db.contracts.find((x) => x.id === where.id);
        return {
          ...c,
          coClient: db.coClients.find((co) => co.id === c.coClientId),
          items: [],
          products: db.products
            .filter((p) => p.depositRequestId === c.id)
            .map((p) => ({ ...p, photos: [], category: { id: p.categoryId, categoryName: "Cat" } })),
        };
      },
    },
    product: {
      create: async ({ data }: any) => {
        const row = { id: uuid(), status: "EN_VENTE", soldAt: null, payoutStatus: null, ...data };
        db.products.push(row);
        return row;
      },
      findMany: async ({ where }: any) =>
        db.products.filter((p) => p.depositRequestId === where.depositRequestId).map((p) => ({ ...p, photos: [] })),
    },
  };
  tx.$transaction = async (fn: any) => fn(tx);
  return { prisma: tx, db };
}

const siteSettings: any = {
  getShopContact: async () => ({ phoneDisplay: "55 863 578", address: "Manouba" }),
  getAdmin: async () => ({ contractTerms: null }),
};

const CAT = "11111111-1111-4111-8111-111111111111";
const baseDto = (items: CreateDepotDto["items"]): CreateDepotDto => ({
  deposant: { firstName: "Sarra", lastName: "Ben Ali", phone: "55123456", address: "12 rue de Tunis, Manouba" },
  durationMonths: 3,
  items,
});

jest.setTimeout(30_000);

describe("DepotService.create", () => {
  it("creates déposant + contract + products with server-side refs and millime split", async () => {
    const { prisma, db } = makePrisma();
    const service = new DepotService(prisma, siteSettings);
    const res = await service.create(
      baseDto([
        { name: "Poussette", price: 320, commissionPercent: 25, categoryId: CAT },
        { name: "Body", price: 12.345, commissionPercent: 30, categoryId: CAT },
      ]),
    );
    expect(res.contractNumber).toBe("DV-2026-0143");
    expect(res.trackingToken).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(res.trackingUrl).toBe(`https://bebedepot.tn/suivi/${res.trackingToken}`);
    expect(res.items.map((i) => i.ref)).toEqual(["D-143-01", "D-143-02"]);
    expect(res.items[0]).toMatchObject({ priceMillimes: 320_000, shopMillimes: 80_000, depositorMillimes: 240_000 });
    expect(res.items[1]).toMatchObject({ priceMillimes: 12_345, shopMillimes: 3_704, depositorMillimes: 8_641 });
    expect(res.totals).toEqual({ priceMillimes: 332_345, shopMillimes: 83_704, depositorMillimes: 248_641 });
    expect(db.products.every((p) => p.status === "EN_VENTE" && p.isDispo && p.isDepot)).toBe(true);
    // Optional fields stay null (the address is required); no password/user involved
    expect(db.coClients[0]).toMatchObject({ email: null, address: "12 rue de Tunis, Manouba", RIB: null });
    expect(db.coClients[0].userId).toBeUndefined();
  });

  it("still produces a contract with a tracking token when articles are skipped", async () => {
    const { prisma, db } = makePrisma();
    const service = new DepotService(prisma, siteSettings);
    const res = await service.create(baseDto([]));
    expect(res.items).toEqual([]);
    expect(res.trackingToken).toBeTruthy();
    expect(db.products).toHaveLength(0);
    const pdf = await service.contractPdf(res.id);
    expect(pdf.buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rejects a duplicate phone with the existing déposant (409)", async () => {
    const { prisma } = makePrisma();
    const service = new DepotService(prisma, siteSettings);
    await service.create(baseDto([]));
    await expect(service.create(baseDto([]))).rejects.toBeInstanceOf(ConflictException);
  });

  it("reuses an existing déposant and continues their ref counter", async () => {
    const { prisma } = makePrisma();
    const service = new DepotService(prisma, siteSettings);
    const first = await service.create(baseDto([{ name: "A", price: 10, commissionPercent: 25, categoryId: CAT }]));
    const second = await service.create({
      deposantId: first.deposant.id,
      durationMonths: 1,
      items: [{ name: "B", price: 20, commissionPercent: 25, categoryId: CAT }],
    });
    expect(second.items[0].ref).toBe("D-143-02");
    expect(second.contractNumber).toBe("DV-2026-0144");
  });
});

describe("buildContractPdf", () => {
  it("renders a valid PDF with many items (multi-page)", async () => {
    const items = Array.from({ length: 45 }, (_, i) => ({
      ref: `D-1-${i + 1}`,
      name: `Article ${i + 1} avec un nom assez long pour être tronqué proprement`,
      priceMillimes: 10_000,
      commissionPercent: 25,
      shopMillimes: 2_500,
      depositorMillimes: 7_500,
    }));
    const buf = await buildContractPdf({
      shop: { name: "Bébé-Dépôt", address: "Manouba", phone: "55 863 578" },
      contractNumber: "DV-2026-0001",
      createdAt: new Date(),
      durationMonths: 3,
      expiresAt: new Date(),
      deposant: { fullName: "Ben Ali Sarra", phone: "55123456" },
      items,
      totals: { priceMillimes: 450_000, shopMillimes: 112_500, depositorMillimes: 337_500 },
      terms: DEFAULT_CONTRACT_TERMS,
      trackingUrl: "https://bebedepot.tn/suivi/AbCdEfGhIjKlMnOpQrStUvWx",
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(5_000);
  });
});
