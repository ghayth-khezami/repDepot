"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Product } from "@/types";

export type ProductCatalogFilters = {
  categoryId?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
  subSubCategory2Id?: string;
  subSubCategory3Id?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
};

export function useInfiniteProducts(opts?: ProductCatalogFilters) {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const resetKey = useMemo(() => JSON.stringify(opts || {}), [opts]);

  const load = useCallback(async (nextPage: number) => {
    if (loadingRef.current) return;
    if (nextPage > 1 && !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.getProductsPage({ page: nextPage, limit: 10, ...optsRef.current });
      setItems((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
      const currentPage = res.meta.page;
      const more = currentPage < res.meta.totalPages;
      pageRef.current = currentPage;
      hasMoreRef.current = more;
      setPage(currentPage);
      setHasMore(more);
    } catch {
      if (nextPage === 1) setItems([]);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pageRef.current = 0;
    hasMoreRef.current = true;
    setItems([]);
    setPage(0);
    setHasMore(true);
    void load(1);
  }, [resetKey, load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadingRef.current || !hasMoreRef.current) return;
        void load(pageRef.current + 1);
      },
      { rootMargin: "240px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  return { items, loading, hasMore, sentinelRef, reload: () => load(1) };
}
