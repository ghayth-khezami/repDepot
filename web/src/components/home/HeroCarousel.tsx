"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_RADIUS, HERO_SLIDES, STORE_CONTAINER, type HeroSlideData } from "@/lib/home";
import { api } from "@/lib/api";
import { FeatureStrip } from "./FeatureStrip";
import { HeroSlide } from "./HeroSlide";

const AUTO_DELAY = 5000;

type ApiSlide = Awaited<ReturnType<typeof api.getHeroSlides>>[number];

function mapApiSlide(slide: ApiSlide): HeroSlideData {
  const cta =
    slide.ctaLabel && slide.ctaType
      ? {
          type: slide.ctaType as "link" | "phone",
          label: slide.ctaLabel,
          href: slide.ctaHref ?? undefined,
        }
      : undefined;

  return {
    id: slide.id,
    image: api.normalizePhotoUrl(slide.imageDoc),
    imageAlt: slide.imageAlt || "Bébé Dépôt",
    imageOnly: slide.imageOnly,
    arabicWelcome: slide.arabicWelcome ?? undefined,
    title: slide.title ?? undefined,
    subtitle: slide.subtitle ?? undefined,
    description: slide.description ?? undefined,
    cta,
    align: slide.align === "center" ? "center" : slide.align === "start" ? "start" : undefined,
  };
}

function preloadImage(src: string) {
  const img = new window.Image();
  img.src = src;
}

export function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlideData[]>(HERO_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    api
      .getHeroSlides()
      .then((rows) => {
        if (rows.length > 0) {
          const mapped = rows.map(mapApiSlide);
          setSlides(mapped);
          mapped.slice(0, 3).forEach((s) => preloadImage(s.image));
        }
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, []);

  useEffect(() => {
    if (count <= 1) return;
    const next = slides[(index + 1) % count];
    const prev = slides[(index - 1 + count) % count];
    if (next) preloadImage(next.image);
    if (prev) preloadImage(prev.image);
  }, [index, slides, count]);

  const goTo = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTO_DELAY);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const activeSlide = useMemo(() => slides[index], [slides, index]);

  if (!activeSlide) return null;

  return (
    <section
      className={`bg-[#FFFDFB] pb-2 pt-4 md:pt-6 ${STORE_CONTAINER}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Bienvenue Bébé Dépôt"
    >
      <div
        className="relative touch-pan-y"
        onTouchStart={(e) => {
          (e.currentTarget as HTMLElement & { _x?: number })._x = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const startX = (e.currentTarget as HTMLElement & { _x?: number })._x;
          if (startX == null) return;
          const diff = startX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
        }}
      >
        <div
          className={`relative overflow-hidden border border-[#E8E4F0]/80 bg-white shadow-[0_8px_40px_rgba(45,35,70,0.08)] ${HERO_RADIUS}`}
        >
          <div className="relative md:min-h-[420px] lg:min-h-[460px]">
            {slides.map((slide, i) => (
              <motion.div
                key={slide.id}
                initial={false}
                animate={{
                  opacity: i === index ? 1 : 0,
                  zIndex: i === index ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className={`${i === index ? "relative" : "pointer-events-none absolute inset-0"} md:absolute md:inset-0`}
                aria-hidden={i !== index}
              >
                <HeroSlide slide={slide} isActive={i === index} priority={i === 0} />
              </motion.div>
            ))}
          </div>

          {count > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center md:bottom-5">
              <div className="pointer-events-auto flex items-center gap-2">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === index
                        ? "h-2 w-6 bg-[#E04672] shadow-sm md:bg-white"
                        : "h-2 w-2 bg-[#E04672]/30 md:bg-white/55"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Slide précédent"
                className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#2D2346]/55 shadow-sm transition hover:text-[#2D2346] md:left-4 md:flex lg:h-11 lg:w-11"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Slide suivant"
                className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#2D2346]/55 shadow-sm transition hover:text-[#2D2346] md:right-4 md:flex lg:h-11 lg:w-11"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <FeatureStrip />
    </section>
  );
}
