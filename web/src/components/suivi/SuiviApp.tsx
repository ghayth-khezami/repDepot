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
  /** Shown once the app is installed (opened from the home-screen icon): one tap to allow notifications. */
  const [askPush, setAskPush] = useState(false);

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
      setAskPush(true);
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
        else if (isStandalone()) {
          // Opened from the installed app and alerts not on yet → ask (once per session).
          try {
            if (!sessionStorage.getItem(`bd-suivi-askpush-${token}`)) {
              sessionStorage.setItem(`bd-suivi-askpush-${token}`, "1");
              window.setTimeout(() => setAskPush(true), 6000); // after the welcome animation
            }
          } catch {
            window.setTimeout(() => setAskPush(true), 6000);
          }
        }
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [registration, token]);

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
      setAskPush(false);
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

      {askPush && push !== "on" ? (
        <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={() => setAskPush(false)}>
          <div className="suivi-pop w-full max-w-sm overflow-hidden rounded-[30px] bg-white text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-[#6D28D9] via-[#A21CAF] to-[#DB2777] px-6 pb-6 pt-8 text-white">
              <span className="suivi-medal mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-[#A21CAF] shadow-xl">
                <BellRing aria-hidden className="suivi-bell h-10 w-10" />
              </span>
              <h2 className="mt-4 text-2xl font-black">Activez les notifications</h2>
              <p className="mt-1 text-sm font-bold text-white/90">Soyez prévenu(e) à la seconde où un article est vendu, et quand votre paiement est prêt.</p>
            </div>
            <div className="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={push === "busy"}
                onClick={() => void enablePush()}
                className="unstyled flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-pink-strong text-base font-black text-white shadow-glow-pink active:scale-[0.98] disabled:opacity-60"
              >
                <Bell aria-hidden className="h-5 w-5" /> {push === "busy" ? "Activation…" : "Activer les notifications"}
              </button>
              {push === "denied" ? (
                <p className="text-xs font-bold text-bd-muted">Les notifications sont bloquées : autorisez-les dans les réglages du téléphone.</p>
              ) : null}
              {msg ? <p className="text-sm font-bold text-bd-ink">{msg}</p> : null}
              <button type="button" onClick={() => setAskPush(false)} className="unstyled min-h-[44px] w-full text-sm font-extrabold text-bd-muted">
                Plus tard
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
