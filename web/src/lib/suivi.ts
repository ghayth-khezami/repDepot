import { getServerApiUrl } from "@/lib/api-url";

/** Public déposant tracking — mirrors GET /public/suivi/:token (no personal contact data). */

export type SuiviStatus = "EN_VENTE" | "VENDU" | "RETIRE";
export type SuiviPayout = "A_PERCEVOIR" | "PAYE";

export interface SuiviItem {
  ref: string;
  name: string;
  photo: string | null;
  category: string | null;
  priceMillimes: number;
  depositorMillimes: number;
  status: SuiviStatus;
  depositedAt: string;
  soldAt: string | null;
  /** Set when the déposant has been paid (status VENDU + payout PAYE). */
  paidAt?: string | null;
  payoutStatus: SuiviPayout | null;
}

export interface SuiviHour {
  weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface SuiviData {
  deposant: { firstName: string; lastInitial: string };
  contract: { number: string | null; depositDate: string; durationMonths: number; expiresAt: string };
  items: SuiviItem[];
  totals: {
    count: number;
    sold: number;
    onSale: number;
    withdrawn: number;
    potentialMillimes: number;
    soldMillimes: number;
    toCollectMillimes: number;
    paidMillimes: number;
  };
  shop: {
    phoneDisplay: string;
    phoneTel: string;
    whatsapp: string;
    address: string;
    mapsUrl: string;
    hours: SuiviHour[];
  };
}

export type SuiviResult = { kind: "ok"; data: SuiviData } | { kind: "not_found" } | { kind: "error" };


const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

export async function fetchSuivi(token: string): Promise<SuiviResult> {
  if (!TOKEN_RE.test(token)) return { kind: "not_found" };
  const headers: Record<string, string> = { Accept: "application/json" };
  // Lets the server-side render bypass the per-IP limiter (every visitor shares this server's IP).
  if (process.env.INTERNAL_API_KEY) headers["x-internal-key"] = process.env.INTERNAL_API_KEY;
  try {
    const res = await fetch(`${getServerApiUrl()}/public/suivi/${encodeURIComponent(token)}`, {
      headers,
      // Never cached: a sale must show the moment the page is (re)opened. Live updates come over the socket.
      cache: "no-store",
    });
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) return { kind: "error" };
    return { kind: "ok", data: (await res.json()) as SuiviData };
  } catch {
    return { kind: "error" };
  }
}
