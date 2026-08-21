"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { ProductCatalogFilters, CatalogFilterState } from "@/components/ProductCatalogFilters";
import { useShop } from "@/context/ShopContext";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { fr } from "@/lib/fr";
import { getCategoryCardImage } from "@/lib/category-images";
import Image from "next/image";
import { LOGO_SRC } from "@/lib/fr";

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
    <div className="w-full bg-white px-4 py-3 text-[#2D2346] sm:px-6 md:px-8 md:py-4 lg:px-10 xl:px-12">
      <nav className="mb-2 flex items-center gap-3 text-xs text-[#182044]/45" aria-label="Fil d'Ariane">
        <span>Accueil</span><span>/</span><span className="text-[#182044]/65">Produits</span>
      </nav>

      <header className="mb-3 flex justify-center overflow-hidden md:mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/allProducts.png" alt="Des produits Bébé Dépôt pour les mamans et leurs bébés" className="block h-auto max-h-[170px] w-full object-contain object-center sm:max-h-[220px] lg:max-h-[270px]" />
      </header>

      <div className="mb-3 overflow-x-auto pb-1">
        <div className="flex min-w-max justify-center gap-2.5">
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className={`unstyled flex h-[68px] w-[96px] flex-col items-center justify-center gap-1 rounded-[1rem] border bg-white text-[11px] font-semibold shadow-[0_6px_18px_rgba(45,35,70,0.06)] transition ${!filters.categoryId ? "border-[#E04672] bg-[#FFF0F4] text-[#E04672]" : "border-[#182044]/10 text-[#182044]/65"}`}> <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0F4] text-sm">☷</span>Tout</button>
          {categories.slice(0, 7).map((category) => (
            <button key={category.id} type="button" onClick={() => setFilters({ ...filters, categoryId: category.id, subCategoryId: undefined, subSubCategory1Id: undefined })} className={`unstyled flex h-[68px] w-[108px] flex-col items-center justify-center gap-1 rounded-[1rem] border bg-white text-[11px] font-semibold shadow-[0_6px_18px_rgba(45,35,70,0.06)] transition ${filters.categoryId === category.id ? "border-[#E04672] bg-[#FFF0F4] text-[#E04672]" : "border-[#182044]/10 text-[#182044]/65"}`}>
              <img src={getCategoryCardImage(category)} alt="" className="h-7 w-7 rounded-full object-cover" />
              <span className="max-w-full truncate px-1">{category.categoryName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="produits-shell">
        <aside className="produits-filters-col">
          <ProductCatalogFilters categories={categories} value={filters} onChange={setFilters} resultCount={items.length} variant="sidebar" />
        </aside>

        <div className="produits-grid-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#182044]/8 bg-white px-4 py-3">
            <p className="text-xs text-[#182044]/55"><strong className="text-[#182044]">{items.length}</strong> {fr.resultsCount}</p>
            <div className="flex items-center gap-2">
              <ProductCatalogFilters categories={categories} value={filters} onChange={setFilters} variant="mobile-trigger" />
              <select value={filters.sort ?? "newest"} onChange={(event) => setFilters({ ...filters, sort: event.target.value as CatalogFilterState["sort"] })} className="rounded-lg border border-[#182044]/10 bg-white px-3 py-2 text-xs text-[#182044] outline-none">
                <option value="newest">Trier par : Popularité</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
            {initialLoading && <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center gap-3"><Image src={LOGO_SRC} alt="Chargement" width={70} height={70} className="animate-pulse object-contain" /><span className="text-xs text-[#182044]/50">Chargement des produits...</span></div>}
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
