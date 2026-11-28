"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, HandCoins, X } from "lucide-react";
import type { SuiviItem } from "@/lib/suivi";
import { getClientApiUrl } from "@/lib/api-url";
import { formatTnd } from "./format";

interface PaymentReq {
  id: string;
  amountMillimes: number;
  pickupDate: string;
  status: "PENDING" | "DONE" | "CANCELLED";
  refs: string[];
}

const TZ = "Africa/Tunis";
const MIN_DAYS = 2;

/** Selectable days: from J+2, next 3 weeks, Sundays excluded (shop closed). */
function selectableDays(now = new Date()) {
  const todayTunis = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  const start = new Date(`${todayTunis}T12:00:00+01:00`);
  const out: Array<{ value: string; date: Date }> = [];
  for (let i = MIN_DAYS; out.length < 18 && i < 40; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    if (d.getUTCDay() === 0) continue; // dimanche
    out.push({ value: new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d), date: d });
  }
  return out;
}

const longDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

/** Fired by the « vendu » celebration: opens the payment request sheet. */
export const OPEN_PAYMENT_EVENT = "bd-open-payment-request";

/**
 * "Demande de paiement": the déposant picks sold articles (or all) and the day he comes to collect his
 * money (48 h minimum, never a Sunday). The shop is notified at once.
 */
export function PaymentRequestCard({ token, items, onChanged }: { token: string; items: SuiviItem[]; onChanged?: () => void }) {
  const [requests, setRequests] = useState<PaymentReq[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PaymentReq | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${getClientApiUrl()}/public/suivi/${encodeURIComponent(token)}/payment-requests`, { cache: "no-store" });
      if (res.ok) setRequests((await res.json()) as PaymentReq[]);
    } catch {
      /* offline */
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load, items]);

  const pendingRefs = useMemo(() => new Set(requests.filter((r) => r.status === "PENDING").flatMap((r) => r.refs)), [requests]);
  const sold = items.filter((i) => i.status === "VENDU" && i.payoutStatus !== "PAYE");
  const available = sold.filter((i) => !pendingRefs.has(i.ref));
  const pending = requests.filter((r) => r.status === "PENDING");
  const days = useMemo(() => selectableDays(), []);
  const chosen = available.filter((i) => selected.has(i.ref));
  const total = chosen.reduce((t, i) => t + i.depositorMillimes, 0);

  // « Choisir mon jour de paiement » from the celebration popup → open the sheet (or show the card).
  const availableRef = useRef(available);
  useEffect(() => {
    availableRef.current = available;
  });
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onOpen = () => {
      const list = availableRef.current;
      if (!list.length) {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setOpen(true);
      setDone(null);
      setSelected(new Set(list.map((i) => i.ref)));
    };
    window.addEventListener(OPEN_PAYMENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PAYMENT_EVENT, onOpen);
  }, []);

  if (!sold.length && !pending.length) return null;

  const toggle = (ref: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(ref)) n.delete(ref);
      else n.add(ref);
      return n;
    });

  const submit = async () => {
    if (!chosen.length || !day) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getClientApiUrl()}/public/suivi/${encodeURIComponent(token)}/payment-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refs: chosen.map((i) => i.ref), pickupDate: day }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(Array.isArray(body?.message) ? body.message[0] : body?.message || "Demande impossible pour le moment.");
      setDone(body as PaymentReq);
      setSelected(new Set());
      setDay(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={sectionRef} aria-label="Paiement" className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-card">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#15803d] to-[#22c55e] px-5 py-4 text-white">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <HandCoins aria-hidden className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black">Récupérer mon paiement</p>
          <p className="text-xs font-bold text-white/85">
            {available.length ? `${available.length} article(s) vendu(s) · ${formatTnd(available.reduce((t, i) => t + i.depositorMillimes, 0))}` : "Demande déjà envoyée"}
          </p>
        </div>
      </div>
      {pending.length ? (
        <ul className="space-y-2 px-5 pt-4">
          {pending.map((r) => (
            <li key={r.id} className="flex items-start gap-2 rounded-2xl bg-bd-success-bg px-3 py-2.5 text-sm font-bold text-bd-success">
              <CalendarCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Rendez-vous le <span className="capitalize">{longDay(r.pickupDate)}</span> · {formatTnd(r.amountMillimes)} ({r.refs.length} article(s))
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="p-5 pt-4">
        {available.length ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setDone(null);
              setSelected(new Set(available.map((i) => i.ref)));
            }}
            className="unstyled flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-green-strong text-base font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.3)] active:scale-[0.98]"
          >
            <HandCoins aria-hidden className="h-5 w-5" /> Demande de paiement
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[97] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Demande de paiement" className="suivi-sheet flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="p-6 text-center">
                <span className="suivi-medal mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#16a34a] to-[#22c55e] text-white shadow-xl">
                  <Check aria-hidden className="h-10 w-10" strokeWidth={3} />
                </span>
                <h2 className="mt-4 text-2xl font-black text-bd-ink">Demande envoyée ✅</h2>
                <p className="mt-2 text-sm font-bold text-bd-muted">
                  Madame Khezami vous attend le <span className="capitalize text-bd-ink">{longDay(done.pickupDate)}</span> pour vous remettre{" "}
                  <span className="text-bd-success">{formatTnd(done.amountMillimes)}</span>.
                </p>
                <button type="button" onClick={() => setOpen(false)} className="unstyled mt-6 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-grad-pink-strong font-black text-white">
                  Parfait
                </button>
              </div>
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-bd-line/10 px-5 py-4">
                  <h2 className="text-lg font-black text-bd-ink">Demande de paiement</h2>
                  <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="unstyled flex h-10 w-10 items-center justify-center rounded-full bg-bd-bg">
                    <X aria-hidden className="h-5 w-5" />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-bd-ink">1. Vos articles vendus</p>
                    <button
                      type="button"
                      onClick={() => setSelected(chosen.length === available.length ? new Set() : new Set(available.map((i) => i.ref)))}
                      className="unstyled rounded-full bg-bd-lilac px-3 py-1 text-xs font-extrabold text-bd-violet-strong"
                    >
                      {chosen.length === available.length ? "Tout désélectionner" : "Tout sélectionner"}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {available.map((i) => {
                      const on = selected.has(i.ref);
                      return (
                        <li key={i.ref}>
                          <button
                            type="button"
                            onClick={() => toggle(i.ref)}
                            className={`unstyled flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition ${on ? "border-[#16a34a] bg-bd-success-bg" : "border-bd-line/15 bg-white"}`}
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-bd-line/30"}`}>
                              {on ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-bd-ink">{i.name}</span>
                              <span className="block text-xs font-bold text-bd-muted">Réf. {i.ref}</span>
                            </span>
                            <span className="shrink-0 text-sm font-black tabular-nums text-bd-success">{formatTnd(i.depositorMillimes)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mb-2 mt-5 text-sm font-black text-bd-ink">2. Quel jour venez-vous ?</p>
                  <p className="-mt-1 mb-2 text-xs font-bold text-bd-muted">À partir de 48 h · la boutique est fermée le dimanche.</p>
                  <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                    {days.map((d) => {
                      const on = d.value === day;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setDay(d.value)}
                          className={`unstyled flex min-w-[64px] snap-start flex-col items-center rounded-2xl border-2 px-2 py-2 transition ${on ? "border-[#E04672] bg-gradient-to-br from-[#E04672] to-[#8B5CF6] text-white shadow-glow-pink" : "border-bd-line/15 bg-white text-bd-ink"}`}
                        >
                          <span className="text-[11px] font-extrabold uppercase">{d.date.toLocaleDateString("fr-FR", { weekday: "short", timeZone: TZ })}</span>
                          <span className="text-xl font-black leading-tight">{d.date.toLocaleDateString("fr-FR", { day: "numeric", timeZone: TZ })}</span>
                          <span className="text-[10px] font-bold opacity-80">{d.date.toLocaleDateString("fr-FR", { month: "short", timeZone: TZ })}</span>
                        </button>
                      );
                    })}
                  </div>
                  {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
                </div>
                <div className="border-t border-bd-line/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    disabled={busy || !chosen.length || !day}
                    onClick={() => void submit()}
                    className="unstyled flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-green-strong text-base font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.3)] disabled:opacity-50"
                  >
                    {busy ? "Envoi…" : !chosen.length ? "Choisissez des articles" : !day ? "Choisissez un jour" : `Confirmer · ${formatTnd(total)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
