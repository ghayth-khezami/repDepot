"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { useShop } from "@/context/ShopContext";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { Mark } from "@/types";

export default function MarkProductsPage() {
  const params = useParams<{ id: string }>();
  const { token, syncLikesForProducts } = useShop();
  const { items, loading, sentinelRef } = useInfiniteProducts({ markId: params.id });
  const [mark, setMark] = useState<Mark | null>(null);

  useEffect(() => {
    api
      .getMarks()
      .then((all) => setMark(all.find((m) => m.id === params.id) ?? null))
      .catch(() => setMark(null));
  }, [params.id]);

  const productIdsKey = useMemo(() => items.map((p) => p.id).join(","), [items]);

  useEffect(() => {
    if (!token || !productIdsKey) return;
    void syncLikesForProducts(productIdsKey.split(","));
  }, [token, productIdsKey, syncLikesForProducts]);

  const logo = mark ? api.normalizePhotoUrl(mark.logoDoc) : "";

  return (
    <div className="page-container space-y-10 py-4">
      <Link
        href="/#categories"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour à la boutique
      </Link>

      <div className="flex flex-wrap items-center gap-6">
        {logo ? (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={mark?.name} className="max-h-full max-w-full object-contain" />
          </div>
        ) : null}
        <div>
          <p className="tag-eyebrow">{fr.ourBrands}</p>
          <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{mark?.name ?? "Marque"}</h1>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          <ProductGridSkeletons count={8} />
        </div>
      ) : null}
      {!loading && items.length === 0 && (
        <p className="text-muted-foreground">Aucun produit pour cette marque.</p>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
