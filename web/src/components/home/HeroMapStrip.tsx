"use client";

import { getGoogleMapsEmbedSrc, getGoogleMapsOpenUrl } from "@/lib/social";
import { HERO_RADIUS } from "@/lib/home";
import { MapPin } from "@phosphor-icons/react";

export function HeroMapStrip() {
  return (
    <div className={`mt-4 overflow-hidden border border-[#E04672]/10 bg-white shadow-[0_4px_20px_rgba(224,70,114,0.06)] ${HERO_RADIUS}`}>
      <a
        href={getGoogleMapsOpenUrl()}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 border-b border-[#E04672]/8 px-4 py-3 text-sm font-semibold text-[#E04672] md:px-5"
      >
        <MapPin size={18} weight="fill" />
        Visitez notre dépôt — Manouba
      </a>
      <iframe
        title="Bébé Dépôt — localisation"
        src={getGoogleMapsEmbedSrc()}
        className="aspect-[2.2/1] w-full border-0 md:aspect-[3.2/1]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
