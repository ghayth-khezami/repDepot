"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { api } from "@/lib/api";

export function ProductPhotoGallery({
  photos,
  alt,
  className = "",
  autoplayMs = 2000,
  showBottomGradient = false,
  selectedIndex,
  onIndexChange,
}: {
  photos: Array<{ photoDoc: string }> | undefined;
  alt: string;
  className?: string;
  autoplayMs?: number;
  showBottomGradient?: boolean;
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
}) {
  const urls = (photos ?? [])
    .map((p) => api.normalizePhotoUrl(p.photoDoc))
    .filter(Boolean) as string[];

  const autoplayPlugin = Autoplay({
    delay: autoplayMs,
    stopOnInteraction: true,
    stopOnMouseEnter: true,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: urls.length > 1, align: "start", dragFree: false },
    urls.length > 1 ? [autoplayPlugin] : [],
  );
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

  useEffect(() => {
    if (!emblaApi || selectedIndex == null) return;
    if (emblaApi.selectedScrollSnap() !== selectedIndex) {
      emblaApi.scrollTo(selectedIndex);
    }
  }, [emblaApi, selectedIndex]);

  useEffect(() => {
    if (onIndexChange) onIndexChange(index);
  }, [index, onIndexChange]);

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
        {showBottomGradient ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2D2346]/35 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full touch-pan-y ${className}`}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {urls.map((src, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {showBottomGradient ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/4 bg-gradient-to-t from-[#2D2346]/30 to-transparent"
          aria-hidden
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-all duration-300 ${
              i === index ? "w-4 opacity-100" : "w-1.5 opacity-55"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
