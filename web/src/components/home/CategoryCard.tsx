"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Category } from "@/types";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr } from "@/lib/fr";

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
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="h-full"
    >
      <Link
        href={`/categories/${category.id}`}
        className="group relative flex h-full min-h-[220px] overflow-hidden rounded-[1.75rem] bg-[#2D2346] shadow-[0_8px_32px_rgba(45,35,70,0.12)] sm:min-h-[240px]"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={category.categoryName}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/50 bg-white/72 px-3 py-2 text-center shadow-[0_8px_24px_rgba(45,35,70,0.12)] backdrop-blur-md transition group-hover:bg-white/82 md:inset-x-4 md:bottom-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-base leading-snug text-[#2D2346] md:text-lg">
            {category.categoryName}
          </h3>
          <p className="mt-0.5 text-xs text-[#2D2346]/60">{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}
