"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { io } from "socket.io-client";
import { Baby, Bell, CalendarDays, Check, HandCoins, Package, PartyPopper, Puzzle, Shirt, Store, Wallet, X } from "lucide-react";
import type { SuiviData, SuiviItem } from "@/lib/suivi";
import { getClientApiUrl, getRemoteApiUrl } from "@/lib/api-url";
import { formatTnd, frDate, frShortDate } from "./format";
import { SuiviAppActions, SuiviWelcome } from "./SuiviApp";
import { OPEN_PAYMENT_EVENT, PaymentRequestCard } from "./PaymentRequest";

const absPhoto = (p: string | null) => (!p ? null : p.startsWith("http") ? p : `${getRemoteApiUrl()}${p.startsWith("/") ? p : `/${p}`}`);
const withPhotos = (d: SuiviData): SuiviData => ({ ...d, items: d.items.map((i) => ({ ...i, photo: absPhoto(i.photo) })) });
const isPaid = (i: SuiviItem) => i.status === "VENDU" && i.payoutStatus === "PAYE";
const isSold = (i: SuiviItem) => i.status === "VENDU" && i.payoutStatus !== "PAYE";

/* ───────────────────────── Live data ───────────────────────── */

/**
 * Keeps the page in sync with the shop, without polling:
 *  - socket `suivi:update` → instant refetch while the app is open;
 *  - back to the app (phone woke up, app reopened from the background) → ONE catch-up refetch, and the
 *    socket is restarted if it may have been frozen by the phone (a frozen socket still says "connected"
 *    but no longer receives anything — that is why the sale only showed after closing the app);
 *  - a push notification arrives while the app is open → the service worker tells the page → refetch.
 * Every refetch goes through one gate: never two requests at once, never twice within 1.5 s.
 */
const MIN_GAP_MS = 1500;
const STALE_SOCKET_MS = 15_000; // hidden longer than this → restart the socket on return

function useLiveSuivi(token: string, initial: SuiviData) {
  const [data, setData] = useState(() => withPhotos(initial));
  const [live, setLive] = useState(false);
  const inflight = useRef<Promise<void> | null>(null);
  const lastFetch = useRef(Date.now()); // the server-rendered data is fresh
  const again = useRef(false);

  /** force = a real change was announced: always fetch it (after the running request if any). */
  const refetch = useCallback(async (force = false): Promise<void> => {
    if (inflight.current) {
      if (force) again.current = true;
      return inflight.current;
    }
    if (!force && Date.now() - lastFetch.current < MIN_GAP_MS) return;
    inflight.current = (async () => {
      // A change announced during a request → one more round, so nothing is missed.
      do {
        again.current = false;
        lastFetch.current = Date.now();
        try {
          const res = await fetch(`${getClientApiUrl()}/public/suivi/${encodeURIComponent(token)}`, { cache: "no-store" });
          if (res.ok) setData(withPhotos((await res.json()) as SuiviData));
        } catch {
          /* offline: keep what we have */
        }
      } while (again.current);
      lastFetch.current = Date.now();
      inflight.current = null;
    })();
    return inflight.current;
  }, [token]);

  useEffect(() => {
    const socket = io(`${getRemoteApiUrl()}/suivi`, { auth: { token }, transports: ["websocket"], reconnectionDelayMax: 30_000 });
    let first = true;
    socket.on("connect", () => {
      setLive(true);
      // (Re)connected after a cut: catch up on what happened meanwhile (the gate skips it if just fetched).
      if (!first) void refetch();
      first = false;
    });
    socket.on("disconnect", () => setLive(false));
    socket.on("suivi:update", () => void refetch(true));

    let hiddenAt = 0;
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (away < 2000) return;
      void refetch();
      if (!socket.connected) socket.connect();
      else if (away > STALE_SOCKET_MS) socket.disconnect().connect(); // possibly frozen by the phone
    };
    const onOnline = () => {
      void refetch();
      if (!socket.connected) socket.connect();
    };
    // Push received while the app is open (sent by suivi-sw.js)
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "bd-suivi-update") void refetch(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      socket.disconnect();
    };
  }, [token, refetch]);

  return { data, live };
}

/* ───────────────────────── Notifications (bell) ───────────────────────── */

interface SuiviEvent {
  id: string;
  kind: "VENDU" | "PAYE";
  at: string;
  item: SuiviItem;
}

function eventsOf(items: SuiviItem[]): SuiviEvent[] {
  const out: SuiviEvent[] = [];
  for (const i of items) {
    if (i.status !== "VENDU") continue;
    if (i.soldAt) out.push({ id: `${i.ref}-v`, kind: "VENDU", at: i.soldAt, item: i });
    if (isPaid(i)) out.push({ id: `${i.ref}-p`, kind: "PAYE", at: i.paidAt ?? i.soldAt ?? new Date().toISOString(), item: i });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

function NotificationsBell({ token, items }: { token: string; items: SuiviItem[] }) {
  const key = `bd-suivi-notifs-read-${token}`;
  const events = useMemo(() => eventsOf(items), [items]);
  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState<string>("");
  useEffect(() => {
    try {
      setReadAt(localStorage.getItem(key) ?? "");
    } catch {
      /* storage blocked */
    }
  }, [key]);
  const unread = events.filter((e) => e.at > readAt).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && events[0]) {
      try {
        localStorage.setItem(key, events[0].at);
      } catch {
        /* ignore */
      }
      // keep the dots visible while the panel is open, clear them on close
      window.setTimeout(() => setReadAt(events[0].at), 1500);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notifications : ${unread} nouvelle(s)` : "Notifications"}
        className="unstyled relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-bd-violet shadow-card backdrop-blur transition active:scale-95"
      >
        <Bell aria-hidden className={`h-6 w-6 ${unread ? "suivi-bell" : ""}`} />
        {unread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-grad-pink-strong px-1 text-[11px] font-black text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 p-3 sm:items-start sm:pt-20" onClick={() => setOpen(false)}>
          <section role="dialog" aria-label="Notifications" className="suivi-sheet w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-bd-line/10 px-5 py-4">
              <h2 className="text-lg font-black text-bd-ink">Notifications</h2>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="unstyled flex h-10 w-10 items-center justify-center rounded-full bg-bd-bg">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </header>
            <ul className="max-h-[60dvh] space-y-1 overflow-y-auto p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {events.length ? (
                events.map((e) => (
                  <li key={e.id} className={`flex items-start gap-3 rounded-2xl p-3 ${e.at > readAt ? "bg-bd-blush/60" : ""}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${e.kind === "PAYE" ? "bg-grad-violet-strong" : "bg-grad-green-strong"}`}>
                      {e.kind === "PAYE" ? <Check aria-hidden className="h-5 w-5" /> : <HandCoins aria-hidden className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-bd-ink">
                        {e.kind === "PAYE" ? "Paiement reçu ✅" : "Article vendu 🎉"}
                      </span>
                      <span className="block text-[13px] font-bold text-bd-muted">
                        {e.kind === "PAYE"
                          ? `« ${e.item.name} » : ${formatTnd(e.item.depositorMillimes)} vous ont été remis.`
                          : `« ${e.item.name} » est vendu ! Votre part : ${formatTnd(e.item.depositorMillimes)}. Choisissez le jour pour la récupérer (« Demande de paiement »).`}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-extrabold text-bd-violet">{frShortDate(e.at)}</span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm font-bold text-bd-muted">
                  <Bell aria-hidden className="h-8 w-8 text-bd-violet" />
                  Pas encore de notification. Vous serez prévenu(e) dès qu&apos;un article est vendu.
                </li>
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}

/* ───────────────────────── Article stepper ───────────────────────── */

const STEPS = [
  { key: "DEPOSE", label: "Déposé" },
  { key: "EN_VENTE", label: "En vente" },
  { key: "VENDU", label: "Vendu" },
  { key: "PAYE", label: "Payé" },
] as const;

function stepIndex(i: SuiviItem) {
  if (isPaid(i)) return 3;
  if (i.status === "VENDU") return 2;
  return 1;
}

function CategoryIcon({ category, className }: { category: string | null; className: string }) {
  const c = (category ?? "").toLowerCase();
  const props = { "aria-hidden": true, className, strokeWidth: 1.8 } as const;
  if (/v[êe]t|habit|body|pyjama/.test(c)) return <Shirt {...props} />;
  if (/jou|jeu|peluche/.test(c)) return <Puzzle {...props} />;
  if (/pouss|lit|chaise|parc|si[èe]ge|b[ée]b[ée]/.test(c)) return <Baby {...props} />;
  return <Package {...props} />;
}

function ArticleCard({ item, fresh }: { item: SuiviItem; fresh: boolean }) {
  const idx = stepIndex(item);
  const withdrawn = item.status === "RETIRE";
  const note = withdrawn
    ? "Article retiré du dépôt."
    : idx === 3
      ? `Payé${item.paidAt ? ` le ${frShortDate(item.paidAt)}` : ""} — merci 💜`
      : idx === 2
        ? "Vendu 🎉 Choisissez votre jour de paiement (« Demande de paiement »)."
        : "En boutique, prêt à trouver preneur.";
  return (
    <li className={`rounded-[22px] bg-white p-3.5 shadow-card ${withdrawn ? "opacity-60" : ""} ${fresh ? "suivi-fresh" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
          {item.photo ? (
            <Image src={item.photo} alt={item.name} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bd-blush via-white to-bd-lilac">
              <CategoryIcon category={item.category} className="h-7 w-7 text-bd-violet/70" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-extrabold text-bd-ink">{item.name}</h3>
          <p className="text-xs font-bold text-bd-muted">Réf. {item.ref}</p>
          <p className="mt-0.5 text-sm font-bold text-bd-muted">
            Votre part <span className="font-black text-bd-success">{formatTnd(item.depositorMillimes)}</span>
          </p>
        </div>
      </div>

      {withdrawn ? null : (
        <ol className="mt-3 grid grid-cols-4" aria-label={`Étape : ${STEPS[idx].label}`}>
          {STEPS.map((s, i) => {
            const done = i <= idx;
            const current = i === idx;
            return (
              <li key={s.key} className="relative flex flex-col items-center gap-1 text-center">
                {i > 0 ? (
                  <span aria-hidden className="absolute right-1/2 top-[13px] h-1 w-full -translate-y-1/2 rounded-full bg-bd-lilac">
                    <span className={`block h-full rounded-full bg-grad-pink-strong transition-[width] duration-700 ${done ? "w-full" : "w-0"}`} />
                  </span>
                ) : null}
                <span
                  className={`relative z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-black ${
                    done ? "bg-grad-pink-strong text-white shadow-glow-pink" : "bg-bd-lilac text-bd-muted"
                  } ${current ? "suivi-step-now" : ""}`}
                >
                  {done && !current ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[11px] font-extrabold ${done ? "text-bd-ink" : "text-bd-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-extrabold ${idx === 2 && !withdrawn ? "bg-bd-success-bg text-bd-success" : idx === 3 ? "bg-violet-100 text-bd-violet-strong" : "bg-bd-bg text-bd-muted"}`}>
        {note}
      </p>
    </li>
  );
}

type Filter = "ALL" | "EN_VENTE" | "VENDU" | "PAYE";

function Articles({ items, fresh }: { items: SuiviItem[]; fresh: Set<string> }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const tabs: Array<{ key: Filter; label: string; n: number }> = [
    { key: "ALL", label: "Tous", n: items.length },
    { key: "EN_VENTE", label: "En vente", n: items.filter((i) => i.status === "EN_VENTE").length },
    { key: "VENDU", label: "Vendus", n: items.filter(isSold).length },
    { key: "PAYE", label: "Payés", n: items.filter(isPaid).length },
  ];
  const visible = items.filter((i) => filter === "ALL" || (filter === "EN_VENTE" ? i.status === "EN_VENTE" : filter === "VENDU" ? isSold(i) : isPaid(i)));
  return (
    <section aria-labelledby="articles-title" className="mt-6">
      <h2 id="articles-title" className="mb-3 text-lg font-black text-bd-ink">Vos articles</h2>
      <div role="tablist" aria-label="Filtrer les articles" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {tabs.filter((t) => t.key === "ALL" || t.n > 0).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === filter}
            onClick={() => setFilter(t.key)}
            className={`unstyled inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
              t.key === filter ? "bg-grad-pink-strong text-white shadow-glow-pink" : "border border-bd-line/15 bg-white text-bd-ink"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-xs ${t.key === filter ? "bg-white/25" : "bg-bd-lilac"}`}>{t.n}</span>
          </button>
        ))}
      </div>
      <ul className="grid gap-3">
        {visible.map((i) => (
          <ArticleCard key={i.ref} item={i} fresh={fresh.has(i.ref)} />
        ))}
      </ul>
    </section>
  );
}

/* ───────────────────────── Celebration ───────────────────────── */

const CONFETTI = ["#EC4899", "#8B5CF6", "#F59E0B", "#10B981", "#3B82F6", "#F472B6"];

function Celebration({ firstName, sold, paid, onClose }: { firstName: string; sold: SuiviItem[]; paid: SuiviItem[]; onClose: () => void }) {
  const total = [...sold, ...paid].reduce((t, i) => t + i.depositorMillimes, 0);
  const paidOnly = paid.length > 0 && sold.length === 0;
  useEffect(() => {
    try {
      navigator.vibrate?.([80, 60, 120]);
    } catch {
      /* unsupported */
    }
  }, []);
  return (
    <div role="dialog" aria-label="Bonne nouvelle" className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-[#1E1B4B]/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="suivi-confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i % 12) * 0.12}s`,
            animationDuration: `${2.6 + (i % 5) * 0.4}s`,
            width: i % 3 ? 8 : 12,
            height: i % 3 ? 14 : 8,
          }}
        />
      ))}
      <div className="suivi-pop relative w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#6D28D9] via-[#A21CAF] to-[#DB2777] px-6 pb-7 pt-9 text-center text-white">
          <span aria-hidden className="suivi-rays" />
          <span className="suivi-medal relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/95 text-[#A21CAF] shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
            {paidOnly ? <Check aria-hidden className="h-12 w-12" strokeWidth={3} /> : <PartyPopper aria-hidden className="h-12 w-12" />}
          </span>
          <p className="suivi-rise relative mt-5 text-xs font-black uppercase tracking-[0.3em] text-white/80">Félicitations</p>
          <h2 className="suivi-rise relative mt-1 text-[28px] font-black leading-tight" style={{ animationDelay: "0.15s" }}>
            Bravo {firstName} !
          </h2>
          <p className="suivi-rise relative mt-2 text-sm font-bold text-white/90" style={{ animationDelay: "0.3s" }}>
            {paidOnly
              ? `Votre paiement a bien été remis (${paid.length} article${paid.length > 1 ? "s" : ""}).`
              : `${sold.length} article${sold.length > 1 ? "s" : ""} vendu${sold.length > 1 ? "s" : ""} ! Choisissez maintenant le jour où vous viendrez récupérer votre paiement.`}
          </p>
          <p className="suivi-count relative mt-4 inline-block rounded-2xl bg-white/15 px-5 py-2 text-3xl font-black tabular-nums">
            {paidOnly ? "" : "+"}
            {formatTnd(total)}
          </p>
        </div>
        <ul className="max-h-[34dvh] space-y-2 overflow-y-auto p-4">
          {[...sold.map((i) => ({ i, paid: false })), ...paid.map((i) => ({ i, paid: true }))].map(({ i, paid: p }, idx) => (
            <li key={`${i.ref}-${p}`} className="suivi-rise flex items-center gap-3 rounded-2xl bg-bd-bg p-2.5" style={{ animationDelay: `${0.4 + idx * 0.08}s` }}>
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac">
                {i.photo ? <Image src={i.photo} alt="" fill sizes="48px" className="object-cover" /> : <Package aria-hidden className="h-6 w-6 text-bd-violet" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-bd-ink">{i.name}</span>
                <span className={`block text-xs font-extrabold ${p ? "text-bd-violet-strong" : "text-bd-success"}`}>
                  {p ? "Paiement reçu ✅" : "Vendu 🎉"} · {formatTnd(i.depositorMillimes)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!paidOnly ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event(OPEN_PAYMENT_EVENT));
                }}
                className="unstyled mb-2 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-green-strong text-base font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.3)] active:scale-[0.98]"
              >
                <CalendarDays aria-hidden className="h-5 w-5" /> Choisir mon jour de paiement
              </button>
              <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-bd-muted">
                <Store aria-hidden className="h-4 w-4" /> Au moins 2 jours à l&apos;avance · boutique fermée le dimanche
              </p>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`unstyled flex min-h-[54px] w-full items-center justify-center rounded-2xl text-base font-black active:scale-[0.98] ${paidOnly ? "bg-grad-pink-strong text-white shadow-glow-pink" : "bg-bd-bg text-bd-ink"}`}
          >
            Voir mes articles
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compares with what this device saw last time: anything newly sold / paid → celebration (also live). */
function useNews(token: string, items: SuiviItem[], enabled: boolean) {
  const [news, setNews] = useState<{ sold: SuiviItem[]; paid: SuiviItem[] } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!enabled) return;
    const key = `bd-suivi-seen-${token}`;
    const sold = items.filter((i) => i.status === "VENDU").map((i) => i.ref);
    const paid = items.filter(isPaid).map((i) => i.ref);
    let prev: { sold: string[]; paid: string[] } | null = null;
    try {
      prev = JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify({ sold, paid }));
    } catch {
      return;
    }
    if (!prev) return; // first visit on this device
    const before = prev;
    const newPaid = items.filter((i) => paid.includes(i.ref) && !before.paid.includes(i.ref));
    const newSold = items.filter((i) => sold.includes(i.ref) && !before.sold.includes(i.ref) && !newPaid.includes(i));
    if (newSold.length || newPaid.length) {
      setNews({ sold: newSold, paid: newPaid });
      setFresh(new Set([...newSold, ...newPaid].map((i) => i.ref)));
    }
  }, [token, items, enabled]);
  return { news, close: () => setNews(null), fresh };
}

/* ───────────────────────── Page body ───────────────────────── */

export default function SuiviLive({ token, initial, hero }: { token: string; initial: SuiviData; hero: React.ReactNode }) {
  const { data, live } = useLiveSuivi(token, initial);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const { news, close, fresh } = useNews(token, data.items, welcomeDone);
  const { deposant, contract, items, totals } = data;
  const soldPct = totals.potentialMillimes > 0 ? Math.min(100, Math.round((totals.soldMillimes / totals.potentialMillimes) * 100)) : 0;
  const scrolled = useRef(false);
  useEffect(() => {
    if (news || !fresh.size || scrolled.current) return;
    scrolled.current = true;
    document.getElementById("articles-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [news, fresh]);

  return (
    <>
      <SuiviWelcome firstName={deposant.firstName} token={token} onDone={() => setWelcomeDone(true)} />
      {news ? <Celebration firstName={deposant.firstName} sold={news.sold} paid={news.paid} onClose={close} /> : null}

      <header className="relative overflow-hidden bg-gradient-to-br from-bd-lilac via-[#F3ECFD] to-bd-blush px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:rounded-b-[40px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-bd-lilac opacity-80 blur-3xl" />
          <div className="absolute -right-16 top-10 h-80 w-80 rounded-full bg-bd-blush opacity-90 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          {hero}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black leading-tight text-bd-ink">Bonjour {deposant.firstName} 👋</h1>
            <p className="truncate text-xs font-bold text-bd-muted">
              {contract.number ? <>Contrat {contract.number} · </> : null}
              <CalendarDays aria-hidden className="mb-0.5 inline h-3.5 w-3.5" /> jusqu&apos;au {frDate(contract.expiresAt)}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-bd-muted">
              <span aria-hidden className={`h-2 w-2 rounded-full ${live ? "suivi-live bg-bd-success" : "bg-bd-muted/50"}`} />
              {live ? "En direct" : "Connexion…"}
            </p>
          </div>
          <NotificationsBell token={token} items={items} />
        </div>
      </header>

      <main className="relative -mt-14 px-4">
        <section aria-label="Vos gains" className="rounded-[28px] bg-white p-5 shadow-[0_20px_50px_rgba(76,29,149,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-bd-muted">
                <Wallet aria-hidden className="h-4 w-4 text-bd-success" /> À récupérer en boutique
              </p>
              <p key={totals.toCollectMillimes} className="suivi-count mt-1 text-[38px] font-black leading-none text-bd-success">
                {formatTnd(totals.toCollectMillimes)}
              </p>
            </div>
            <p className="rounded-2xl bg-violet-50 px-3 py-2 text-right text-[11px] font-extrabold text-bd-muted">
              Déjà payé
              <br />
              <span className="text-sm font-black text-bd-violet-strong">{formatTnd(totals.paidMillimes)}</span>
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-bd-lilac" role="img" aria-label={`${soldPct} % vendu`}>
            <div className="h-full rounded-full bg-grad-green-strong transition-[width] duration-1000" style={{ width: `${Math.max(soldPct, 3)}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { n: totals.onSale, label: "En vente" },
              { n: items.filter(isSold).length, label: "Vendus" },
              { n: items.filter(isPaid).length, label: "Payés" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-bd-bg py-2">
                <p className="text-xl font-black tabular-nums text-bd-ink">{k.n}</p>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">{k.label}</p>
              </div>
            ))}
          </div>
        </section>

        <PaymentRequestCard token={token} items={items} />
        <SuiviAppActions token={token} />

        {items.length ? (
          <Articles items={items} fresh={fresh} />
        ) : (
          <section className="mt-6 flex flex-col items-center gap-3 rounded-[28px] bg-white px-6 py-10 text-center shadow-card">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-grad-violet text-white shadow-glow-violet">
              <Package className="h-7 w-7" />
            </span>
            <p className="text-base font-black text-bd-ink">Vos articles apparaîtront ici dès leur mise en vente</p>
            <p className="max-w-xs text-sm font-bold text-bd-muted">Gardez ce lien : la page se met à jour en direct.</p>
          </section>
        )}
      </main>
    </>
  );
}
