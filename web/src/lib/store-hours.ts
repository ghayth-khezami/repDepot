import { MessageKey } from "@/i18n/messages";

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface StoreHour {
  id: string;
  weekday: Weekday;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export const WEEKDAY_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const weekdayMessageKey: Record<Weekday, MessageKey> = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
};

export function formatHourRange(open: string, close: string, locale: "fr" | "ar") {
  if (locale === "ar") return `${open} – ${close}`;
  return `${open.replace(":", "h")} – ${close.replace(":", "h")}`;
}
