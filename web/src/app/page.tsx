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

  return (
    <div className="min-h-dvh w-full bg-[#FFFDFB] text-[#2D2346]">
      <HeroCarousel />

      <div className="home-content-flow space-y-16 overflow-x-clip py-12 md:space-y-24 md:py-16">
        <div className={`${STORE_CONTAINER} home-premium-section`}>
          <ProductsGrid products={featured} loading={featuredLoading} />
        </div>

        <div className={`${STORE_CONTAINER} home-premium-section`}>
          <CategoriesExplorer
            categories={categories}
            counts={Object.fromEntries(categories.map((category) => [category.id, category._count?.products ?? 0]))}
          />
        </div>

        <div className={STORE_CONTAINER}>
          <TrustSection />
        </div>
      </div>

      <TestimonialsCarousel />
      <div className="home-store-section">
        <YouTubeSection />
      </div>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
}
