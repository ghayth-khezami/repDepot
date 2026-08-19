"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { StoreHoursRow } from "@/components/StoreHoursRow";
import { fr } from "@/lib/fr";
import { api } from "@/lib/api";
import { StoreHour } from "@/lib/store-hours";
import { getGoogleMapsEmbedSrc, getGoogleMapsOpenUrl } from "@/lib/social";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { STORE_CONTAINER } from "@/lib/home";

export default function MagasinPage() {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStoreHours()
      .then((data) => setHours(data as StoreHour[]))
      .catch(() => setHours([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className={`space-y-12 py-6 md:space-y-16 md:py-10 ${STORE_CONTAINER}`}>
        <YouTubeEmbed />

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[1.75rem] shadow-[0_12px_40px_rgba(224,70,114,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/depoo.jpg"
                alt="Notre dépôt Bébé Dépôt"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <div className="space-y-4 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E04672]">
              Notre boutique
            </p>
            <h1 className="font-display text-4xl leading-tight text-[#2D2346] md:text-5xl">
              {fr.visitStore}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-[#2D2346]/65">
              Venez découvrir Bébé Dépôt à Manouba — articles neufs et d&apos;occasion sélectionnés
              avec soin pour les mamans et leurs bébés.
            </p>
            <Link
              href={getGoogleMapsOpenUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#E04672] underline-offset-4 hover:underline"
            >
              Ouvrir dans Google Maps
              <ArrowSquareOut size={16} weight="bold" />
            </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-[#E04672]/10 shadow-[0_12px_40px_rgba(224,70,114,0.1)]">
            <iframe
              title="Bébé Dépôt — Manouba"
              src={getGoogleMapsEmbedSrc()}
              className="aspect-[4/3] w-full border-0 md:aspect-[16/11]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-center text-2xl text-[#2D2346] md:text-3xl">
            {fr.hoursTitle}
          </h2>
          {loading ? (
            <p className="text-center text-sm text-[#2D2346]/55">{fr.loading}</p>
          ) : (
            <StoreHoursRow hours={hours} />
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
