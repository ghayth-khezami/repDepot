import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronDown, Clock, Lock, MapPin, MessageCircle, Navigation, Package, Phone, Wallet } from "lucide-react";
import { fetchSuivi, type SuiviData } from "@/lib/suivi";
import { photoAbsoluteUrl } from "@/lib/server-api";
import { formatTnd, frDate } from "@/components/suivi/format";
import { ProductList } from "@/components/suivi/ProductList";
import { OpeningHours } from "@/components/suivi/OpeningHours";
import { SuiviAppActions, SuiviIntro } from "@/components/suivi/SuiviApp";
import SuiviUnavailable from "./unavailable";

/** Installable per contract: manifest + iOS home-screen icon. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/suivi/${token}/pwa`,
    appleWebApp: { capable: true, title: "Mon dépôt", statusBarStyle: "default" },
    icons: { apple: "/suivi-apple-touch.png", icon: "/suivi-icon-192.png" },
  };
}

const hasWaveIllustration = (() => {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "illustrations", "wave.png"));
  } catch {
    return false;
  }
})();

function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-bd-lilac opacity-80 blur-3xl" />
      <div className="absolute -right-16 top-10 h-80 w-80 rounded-full bg-bd-blush opacity-90 blur-3xl" />
    </div>
  );
}

function ContactSection({ shop, contractNumber }: { shop: SuiviData["shop"]; contractNumber: string | null }) {
  const message = `Bonjour, je vous contacte au sujet de mon contrat de dépôt${contractNumber ? ` ${contractNumber}` : ""}.`;
  const actions = [
    { href: `tel:${shop.phoneTel}`, label: "Appeler", sub: shop.phoneDisplay, icon: Phone, cls: "bg-grad-pink-strong shadow-glow-pink" },
    { href: `https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(message)}`, label: "WhatsApp", sub: "Message", icon: MessageCircle, cls: "bg-grad-green-strong shadow-[0_8px_24px_rgba(22,163,74,0.3)]", external: true },
    { href: shop.mapsUrl, label: "Itinéraire", sub: "Google Maps", icon: Navigation, cls: "bg-grad-violet-strong shadow-glow-violet", external: true },
  ];
  return (
    <section aria-labelledby="contact-title" className="mt-8 rounded-card bg-white p-5 shadow-card">
      <h2 id="contact-title" className="text-lg font-black text-bd-ink">Une question ?</h2>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {actions.map((a) => (
          <a
            key={a.label}
            href={a.href}
            {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center text-white transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bd-pink/30 ${a.cls}`}
          >
            <a.icon aria-hidden className="h-6 w-6" />
            <span className="text-sm font-black">{a.label}</span>
            <span className="text-[11px] font-bold text-white/90">{a.sub}</span>
          </a>
        ))}
      </div>
      <details className="group mt-4 rounded-2xl bg-bd-bg">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-black text-bd-ink">
          <span className="flex items-center gap-2">
            <Clock aria-hidden className="h-4 w-4 text-bd-violet" /> Horaires et adresse
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          <OpeningHours hours={shop.hours} />
          <p className="flex items-start gap-2 text-sm font-bold text-bd-ink">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-bd-violet" /> {shop.address}
          </p>
        </div>
      </details>
    </section>
  );
}

export default async function SuiviPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await fetchSuivi(token);
  if (result.kind === "not_found") notFound();
  if (result.kind === "error") return <SuiviUnavailable />;

  const { deposant, contract, items, totals, shop } = result.data;

  const soldPct = totals.potentialMillimes > 0 ? Math.min(100, Math.round((totals.soldMillimes / totals.potentialMillimes) * 100)) : 0;

  return (
    <div className="relative mx-auto w-full max-w-xl pb-10">
      <SuiviIntro
        firstName={deposant.firstName}
        token={token}
        items={items.map((i) => ({
          ref: i.ref,
          name: i.name,
          status: i.status,
          payoutStatus: i.payoutStatus,
          depositorMillimes: i.depositorMillimes,
          photo: i.photo ? photoAbsoluteUrl(i.photo) : null,
        }))}
      />

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-bd-lilac via-[#F3ECFD] to-bd-blush px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:rounded-b-[40px]">
        <Blobs />
        <div className="relative flex items-center gap-3">
          <Image src="/suivi-icon-192.png" alt="Bébé Dépôt" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-card" priority />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black leading-tight text-bd-ink">
              Bonjour {deposant.firstName}
              {hasWaveIllustration ? (
                <Image src="/illustrations/wave.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              ) : (
                <span aria-hidden>👋</span>
              )}
            </h1>
            <p className="truncate text-xs font-bold text-bd-muted">
              {contract.number ? <>Contrat {contract.number} · </> : null}
              <CalendarDays aria-hidden className="mb-0.5 inline h-3.5 w-3.5" /> jusqu&apos;au {frDate(contract.expiresAt)}
            </p>
          </div>
        </div>
      </header>

      <main className="relative -mt-14 px-4">
        {/* The one number that matters */}
        <section aria-label="Vos gains" className="rounded-card bg-white p-5 shadow-[0_20px_50px_rgba(76,29,149,0.12)]">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-bd-muted">
            <Wallet aria-hidden className="h-4 w-4 text-bd-success" /> À percevoir
          </p>
          <p className="mt-1 text-[40px] font-black leading-none text-bd-success">{formatTnd(totals.toCollectMillimes)}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-bd-lilac" role="img" aria-label={`${soldPct} % vendu`}>
            <div className="h-full rounded-full bg-grad-green-strong transition-[width] duration-700" style={{ width: `${Math.max(soldPct, 3)}%` }} />
          </div>
          <p className="mt-2 flex justify-between text-sm font-bold text-bd-ink">
            <span>
              <span className="font-black">{totals.sold}</span> vendu{totals.sold > 1 ? "s" : ""} sur {totals.count}
            </span>
            <span className="text-bd-muted">Déjà payé {formatTnd(totals.paidMillimes)}</span>
          </p>
        </section>

        <SuiviAppActions token={token} />

        {items.length ? (
          <ProductList items={items.map((i) => ({ ...i, photo: i.photo ? photoAbsoluteUrl(i.photo) : null }))} />
        ) : (
          <section className="mt-6 flex flex-col items-center gap-3 rounded-card bg-white px-6 py-10 text-center shadow-card">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-grad-violet text-white shadow-glow-violet">
              <Package className="h-7 w-7" />
            </span>
            <p className="text-base font-black text-bd-ink">Vos articles apparaîtront ici dès leur mise en vente</p>
            <p className="max-w-xs text-sm font-bold text-bd-muted">Gardez ce lien : la page se met à jour automatiquement.</p>
          </section>
        )}

        <ContactSection shop={shop} contractNumber={contract.number} />

        <footer className="mt-8 space-y-2 text-center text-xs font-bold text-bd-muted">
          <p className="inline-flex items-center gap-1.5">
            <Lock aria-hidden className="h-3.5 w-3.5" /> Cette page est privée, ne partagez pas ce lien.
          </p>
          <p>
            <a href="https://bebedepot.tn" className="font-extrabold text-bd-violet-strong underline-offset-2 hover:underline">
              bebedepot.tn
            </a>{" "}
            · Mise à jour automatique
          </p>
        </footer>
      </main>
    </div>
  );
}
