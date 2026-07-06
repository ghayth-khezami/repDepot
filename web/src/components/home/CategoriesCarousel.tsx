"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import { Category } from "@/types";
import { FadeUp } from "./FadeUp";
import { CategoryCard } from "./CategoryCard";

export function CategoriesCarousel({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!categories.length) return null;

  return (
    <FadeUp>
      <section id="categories" className="scroll-mt-32 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8D6BFF]">
              Catégories
            </p>
            <h2 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
              Parcourez nos catégories
            </h2>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Catégories précédentes"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8D6BFF]/20 bg-white text-[#2D2346] shadow-sm transition hover:border-[#8D6BFF]/40"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Catégories suivantes"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8D6BFF]/20 bg-white text-[#2D2346] shadow-sm transition hover:border-[#8D6BFF]/40"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="-ml-4 flex touch-pan-y">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="min-w-0 flex-[0_0_72%] pl-4 sm:flex-[0_0_48%] md:flex-[0_0_32%] lg:flex-[0_0_24%]"
              >
                <CategoryCard category={cat} count={counts[cat.id] ?? 0} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
