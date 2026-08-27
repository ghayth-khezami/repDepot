"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Category } from "@/types";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr } from "@/lib/fr";
import { HOME_COLORS } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { FloatingStickers } from "./FloatingStickers";

export function CategoriesExplorer({
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

        <div className="home-stickers-content space-y-8 px-1 py-1 md:px-2 md:py-2">
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
              href="/categories"
              className="text-sm font-semibold text-[#E04672] underline-offset-4 hover:underline"
            >
              Voir tout →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-7">
            {categories.map((cat) => {
              const count = counts[cat.id] ?? 0;
              const image = getCategoryCardImage(cat);
              const label =
                count === 1 ? `1 ${fr.article}` : `${count} ${fr.articles}`;

              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="h-full"
                >
                  <Link
                    href={`/categories/${cat.id}`}
                    className="group relative flex h-full min-h-[170px] overflow-hidden rounded-xl border border-[#182044]/8 bg-transparent shadow-[0_5px_18px_rgba(45,35,70,0.05)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(45,35,70,0.1)] md:min-h-[190px]"
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl bg-transparent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={cat.categoryName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-x-2 bottom-2 rounded-xl border border-white/50 bg-white/72 px-2 py-1.5 text-center shadow-[0_8px_24px_rgba(45,35,70,0.12)] backdrop-blur-md transition group-hover:bg-white/82 md:inset-x-3 md:bottom-3">
                      <h3 className="line-clamp-2 min-h-[2rem] font-display text-xs leading-snug text-[#2D2346] md:text-sm">
                        {cat.categoryName}
                      </h3>
                      <p className="mt-0.5 text-[10px] text-[#2D2346]/60">{label}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
