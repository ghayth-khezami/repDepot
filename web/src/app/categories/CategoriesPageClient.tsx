"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, House } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { fr } from "@/lib/fr";
import type { CategoryHierarchyNode, CategoryTreeSelection } from "@/types";

const CARD_COLORS = ["#FFF0F4", "#F4EEFB", "#FFF7DE", "#EAF8F7", "#EEF5FF", "#FFF0EC"];

function CategoryCard({ category, index, count, active, onSelect }: { category: CategoryHierarchyNode; index: number; count: number; active: boolean; onSelect: () => void }) {
  const image = getCategoryCardImage(category);
  const links = category.subCategories.slice(0, 3).map((item) => item.title);
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <button type="button" onClick={onSelect} className={`unstyled group flex min-h-[292px] flex-col rounded-xl border bg-white p-3 text-left shadow-[0_5px_18px_rgba(45,35,70,0.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(45,35,70,0.1)] ${active ? "border-[#E04672]" : "border-[#2D2346]/10"}`}>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-full p-2" style={{ backgroundColor: color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <h2 className="line-clamp-2 min-h-10 text-center font-display text-sm font-semibold leading-tight text-[#182044]">{category.categoryName}</h2>
        <p className="mt-1 text-center text-[11px] text-[#182044]/45">{count} {count === 1 ? fr.article : fr.articles}</p>
        <ul className="mt-2 space-y-1 text-[11px] text-[#182044]/65">
          {links.map((label) => <li key={label} className="flex items-center gap-2"><span className="h-1 w-1 shrink-0 rounded-full bg-[#E04672]/65" />{label}</li>)}
        </ul>
        <span className="mt-auto flex h-7 items-center justify-center rounded-lg text-[11px] font-medium" style={{ backgroundColor: color, color: "#E04672" }}>Explorer</span>
      </div>
    </button>
  );
}

export function CategoriesPageClient() {
  const [tree, setTree] = useState<CategoryHierarchyNode[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<CategoryTreeSelection | null>(null);

  useEffect(() => {
    api.getCategoryHierarchy().then((data) => {
      setTree(data);
      if (data[0]) setSelection({ categoryId: data[0].id, label: data[0].categoryName });
      void Promise.all(data.map(async (category) => {
        try {
          const result = await api.getProductsPage({ categoryId: category.id, page: 1, limit: 1 });
          return [category.id, result.meta.total] as const;
        } catch {
          return [category.id, 0] as const;
        }
      })).then((entries) => setCounts(Object.fromEntries(entries)));
    }).catch(() => setTree([])).finally(() => setLoading(false));
  }, []);

  const productFilters = useMemo(() => selection ? { categoryId: selection.categoryId, subCategoryId: selection.subCategoryId, subSubCategory1Id: selection.subSubCategory1Id, subSubCategory2Id: selection.subSubCategory2Id, subSubCategory3Id: selection.subSubCategory3Id } : {}, [selection]);
  const { items, loading: productsLoading, sentinelRef } = useInfiniteProducts(productFilters);

  return (
    <main className="w-full space-y-8 bg-white px-4 py-5 text-[#182044] sm:px-6 md:px-8 md:py-8 lg:px-10 xl:px-12">
      <nav className="flex items-center gap-3 text-xs text-[#182044]/45" aria-label="Fil d'Ariane">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[#E04672]"><House size={13} /> Accueil</Link><span>/</span><span className="text-[#182044]/65">Catégories</span>
      </nav>
      <section className="grid items-center gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div><h1 className="font-display text-4xl leading-[1.05] text-[#182044] md:text-5xl">Parcourez nos <span className="text-[#E04672]">catégories</span></h1><p className="mt-4 max-w-xs text-sm leading-relaxed text-[#182044]/60">Choisissez une catégorie, explorez la sélection et trouvez exactement ce dont votre bébé a besoin.</p></div>
        <div className="relative flex h-40 items-center justify-end overflow-hidden rounded-2xl border border-[#E04672]/15 bg-[#FFF0F4] px-6 md:h-44 md:px-12"><div className="absolute -left-10 -top-16 h-44 w-64 rounded-full bg-white/45" /><div className="absolute -right-10 -bottom-20 h-48 w-64 rounded-full bg-white/35" /><img src="/hero.jpg" alt="Sélection de produits pour bébé" className="relative h-full w-3/4 object-cover object-center mix-blend-multiply md:w-2/3" /></div>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl text-[#182044] md:text-2xl">Catégories principales</h2>
        {loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[292px] animate-pulse rounded-xl bg-[#FFF0F4]" />)}</div> : tree.length === 0 ? <p className="text-sm text-[#182044]/55">Aucune catégorie disponible.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">{tree.slice(0, 6).map((category, index) => <CategoryCard key={category.id} category={category} index={index} count={counts[category.id] ?? 0} active={selection?.categoryId === category.id} onSelect={() => setSelection({ categoryId: category.id, label: category.categoryName })} />)}</div>}
      </section>
      {selection && <section className="space-y-5 pt-3"><div className="flex items-end justify-between border-b border-[#182044]/10 pb-3"><h2 className="font-display text-xl text-[#182044] md:text-2xl">Produits populaires</h2><Link href={`/produits?${new URLSearchParams(Object.entries(productFilters).filter(([, value]) => value) as [string, string][]).toString()}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#E04672]">Voir tout <ArrowRight size={14} /></Link></div><div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">{items.slice(0, 10).map((product) => <ProductCard key={product.id} product={product} />)}{productsLoading && items.length === 0 && <ProductGridSkeletons count={5} />}</div>{!productsLoading && items.length === 0 && <p className="py-8 text-center text-sm text-[#182044]/55">{fr.noProducts}</p>}<div ref={sentinelRef} className="h-4" /></section>}
    </main>
  );
}