"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useCallback } from "react";
import { Product } from "@/types";
import { fr } from "@/lib/fr";
import { FadeUp } from "./FadeUp";
import { ProductCard } from "./ProductCard";

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] rounded-[1.75rem] bg-[#F7F2FF]" />
      <div className="mt-4 h-4 rounded-full bg-[#F7F2FF]" />
      <div className="mt-2 h-10 rounded-full bg-[#F7F2FF]" />
    </div>
  );
}

export function ProductsCarousel({
  products,
  loading,
}: {
  products: Product[];
  loading?: boolean;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <FadeUp>
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8D6BFF]">
              Sélection
            </p>
            <h2 className="mt-2 flex items-center gap-2 font-display text-3xl text-[#2D2346] md:text-4xl">
              {fr.favoritesTitle}
              <Heart size={22} className="fill-[#FF8DAA] text-[#FF8DAA]" strokeWidth={0} />
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/produits"
              className="text-sm font-semibold text-[#8D6BFF] underline-offset-4 hover:underline"
            >
              {fr.seeAll}
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Produits précédents"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8D6BFF]/20 bg-white text-[#2D2346] shadow-sm transition hover:border-[#8D6BFF]/40"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="Produits suivants"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8D6BFF]/20 bg-white text-[#2D2346] shadow-sm transition hover:border-[#8D6BFF]/40"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="-ml-4 flex touch-pan-y">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-[0_0_72%] pl-4 sm:flex-[0_0_46%] md:flex-[0_0_32%] lg:flex-[0_0_24%] xl:flex-[0_0_19.5%]"
                  >
                    <ProductSkeleton />
                  </div>
                ))
              : products.map((product) => (
                  <div
                    key={product.id}
                    className="min-w-0 flex-[0_0_72%] pl-4 sm:flex-[0_0_46%] md:flex-[0_0_32%] lg:flex-[0_0_24%] xl:flex-[0_0_19.5%]"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>
        </div>

        {!loading && products.length === 0 && (
          <p className="text-center text-sm text-[#2D2346]/60">{fr.noProducts}</p>
        )}
      </section>
    </FadeUp>
  );
}
