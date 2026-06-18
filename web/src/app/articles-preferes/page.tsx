"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";

const LIMIT = 12;

export default function ArticlesPreferesPage() {
  const { token, user, syncLikesForProducts } = useShop();
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setPage(1);
      setHasMore(true);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.getLikedProductsPage(token, { page, limit: LIMIT });
        if (cancelled) return;
        const totalPages = Math.max(1, res.meta.totalPages || 1);
        setItems((prev) => {
          if (page === 1) return res.data;
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const p of res.data) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          }
          return merged;
        });
        setHasMore(page < totalPages);
      } catch {
        if (!cancelled) {
          if (page === 1) setItems([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, page]);

  useEffect(() => {
    if (!token || items.length === 0) return;
    void syncLikesForProducts(items.map((p) => p.id));
  }, [token, items, syncLikesForProducts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!token || !el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && hasMore) setPage((p) => p + 1);
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, hasMore, token]);

  if (!token || !user) {
    return (
      <div className="page-container py-8">
        <div className="surface-card mx-auto max-w-lg p-8 text-center">
          <p className="font-medium text-foreground">Connectez-vous pour voir vos articles préférés.</p>
          <Link href="/login" className="btn-primary mt-4 inline-flex">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8 py-4">
      <div>
        <p className="tag-eyebrow">Favoris</p>
        <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">Articles préférés</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vos coups de cœur, chargés page par page.
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <div className="surface-card p-10 text-center">
          <p className="font-medium">Aucun article préféré pour le moment.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Touchez le cœur sur une carte produit pour l&apos;ajouter ici.
          </p>
          <Link href="/produits" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
            Retour à la boutique
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onFavoriteChange={(r, pid) => {
                if (r === "removed") setItems((prev) => prev.filter((p) => p.id !== pid));
              }}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-2" />
      <div className="flex justify-center pb-6">
        {loading ? (
          <span className="text-xs text-muted-foreground">Chargement…</span>
        ) : hasMore && items.length > 0 ? (
          <span className="text-xs text-muted-foreground">Faites défiler pour charger plus</span>
        ) : items.length > 0 ? (
          <span className="text-xs text-muted-foreground">Fin de la liste ({items.length})</span>
        ) : null}
      </div>
    </div>
  );
}
