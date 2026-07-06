"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_RADIUS, HERO_SLIDES, STORE_CONTAINER } from "@/lib/home";
import { FeatureStrip } from "./FeatureStrip";
import { HeroMapStrip } from "./HeroMapStrip";
import { HeroSlide } from "./HeroSlide";

const AUTO_DELAY = 4000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = HERO_SLIDES.length;

  const goTo = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTO_DELAY);
    return () => window.clearInterval(id);
  }, [paused, count]);

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
        {/* Rounded hero card — like the mockup */}
        <div
          className={`relative overflow-hidden border border-[#E8E4F0]/80 bg-white shadow-[0_8px_40px_rgba(45,35,70,0.08)] ${HERO_RADIUS}`}
        >
          <div className="relative min-h-[360px] md:min-h-[420px] lg:min-h-[460px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={HERO_SLIDES[index].id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <HeroSlide slide={HERO_SLIDES[index]} isActive />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots — bottom center inside card */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2">
              {HERO_SLIDES.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === index
                      ? "h-2 w-6 bg-white shadow-sm"
                      : "h-2 w-2 bg-white/55 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Arrows — inside card edges */}
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
        </div>
      </div>

      <HeroMapStrip />
      <FeatureStrip />
    </section>
  );
}
