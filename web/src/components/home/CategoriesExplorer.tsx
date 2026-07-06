"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Category } from "@/types";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr } from "@/lib/fr";
import { HOME_COLORS } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { FloatingStickers } from "./FloatingStickers";

const PASTEL_BG = ["#FFF5F8", "#FFF0F4", "#FFF8F5", "#FFF5F0", "#FFF0F8", "#FFF8F0"];

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

        <div className="home-stickers-content space-y-8">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {categories.map((cat) => {
              const count = counts[cat.id] ?? 0;
              const image = getCategoryCardImage(cat);
              const label =
                count === 1 ? `1 ${fr.article}` : `${count} ${fr.articles}`;
              const bg = PASTEL_BG[cat.categoryName.charCodeAt(0) % PASTEL_BG.length];

              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="h-full"
                >
                  <Link
                    href={`/categories/${cat.id}`}
                    className="group flex h-full min-h-[200px] flex-col overflow-hidden rounded-[1.75rem] bg-white p-3 shadow-[0_8px_32px_rgba(45,35,70,0.07)] transition hover:shadow-[0_12px_36px_rgba(45,35,70,0.1)] md:min-h-[220px] md:p-4"
                  >
                    <div
                      className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] p-4"
                      style={{ backgroundColor: bg }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={cat.categoryName}
                        className="max-h-[85%] max-w-[85%] object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-center px-1 py-3">
                      <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-sm leading-snug text-[#2D2346] md:text-base">
                        {cat.categoryName}
                      </h3>
                      <p className="mt-1 text-xs text-[#2D2346]/55 md:text-sm">{label}</p>
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
