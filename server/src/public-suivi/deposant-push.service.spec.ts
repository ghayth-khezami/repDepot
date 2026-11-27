import { PayoutStatus, ProductStatus } from "@prisma/client";
import { DeposantPushService } from "./deposant-push.service";
import { publishProductStatusChanged } from "../common/domain-events";
import { renderDeposantMessage } from "../notification/deposant-templates";
import { categoryKey } from "../category/category-name";

function makePrisma(products: any[]) {
  const logs: any[] = [];
  const prisma: any = {
    logs,
    product: {
      findMany: async ({ where }: any) =>
        products.filter(
          (p) =>
            where.id.in.includes(p.id) &&
            p.isDepot &&
            p.status === where.status &&
            (!where.payoutStatus || p.payoutStatus === where.payoutStatus) &&
            (where.soldNotifiedAt === null ? !p.soldNotifiedAt : true) &&
            (where.paidNotifiedAt === null ? !p.paidNotifiedAt : true),
        ),
      updateMany: async ({ where, data }: any) => {
        products.filter((p) => where.id.in.includes(p.id)).forEach((p) => Object.assign(p, data));
        return { count: 1 };
      },
    },
    deposantPush: { findMany: async () => [], delete: async () => undefined },
    deposantNotification: { create: async ({ data }: any) => logs.push(data) },
  };
  return prisma;
}

const karim = () => ({
  id: "p1",
  ref: "D-2-04",
  productName: "Jouet de enfants",
  PrixVente: 150,
  isDepot: true,
  status: ProductStatus.VENDU,
  payoutStatus: PayoutStatus.A_PERCEVOIR,
  coclientId: "c1",
  coClient: { firstName: "Karim", email: "karim@example.com" },
  soldNotifiedAt: null as Date | null,
  paidNotifiedAt: null as Date | null,
});

describe("déposant notifications", () => {
  const OLD = process.env.KHEZAMI_PHONE;
  beforeAll(() => (process.env.KHEZAMI_PHONE = "55 000 111"));
  afterAll(() => (process.env.KHEZAMI_PHONE = OLD));

  it("renders the VENDU and PAYE templates with every variable", () => {
    const vars = { prenom: "Karim", produit: "Poussette", ref: "D-2-04", prix: "150.000" };
    const sold = renderDeposantMessage("VENDU", vars, "55 000 111").body;
    expect(sold).toContain("Bonjour Karim");
    expect(sold).toContain("« Poussette » (réf. D-2-04)");
    expect(sold).toContain("Votre part de 150.000 TND vous attend");
    expect(sold).toContain("Madame Khezami au 55 000 111");
    expect(renderDeposantMessage("PAYE", vars, "55 000 111").body).toContain("vous a bien été remis ✅");
  });

  it("sends on every channel the déposant has, logs each attempt, and sends only once", async () => {
    const product = karim();
    const prisma = makePrisma([product]);
    const sent: any[] = [];
    const email: any = { isConfigured: () => true, sendText: async (m: any) => sent.push(m) };
    const svc = new DeposantPushService(prisma, email);
    svc.onModuleInit();
    try {
      // Marked "Vendu" by hand: no message yet (it is sent when the order is created).
      const manual = await publishProductStatusChanged({ productIds: ["p1"], to: "VENDU", source: "manual" });
      expect(manual.sent + manual.failed + manual.skipped).toBe(0);
      expect(sent).toHaveLength(0);

      const summary = await publishProductStatusChanged({ productIds: ["p1"], to: "VENDU", source: "order" });
      expect(summary.sent).toBe(1);
      expect(summary.channels).toEqual(["email"]);
      expect(sent[0].to).toBe("karim@example.com");
      expect(sent[0].text).toContain("Jouet de enfants");
      expect(prisma.logs.map((l: any) => `${l.channel}:${l.status}`)).toEqual(["push:skipped", "email:sent", "sms:skipped"]);
      expect(product.soldNotifiedAt).toBeInstanceOf(Date);

      const again = await publishProductStatusChanged({ productIds: ["p1"], to: "VENDU", source: "order" });
      expect(again.sent).toBe(0);
    } finally {
      svc.onModuleDestroy();
    }
  });

  it("records a failed email instead of swallowing it", async () => {
    const product = { ...karim(), payoutStatus: PayoutStatus.PAYE };
    const prisma = makePrisma([product]);
    const email: any = { isConfigured: () => true, sendText: async () => { throw new Error("SMTP 535"); } };
    const svc = new DeposantPushService(prisma, email);
    const summary = await svc.notify("PAYE", ["p1"]);
    expect(summary.failed).toBe(1);
    expect(summary.errors[0]).toContain("SMTP 535");
    expect(prisma.logs.find((l: any) => l.channel === "email").status).toBe("failed");
  });
});

describe("category names", () => {
  it("treats case and accents as the same name", () => {
    expect(categoryKey("  Poussettes ")).toBe(categoryKey("POUSSÉTTES"));
    expect(categoryKey("Vêtements  bébé")).toBe("vetements bebe");
  });
});
