"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { ClientFeedbacksCarousel } from "@/components/ClientFeedbacksCarousel";
import { DepositBannerSection } from "@/components/DepositBannerSection";
import { FloatingStickersBackground } from "@/components/FloatingStickersBackground";
import { HeroVideoCarousel } from "@/components/HeroVideoCarousel";
import { MarksCarousel } from "@/components/MarksCarousel";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useShop } from "@/context/ShopContext";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr, WANTED_IMG } from "@/lib/fr";
import { Category, Product } from "@/types";

export default function Home() {
  const router = useRouter();
  const { categories, token, user, syncLikesForProducts } = useShop();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const run = async () => {
      setFeaturedLoading(true);
      try {
        const picked = await api.getFeaturedProducts();
        if (picked.length > 0) {
          setFeatured(picked.slice(0, 8));
          void syncLikesForProducts(picked.map((p) => p.id));
          return;
        }
        const res = await api.getProductsPage({ page: 1, limit: 8 });
        setFeatured(res.data);
        if (res.data.length) void syncLikesForProducts(res.data.map((p) => p.id));
      } catch {
        setFeatured([]);
      } finally {
        setFeaturedLoading(false);
      }
    };
    void run();
  }, [syncLikesForProducts]);

  useEffect(() => {
    if (!categories.length) return;
    const run = async () => {
      const entries = await Promise.all(
        categories.map(async (c) => {
          try {
            const res = await api.getProductsPage({ page: 1, limit: 1, categoryId: c.id });
            return [c.id, res.meta.total] as const;
          } catch {
            return [c.id, 0] as const;
          }
        }),
      );
      setCategoryCounts(Object.fromEntries(entries));
    };
    void run();
  }, [categories]);

  const showFeatured = featuredLoading || featured.length > 0;

  return (
    <div className="home-scroll-shell">
      <HeroVideoCarousel
        onDeposit={() =>
          user
            ? router.push("/deposer/request")
            : router.push("/login?intent=deposer&redirect=/deposer/request")
        }
      />

      <div className="home-scroll-body space-y-20 md:space-y-28 pb-16 pt-6 md:pt-10">
        {showFeatured && (
          <ScrollReveal>
            <section className="page-container">
            <div className="mb-8">
              <p className="tag-eyebrow">{fr.selectionEyebrow}</p>
              <h2 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.favoritesTitle}</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {featuredLoading ? (
                <ProductGridSkeletons count={8} />
              ) : (
                featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)
              )}
            </div>
            {!featuredLoading && featured.length > 0 && (
              <div className="featured-see-more-wrap mt-10 flex flex-col items-center">
                <Link href="/produits" className="btn-primary shadow-glow">
                  {fr.seeMore}
                  <ArrowUpRight size={16} />
                </Link>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={WANTED_IMG}
                  alt=""
                  className="featured-see-more-baby"
                  draggable={false}
                />
              </div>
            )}
          </section>
          </ScrollReveal>
        )}

        <div className="home-stickers-zone">
          <FloatingStickersBackground />
          <div className="home-stickers-content space-y-20 md:space-y-28">
            {categories.length > 0 && (
              <ScrollReveal>
              <section id="categories" className="page-container scroll-mt-24">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="tag-eyebrow">{fr.categoriesEyebrow}</p>
                    <h2 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.exploreShop}</h2>
                  </div>
                  <Link
                    href="/produits"
                    className="text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {fr.seeAll}
                  </Link>
                </div>
                <div className="grid gap-5 md:grid-cols-4 md:auto-rows-[200px]">
                  {categories.map((cat, i) => (
                    <CategoryBentoCard
                      key={cat.id}
                      category={cat}
                      count={categoryCounts[cat.id] ?? 0}
                      large={i === 0}
                    />
                  ))}
                </div>
              </section>
              </ScrollReveal>
            )}

            <ScrollReveal delay={0.05}>
              <MarksCarousel />
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <DepositBannerSection
              onDeposit={() =>
                user
                  ? router.push("/deposer/request")
                  : router.push("/login?intent=deposer&redirect=/deposer/request")
              }
              />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <ClientFeedbacksCarousel />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBentoCard({
  category,
  count,
  large,
}: {
  category: Category;
  count: number;
  large: boolean;
}) {
  const img = getCategoryCardImage(category);
  const countLabel =
    count === 1 ? `1 ${fr.article}` : `${count} ${fr.articles}`;
  return (
    <Link
      href={`/categories/${category.id}`}
      className={`group relative min-h-[200px] overflow-hidden rounded-3xl ${
        large ? "md:col-span-2 md:row-span-2 md:min-h-[420px]" : "md:min-h-[200px]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={category.categoryName}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div>
          <p className={`display text-cream ${large ? "text-2xl" : "text-xl md:text-2xl"}`}>
            {category.categoryName}
          </p>
          <p className="text-xs text-cream/80">{countLabel}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground transition group-hover:-translate-y-0.5">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}
