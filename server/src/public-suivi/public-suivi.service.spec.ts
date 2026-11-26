import { NotFoundException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { computeSuiviTotals, PublicSuiviService } from "./public-suivi.service";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWx";
const SECRET_PHONE = "98765432";
const SECRET_EMAIL = "secret@example.com";
const SECRET_ADDRESS = "12 rue Secrète";
const SECRET_RIB = "12345678901234567890";

function product(over: Partial<any> = {}) {
  return {
    ref: "D-143-01",
    productName: "Poussette",
    PrixVente: 320,
    depotPercentage: 25,
    shopAmountMillimes: 80_000,
    depositorAmountMillimes: 240_000,
    status: ProductStatus.EN_VENTE,
    soldAt: null,
    payoutStatus: null,
    createdAt: new Date("2026-11-01T10:00:00Z"),
    category: { categoryName: "Poussettes" },
    photos: [],
    // Fields that must never be forwarded even if a future select returns them:
    PrixAchat: 10,
    coclientId: "co-1",
    barcode: "2000000000001",
    ...over,
  };
}

function setup(row: any) {
  const findUnique = jest.fn().mockResolvedValue(row);
  const prisma = { depositRequest: { findUnique } } as any;
  const siteSettings = {
    getShopContact: jest.fn().mockResolvedValue({
      phone: "55863578",
      phoneDisplay: "55 863 578",
      phoneTel: "+21655863578",
      whatsapp: "21655863578",
      address: "Route Campus universitaire, Manouba",
      mapsUrl: "https://maps.example",
    }),
  } as any;
  const storeHours = {
    findAll: jest.fn().mockResolvedValue([
      { id: "h", weekday: "MONDAY", isClosed: false, openTime: "09:00", closeTime: "19:00", createdAt: new Date(), updatedAt: new Date() },
    ]),
  } as any;
  return { service: new PublicSuiviService(prisma, siteSettings, storeHours), findUnique };
}

const fullRow = {
  id: "contract-uuid",
  contractNumber: "DV-2026-0143",
  createdAt: new Date("2026-11-01T10:00:00Z"),
  durationMonths: 3,
  internalNote: "note interne",
  // A mock that over-returns: the service must still whitelist.
  coClient: {
    id: "co-1",
    firstName: "Sarra",
    lastName: "Ben Ali",
    phoneNumber: SECRET_PHONE,
    email: SECRET_EMAIL,
    address: SECRET_ADDRESS,
    RIB: SECRET_RIB,
  },
  products: [
    product(),
    product({ ref: "D-143-02", status: ProductStatus.VENDU, soldAt: new Date("2026-11-10"), payoutStatus: PayoutStatus.PAYE }),
    product({ ref: "D-143-03", status: ProductStatus.VENDU, soldAt: new Date("2026-11-11"), payoutStatus: null }),
    product({ ref: "D-143-04", status: ProductStatus.RETIRE }),
  ],
};

describe("PublicSuiviService", () => {
  it("never exposes the déposant's phone, email, address or RIB", async () => {
    const { service, findUnique } = setup(fullRow);
    const res = await service.getByToken(TOKEN);
    const json = JSON.stringify(res);
    for (const secret of [SECRET_PHONE, SECRET_EMAIL, SECRET_ADDRESS, SECRET_RIB, "Ben Ali", "note interne", "contract-uuid", "co-1", "PrixAchat", "barcode"]) {
      expect(json).not.toContain(secret);
    }
    // The query itself only selects first/last name from the déposant.
    const select = findUnique.mock.calls[0][0].select;
    expect(Object.keys(select.coClient.select).sort()).toEqual(["firstName", "lastName"]);
  });

  it("returns exactly the whitelisted shape", async () => {
    const { service } = setup(fullRow);
    const res = await service.getByToken(TOKEN);
    expect(Object.keys(res).sort()).toEqual(["contract", "deposant", "items", "shop", "totals"]);
    expect(res.deposant).toEqual({ firstName: "Sarra", lastInitial: "B" });
    expect(Object.keys(res.contract).sort()).toEqual(["depositDate", "durationMonths", "expiresAt", "number"]);
    expect(Object.keys(res.items[0]).sort()).toEqual(
      ["category", "depositedAt", "depositorMillimes", "name", "payoutStatus", "photo", "priceMillimes", "ref", "soldAt", "status"],
    );
    expect(Object.keys(res.shop).sort()).toEqual(["address", "hours", "mapsUrl", "phoneDisplay", "phoneTel", "whatsapp"]);
    expect(Object.keys(res.shop.hours[0]).sort()).toEqual(["closeTime", "isClosed", "openTime", "weekday"]);
    expect(res.contract.expiresAt.toISOString().slice(0, 10)).toBe("2027-02-01");
  });

  it("computes totals: à percevoir, payé, potentiel", async () => {
    const { service } = setup(fullRow);
    const { totals, items } = await service.getByToken(TOKEN);
    expect(items[2].payoutStatus).toBe(PayoutStatus.A_PERCEVOIR); // sold, not yet paid
    expect(totals).toEqual({
      count: 4,
      sold: 2,
      onSale: 1,
      withdrawn: 1,
      potentialMillimes: 720_000,
      soldMillimes: 480_000,
      toCollectMillimes: 240_000,
      paidMillimes: 240_000,
    });
  });

  it("404s on malformed tokens without querying the database", async () => {
    const { service, findUnique } = setup(fullRow);
    for (const bad of ["", "short", "1", "../../etc/passwd", "a".repeat(65), "AbCdEfGhIjKlMnOpQrSt Uvw"]) {
      await expect(service.getByToken(bad)).rejects.toBeInstanceOf(NotFoundException);
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("404s on unknown tokens", async () => {
    const { service } = setup(null);
    await expect(service.getByToken(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("handles a contract with zero articles", async () => {
    const { service } = setup({ ...fullRow, products: [] });
    const res = await service.getByToken(TOKEN);
    expect(res.items).toEqual([]);
    expect(computeSuiviTotals([])).toEqual(res.totals);
  });
});
