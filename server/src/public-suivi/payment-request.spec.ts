import { parsePickupDay } from "./payment-request.service";

describe("payment request pickup day", () => {
  // Thursday 26 Nov 2026, 10:00 in Tunis
  const now = new Date("2026-11-26T09:00:00Z");

  it("refuses less than 2 days ahead", () => {
    expect(() => parsePickupDay("2026-11-27", now)).toThrow(/48 h/);
  });
  it("accepts exactly 2 days ahead", () => {
    expect(parsePickupDay("2026-11-28", now).toISOString()).toBe("2026-11-28T11:00:00.000Z");
  });
  it("refuses Sundays", () => {
    expect(() => parsePickupDay("2026-11-29", now)).toThrow(/dimanche/);
  });
  it("refuses malformed dates", () => {
    expect(() => parsePickupDay("29/11/2026", now)).toThrow(/invalide/);
  });
});
