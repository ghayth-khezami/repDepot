import { buildContractPdf, splitByScript } from "./contract-pdf";
import { commissionLabel, DEFAULT_CONTRACT_TERMS, resolveContractTerms } from "./contract-terms";

describe("contract terms", () => {
  it("uses the dépôt's commission and duration in the default terms", () => {
    const t = resolveContractTerms(null, { commissions: [5, 5], durationMonths: 6 });
    expect(t).toContain("Une commission de 5 % du prix");
    expect(t).toContain("dépassé 6 mois");
    expect(t).toContain("après 5 mois de dépôt");
    expect(t).toContain("à l'issue de 6 mois");
    expect(t).not.toContain("25 %");
  });

  it("rewrites old saved texts with hard-coded numbers", () => {
    const old = "Une commission de 25 % du prix.\nLes articles ayant dépassé 3 mois de dépôt seront retournés.";
    const t = resolveContractTerms(old, { commissions: [15], durationMonths: 1 });
    expect(t).toBe("Une commission de 15 % du prix.\nLes articles ayant dépassé 1 mois de dépôt seront retournés.");
  });

  it("describes mixed commissions as a range", () => {
    expect(commissionLabel([10, 25, 10])).toBe("10 à 25 % (selon l'article, voir la fiche de dépôt)");
    expect(commissionLabel([])).toBe("25 %");
  });

  it("splits a mixed Latin / Arabic address into one line per script", () => {
    expect(splitByScript("X 20, Ariana Al Ulya, أريانة العليا, معتمدية أريانة, Ariana, 2037, Tunisia")).toEqual({
      latin: "X 20, Ariana Al Ulya, Ariana, 2037, Tunisia",
      arabic: "أريانة العليا، معتمدية أريانة",
    });
  });

  it("renders a contract whose address contains Arabic", async () => {
    const buf = await buildContractPdf({
      shop: { name: "Bébé-Dépôt", address: "Manouba", phone: "55 863 578" },
      contractNumber: "DV-2026-0005",
      createdAt: new Date("2026-11-27"),
      durationMonths: 3,
      expiresAt: new Date("2027-02-27"),
      deposant: { fullName: "Test Test", phone: "25252525", address: "X 20, Ariana Al Ulya, أريانة العليا, Tunisia" },
      items: [],
      totals: { priceMillimes: 0, shopMillimes: 0, depositorMillimes: 0 },
      terms: resolveContractTerms(DEFAULT_CONTRACT_TERMS, { commissions: [5], durationMonths: 3 }),
      trackingUrl: "https://bebedepot.tn/suivi/abcdefghijklmnopqrstuvwxyz",
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.toString("latin1")).toContain("Amiri");
  }, 30_000); // embedding the Arabic font is slow when every suite runs in parallel
});
