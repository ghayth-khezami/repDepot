"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { api } from "@/lib/api";
import { fr, LOGO_SRC } from "@/lib/fr";
import { FOOTER_LINKS, STORE_CONTAINER } from "@/lib/home";
import { getGoogleMapsEmbedSrc, getGoogleMapsOpenUrl, SOCIAL, STORE_EMAIL, STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/social";

export function Footer() {
  const { categories } = useShop();
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const onNewsletter = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    try {
      await api.subscribeNewsletter(email.trim());
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    }
  };

  return (
    <footer className="mt-8 w-full bg-gradient-to-b from-[#FFFDFB] to-[#FFF0F4] pt-16 md:pt-20">
      <div className={`pb-10 ${STORE_CONTAINER}`}>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-5 lg:col-span-4">
            <div className="flex items-center gap-3">
              <Image
                src={LOGO_SRC}
                alt={fr.brand}
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-contain"
              />
              <div>
                <p className="font-display text-2xl text-[#2D2346]">{fr.brand}</p>
                <p className="text-sm italic text-[#FF6B8A]">by Mme Khezami</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#2D2346]/65">
              {fr.footerAbout}
            </p>
            <div className="space-y-2 text-sm text-[#2D2346]/75">
              <a
                href={`tel:${STORE_PHONE_TEL}`}
                className="flex items-center gap-2 font-medium text-[#E04672] hover:underline"
              >
                <Phone size={15} />
                {STORE_PHONE_DISPLAY}
              </a>
              <a
                href={`mailto:${STORE_EMAIL}`}
                className="flex items-center gap-2 font-medium text-[#E04672] hover:underline"
              >
                <Mail size={15} />
                {STORE_EMAIL}
              </a>
              <p className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#E04672]" />
                <span>
                  {fr.storeCity}
                  <a
                    href={getGoogleMapsOpenUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-[#E04672] underline-offset-2 hover:underline"
                  >
                    {fr.seeRoute}
                  </a>
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E04672]">
              Liens utiles
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#2D2346]/75 transition hover:text-[#E04672]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E04672]">
              Catégories
            </p>
            <ul className="space-y-2.5">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.id}`}
                    className="text-sm text-[#2D2346]/75 transition hover:text-[#E04672]"
                  >
                    {cat.categoryName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E04672]">
              {fr.newsletterTitle}
            </p>
            <form onSubmit={onNewsletter} className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={fr.newsletterPlaceholder}
                className="w-full rounded-full border border-[#E04672]/15 bg-white py-4 pl-5 pr-14 text-sm text-[#2D2346] shadow-sm outline-none transition focus:border-[#E04672]/40 focus:ring-2 focus:ring-[#E04672]/15"
              />
              <button
                type="submit"
                aria-label={fr.newsletterSubmit}
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF6B8A] text-white transition hover:brightness-105"
              >
                <ArrowRight size={18} />
              </button>
            </form>
            {status === "ok" && (
              <p className="text-sm text-[#E04672]">{fr.newsletterSuccess}</p>
            )}
            {status === "err" && (
              <p className="text-sm text-red-600">{fr.newsletterError}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { href: SOCIAL.instagram.href, label: "Instagram", logo: SOCIAL.instagram.logoSrc },
                { href: SOCIAL.facebook.href, label: "Facebook", logo: SOCIAL.facebook.logoSrc },
                { href: SOCIAL.whatsapp.href, label: "WhatsApp", logo: SOCIAL.whatsapp.logoSrc },
                { href: SOCIAL.tiktok.href, label: "TikTok", logo: SOCIAL.tiktok.logoSrc },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E04672]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#E04672]/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo} alt="" className="h-5 w-5 object-contain" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E04672]/10 pt-6 text-center text-xs text-[#2D2346]/50">
          © {year} {fr.brand} — {fr.rights}
        </div>
      </div>

      <div className="w-full px-4 pb-0 md:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-t-[1.75rem] border border-[#E04672]/10 shadow-[0_-8px_32px_rgba(45,35,70,0.06)]">
          <iframe
            title="Bébé Dépôt — Manouba"
            src={getGoogleMapsEmbedSrc()}
            className="aspect-[16/9] w-full border-0 sm:aspect-[21/9]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </footer>
  );
}
