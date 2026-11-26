import { formatTnd, fromMillimes, splitCommission, toMillimes } from "./money";

describe("money (millimes)", () => {
  it("converts TND ↔ millimes without float drift", () => {
    expect(toMillimes(320)).toBe(320_000);
    expect(toMillimes(0.1 + 0.2)).toBe(300);
    expect(toMillimes(12.345)).toBe(12_345);
    expect(toMillimes(1.0005)).toBe(1_001); // half-up on the millime
    expect(fromMillimes(12_345)).toBe(12.345);
  });

  it.each([
    // price (millimes), commission %, shop, depositor
    [320_000, 25, 80_000, 240_000],
    [100_000, 0, 0, 100_000],
    [100_000, 100, 100_000, 0],
    [99_999, 33, 33_000, 66_999], // 32 999.67 → 33 000
    [10_001, 12.5, 1_250, 8_751], // 1 250.125 → 1 250
    [10_004, 12.5, 1_251, 8_753], // 1 250.5 → 1 251 (half-up)
    [1, 40, 0, 1],
    [3, 50, 2, 1], // 1.5 → 2
  ])("splits %i mm at %d%% → shop %i / déposant %i", (price, pct, shop, dep) => {
    const s = splitCommission(price, pct);
    expect(s.shopMillimes).toBe(shop);
    expect(s.depositorMillimes).toBe(dep);
    expect(s.shopMillimes + s.depositorMillimes).toBe(price);
  });

  it("clamps commission into 0–100", () => {
    expect(splitCommission(1000, -5).shopMillimes).toBe(0);
    expect(splitCommission(1000, 150).shopMillimes).toBe(1000);
  });

  it("always sums back to the price (property check)", () => {
    for (let i = 0; i < 2000; i++) {
      const price = Math.floor(Math.random() * 5_000_000);
      const pct = Math.round(Math.random() * 10000) / 100;
      const s = splitCommission(price, pct);
      expect(s.shopMillimes + s.depositorMillimes).toBe(price);
      expect(s.shopMillimes).toBe(Math.round((price * pct) / 100 + 1e-9));
    }
  });

  it("formats with 3 decimals", () => {
    expect(formatTnd(320_000)).toBe("320.000 TND");
    expect(formatTnd(5)).toBe("0.005 TND");
    expect(formatTnd(-1_250)).toBe("-1.250 TND");
  });
});
