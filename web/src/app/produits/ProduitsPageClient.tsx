"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { ProductCatalogFilters, CatalogFilterState } from "@/components/ProductCatalogFilters";
import { useShop } from "@/context/ShopContext";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";

const DEFAULT_FILTERS: CatalogFilterState = { sort: "newest" };

export function ProduitsPageClient() {
  const searchParams = useSearchParams();
  const { categories, token, syncLikesForProducts } = useShop();
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    const next: CatalogFilterState = { sort: "newest" };
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const subSubCategory1Id = searchParams.get("subSubCategory1Id");
    const subSubCategory2Id = searchParams.get("subSubCategory2Id");
    const subSubCategory3Id = searchParams.get("subSubCategory3Id");
    if (categoryId) next.categoryId = categoryId;
    if (subCategoryId) next.subCategoryId = subCategoryId;
    if (subSubCategory1Id) next.subSubCategory1Id = subSubCategory1Id;
    if (subSubCategory2Id) next.subSubCategory2Id = subSubCategory2Id;
    if (subSubCategory3Id) next.subSubCategory3Id = subSubCategory3Id;
    if (categoryId || subCategoryId || subSubCategory1Id || subSubCategory2Id || subSubCategory3Id)
      setFilters(next);
  }, [searchParams]);

  const queryOpts = useMemo(() => {
    const o: CatalogFilterState = { sort: filters.sort ?? "newest" };
    if (filters.search) o.search = filters.search;
    if (filters.categoryId) o.categoryId = filters.categoryId;
    if (filters.subCategoryId) o.subCategoryId = filters.subCategoryId;
    if (filters.subSubCategory1Id) o.subSubCategory1Id = filters.subSubCategory1Id;
    if (filters.subSubCategory2Id) o.subSubCategory2Id = filters.subSubCategory2Id;
    if (filters.subSubCategory3Id) o.subSubCategory3Id = filters.subSubCategory3Id;
    if (filters.minPrice !== undefined && !Number.isNaN(filters.minPrice)) {
      o.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined && !Number.isNaN(filters.maxPrice)) {
      o.maxPrice = filters.maxPrice;
    }
    return o;
  }, [filters]);

  const { items, loading, sentinelRef } = useInfiniteProducts(queryOpts);
  const initialLoading = loading && items.length === 0;
  const loadingMore = loading && items.length > 0;

  const productIdsKey = useMemo(() => items.map((p) => p.id).join(","), [items]);

  useEffect(() => {
    if (!token || !productIdsKey) return;
    void syncLikesForProducts(productIdsKey.split(","));
  }, [token, productIdsKey, syncLikesForProducts]);

  return (
    <div className={`w-full bg-[#FFFDFB] py-6 text-[#2D2346] md:py-10 ${STORE_CONTAINER}`}>
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E04672]">
          {fr.shopEyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl text-[#2D2346] md:text-5xl">
          {fr.productsPageTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[#2D2346]/65">{fr.productsPageSub}</p>
      </header>

      <div className="produits-shell">
        <aside className="produits-filters-col">
          <ProductCatalogFilters
            categories={categories}
            value={filters}
            onChange={setFilters}
            resultCount={items.length}
            variant="sidebar"
          />
        </aside>

        <div className="produits-grid-col">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {initialLoading && <ProductGridSkeletons count={10} />}
            {loadingMore && <ProductGridSkeletons count={5} />}
          </div>

          {!loading && items.length === 0 && (
            <p className="py-16 text-center text-sm text-[#2D2346]/60">{fr.noProducts}</p>
          )}
          <div ref={sentinelRef} className="h-6" />
        </div>
      </div>
    </div>
  );
}
