"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { SuiviHour } from "@/lib/suivi";
import { WEEKDAY_FR, shopNow, toMinutes } from "./format";

/** Opening hours from Horaires with a live "Ouvert maintenant / Fermé" badge (shop timezone). */
export function OpeningHours({ hours }: { hours: SuiviHour[] }) {
  // Computed after mount so the server render and the visitor's clock never disagree.
  const [now, setNow] = useState<ReturnType<typeof shopNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(shopNow());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const today = now ? hours.find((h) => h.weekday === now.weekday) : undefined;
  const open =
    !!today &&
    !today.isClosed &&
    now !== null &&
    (toMinutes(today.openTime) ?? 1e9) <= now.minutes &&
    now.minutes < (toMinutes(today.closeTime) ?? -1);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-bd-ink">
          <Clock aria-hidden className="h-4 w-4 text-bd-violet" /> Horaires
        </h3>
        {now ? (
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${open ? "bg-bd-success-bg text-bd-success" : "bg-bd-danger-bg text-bd-danger"}`}
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${open ? "animate-pulse bg-bd-success" : "bg-bd-danger"}`} />
            {open ? "Ouvert maintenant" : "Fermé"}
          </span>
        ) : null}
      </div>
      <ul className="divide-y divide-bd-line/5 rounded-2xl bg-bd-bg px-3 text-sm">
        {hours.map((h) => {
          const isToday = now?.weekday === h.weekday;
          return (
            <li key={h.weekday} className={`flex justify-between py-2 ${isToday ? "font-black text-bd-ink" : "font-bold text-bd-muted"}`}>
              <span>
                {WEEKDAY_FR[h.weekday]}
                {isToday ? <span className="sr-only"> (aujourd&apos;hui)</span> : null}
              </span>
              <span className="tabular-nums">{h.isClosed || !h.openTime || !h.closeTime ? "Fermé" : `${h.openTime} – ${h.closeTime}`}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
