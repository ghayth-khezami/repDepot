"use client";

import { useEffect, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { api } from "@/lib/api";
import { Product } from "@/types";
import {
  CategoriesExplorer,
  FloatingContactButtons,
  Footer,
  HeroCarousel,
  ProductsGrid,
  TestimonialsCarousel,
  TrustSection,
  YouTubeSection,
} from "@/components/home";
import { STORE_CONTAINER } from "@/lib/home";

export default function Home() {
  const { categories, syncLikesForProducts } = useShop();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const run = async () => {
      setFeaturedLoading(true);
      try {
        const picked = await api.getFeaturedProducts();
        if (picked.length > 0) {
          const list = picked.slice(0, 8);
          setFeatured(list);
          void syncLikesForProducts(list.map((p) => p.id));
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

  return (
    <div className="min-h-dvh w-full bg-[#FFFDFB] text-[#2D2346]">
      <HeroCarousel />

      <div className="space-y-20 overflow-x-clip py-16 md:space-y-28 md:py-20">
        <div className={STORE_CONTAINER}>
          <ProductsGrid products={featured} loading={featuredLoading} />
        </div>

        <div className={STORE_CONTAINER}>
          <CategoriesExplorer categories={categories} counts={categoryCounts} />
        </div>

        <div className={STORE_CONTAINER}>
          <TrustSection />
        </div>
      </div>

      <TestimonialsCarousel />
      <YouTubeSection />
      <Footer />
      <FloatingContactButtons />
    </div>
  );
}
