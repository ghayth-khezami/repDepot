/**
 * In-process domain events. `product.status.changed` is published by the service layer after a
 * successful transition; the déposant notifier listens to it.
 *  - publishProductStatusChanged(): awaited, returns what the listeners did (admin gets "Déposant notifié ✅").
 *  - publishProductStatusChangedLater(): batched 2 s later, for callers still inside a DB transaction (orders).
 */
export type ProductStage = "EN_VENTE" | "VENDU" | "PAYE" | "RETIRE";

export interface ProductStatusChanged {
  productIds: string[];
  to: ProductStage;
  /**
   * "order" = sold through an order (website, backoffice order, achat sur place).
   * "manual" = status changed by hand in the backoffice. The déposant's "vendu" message is only sent
   * for orders; a manual "Vendu" just waits for its order.
   */
  source?: "order" | "manual";
}

export interface NotifySummary {
  sent: number;
  failed: number;
  skipped: number;
  channels: string[];
  errors: string[];
}

type Listener = (event: ProductStatusChanged) => Promise<NotifySummary | void>;

const listeners: Listener[] = [];

export function onProductStatusChanged(fn: Listener) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export const emptySummary = (): NotifySummary => ({ sent: 0, failed: 0, skipped: 0, channels: [], errors: [] });

export async function publishProductStatusChanged(event: ProductStatusChanged): Promise<NotifySummary> {
  const total = emptySummary();
  if (!event.productIds.length) return total;
  for (const fn of listeners) {
    try {
      const r = await fn(event);
      if (!r) continue;
      total.sent += r.sent;
      total.failed += r.failed;
      total.skipped += r.skipped;
      total.channels.push(...r.channels.filter((c) => !total.channels.includes(c)));
      total.errors.push(...r.errors);
    } catch (e) {
      total.failed += 1;
      total.errors.push((e as Error).message);
    }
  }
  return total;
}

const pending = new Map<string, Set<string>>();
let timer: NodeJS.Timeout | null = null;

export function publishProductStatusChangedLater(event: ProductStatusChanged, delayMs = 2000) {
  if (!event.productIds.length) return;
  const key = `${event.to}|${event.source ?? "manual"}`;
  const set = pending.get(key) ?? new Set<string>();
  event.productIds.forEach((id) => set.add(id));
  pending.set(key, set);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const batches = [...pending.entries()];
    pending.clear();
    for (const [key, ids] of batches) {
      const [to, source] = key.split("|") as [ProductStage, "order" | "manual"];
      void publishProductStatusChanged({ productIds: [...ids], to, source });
    }
  }, delayMs);
}
