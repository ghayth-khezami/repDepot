import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown, Clock, Lock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { fetchSuivi, type SuiviData } from "@/lib/suivi";
import { OpeningHours } from "@/components/suivi/OpeningHours";
import SuiviLive from "@/components/suivi/SuiviLive";
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

export const dynamic = "force-dynamic";

export default async function SuiviPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await fetchSuivi(token);
  if (result.kind === "not_found") notFound();
  if (result.kind === "error") return <SuiviUnavailable />;

  const { contract, shop } = result.data;

  return (
    <div className="relative mx-auto w-full max-w-xl pb-10">
      <SuiviLive
        token={token}
        initial={result.data}
        hero={<Image src="/suivi-icon-192.png" alt="Bébé Dépôt" width={48} height={48} className="h-12 w-12 shrink-0 rounded-2xl shadow-card" priority />}
      />
      <div className="px-4">
        <ContactSection shop={shop} contractNumber={contract.number} />
        <footer className="mt-8 text-center text-xs font-bold text-bd-muted">
          <p className="inline-flex items-center gap-1.5">
            <Lock aria-hidden className="h-3.5 w-3.5" /> Cette page est privée, ne partagez pas ce lien.
          </p>
        </footer>
      </div>
    </div>
  );
}
