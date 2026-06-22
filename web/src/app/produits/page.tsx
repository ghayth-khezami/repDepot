"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { ProductCatalogFilters, CatalogFilterState } from "@/components/ProductCatalogFilters";
import { useShop } from "@/context/ShopContext";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { fr } from "@/lib/fr";

const DEFAULT_FILTERS: CatalogFilterState = { sort: "newest" };

export default function ProduitsPage() {
  const { categories, token, syncLikesForProducts } = useShop();
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTERS);

  const queryOpts = useMemo(() => {
    const o: CatalogFilterState = { sort: filters.sort ?? "newest" };
    if (filters.search) o.search = filters.search;
    if (filters.categoryId) o.categoryId = filters.categoryId;
    if (filters.subCategoryId) o.subCategoryId = filters.subCategoryId;
    if (filters.subSubCategory1Id) o.subSubCategory1Id = filters.subSubCategory1Id;
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
    <div className="page-container produits-page py-6 md:py-10">
      <header className="produits-page-header mb-6 md:mb-8">
        <p className="tag-eyebrow">{fr.shopEyebrow}</p>
        <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.productsPageTitle}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{fr.productsPageSub}</p>
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
            <p className="py-16 text-center text-sm text-muted-foreground">{fr.noProducts}</p>
          )}
          <div ref={sentinelRef} className="h-6" />
        </div>
      </div>
    </div>
  );
}
