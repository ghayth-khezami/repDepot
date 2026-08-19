"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { youtubeEmbedUrl } from "@/lib/youtube";

export function YouTubeEmbed({ className = "" }: { className?: string }) {
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSiteSettings()
      .then((s) => setEmbedSrc(youtubeEmbedUrl(s.youtubeUrl)))
      .catch(() => setEmbedSrc(null));
  }, []);

  if (!embedSrc) return null;

  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] border border-[#E04672]/10 shadow-[0_8px_32px_rgba(45,35,70,0.08)] ${className}`}
    >
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
  );
}
