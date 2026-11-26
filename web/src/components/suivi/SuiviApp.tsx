"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Bell, BellRing, Check, Download, Share, SquarePlus, X } from "lucide-react";
import { getClientApiUrl } from "@/lib/api-url";

/* ───────────────────────── Welcome (5 s) ───────────────────────── */

const WELCOME_MS = 5000;

/** Full-screen welcome for the déposant(e): logo, name, sparkles, 5-second progress — then the page. */
export function SuiviWelcome({ firstName, token, onDone }: { firstName: string; token: string; onDone?: () => void }) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const key = `bd-suivi-welcome-${token}`;
    try {
      if (sessionStorage.getItem(key)) {
        onDone?.();
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: still show */
    }
    setShow(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 1500 : WELCOME_MS;
    const t1 = window.setTimeout(() => setLeaving(true), total - 500);
    const t2 = window.setTimeout(() => {
      setShow(false);
      onDone?.();
    }, total);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // onDone is a stable parent setter; re-running on its identity would replay the welcome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!show) return null;
  const letters = Array.from(firstName);
  return (
    <div
      role="dialog"
      aria-label={`Bienvenue ${firstName}`}
      className={`suivi-welcome fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 text-center ${leaving ? "is-leaving" : ""}`}
    >
      {/* floating sparkles */}
      {["✨", "🧸", "💖", "🍼", "⭐", "🎀", "✨", "💜"].map((e, i) => (
        <span key={i} aria-hidden className="suivi-float" style={{ left: `${8 + i * 11.5}%`, animationDelay: `${(i % 4) * 0.35}s`, fontSize: `${18 + (i % 3) * 8}px` }}>
          {e}
        </span>
      ))}

      <div className="suivi-logo relative">
        <span aria-hidden className="suivi-halo" />
        <Image src="/suivi-icon-192.png" alt="Bébé Dépôt" width={132} height={132} priority className="relative h-32 w-32 rounded-[36px] shadow-[0_24px_60px_rgba(109,40,217,0.35)]" />
      </div>

      <p className="suivi-rise mt-8 text-sm font-black uppercase tracking-[0.3em] text-white/80" style={{ animationDelay: "0.5s" }}>
        Bienvenue
      </p>
      <h1 className="mt-2 text-5xl font-black text-white drop-shadow-sm" aria-hidden>
        {letters.map((l, i) => (
          <span key={i} className="suivi-letter" style={{ animationDelay: `${0.8 + i * 0.07}s` }}>
            {l === " " ? " " : l}
          </span>
        ))}
      </h1>
      <p className="suivi-rise mt-4 max-w-xs text-base font-bold text-white/90" style={{ animationDelay: `${1.2 + letters.length * 0.07}s` }}>
        Merci de votre confiance 💜
        <br />
        Voici le suivi de vos articles.
      </p>

      <div className="absolute inset-x-10 bottom-[max(3rem,env(safe-area-inset-bottom))] mx-auto max-w-xs">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="suivi-progress h-full rounded-full bg-white" />
        </div>
        <button
          type="button"
          onClick={() => {
            setShow(false);
            onDone?.();
          }}
          className="unstyled mt-4 w-full text-sm font-extrabold text-white/80"
        >
          Passer
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Install + notifications ───────────────────────── */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/**
 * Two big friendly buttons:
 *  • "Télécharger l'app" — installs this page with the Bébé Dépôt icon (Android prompt / iOS how-to).
 *  • "Alertes de vente" — push notification as soon as an article is sold.
 */
export function SuiviAppActions({ token }: { token: string }) {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [push, setPush] = useState<"unsupported" | "off" | "on" | "denied" | "busy">("off");
  const [msg, setMsg] = useState<string | null>(null);

  const registration = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return null;
    return navigator.serviceWorker.register("/suivi-sw.js", { scope: "/suivi/" });
  }, []);

  useEffect(() => {
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // iOS only supports push once the app is on the home screen.
      setPush("unsupported");
    } else if (Notification.permission === "denied") setPush("denied");
    else {
      void registration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (sub) setPush("on");
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [registration]);

  const install = async () => {
    if (installEvt) {
      await installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallEvt(null);
    } else if (isIos()) setIosHelp(true);
    else setMsg("Ouvrez le menu ⋮ du navigateur puis « Installer l'application ».");
  };

  const enablePush = async () => {
    setMsg(null);
    if (push === "unsupported") {
      if (isIos() && !isStandalone()) setIosHelp(true);
      else setMsg("Les notifications ne sont pas disponibles sur ce navigateur.");
      return;
    }
    setPush("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPush(perm === "denied" ? "denied" : "off");
        return;
      }
      const api = getClientApiUrl();
      const { publicKey } = (await fetch(`${api}/public/suivi/push/key`).then((r) => r.json())) as { publicKey: string | null };
      if (!publicKey) throw new Error("no key");
      const reg = await registration();
      if (!reg) throw new Error("no sw");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await fetch(`${api}/public/suivi/${token}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setPush("on");
      setMsg("C'est activé ! Vous serez prévenu(e) dès qu'un article est vendu 🎉");
    } catch {
      setPush("off");
      setMsg("Impossible d'activer les alertes pour le moment. Réessayez plus tard.");
    }
  };

  const disablePush = async () => {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch(`${getClientApiUrl()}/public/suivi/${token}/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => undefined);
      await sub.unsubscribe();
    }
    setPush("off");
  };

  return (
    <section aria-label="Application et alertes" className="mt-4">
      <div className="grid grid-cols-2 gap-2.5">
        {installed ? (
          <div className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-bd-success-bg px-3 text-sm font-black text-bd-success">
            <Check aria-hidden className="h-5 w-5" /> App installée
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void install()}
            className="unstyled flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-grad-violet-strong px-3 text-sm font-black text-white shadow-glow-violet transition active:scale-[0.97]"
          >
            <Download aria-hidden className="h-5 w-5" /> Télécharger l&apos;app
          </button>
        )}
        {push === "on" ? (
          <button
            type="button"
            onClick={() => void disablePush()}
            className="unstyled flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-bd-success-bg px-3 text-sm font-black text-bd-success transition active:scale-[0.97]"
          >
            <BellRing aria-hidden className="h-5 w-5" /> Alertes activées
          </button>
        ) : (
          <button
            type="button"
            disabled={push === "busy" || push === "denied"}
            onClick={() => void enablePush()}
            className="unstyled flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-grad-pink-strong px-3 text-sm font-black text-white shadow-glow-pink transition active:scale-[0.97] disabled:opacity-60"
          >
            <Bell aria-hidden className="h-5 w-5" /> {push === "busy" ? "Activation…" : push === "denied" ? "Alertes bloquées" : "Alertes de vente"}
          </button>
        )}
      </div>
      {push === "denied" ? (
        <p className="mt-2 text-center text-xs font-bold text-bd-muted">Autorisez les notifications pour ce site dans les réglages du téléphone.</p>
      ) : null}
      {msg ? <p className="mt-2 text-center text-sm font-bold text-bd-ink">{msg}</p> : null}

      {iosHelp ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/40 p-3" onClick={() => setIosHelp(false)}>
          <div className="suivi-sheet w-full rounded-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-black text-bd-ink">Installer sur l&apos;iPhone</h2>
              <button type="button" aria-label="Fermer" onClick={() => setIosHelp(false)} className="unstyled -mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-full">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-3 space-y-3 text-[15px] font-bold text-bd-ink">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet"><Share aria-hidden className="h-5 w-5" /></span>
                Touchez « Partager » en bas de Safari
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet"><SquarePlus aria-hidden className="h-5 w-5" /></span>
                Choisissez « Sur l&apos;écran d&apos;accueil »
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet"><Bell aria-hidden className="h-5 w-5" /></span>
                Ouvrez l&apos;app « Mon dépôt » puis activez les alertes
              </li>
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ───────────────────────── "Bonne nouvelle" on return ───────────────────────── */

export interface NewsItem {
  ref: string;
  name: string;
  status: "EN_VENTE" | "VENDU" | "RETIRE";
  payoutStatus: "A_PERCEVOIR" | "PAYE" | null;
  depositorMillimes: number;
  photo: string | null;
}

const fmtTnd = (m: number) => `${Math.floor(m / 1000)}.${String(m % 1000).padStart(3, "0")} TND`;

/**
 * Remembers (per contract, on this device) which articles were sold / paid at the last visit.
 * When the déposant(e) comes back and something changed: confetti + the list of good news.
 */
function SuiviNews({ token, items, firstName }: { token: string; items: NewsItem[]; firstName: string }) {
  const [news, setNews] = useState<{ sold: NewsItem[]; paid: NewsItem[] } | null>(null);

  useEffect(() => {
    const key = `bd-suivi-seen-${token}`;
    const sold = items.filter((i) => i.status === "VENDU").map((i) => i.ref);
    const paid = items.filter((i) => i.status === "VENDU" && i.payoutStatus === "PAYE").map((i) => i.ref);
    let prev: { sold: string[]; paid: string[] } | null = null;
    try {
      prev = JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify({ sold, paid }));
    } catch {
      return; // storage blocked: no history to compare, show nothing
    }
    if (!prev) return; // first visit on this device
    const before = prev;
    const newPaid = items.filter((i) => paid.includes(i.ref) && !before.paid.includes(i.ref));
    const newSold = items.filter((i) => sold.includes(i.ref) && !before.sold.includes(i.ref) && !newPaid.includes(i));
    if (newSold.length || newPaid.length) setNews({ sold: newSold, paid: newPaid });
  }, [token, items]);

  if (!news) return null;
  const total = [...news.sold, ...news.paid].reduce((t, i) => t + i.depositorMillimes, 0);
  const rows = [...news.paid.map((i) => ({ i, paid: true })), ...news.sold.map((i) => ({ i, paid: false }))];
  return (
    <div role="dialog" aria-label="Bonne nouvelle" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={() => setNews(null)}>
      {["🎉", "💰", "✨", "🎊", "💖", "⭐", "🎉", "💜", "✨", "🎊"].map((e, i) => (
        <span key={i} aria-hidden className="suivi-float" style={{ left: `${4 + i * 9.5}%`, animationDelay: `${(i % 5) * 0.25}s`, fontSize: `${20 + (i % 3) * 8}px` }}>
          {e}
        </span>
      ))}
      <div className="suivi-sheet relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-[#6D28D9] via-[#9333EA] to-[#DB2777] px-6 pb-6 pt-7 text-center text-white">
          <p className="suivi-logo text-5xl" aria-hidden>
            {news.paid.length ? "💰" : "🎉"}
          </p>
          <h2 className="mt-3 text-2xl font-black">Bonne nouvelle {firstName} !</h2>
          <p className="mt-1 text-sm font-bold text-white/90">
            {news.paid.length && news.sold.length
              ? "Des articles vendus et un paiement prêt depuis votre dernière visite."
              : news.paid.length
                ? `Votre paiement est prêt (${news.paid.length} article${news.paid.length > 1 ? "s" : ""}).`
                : `${news.sold.length} article${news.sold.length > 1 ? "s" : ""} vendu${news.sold.length > 1 ? "s" : ""} depuis votre dernière visite.`}
          </p>
          <p className="mt-3 text-3xl font-black tabular-nums">+{fmtTnd(total)}</p>
        </div>
        <ul className="max-h-[40dvh] space-y-2 overflow-y-auto p-4">
          {rows.map(({ i, paid }, idx) => (
            <li key={i.ref} className="suivi-rise flex items-center gap-3 rounded-2xl bg-bd-bg p-2.5" style={{ animationDelay: `${0.15 + idx * 0.08}s` }}>
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac text-xl">
                {i.photo ? <Image src={i.photo} alt="" fill sizes="48px" className="object-cover" /> : paid ? "💰" : "🎉"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-bd-ink">{i.name}</span>
                <span className={`block text-xs font-extrabold ${paid ? "text-bd-violet-strong" : "text-bd-success"}`}>
                  {paid ? "Paiement prêt ✅" : "Vendu 🎉"} · {fmtTnd(i.depositorMillimes)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="mb-3 text-center text-xs font-bold text-bd-muted">📞 Contactez Madame Khezami pour organiser votre paiement.</p>
          <button type="button" onClick={() => setNews(null)} className="unstyled flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-grad-pink-strong text-base font-black text-white shadow-glow-pink">
            Voir mes articles
          </button>
        </div>
      </div>
    </div>
  );
}

/** Welcome (once per visit) → then the "Bonne nouvelle" screen if something sold / was paid since last time. */
export function SuiviIntro({ token, firstName, items }: { token: string; firstName: string; items: NewsItem[] }) {
  const [welcomeDone, setWelcomeDone] = useState(false);
  return (
    <>
      <SuiviWelcome firstName={firstName} token={token} onDone={() => setWelcomeDone(true)} />
      {welcomeDone ? <SuiviNews token={token} items={items} firstName={firstName} /> : null}
    </>
  );
}
