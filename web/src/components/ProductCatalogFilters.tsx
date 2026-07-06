"use client";

import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductCatalogFilters as Filters } from "@/hooks/useInfiniteProducts";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { Category, SubCategory, SubSubCategory1 } from "@/types";

export type CatalogFilterState = Filters & {
  categoryId?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
};

const PRICE_MIN = 0;
const PRICE_MAX = 500;

const SORT_OPTIONS: Array<{ value: NonNullable<Filters["sort"]>; label: string }> = [
  { value: "price_asc", label: fr.sortPriceAsc },
  { value: "price_desc", label: fr.sortPriceDesc },
];

type Props = {
  categories: Category[];
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  resultCount?: number;
  variant?: "sidebar" | "standalone";
};

function countActive(f: CatalogFilterState) {
  let n = 0;
  if (f.search?.trim()) n += 1;
  if (f.categoryId) n += 1;
  if (f.subCategoryId) n += 1;
  if (f.subSubCategory1Id) n += 1;
  if (f.minPrice !== undefined && f.minPrice > PRICE_MIN) n += 1;
  if (f.maxPrice !== undefined && f.maxPrice < PRICE_MAX) n += 1;
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
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState(value.search ?? "");
  const [priceMin, setPriceMin] = useState(value.minPrice ?? PRICE_MIN);
  const [priceMax, setPriceMax] = useState(value.maxPrice ?? PRICE_MAX);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const activeCount = countActive(value);

  useEffect(() => setMounted(true), []);

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
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
    onChange({ sort: "newest", minPrice: undefined, maxPrice: undefined });
  };

  const handlePriceChange = (min: number, max: number) => {
    setPriceMin(min);
    setPriceMax(max);
    patch({
      minPrice: min > PRICE_MIN ? min : undefined,
      maxPrice: max < PRICE_MAX ? max : undefined,
    });
  };

  const panel = (
    <div className="catalog-filter-panel space-y-5">
      <label className="block">
        <span className="catalog-filter-label">{fr.filterSearch}</span>
        <span className="relative flex">
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
        </span>
      </label>

      <div>
        <span className="catalog-filter-label">{fr.filterCategory}</span>
        <select
          value={value.categoryId ?? ""}
          onChange={(e) => patch({ categoryId: e.target.value || undefined })}
          className="catalog-filter-input !cursor-pointer"
        >
          <option value="">{fr.filterAll}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </select>
      </div>

      {value.categoryId ? (
        <div>
          <span className="catalog-filter-label">{fr.filterSubCategory}</span>
          <select
            value={value.subCategoryId ?? ""}
            onChange={(e) => patch({ subCategoryId: e.target.value || undefined })}
            className="catalog-filter-input !cursor-pointer"
            disabled={!subCategories.length}
          >
            <option value="">{fr.filterAll}</option>
            {subCategories.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      ) : null}

      {value.subCategoryId ? (
        <div>
          <span className="catalog-filter-label">{fr.filterSubSubCategory}</span>
          <select
            value={value.subSubCategory1Id ?? ""}
            onChange={(e) => patch({ subSubCategory1Id: e.target.value || undefined })}
            className="catalog-filter-input !cursor-pointer"
            disabled={!subSubCategories.length}
          >
            <option value="">{fr.filterAll}</option>
            {subSubCategories.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <span className="catalog-filter-label">Prix (TND)</span>
        <PriceRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
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
              {panel}
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

  if (variant === "sidebar") {
    return (
      <>
        <div className="produits-filters-card hidden p-4 lg:block lg:p-5">
          {panel}
        </div>
        {mobileSheet}
        {mobileFab}
      </>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {resultCount !== undefined && (
            <span>
              <strong className="text-foreground">{resultCount}</strong> {fr.resultsCount}
            </span>
          )}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {activeCount} {fr.activeFilters}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn-primary !py-2.5 !px-4"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal size={16} />
          {fr.showFilters}
        </button>
      </div>
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-primary/10 bg-card/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          {panel}
        </div>
      </div>
      {mobileSheet}
      {mobileFab}
    </div>
  );
}
