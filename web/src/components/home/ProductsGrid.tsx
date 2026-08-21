"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart } from "@phosphor-icons/react";
import { Product } from "@/types";
import { fr } from "@/lib/fr";
import { HOME_COLORS } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { FloatingStickers } from "./FloatingStickers";
import { ProductCard } from "./ProductCard";

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div
        className="aspect-[4/5] rounded-[1.75rem]"
        style={{ backgroundColor: HOME_COLORS.secondary }}
      />
      <div className="mt-4 h-4 rounded-full" style={{ backgroundColor: HOME_COLORS.secondary }} />
      <div className="mt-2 h-10 rounded-full" style={{ backgroundColor: HOME_COLORS.secondary }} />
    </div>
  );
}

export function ProductsGrid({
  products,
  loading,
}: {
  products: Product[];
  loading?: boolean;
}) {
  const visible = products.slice(0, 8);

  return (
    <FadeUp>
      <section className="home-stickers-zone relative">
        <FloatingStickers seed={1} />

        <div className="home-stickers-content space-y-10 px-1 py-1 md:px-2 md:py-2">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: HOME_COLORS.primary }}
            >
              Sélection
            </p>
            <h2 className="mt-2 flex items-center gap-2 font-display text-3xl text-[#2D2346] md:text-4xl">
              {fr.favoritesTitle}
              <Heart size={24} weight="fill" className="text-[#FF6B8A]" />
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>

          {!loading && products.length === 0 && (
            <p className="text-center text-sm text-[#2D2346]/60">{fr.noProducts}</p>
          )}

          <div className="flex flex-col items-center gap-4 border-t border-[#E04672]/8 pt-8">
            <Link
              href="/produits"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.22)] transition hover:brightness-105 md:text-base"
              style={{ backgroundColor: HOME_COLORS.primary }}
            >
              Voir tout les articles
              <ArrowRight size={18} weight="bold" />
            </Link>
            <div className="relative mt-2 h-20 w-48 md:mt-3 md:h-28 md:w-64">
              <Image
                src="/wanted.png"
                alt=""
                fill
                sizes="144px"
                className="object-contain object-top opacity-80"
              />
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
