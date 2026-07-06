"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Category } from "@/types";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr } from "@/lib/fr";

const PASTEL_BG = ["#FFF5F8", "#FFF0F4", "#FFF8F5", "#FFF5F0", "#FFF0F8", "#FFF8F0"];

export function CategoryCard({
  category,
  count,
}: {
  category: Category;
  count: number;
}) {
  const image = getCategoryCardImage(category);
  const label =
    count === 1 ? `1 ${fr.article}` : `${count} ${fr.articles}`;
  const bg =
    PASTEL_BG[category.categoryName.charCodeAt(0) % PASTEL_BG.length];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="h-full"
    >
      <Link
        href={`/categories/${category.id}`}
        className="group flex h-full min-h-[220px] flex-col overflow-hidden rounded-[1.75rem] bg-white p-3 shadow-[0_8px_32px_rgba(45,35,70,0.07)] sm:min-h-[240px] md:p-4"
      >
        <div
          className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] p-4 md:rounded-[1.35rem] md:p-5"
          style={{ backgroundColor: bg }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={category.categoryName}
            className="max-h-[85%] max-w-[85%] object-contain transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        <div className="flex flex-1 flex-col justify-center px-1 py-3 md:px-2 md:py-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-base leading-snug text-[#2D2346] md:text-lg">
            {category.categoryName}
          </h3>
          <p className="mt-1 text-sm text-[#2D2346]/55">{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}
