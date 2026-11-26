/**
 * Tiny in-process bus: "these products were just marked VENDU".
 * Batched with a short delay so the emitting transaction has committed before listeners read the DB.
 */
type Listener = (productIds: string[]) => void | Promise<void>;

let listener: Listener | null = null;
const pending = new Set<string>();
let timer: NodeJS.Timeout | null = null;

export function onProductsSold(fn: Listener) {
  listener = fn;
}

export function emitProductsSold(productIds: string[]) {
  if (!productIds.length) return;
  productIds.forEach((id) => pending.add(id));
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const batch = [...pending];
    pending.clear();
    timer = null;
    void Promise.resolve(listener?.(batch)).catch(() => undefined);
  }, 2000);
}
