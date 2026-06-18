"use client";

import { fr } from "@/lib/fr";
import { StoreHour, WEEKDAY_ORDER, formatHourRange, weekdayMessageKey } from "@/lib/store-hours";
const DAY_FR: Record<string, string> = {
  monday: fr.monday,
  tuesday: fr.tuesday,
  wednesday: fr.wednesday,
  thursday: fr.thursday,
  friday: fr.friday,
  saturday: fr.saturday,
  sunday: fr.sunday,
};

function DayCard({ row }: { row: StoreHour }) {
  const dayKey = weekdayMessageKey[row.weekday];
  const label = DAY_FR[dayKey] ?? dayKey;

  return (
    <div className="flex min-w-[4.5rem] flex-1 flex-col overflow-hidden rounded-lg border border-[oklch(0.88_0.02_80)] bg-[oklch(0.96_0.015_80)] shadow-sm">
      <div className="relative bg-[oklch(0.93_0.025_80)] px-2 py-2 text-center">
        <span className="absolute left-1/2 top-0 flex -translate-x-1/2 gap-1">
          <span className="h-2 w-0.5 rounded-full bg-foreground/25" />
          <span className="h-2 w-0.5 rounded-full bg-foreground/25" />
        </span>
        <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-plum-deep sm:text-xs">
          {label}
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-2 py-4 text-center">
        {row.isClosed ? (
          <p className="text-sm font-bold text-red-600">{fr.closed}</p>
        ) : row.openTime && row.closeTime ? (
          <p className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
            {formatHourRange(row.openTime, row.closeTime, "fr")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}

export function StoreHoursRow({ hours }: { hours: StoreHour[] }) {
  const ordered =
    hours.length > 0
      ? WEEKDAY_ORDER.map(
          (wd) =>
            hours.find((h) => h.weekday === wd) ?? {
              weekday: wd,
              isClosed: true,
              openTime: null,
              closeTime: null,
              id: "",
            },
        )
      : [];

  return (
    <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:gap-3 sm:px-0">
      {ordered.map((row) => (
        <DayCard key={row.weekday} row={row as StoreHour} />
      ))}
    </div>
  );
}
