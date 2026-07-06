"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CaretDown, CaretRight, ArrowLeft } from "@phosphor-icons/react";
import { Category } from "@/types";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";
import { useShop } from "@/context/ShopContext";

type Path = { sub?: string; ss1?: string; ss2?: string; ss3?: string };

function buildHref(categoryId: string, path: Path) {
  const params = new URLSearchParams({ categoryId });
  if (path.sub) params.set("subCategoryId", path.sub);
  if (path.ss1) params.set("subSubCategory1Id", path.ss1);
  if (path.ss2) params.set("subSubCategory2Id", path.ss2);
  if (path.ss3) params.set("subSubCategory3Id", path.ss3);
  return `/produits?${params.toString()}`;
}

function TreeBranch({
  id,
  title,
  depth,
  categoryId,
  path,
}: {
  id: string;
  title: string;
  depth: 1 | 2 | 3 | 4;
  categoryId: string;
  path: Path;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const href = buildHref(categoryId, path);
  const canExpand = depth < 4;

  const loadChildren = useCallback(async () => {
    if (children.length || loading) return;
    setLoading(true);
    try {
      if (depth === 1) {
        const res = await api.getSubSubCategories1({ subCategoryId: id, limit: 50, page: 1 });
        setChildren(res.data.map((s) => ({ id: s.id, title: s.title })));
      } else if (depth === 2) {
        const res = await api.getSubSubCategories2({ subSubCategory1Id: id, limit: 50, page: 1 });
        setChildren(res.data.map((s) => ({ id: s.id, title: s.title })));
      } else if (depth === 3) {
        const res = await api.getSubSubCategories3({ subSubCategory2Id: id, limit: 50, page: 1 });
        setChildren(res.data.map((s) => ({ id: s.id, title: s.title })));
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [children.length, depth, id, loading]);

  const toggle = () => {
    if (!open && canExpand) void loadChildren();
    setOpen((v) => !v);
  };

  const childDepth = (depth + 1) as 2 | 3 | 4 | 5;

  return (
    <div className="ml-3 border-l-2 border-[#E04672]/12 pl-3">
      <div className="flex items-center gap-2 py-1">
        {canExpand ? (
          <button
            type="button"
            onClick={toggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#E04672]/70 transition hover:bg-[#FFF0F4]"
          >
            {loading ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#E04672]/40" />
            ) : open ? (
              <CaretDown size={14} weight="bold" />
            ) : (
              <CaretRight size={14} weight="bold" />
            )}
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <Link
          href={href}
          className="min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-sm font-medium text-[#2D2346]/85 transition hover:bg-[#FFF0F4] hover:text-[#E04672]"
        >
          {title}
        </Link>
      </div>

      {open && children.length > 0 && canExpand && (
        <div className="space-y-0.5 pb-1">
          {children.map((child) => {
            const nextPath: Path = { ...path };
            if (depth === 1) nextPath.ss1 = child.id;
            else if (depth === 2) nextPath.ss2 = child.id;
            else if (depth === 3) nextPath.ss3 = child.id;

            return (
              <TreeBranch
                key={child.id}
                id={child.id}
                title={child.title}
                depth={childDepth as 1 | 2 | 3 | 4}
                categoryId={categoryId}
                path={nextPath}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryAccordion({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const image = getCategoryCardImage(category);

  useEffect(() => {
    if (!open || subs.length) return;
    setLoading(true);
    api
      .getSubCategories({ categoryId: category.id, limit: 50, page: 1 })
      .then((res) => setSubs(res.data.map((s) => ({ id: s.id, title: s.title }))))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [open, category.id, subs.length]);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#E04672]/10 bg-white shadow-[0_8px_32px_rgba(45,35,70,0.06)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-[#FFFDFB] md:p-5"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl md:h-20 md:w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-arabic-display text-lg font-semibold text-[#2D2346] md:text-xl">
            {category.categoryName}
          </p>
          <p className="mt-0.5 text-xs text-[#2D2346]/55">
            {open ? "Masquer les sous-catégories" : "Voir toutes les sous-catégories"}
          </p>
        </div>
        <CaretDown
          size={20}
          weight="bold"
          className={`shrink-0 text-[#E04672]/60 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[#E04672]/8 px-4 pb-5 pt-3 md:px-5">
          <Link
            href={`/produits?categoryId=${category.id}`}
            className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:brightness-105"
            style={{ backgroundColor: HOME_COLORS.primary }}
          >
            Tous les produits →
          </Link>

          {loading && (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-[#FFF0F4]" />
              ))}
            </div>
          )}

          {!loading &&
            subs.map((sub) => (
              <TreeBranch
                key={sub.id}
                id={sub.id}
                title={sub.title}
                depth={1}
                categoryId={category.id}
                path={{ sub: sub.id }}
              />
            ))}

          {!loading && subs.length === 0 && (
            <Link
              href={`/categories/${category.id}`}
              className="block py-2 text-sm text-[#E04672] hover:underline"
            >
              Parcourir la catégorie →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

export function CategoriesPageClient() {
  const { categories } = useShop();

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
          Parcourez toutes nos catégories
        </h1>
        <p className="mt-2 max-w-lg text-sm text-[#2D2346]/65">
          De la catégorie principale jusqu&apos;aux sous-niveaux — trouvez rapidement ce qu&apos;il
          vous faut pour bébé.
        </p>
      </div>

      {!categories.length ? (
        <p className="text-sm text-[#2D2346]/60">Aucune catégorie disponible.</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <CategoryAccordion key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </div>
  );
}
