"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { api } from "@/lib/api";

export function ProductPhotoGallery({
  photos,
  alt,
  className = "",
}: {
  photos: Array<{ photoDoc: string }> | undefined;
  alt: string;
  className?: string;
}) {
  const urls = (photos ?? [])
    .map((p) => api.normalizePhotoUrl(p.photoDoc))
    .filter(Boolean) as string[];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!urls.length) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#FFF0F4] text-sm text-[#2D2346]/50 ${className}`}
      >
        —
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full touch-pan-y ${className}`}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {urls.map((src, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all duration-300 ${
              i === index ? "w-4 opacity-100" : "w-1.5 opacity-55"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
