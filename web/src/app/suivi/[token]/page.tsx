import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CircleCheck,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Tag,
  Undo2,
  Wallet,
} from "lucide-react";
import { fetchSuivi, type SuiviData } from "@/lib/suivi";
import { photoAbsoluteUrl } from "@/lib/server-api";
import { formatTnd, frDate } from "@/components/suivi/format";
import { ProductList } from "@/components/suivi/ProductList";
import { OpeningHours } from "@/components/suivi/OpeningHours";
import SuiviUnavailable from "./unavailable";

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

/** Circular progress: sold value / total potential (déposant share). */
function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${Math.round(pct * 100)} % de la valeur vendue`}>
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#16A34A" />
            <stop offset="1" stopColor="#4ADE80" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E9DDFB" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-bd-ink">{Math.round(pct * 100)}%</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-bd-muted">vendu</span>
      </div>
    </div>
  );
}

function Counter({ icon: Icon, label, value, tile }: { icon: typeof Tag; label: string; value: number; tile: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-white p-3 text-center shadow-card sm:flex-row sm:text-left">
      <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${tile}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div>
        <p className="text-2xl font-black leading-none text-bd-ink">{value}</p>
        <p className="mt-1 text-xs font-extrabold text-bd-muted">{label}</p>
      </div>
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
      <h2 id="contact-title" className="text-lg font-black text-bd-ink">Une question ? Contactez la boutique</h2>
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
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <OpeningHours hours={shop.hours} />
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-bd-ink">
            <MapPin aria-hidden className="h-4 w-4 text-bd-violet" /> Adresse
          </h3>
          <p className="rounded-2xl bg-bd-bg px-3 py-2.5 text-sm font-bold text-bd-ink">{shop.address}</p>
        </div>
      </div>
    </section>
  );
}

export default async function SuiviPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await fetchSuivi(token);
  if (result.kind === "not_found") notFound();
  if (result.kind === "error") return <SuiviUnavailable />;

  const { deposant, contract, items, totals, shop } = result.data;

  return (
    <div className="relative mx-auto w-full max-w-3xl pb-10">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-bd-lilac via-[#F3ECFD] to-bd-blush px-5 pb-24 pt-6 sm:rounded-b-[40px]">
        <Blobs />
        <div className="relative flex items-center gap-2.5">
          <Image src="/depot.png" alt="Bébé Dépôt" width={44} height={44} className="h-11 w-11 rounded-2xl bg-white object-contain p-1 shadow-card" priority />
          <span className="text-sm font-black tracking-wide text-bd-ink">BÉBÉ-DÉPÔT</span>
        </div>
        <div className="relative mt-6">
          <h1 className="flex items-center gap-2 text-3xl font-black leading-tight text-bd-ink sm:text-4xl">
            Bonjour {deposant.firstName}
            {hasWaveIllustration ? (
              <Image src="/illustrations/wave.png" alt="" width={44} height={44} className="h-10 w-10 object-contain" />
            ) : (
              <span aria-hidden>👋</span>
            )}
          </h1>
          <p className="mt-2 text-sm font-bold text-bd-muted">
            {contract.number ? <>Contrat <span className="text-bd-ink">{contract.number}</span> · </> : null}
            déposé le {frDate(contract.depositDate)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold text-bd-ink shadow-card backdrop-blur">
            <CalendarDays aria-hidden className="h-4 w-4 text-bd-violet" />
            Dépôt valable jusqu&apos;au {frDate(contract.expiresAt)}
          </p>
        </div>
      </header>

      <main className="relative -mt-16 px-4">
        {/* Earnings */}
        <section aria-label="Vos gains" className="rounded-card border border-bd-line/10 bg-white p-5 shadow-[0_20px_50px_rgba(76,29,149,0.12)]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-bd-muted">
                <Wallet aria-hidden className="h-4 w-4 text-bd-success" /> À percevoir
              </p>
              <p className="mt-1 text-[32px] font-black leading-none text-bd-success sm:text-4xl">{formatTnd(totals.toCollectMillimes)}</p>
              <p className="mt-2 text-sm font-bold text-bd-ink">
                Déjà payé : <span className="font-black text-bd-violet-strong">{formatTnd(totals.paidMillimes)}</span>
              </p>
              <p className="mt-0.5 text-xs font-bold text-bd-muted">sur {formatTnd(totals.potentialMillimes)} si tout est vendu</p>
            </div>
            <ProgressRing value={totals.soldMillimes} total={totals.potentialMillimes} />
          </div>
        </section>

        {/* Counters */}
        <section aria-label="Résumé" className="mt-4 grid grid-cols-3 gap-2.5">
          <Counter icon={CircleCheck} label="Vendus" value={totals.sold} tile="bg-grad-green-strong" />
          <Counter icon={Tag} label="En vente" value={totals.onSale} tile="bg-grad-pink-strong" />
          <Counter icon={Undo2} label="Retirés" value={totals.withdrawn} tile="bg-grad-gray" />
        </section>

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
            · Mise à jour automatique toutes les 30 secondes
          </p>
        </footer>
      </main>
    </div>
  );
}
