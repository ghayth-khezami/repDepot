"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { FadeUp } from "./FadeUp";

export function YouTubeSection() {
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSiteSettings()
      .then((s) => setEmbedSrc(youtubeEmbedUrl(s.youtubeUrl)))
      .catch(() => setEmbedSrc(null));
  }, []);

  return (
    <FadeUp>
      <section className={`space-y-10 ${STORE_CONTAINER}`}>
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

        <div className="flex flex-col items-center gap-4 border-t border-[#E04672]/8 pt-8">
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
          <Link
            href="/magasin"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.22)] transition hover:brightness-105 md:text-base"
            style={{ backgroundColor: HOME_COLORS.primary }}
          >
            Voir tout les articles
            <ArrowRight size={18} weight="bold" />
          </Link>
          <div className="relative mt-2 h-20 w-48 md:mt-3 md:h-28 md:w-64">
            <Image
              src="/depoo.jpg"
              alt="Notre magasin Bébé Dépôt"
              fill
              sizes="256px"
              className="rounded-[1.25rem] object-cover object-center shadow-md"
            />
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
