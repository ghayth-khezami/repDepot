"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductCatalogFilters as Filters } from "@/hooks/useInfiniteProducts";
import { Category, Mark, SubCategory } from "@/types";

export type CatalogFilterState = Filters & {
  categoryId?: string;
  subCategoryId?: string;
};

const SORT_OPTIONS: Array<{ value: NonNullable<Filters["sort"]>; label: string }> = [
  { value: "newest", label: fr.sortNewest },
  { value: "price_asc", label: fr.sortPriceAsc },
  { value: "price_desc", label: fr.sortPriceDesc },
  { value: "name_asc", label: fr.sortNameAsc },
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
  if (f.markId) n += 1;
  if (f.minPrice !== undefined && f.minPrice > 0) n += 1;
  if (f.maxPrice !== undefined && f.maxPrice > 0) n += 1;
  if (f.isDispo) n += 1;
  if (f.isDepot) n += 1;
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
  const [marks, setMarks] = useState<Mark[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState(value.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const activeCount = countActive(value);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    api.getMarks().then(setMarks).catch(() => setMarks([]));
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
    }
    onChange(next);
  };

  const reset = () => {
    setSearchInput("");
    onChange({ sort: "newest" });
  };

  const panel = (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {fr.filterSearch}
        </span>
        <span className="relative flex">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={fr.filterSearch}
            className="field-input !rounded-2xl !py-3 !pl-11"
          />
        </span>
      </label>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {fr.filterCategory}
        </span>
        <div className="no-scrollbar flex flex-wrap gap-2">
          <FilterChip active={!value.categoryId} onClick={() => patch({ categoryId: undefined })}>
            {fr.filterAll}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={value.categoryId === c.id}
              onClick={() => patch({ categoryId: c.id })}
            >
              {c.categoryName}
            </FilterChip>
          ))}
        </div>
      </div>

      {value.categoryId && subCategories.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {fr.filterSubCategory}
          </span>
          <div className="no-scrollbar flex flex-wrap gap-2">
            <FilterChip
              active={!value.subCategoryId}
              onClick={() => patch({ subCategoryId: undefined })}
            >
              {fr.filterAll}
            </FilterChip>
            {subCategories.map((s) => (
              <FilterChip
                key={s.id}
                active={value.subCategoryId === s.id}
                onClick={() => patch({ subCategoryId: s.id })}
              >
                {s.title}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {marks.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {fr.filterMark}
          </span>
          <div className="no-scrollbar flex flex-wrap gap-2">
            <FilterChip active={!value.markId} onClick={() => patch({ markId: undefined })}>
              {fr.filterAll}
            </FilterChip>
            {marks.map((m) => (
              <FilterChip
                key={m.id}
                active={value.markId === m.id}
                onClick={() => patch({ markId: m.id })}
              >
                {m.logoDoc ? (
                  <Image
                    src={api.normalizePhotoUrl(m.logoDoc) ?? ""}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : null}
                {m.name}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {fr.filterMinPrice}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.minPrice ?? ""}
            onChange={(e) =>
              patch({
                minPrice: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="field-input !rounded-2xl"
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {fr.filterMaxPrice}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.maxPrice ?? ""}
            onChange={(e) =>
              patch({
                maxPrice: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="field-input !rounded-2xl"
            placeholder="—"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={!!value.isDispo}
          onChange={(e) => patch({ isDispo: e.target.checked || undefined })}
          className="h-4 w-4 rounded border-border accent-[var(--plum)]"
        />
        <span className="text-sm font-medium text-foreground">{fr.filterStock}</span>
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={!!value.isDepot}
          onChange={(e) => patch({ isDepot: e.target.checked || undefined })}
          className="h-4 w-4 rounded border-border accent-[var(--plum)]"
        />
        <span className="text-sm font-medium text-foreground">{fr.filterDepot}</span>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {fr.filterSort}
        </span>
        <select
          value={value.sort ?? "newest"}
          onChange={(e) => patch({ sort: e.target.value as NonNullable<Filters["sort"]> })}
          className="field-input !cursor-pointer !rounded-2xl"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {activeCount > 0 && (
        <button type="button" onClick={reset} className="btn-ghost w-full justify-center">
          <X size={16} />
          {fr.clearFilters}
        </button>
      )}
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
        <div className="produits-filters-card hidden rounded-2xl border border-primary/10 bg-card/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:block lg:p-5">
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "text-cream shadow-[var(--shadow-glow)]"
          : "border border-border bg-background text-foreground/85 hover:border-primary/30"
      }`}
      style={active ? { background: "var(--gradient-brand)" } : undefined}
    >
      {children}
    </button>
  );
}
