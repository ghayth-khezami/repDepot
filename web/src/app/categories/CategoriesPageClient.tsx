"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeletons } from "@/components/ProductCardSkeleton";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";
import type { CategoryHierarchyNode, CategoryTreeSelection } from "@/types";

function TreeNodeCard({
  title,
  image,
  selected,
  onClick,
  compact = false,
}: {
  title: string;
  image: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group overflow-hidden rounded-[1.25rem] border-2 bg-white text-left shadow-[0_6px_24px_rgba(45,35,70,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(224,70,114,0.12)] ${
        selected
          ? "border-[#E04672] ring-2 ring-[#E04672]/20"
          : "border-[#E04672]/15 hover:border-[#E04672]/40"
      } ${compact ? "w-[7.5rem] sm:w-[8.5rem]" : "w-full max-w-[11rem] sm:max-w-[12rem]"}`}
    >
      <div className={`relative overflow-hidden ${compact ? "h-16" : "h-20 sm:h-24"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[#2D2346]/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5">
          <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
            {title}
          </span>
        </div>
      </div>
      <div className="h-1.5" style={{ backgroundColor: selected ? HOME_COLORS.primary : `${HOME_COLORS.primary}33` }} />
    </button>
  );
}

function VerticalConnector() {
  return <div className="mx-auto h-6 w-0.5 rounded-full bg-[#E04672]/25" aria-hidden />;
}

function HorizontalRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-wrap items-start justify-center gap-3 sm:gap-4">
      <div
        className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-0.5 rounded-full bg-[#E04672]/20"
        aria-hidden
      />
      {children}
    </div>
  );
}

function SubSub3Row({
  nodes,
  image,
  selection,
  base,
  onSelect,
}: {
  nodes: { id: string; title: string }[];
  image: string;
  selection: CategoryTreeSelection | null;
  base: Omit<CategoryTreeSelection, "label" | "subSubCategory3Id">;
  onSelect: (s: CategoryTreeSelection) => void;
}) {
  if (!nodes.length) return null;
  return (
    <div className="mt-2 flex flex-col items-center">
      <VerticalConnector />
      <HorizontalRail>
        {nodes.map((n) => (
          <div key={n.id} className="pt-3">
            <TreeNodeCard
              title={n.title}
              image={image}
              compact
              selected={selection?.subSubCategory3Id === n.id}
              onClick={() =>
                onSelect({
                  ...base,
                  subSubCategory3Id: n.id,
                  label: n.title,
                })
              }
            />
          </div>
        ))}
      </HorizontalRail>
    </div>
  );
}

function SubSub2Column({
  node,
  image,
  selection,
  base,
  onSelect,
}: {
  node: {
    id: string;
    title: string;
    subSubCategories3: { id: string; title: string }[];
  };
  image: string;
  selection: CategoryTreeSelection | null;
  base: Omit<CategoryTreeSelection, "label" | "subSubCategory2Id" | "subSubCategory3Id">;
  onSelect: (s: CategoryTreeSelection) => void;
}) {
  const base2 = { ...base, subSubCategory2Id: node.id };
  return (
    <div className="flex flex-col items-center">
      <TreeNodeCard
        title={node.title}
        image={image}
        compact
        selected={
          selection?.subSubCategory2Id === node.id && !selection?.subSubCategory3Id
        }
        onClick={() => onSelect({ ...base2, label: node.title })}
      />
      <SubSub3Row
        nodes={node.subSubCategories3}
        image={image}
        selection={selection}
        base={base2}
        onSelect={onSelect}
      />
    </div>
  );
}

function SubSub1Column({
  node,
  image,
  selection,
  base,
  onSelect,
}: {
  node: {
    id: string;
    title: string;
    subSubCategories2: Array<{
      id: string;
      title: string;
      subSubCategories3: { id: string; title: string }[];
    }>;
  };
  image: string;
  selection: CategoryTreeSelection | null;
  base: Omit<CategoryTreeSelection, "label" | "subSubCategory1Id" | "subSubCategory2Id" | "subSubCategory3Id">;
  onSelect: (s: CategoryTreeSelection) => void;
}) {
  const base1 = { ...base, subSubCategory1Id: node.id };
  return (
    <div className="flex flex-col items-center">
      <TreeNodeCard
        title={node.title}
        image={image}
        compact
        selected={
          selection?.subSubCategory1Id === node.id &&
          !selection?.subSubCategory2Id &&
          !selection?.subSubCategory3Id
        }
        onClick={() => onSelect({ ...base1, label: node.title })}
      />
      {node.subSubCategories2.length > 0 && (
        <div className="flex flex-col items-center">
          <VerticalConnector />
          <HorizontalRail>
            {node.subSubCategories2.map((ss2) => (
              <div key={ss2.id} className="pt-3">
                <SubSub2Column
                  node={ss2}
                  image={image}
                  selection={selection}
                  base={base1}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </HorizontalRail>
        </div>
      )}
    </div>
  );
}

function CategoryTreeDiagram({
  category,
  selection,
  onSelect,
}: {
  category: CategoryHierarchyNode;
  selection: CategoryTreeSelection | null;
  onSelect: (s: CategoryTreeSelection) => void;
}) {
  const image = getCategoryCardImage(category);
  const subs = category.subCategories ?? [];

  return (
    <div className="cat-hierarchy-tree overflow-x-auto rounded-[1.75rem] border border-[#E04672]/10 bg-gradient-to-b from-[#FFFDFB] to-[#FFF0F4]/40 p-5 sm:p-8">
      <div className="flex min-w-[min(100%,20rem)] flex-col items-center">
        <TreeNodeCard
          title={category.categoryName}
          image={image}
          selected={
            selection?.categoryId === category.id &&
            !selection?.subCategoryId &&
            !selection?.subSubCategory1Id
          }
          onClick={() =>
            onSelect({
              categoryId: category.id,
              label: category.categoryName,
            })
          }
        />

        {subs.length > 0 && (
          <>
            <VerticalConnector />
            <HorizontalRail>
              {subs.map((sub) => (
                <div key={sub.id} className="flex flex-col items-center pt-3">
                  <TreeNodeCard
                    title={sub.title}
                    image={image}
                    compact
                    selected={
                      selection?.subCategoryId === sub.id &&
                      !selection?.subSubCategory1Id
                    }
                    onClick={() =>
                      onSelect({
                        categoryId: category.id,
                        subCategoryId: sub.id,
                        label: sub.title,
                      })
                    }
                  />
                  {(sub.subSubCategories1?.length ?? 0) > 0 && (
                    <div className="flex flex-col items-center">
                      <VerticalConnector />
                      <HorizontalRail>
                        {sub.subSubCategories1.map((ss1) => (
                          <div key={ss1.id} className="pt-3">
                            <SubSub1Column
                              node={ss1}
                              image={image}
                              selection={selection}
                              base={{
                                categoryId: category.id,
                                subCategoryId: sub.id,
                              }}
                              onSelect={onSelect}
                            />
                          </div>
                        ))}
                      </HorizontalRail>
                    </div>
                  )}
                </div>
              ))}
            </HorizontalRail>
          </>
        )}
      </div>
    </div>
  );
}

export function CategoriesPageClient() {
  const [tree, setTree] = useState<CategoryHierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selection, setSelection] = useState<CategoryTreeSelection | null>(null);

  useEffect(() => {
    api
      .getCategoryHierarchy()
      .then((data) => {
        setTree(data);
        if (data[0]) {
          setActiveCategoryId(data[0].id);
          setSelection({ categoryId: data[0].id, label: data[0].categoryName });
        }
      })
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  const activeCategory = useMemo(
    () => tree.find((c) => c.id === activeCategoryId) ?? null,
    [tree, activeCategoryId],
  );

  const productFilters = useMemo(() => {
    if (!selection) return {};
    return {
      categoryId: selection.categoryId,
      subCategoryId: selection.subCategoryId,
      subSubCategory1Id: selection.subSubCategory1Id,
      subSubCategory2Id: selection.subSubCategory2Id,
      subSubCategory3Id: selection.subSubCategory3Id,
    };
  }, [selection]);

  const { items, loading: productsLoading, sentinelRef } = useInfiniteProducts(productFilters);

  const pickCategory = (cat: CategoryHierarchyNode) => {
    setActiveCategoryId(cat.id);
    setSelection({ categoryId: cat.id, label: cat.categoryName });
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

      <div>
        <p
          className="text-xs font-semibold uppercase tracking-[0.24em]"
          style={{ color: HOME_COLORS.primary }}
        >
          {fr.navCategories}
        </p>
        <h1 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
          Parcourez nos catégories
        </h1>
        <p className="mt-2 max-w-lg text-sm text-[#2D2346]/65">
          Choisissez une catégorie, explorez l&apos;arborescence, puis consultez les produits
          associés.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#FFF0F4]" />
          ))}
        </div>
      ) : !tree.length ? (
        <p className="text-sm text-[#2D2346]/60">Aucune catégorie disponible.</p>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {tree.map((cat) => {
              const image = getCategoryCardImage(cat);
              const active = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => pickCategory(cat)}
                  className={`shrink-0 overflow-hidden rounded-[1.35rem] border-2 transition ${
                    active
                      ? "border-[#E04672] shadow-[0_8px_24px_rgba(224,70,114,0.15)]"
                      : "border-[#E04672]/12 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="relative h-20 w-24 sm:h-24 sm:w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2D2346]/70 to-transparent px-2 pb-2 pt-6">
                      <span className="line-clamp-2 text-left text-[10px] font-semibold leading-tight text-white sm:text-xs">
                        {cat.categoryName}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeCategory && (
            <CategoryTreeDiagram
              category={activeCategory}
              selection={selection}
              onSelect={setSelection}
            />
          )}

          {selection && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E04672]/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E04672]">
                    Produits
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-[#2D2346] md:text-3xl">
                    {selection.label}
                  </h2>
                </div>
                <Link
                  href={`/produits?${new URLSearchParams(
                    Object.entries(productFilters).filter(([, v]) => v) as [string, string][],
                  ).toString()}`}
                  className="text-sm font-semibold text-[#E04672] hover:underline"
                >
                  Voir tout →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
                {productsLoading && items.length === 0 && <ProductGridSkeletons count={6} />}
              </div>

              {!productsLoading && items.length === 0 && (
                <p className="py-10 text-center text-sm text-[#2D2346]/55">{fr.noProducts}</p>
              )}
              <div ref={sentinelRef} className="h-8" />
            </section>
          )}
        </>
      )}
    </div>
  );
}
