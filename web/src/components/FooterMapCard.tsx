"use client";

import { MapPin, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getGoogleMapsEmbedSrc, getGoogleMapsOpenUrl } from "@/lib/social";

export function FooterMapCard() {
  const [expanded, setExpanded] = useState(false);
  const mapSrc = getGoogleMapsEmbedSrc();

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  return (
    <>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[#E04672]/15 bg-white/60 shadow-[0_8px_24px_rgba(224,70,114,0.1)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-[#E04672]/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#2D2346]">
              <MapPin size={14} className="text-[#E04672]" />
              Bébé Dépôt
            </p>
            <span className="text-[10px] italic text-[#E04672]">by Mme Khezami</span>
          </div>
          <iframe
            title="Bébé Dépôt — by Mme Khezami"
            src={mapSrc}
            className="h-36 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn-primary w-full !px-4 !py-2.5 text-xs"
        >
          <Maximize2 size={14} />
          Voir la carte
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2D2346]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-map-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
        >
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-[#FFFDFB] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#E04672]/10 px-5 py-4">
              <div>
                <h2 id="footer-map-title" className="font-display text-2xl text-[#2D2346]">
                  Bébé Dépôt
                </h2>
                <p className="text-sm italic text-[#E04672]">by Mme Khezami</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getGoogleMapsOpenUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost !px-4 !py-2 text-xs"
                >
                  Ouvrir dans Google Maps
                </a>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="btn-dark-glass h-10 w-10 !p-0"
                  aria-label="Fermer la carte"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe
              title="Bébé Dépôt — carte agrandie"
              src={mapSrc}
              className="h-[65vh] min-h-[22rem] w-full border-0"
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
