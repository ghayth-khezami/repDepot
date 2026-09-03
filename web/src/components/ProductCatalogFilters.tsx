"use client";

import { createPortal } from "react-dom";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductCatalogFilters as Filters } from "@/hooks/useInfiniteProducts";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { Category, SubCategory, SubSubCategory1 } from "@/types";
import { getCategoryCardImage } from "@/lib/category-images";

export type CatalogFilterState = Filters & {
  categoryId?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
};

const FALLBACK_PRICE_MIN = 0;
const FALLBACK_PRICE_MAX = 500;

const SORT_OPTIONS: Array<{ value: NonNullable<Filters["sort"]>; label: string }> = [
  { value: "price_asc", label: fr.sortPriceAsc },
  { value: "price_desc", label: fr.sortPriceDesc },
];

type Props = {
  categories: Category[];
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  resultCount?: number;
  variant?: "sidebar" | "standalone" | "mobile-trigger";
};

function countActive(f: CatalogFilterState, priceMin: number, priceMax: number) {
  let n = 0;
  if (f.search?.trim()) n += 1;
  if (f.categoryId) n += 1;
  if (f.subCategoryId) n += 1;
  if (f.subSubCategory1Id) n += 1;
  if (f.minPrice !== undefined && f.minPrice > priceMin) n += 1;
  if (f.maxPrice !== undefined && f.maxPrice < priceMax) n += 1;
  if (f.sort && f.sort !== "newest") n += 1;
  return n;
}

export function ProductCatalogFilters({
  categories,
  value,
  onChange,
  resultCount,
  variant = "standalone",
}: Props) {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory1[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [subCategoryOpen, setSubCategoryOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [priceBounds, setPriceBounds] = useState({ min: FALLBACK_PRICE_MIN, max: FALLBACK_PRICE_MAX });
  const [searchInput, setSearchInput] = useState(value.search ?? "");
  const [priceMin, setPriceMin] = useState(value.minPrice ?? FALLBACK_PRICE_MIN);
  const [priceMax, setPriceMax] = useState(value.maxPrice ?? FALLBACK_PRICE_MAX);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const activeCount = countActive(value, priceBounds.min, priceBounds.max);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    api.getProductPriceRange().then((range) => {
      const min = Math.floor(Math.max(0, range.min));
      const max = Math.ceil(Math.max(min + 1, range.max));
      setPriceBounds({ min, max });
      setPriceMin(value.minPrice ?? min);
      setPriceMax(value.maxPrice ?? max);
    }).catch(() => undefined);
    // The range is loaded once when the filter panel mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value.categoryId) {
      setSubCategories([]);
      return;
    }
    api
      .getSubCategories({ categoryId: value.categoryId, limit: 10, page: 1 })
      .then((res) => setSubCategories(res.data))
      .catch(() => setSubCategories([]));
  }, [value.categoryId]);

  useEffect(() => {
    if (!value.subCategoryId) {
      setSubSubCategories([]);
      return;
    }
    api
      .getSubSubCategories1({ subCategoryId: value.subCategoryId, limit: 10, page: 1 })
      .then((res) => setSubSubCategories(res.data))
      .catch(() => setSubSubCategories([]));
  }, [value.subCategoryId]);

  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    if (next === value.search) return;
    onChange({ ...value, search: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const patch = (partial: Partial<CatalogFilterState>) => {
    const next = { ...value, ...partial };
    if (partial.categoryId !== undefined && partial.categoryId !== value.categoryId) {
      next.subCategoryId = undefined;
      next.subSubCategory1Id = undefined;
    }
    if (partial.subCategoryId !== undefined && partial.subCategoryId !== value.subCategoryId) {
      next.subSubCategory1Id = undefined;
    }
    onChange(next);
  };

  const reset = () => {
    setSearchInput("");
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
    onChange({ sort: "newest", minPrice: undefined, maxPrice: undefined });
  };

  const handlePriceChange = (min: number, max: number) => {
    setPriceMin(min);
    setPriceMax(max);
    patch({
      minPrice: min > priceBounds.min ? min : undefined,
      maxPrice: max < priceBounds.max ? max : undefined,
    });
  };

  const panel = (includeSearch = true) => (
    <div className="catalog-filter-panel space-y-5">
      {includeSearch && (
        <label className="block">
          <span className="catalog-filter-label">{fr.filterSearch}</span>
          <span className="relative flex">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)]/60"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={fr.filterSearch}
              className="catalog-filter-input !pl-11"
            />
          </span>
        </label>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="catalog-filter-label mb-0">{fr.filterCategory}</span>
          <button type="button" className="unstyled !p-1 text-[#182044]/50" onClick={() => setCategoryOpen((open) => !open)} aria-expanded={categoryOpen} aria-label="Afficher les catégories">
            <ChevronDown size={15} className={`transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${categoryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 space-y-1 overflow-hidden border-t border-[#182044]/8 pt-2">
          <button type="button" className={`unstyled flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${!value.categoryId ? "bg-[var(--secondary)] font-semibold text-[var(--primary)]" : "text-[#182044]/70"}`} onClick={() => patch({ categoryId: undefined })}>
            <span>{fr.filterAll}</span>{!value.categoryId ? <span>✓</span> : null}
          </button>
          {categories.map((c) => <div key={c.id}>
            <button type="button" className={`unstyled flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${value.categoryId === c.id ? "bg-[var(--secondary)] font-semibold text-[var(--primary)]" : "text-[#182044]/70"}`} onClick={() => patch({ categoryId: c.id })}><span>{c.categoryName}</span><ChevronDown size={13} className={value.categoryId === c.id ? "rotate-180" : ""} /></button>
            {value.categoryId === c.id ? <div className={`ml-3 grid border-l-2 border-[var(--primary)]/15 pl-2 transition-[grid-template-rows,opacity] duration-300 ease-out ${subCategoryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 space-y-1 overflow-hidden py-1"><button type="button" className={`unstyled flex w-full px-2 py-1 text-left text-xs ${!value.subCategoryId ? "font-semibold text-[var(--primary)]" : "text-[#182044]/65"}`} onClick={() => patch({ subCategoryId: undefined })}>{fr.filterAll}</button>{subCategories.map((s) => <div key={s.id}><button type="button" className={`unstyled flex w-full items-center justify-between px-2 py-1 text-left text-xs ${value.subCategoryId === s.id ? "font-semibold text-[var(--primary)]" : "text-[#182044]/65"}`} onClick={() => patch({ subCategoryId: s.id })}><span>{s.title}</span><ChevronDown size={13} className={value.subCategoryId === s.id ? "rotate-180" : ""} /></button>{value.subCategoryId === s.id && subSubCategories.length > 0 ? <div className="ml-3 space-y-1 border-l border-[var(--primary)]/15 pl-2">{subSubCategories.map((ss) => <button key={ss.id} type="button" className={`unstyled block w-full px-2 py-1 text-left text-[11px] ${value.subSubCategory1Id === ss.id ? "font-semibold text-[var(--primary)]" : "text-[#182044]/55"}`} onClick={() => patch({ subSubCategory1Id: ss.id })}>{ss.title}</button>)}</div> : null}</div>)}</div></div> : null}
          </div>)}
        </div>
        </div>
      </div>

      <div>
        <span className="catalog-filter-label">Prix (TND)</span>
        <PriceRangeSlider
          min={priceBounds.min}
          max={priceBounds.max}
          valueMin={priceMin}
          valueMax={priceMax}
          onChange={handlePriceChange}
        />
      </div>

      <label className="block">
        <span className="catalog-filter-label">{fr.filterSort}</span>
        <select
          value={value.sort ?? "newest"}
          onChange={(e) => patch({ sort: e.target.value as NonNullable<Filters["sort"]> })}
          className="catalog-filter-input !cursor-pointer"
        >
          <option value="newest">{fr.sortNewest}</option>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E04672]/20 bg-[#FFF0F4] py-3 text-sm font-semibold text-[#E04672] transition hover:bg-[#FFE8EE]"
        >
          <X size={16} />
          {fr.clearFilters}
        </button>
      ) : null}
    </div>
  );

  const mobileSheet =
    mobileOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[80] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-label={fr.hideFilters}
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="display text-2xl text-plum-deep">{fr.showFilters}</h2>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {panel()}
              <button
                type="button"
                className="btn-primary mt-6 w-full justify-center"
                onClick={() => setMobileOpen(false)}
              >
                {fr.applyFilters}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  const mobileFab =
    mounted
      ? createPortal(
          <button
            type="button"
            className="catalog-fab lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={fr.showFilters}
          >
            <SlidersHorizontal size={22} strokeWidth={2} />
            {activeCount > 0 ? <span className="catalog-fab-badge">{activeCount}</span> : null}
          </button>,
          document.body,
        )
      : null;

  if (variant === "mobile-trigger") {
    return (
      <>
        <button type="button" className="unstyled inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E04672]/20 bg-[#FFF0F4] px-3 text-xs font-semibold text-[#E04672] lg:hidden" onClick={() => setMobileOpen(true)} aria-label={fr.showFilters}>
          <SlidersHorizontal size={15} />
          Filtrer{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {mobileSheet}
      </>
    );
  }

  if (variant === "sidebar") {
    return (
      <>
        <div className="produits-filters-card hidden p-4 lg:block lg:p-5">
          {panel()}
        </div>
        {mobileSheet}
        
      </>
    );
  }

  // Standalone horizontal top variant with categories row and accordion
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition hover:-translate-y-0.5 ${advancedOpen ? "border-[#E04672] bg-[#FFF0F4] text-[#E04672]" : "border-[#E04672]/15 bg-white text-[#2D2346]"}`}
          aria-label={advancedOpen ? "Masquer les filtres" : "Afficher les filtres"}
          aria-expanded={advancedOpen}
        >
          <SlidersHorizontal size={20} />
        </button>
        <div className="flex-1">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E04672]/50"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={fr.filterSearch}
              className="catalog-filter-input !pl-11"
            />
          </label>
        </div>

        <div className="ml-4 hidden lg:block">
          <div className="text-sm text-muted-foreground">
            {resultCount !== undefined && (
              <span>
                <strong className="text-foreground">{resultCount}</strong> {fr.resultsCount}
              </span>
            )}
            {activeCount > 0 && (
              <span className="ml-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {activeCount} {fr.activeFilters}
              </span>
            )}
          </div>
        </div>

        <div className="ml-3 lg:hidden">
          <button type="button" className="btn-primary !py-2.5 !px-3" onClick={() => setMobileOpen(true)}>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Categories row */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex gap-3 px-0">
          <button
            type="button"
            onClick={() => patch({ categoryId: undefined })}
            className={`flex-shrink-0 flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${!value.categoryId ? 'border-primary bg-primary/10 text-primary' : 'bg-white border-border'}`}>
            {fr.filterAll}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => patch({ categoryId: c.id })}
              className={`flex-shrink-0 flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-semibold ${value.categoryId === c.id ? 'border-primary bg-primary/10 text-primary' : 'bg-white border-border'}`}
            >
              <img src={getCategoryCardImage(c)} alt="" className="h-8 w-8 rounded-full object-cover" />
              <span>{c.categoryName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accordion for subcategories */}
      {value.categoryId && (
        <div className="mt-4 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => patch({ subCategoryId: undefined })}
              className={`rounded-full px-3 py-2 text-sm font-medium ${!value.subCategoryId ? 'bg-primary/10 text-primary' : 'bg-white border border-border'}`}
            >
              {fr.filterAll}
            </button>
            {subCategories.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => patch({ subCategoryId: s.id })}
                className={`rounded-full px-3 py-2 text-sm font-medium ${value.subCategoryId === s.id ? 'bg-primary/10 text-primary' : 'bg-white border border-border'}`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {value.subCategoryId && subSubCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => patch({ subSubCategory1Id: undefined })}
                className={`rounded-full px-3 py-2 text-sm font-medium ${!value.subSubCategory1Id ? 'bg-primary/10 text-primary' : 'bg-white border border-border'}`}
              >
                {fr.filterAll}
              </button>
              {subSubCategories.map((ss) => (
                <button
                  key={ss.id}
                  type="button"
                  onClick={() => patch({ subSubCategory1Id: ss.id })}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${value.subSubCategory1Id === ss.id ? 'bg-primary/10 text-primary' : 'bg-white border border-border'}`}
                >
                  {ss.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop: full panel below for advanced filters */}
      {advancedOpen && <div className="mt-4">
        <div className="rounded-3xl border border-primary/10 bg-card/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          {panel(false)}
        </div>
      </div>}

      {mobileSheet}
      {mobileFab}
    </div>
  );
}
