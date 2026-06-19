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
import { SubCategory } from "@/types";

export default function CategoryPage() {
  const params = useParams<{ id: string }>();
  const { categories, token, syncLikesForProducts } = useShop();
  const { items, loading, sentinelRef } = useInfiniteProducts({ categoryId: params.id });
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  const productIdsKey = useMemo(() => items.map((p) => p.id).join(","), [items]);

  useEffect(() => {
    if (!token || !productIdsKey) return;
    void syncLikesForProducts(productIdsKey.split(","));
  }, [token, productIdsKey, syncLikesForProducts]);

  useEffect(() => {
    api
      .getSubCategories({ categoryId: params.id, limit: 50, page: 1 })
      .then((res) => setSubCategories(res.data))
      .catch(() => setSubCategories([]));
  }, [params.id]);

  const category = categories.find((c) => c.id === params.id);

  const sections = useMemo(() => {
    const order = [...subCategories.map((s) => s.id), "__none__"];
    const byId = new Map<string, { title: string; products: typeof items }>();
    for (const sub of subCategories) {
      byId.set(sub.id, { title: sub.title, products: [] });
    }
    byId.set("__none__", { title: "Autres", products: [] });
    for (const p of items) {
      const key = p.subCategoryId && byId.has(p.subCategoryId) ? p.subCategoryId : "__none__";
      const title =
        key === "__none__"
          ? "Autres"
          : subCategories.find((s) => s.id === key)?.title ?? p.subCategory?.title ?? "Autres";
      if (!byId.has(key)) byId.set(key, { title, products: [] });
      byId.get(key)!.products.push(p);
    }
    return order
      .map((id) => ({ id, ...byId.get(id)! }))
      .filter((s) => s.products.length > 0);
  }, [items, subCategories]);

  return (
    <div className="page-container space-y-10 py-4">
      <Link
        href="/#categories"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux catégories
      </Link>
      <div>
        <p className="tag-eyebrow">{fr.categoriesEyebrow}</p>
        <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">
          {category?.categoryName || "Catégorie"}
        </h1>
        {category?.description ? (
          <p className="mt-2 max-w-lg text-muted-foreground">{category.description}</p>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          <ProductGridSkeletons count={8} />
        </div>
      ) : null}
      {!loading && items.length === 0 && (
        <p className="text-muted-foreground">Aucun produit dans cette catégorie.</p>
      )}

      {sections.map((section) => (
        <section key={section.id} className="space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
            <h2 className="display text-2xl text-plum-deep md:text-3xl">{section.title}</h2>
            <span className="text-sm text-muted-foreground">
              {section.products.length} {section.products.length > 1 ? fr.articles : fr.article}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {section.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
