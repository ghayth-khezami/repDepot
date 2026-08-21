"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { FadeUp } from "./FadeUp";
import { StoreHoursRow } from "@/components/StoreHoursRow";
import { StoreHour } from "@/lib/store-hours";

export function YouTubeSection() {
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [hours, setHours] = useState<StoreHour[]>([]);

  useEffect(() => {
    api
      .getSiteSettings()
      .then((s) => setEmbedSrc(youtubeEmbedUrl(s.youtubeUrl)))
      .catch(() => setEmbedSrc(null));
    api
      .getStoreHours()
      .then((h) =>
        setHours(
          h.map((it) => ({
            ...it,
            // normalize weekday string into the Weekday union expected by StoreHour
            weekday: (it.weekday?.toUpperCase?.() ?? "MONDAY") as StoreHour["weekday"],
          })),
        ),
      )
      .catch(() => setHours([]));
  }, []);

  return (
    <FadeUp>
      <section className={`home-store-panel space-y-10 ${STORE_CONTAINER}`}>
        <div className="flex flex-col items-center gap-4 border-t border-[#E04672]/8 pt-8 text-center">
          <div className="text-center">
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: HOME_COLORS.primary }}
            >
              Notre boutique
            </p>
            <h2 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
              Découvrez notre magasin
            </h2>
          </div>
        </div>

        {embedSrc && (
          <div className="overflow-hidden rounded-[1.75rem] border border-[#E04672]/10 shadow-[0_8px_32px_rgba(45,35,70,0.08)]">
            <div className="relative aspect-video w-full">
              <iframe
                title="Bébé Dépôt — vidéo"
                src={embedSrc}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )}

        {hours.length > 0 && (
          <div className="mx-auto w-full max-w-5xl space-y-5 text-center">
            <h3 className="font-display text-2xl text-[#2D2346] md:text-3xl">Nos horaires</h3>
            <StoreHoursRow hours={hours} />
            <Link
              href="/magasin"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 md:text-base"
              style={{ backgroundColor: HOME_COLORS.primary }}
            >
              Notre dépôt
              <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        )}

        <div className="flex justify-center">
          <div className="relative h-20 w-48 md:h-28 md:w-64">
            <Image
              src="/wanted.png"
              alt="Bébé Dépôt"
              fill
              sizes="256px"
              className="object-contain object-top opacity-80"
            />
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
