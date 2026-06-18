const SENSITIVE_PRODUCT_KEYS = [
  "PrixAchat",
  "gain",
  "surcharge",
  "depotPercentage",
  "coclientId",
  "commandDetails",
] as const;

export function sanitizeProductForStorefront<T extends Record<string, unknown>>(product: T) {
  const copy = { ...product } as Record<string, unknown>;
  for (const key of SENSITIVE_PRODUCT_KEYS) {
    delete copy[key];
  }
  if (copy.coClient && typeof copy.coClient === "object") {
    const co = copy.coClient as Record<string, unknown>;
    copy.coClient = {
      id: co.id,
      firstName: co.firstName,
      lastName: co.lastName,
    };
  }
  return copy as T;
}
