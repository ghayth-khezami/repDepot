"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CaretRight,
  House,
  TreeStructure,
} from "@phosphor-icons/react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { api } from "@/lib/api";
import { getCategoryCardImage, getCategoryCoverImage } from "@/lib/category-images";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";
import type { CategoryHierarchy, CategoryTreeLevel } from "@/types";

type StackItem = {
  level: CategoryTreeLevel;
  id: string;
  title: string;
};

type TreeNode = {
  id: string;
  title: string;
  level: CategoryTreeLevel;
  image: string;
  hasChildren: boolean;
};

function getChildren(
  tree: CategoryHierarchy[],
  stack: StackItem[],
): TreeNode[] {
  if (!stack.length) {
    return tree.map((cat) => ({
      id: cat.id,
      title: cat.categoryName,
      level: "category" as const,
      image: getCategoryCardImage(cat),
      hasChildren: cat.subCategories.length > 0,
    }));
  }

  const cat = tree.find((c) => c.id === stack[0].id);
  if (!cat) return [];

  if (stack.length === 1) {
    return cat.subCategories.map((sub) => ({
      id: sub.id,
      title: sub.title,
      level: "sub" as const,
      image: getCategoryCardImage(cat),
      hasChildren: sub.subSubCategories1.length > 0,
    }));
  }

  const sub = cat.subCategories.find((s) => s.id === stack[1].id);
  if (!sub || stack.length === 2) {
    if (!sub) return [];
    return sub.subSubCategories1.map((ss1) => ({
      id: ss1.id,
      title: ss1.title,
      level: "ss1" as const,
      image: getCategoryCardImage(cat),
      hasChildren: ss1.subSubCategories2.length > 0,
    }));
  }

  const ss1 = sub.subSubCategories1.find((s) => s.id === stack[2].id);
  if (!ss1 || stack.length === 3) {
    if (!ss1) return [];
    return ss1.subSubCategories2.map((ss2) => ({
      id: ss2.id,
      title: ss2.title,
      level: "ss2" as const,
      image: getCategoryCardImage(cat),
      hasChildren: ss2.subSubCategories3.length > 0,
    }));
  }

  const ss2 = ss1.subSubCategories2.find((s) => s.id === stack[3].id);
  if (!ss2 || stack.length === 4) {
    if (!ss2) return [];
    return ss2.subSubCategories3.map((ss3) => ({
      id: ss3.id,
      title: ss3.title,
      level: "ss3" as const,
      image: getCategoryCardImage(cat),
      hasChildren: false,
    }));
  }

  return [];
}

function productFilters(tree: CategoryHierarchy[], stack: StackItem[]) {
  if (!stack.length) return {};
  const filters: Record<string, string> = { categoryId: stack[0].id };
  for (const item of stack.slice(1)) {
    if (item.level === "sub") filters.subCategoryId = item.id;
    if (item.level === "ss1") filters.subSubCategory1Id = item.id;
    if (item.level === "ss2") filters.subSubCategory2Id = item.id;
    if (item.level === "ss3") filters.subSubCategory3Id = item.id;
  }
  return filters;
}

function TreeNodeCard({
  node,
  active,
  onSelect,
  onDrill,
}: {
  node: TreeNode;
  active: boolean;
  onSelect: () => void;
  onDrill: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect();
        if (node.hasChildren) onDrill();
      }}
      className={`group flex w-full flex-col overflow-hidden rounded-[1.5rem] border-2 bg-white text-left shadow-[0_8px_28px_rgba(45,35,70,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(224,70,114,0.12)] ${
        active
          ? "border-[#E04672] ring-2 ring-[#E04672]/20"
          : "border-[#E04672]/12 hover:border-[#E04672]/35"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.image}
          alt={node.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {node.hasChildren && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#E04672] shadow-sm">
            <CaretRight size={14} weight="bold" />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-[#2D2346]">
          {node.title}
        </span>
      </div>
    </button>
  );
}

export function CategoriesPageClient() {
  const [tree, setTree] = useState<CategoryHierarchy[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCategoryHierarchy()
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoadingTree(false));
  }, []);

  const children = useMemo(() => getChildren(tree, stack), [tree, stack]);
  const filters = useMemo(() => productFilters(tree, stack), [tree, stack]);
  const { items, loading, sentinelRef } = useInfiniteProducts(
    stack.length ? filters : undefined,
  );

  const parentTitle = stack.length ? stack[stack.length - 1].title : null;

  const onNodeClick = (node: TreeNode) => {
    setActiveId(node.id);
    const item: StackItem = { level: node.level, id: node.id, title: node.title };
    if (node.level === "category") {
      setStack([item]);
      return;
    }
    if (node.level === "sub") {
      setStack((prev) => [prev[0], item]);
      return;
    }
    if (node.level === "ss1") {
      setStack((prev) => [prev[0], prev[1], item]);
      return;
    }
    if (node.level === "ss2") {
      setStack((prev) => [prev[0], prev[1], prev[2], item]);
      return;
    }
    if (node.level === "ss3") {
      setStack((prev) => [...prev.slice(0, 4), item]);
    }
  };

  const onDrill = (node: TreeNode) => {
    if (!node.hasChildren) return;
    const item: StackItem = { level: node.level, id: node.id, title: node.title };
    if (node.level === "category") setStack([item]);
    else if (node.level === "sub") setStack((prev) => [prev[0], item]);
    else if (node.level === "ss1") setStack((prev) => [prev[0], prev[1], item]);
    else if (node.level === "ss2") setStack((prev) => [prev[0], prev[1], prev[2], item]);
  };

  const goToCrumb = (index: number) => {
    if (index < 0) {
      setStack([]);
      setActiveId(null);
      return;
    }
    setStack((prev) => prev.slice(0, index + 1));
    setActiveId(stack[index]?.id ?? null);
  };

  return (
    <div className={`space-y-8 py-6 md:py-10 ${STORE_CONTAINER}`}>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#2D2346]/60 transition hover:text-[#E04672]"
      >
        <ArrowLeft size={16} />
        Retour à l&apos;accueil
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="font-arabic-display text-2xl font-bold md:text-3xl"
            style={{ color: HOME_COLORS.primary }}
          >
            التصنيفات
          </p>
          <p
            className="mt-1 text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: HOME_COLORS.primary }}
          >
            {fr.navCategories}
          </p>
          <h1 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
            Arbre des catégories
          </h1>
        </div>
        <TreeStructure size={36} weight="duotone" className="text-[#E04672]/40" />
      </div>

      {/* Breadcrumb tree path */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => goToCrumb(-1)}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
            !stack.length
              ? "bg-[#E04672] text-white"
              : "bg-[#FFF0F4] text-[#2D2346]/70 hover:text-[#E04672]"
          }`}
        >
          <House size={14} weight="bold" />
          Toutes
        </button>
        {stack.map((item, i) => (
          <span key={item.id} className="flex items-center gap-1.5">
            <CaretRight size={12} className="text-[#E04672]/50" />
            <button
              type="button"
              onClick={() => goToCrumb(i)}
              className={`max-w-[9rem] truncate rounded-full px-3 py-1.5 font-medium transition ${
                i === stack.length - 1
                  ? "bg-[#E04672] text-white"
                  : "bg-[#FFF0F4] text-[#2D2346]/70 hover:text-[#E04672]"
              }`}
            >
              {item.title}
            </button>
          </span>
        ))}
      </nav>

      {/* Tree connector + current level */}
      <div className="relative">
        {parentTitle && stack.length > 0 && (
          <div className="mb-4 flex flex-col items-center">
            <div className="rounded-[1.25rem] border-2 border-[#E04672]/25 bg-[#FFF0F4] px-5 py-2.5 text-sm font-semibold text-[#E04672]">
              {parentTitle}
            </div>
            <div className="h-6 w-0.5 bg-[#E04672]/25" aria-hidden />
            <div className="h-0.5 w-full max-w-md bg-[#E04672]/15" aria-hidden />
          </div>
        )}

        {loadingTree ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#FFF0F4]" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <p className="text-sm text-[#2D2346]/60">Aucune sous-catégorie ici.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {children.map((node) => (
              <TreeNodeCard
                key={node.id}
                node={node}
                active={activeId === node.id}
                onSelect={() => onNodeClick(node)}
                onDrill={() => onDrill(node)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Products for selected branch */}
      {stack.length > 0 && (
        <section className="space-y-6 border-t border-[#E04672]/10 pt-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E04672]">
              Produits
            </p>
            <h2 className="mt-1 font-display text-2xl text-[#2D2346] md:text-3xl">
              {stack.map((s) => s.title).join(" › ")}
            </h2>
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              <ProductGridSkeletons count={4} />
            </div>
          ) : null}

          {!loading && items.length === 0 && (
            <p className="text-sm text-[#2D2346]/60">Aucun produit dans cette sélection.</p>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-8" />
        </section>
      )}
    </div>
  );
}
