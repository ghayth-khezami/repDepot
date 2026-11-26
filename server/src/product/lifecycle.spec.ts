import { BadRequestException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { assertTransition, stageData, stageOf } from "./lifecycle";
import { deposantSearchClauses } from "./deposant-search";
import { ChangeLifecycleDto } from "./dto/change-lifecycle.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { buildQrCardsPdf } from "../common/barcode-label.util";
import { isAllowedCommission, COMMISSION_VALUES } from "../common/commission";

describe("product lifecycle EN_VENTE → VENDU → PAYE", () => {
  it("derives the visible stage from status + payoutStatus", () => {
    expect(stageOf({ status: ProductStatus.EN_VENTE, payoutStatus: null })).toBe("EN_VENTE");
    expect(stageOf({ status: ProductStatus.VENDU, payoutStatus: PayoutStatus.A_PERCEVOIR })).toBe("VENDU");
    expect(stageOf({ status: ProductStatus.VENDU, payoutStatus: PayoutStatus.PAYE })).toBe("PAYE");
    expect(stageOf({ status: ProductStatus.RETIRE, payoutStatus: null })).toBe("RETIRE");
  });

  it("allows the forward steps and the reset", () => {
    expect(() => assertTransition("EN_VENTE", "VENDU", true)).not.toThrow();
    expect(() => assertTransition("VENDU", "PAYE", true)).not.toThrow();
    expect(() => assertTransition("PAYE", "EN_VENTE", true)).not.toThrow();
    expect(() => assertTransition("VENDU", "EN_VENTE", false)).not.toThrow();
    expect(() => assertTransition("EN_VENTE", "RETIRE", true)).not.toThrow();
  });

  it("rejects skipping or going backwards with a readable 400", () => {
    expect(() => assertTransition("EN_VENTE", "PAYE", true)).toThrow(BadRequestException);
    expect(() => assertTransition("PAYE", "VENDU", true)).toThrow(/Changement impossible/);
    expect(() => assertTransition("RETIRE", "VENDU", true)).toThrow(BadRequestException);
  });

  it("refuses PAYE for shop purchases (no déposant to pay)", () => {
    expect(() => assertTransition("VENDU", "PAYE", false)).toThrow(/dépôt/);
  });

  it("stamps soldAt / paidAt and keeps them on later steps", () => {
    const now = new Date("2026-11-27T10:00:00Z");
    const sold = stageData("VENDU", true, { soldAt: null, paidAt: null }, now);
    expect(sold).toMatchObject({ status: ProductStatus.VENDU, isDispo: false, soldAt: now, payoutStatus: PayoutStatus.A_PERCEVOIR });
    const paid = stageData("PAYE", true, { soldAt: now, paidAt: null }, new Date("2026-11-28T10:00:00Z"));
    expect(paid.soldAt).toBe(now);
    expect(paid.payoutStatus).toBe(PayoutStatus.PAYE);
    expect(paid.paidAt).toEqual(new Date("2026-11-28T10:00:00Z"));
    const reset = stageData("EN_VENTE", true, { soldAt: now, paidAt: now });
    expect(reset).toMatchObject({ status: ProductStatus.EN_VENTE, isDispo: true, soldAt: null, paidAt: null, soldNotifiedAt: null, paidNotifiedAt: null });
  });

  it("validates the lifecycle DTO", async () => {
    expect(await validate(plainToInstance(ChangeLifecycleDto, { to: "PAYE" }))).toHaveLength(0);
    expect((await validate(plainToInstance(ChangeLifecycleDto, { to: "LIVRE" })))[0].constraints).toBeDefined();
  });
});

describe("commission values", () => {
  it("only accepts the fixed list", async () => {
    expect(COMMISSION_VALUES).toEqual([5, 10, 15, 25, 30, 35, 40, 45, 50]);
    expect(isAllowedCommission(25)).toBe(true);
    expect(isAllowedCommission(20)).toBe(false);
    const bad = plainToInstance(CreateProductDto, { depotPercentage: 20 });
    const errors = await validate(bad);
    expect(errors.find((e) => e.property === "depotPercentage")).toBeDefined();
    const good = plainToInstance(CreateProductDto, { depotPercentage: 30 });
    expect((await validate(good)).find((e) => e.property === "depotPercentage")).toBeUndefined();
  });
});

describe("admin product search by déposant", () => {
  it("matches every word of the name", () => {
    const [clause] = deposantSearchClauses("karim ben");
    expect(clause.coClient.AND).toHaveLength(2);
  });
  it("matches phone digits and the déposant N°", () => {
    const phone = deposantSearchClauses("55 863 778");
    expect(phone.some((c) => c.coClient?.phoneNumber?.contains === "55863778")).toBe(true);
    const num = deposantSearchClauses("2");
    expect(num.some((c) => c.coClient?.number === 2)).toBe(true);
  });
  it("returns nothing for an empty search", () => {
    expect(deposantSearchClauses("   ")).toEqual([]);
  });
});

describe("QR cards PDF", () => {
  const product = (i: number) => ({
    id: `id-${i}`,
    ref: `D-2-${String(i).padStart(2, "0")}`,
    productName: `Article ${i} avec un nom vraiment très très long qui ne tient pas sur une ligne`,
    description: "Description longue ".repeat(20),
    PrixVente: 150 + i,
  });
  it("renders a valid PDF, 12 fixed cards per A4 page", async () => {
    const one = await buildQrCardsPdf(Array.from({ length: 12 }, (_, i) => product(i)));
    const two = await buildQrCardsPdf(Array.from({ length: 13 }, (_, i) => product(i)));
    expect(one.subarray(0, 4).toString()).toBe("%PDF");
    const pages = (b: Buffer) => (b.toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pages(one)).toBe(1);
    expect(pages(two)).toBe(2);
  }, 30000);
});
