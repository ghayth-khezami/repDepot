"use client";

import Link from "next/link";
import { Category } from "@/types";
import { fr } from "@/lib/fr";
import { HOME_COLORS } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { FloatingStickers } from "./FloatingStickers";
import { CategoryCard } from "./CategoryCard";

export function CategoriesGrid({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  if (!categories.length) return null;

  return (
    <FadeUp>
      <section id="categories" className="home-stickers-zone relative scroll-mt-32">
        <FloatingStickers seed={2} />

        <div className="home-stickers-content space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.24em]"
                style={{ color: HOME_COLORS.primary }}
              >
                Catégories
              </p>
              <h2 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
                Parcourez nos catégories
              </h2>
            </div>
            <Link
              href="/produits"
              className="text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: HOME_COLORS.primary }}
            >
              Voir toutes les catégories
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} count={counts[cat.id] ?? 0} />
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
