"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { Category } from "@/types";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { HOME_COLORS } from "@/lib/home";

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
    if (!open && depth < 4) void loadChildren();
    setOpen((v) => !v);
  };

  const childDepth = (depth + 1) as 2 | 3 | 4 | 5;
  const canExpand = depth < 4;

  return (
    <div className="relative pl-3">
      <div
        className="absolute bottom-0 left-1.5 top-0 w-px bg-white/18"
        aria-hidden
      />
      <div className="relative flex items-center gap-1 py-0.5">
        {canExpand ? (
          <button
            type="button"
            onClick={toggle}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/65 transition hover:bg-white/10"
          >
            {loading ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
            ) : open ? (
              <CaretDown size={12} weight="bold" />
            ) : (
              <CaretRight size={12} weight="bold" />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={href}
          className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-sm text-white/88 transition hover:bg-white/10"
        >
          {title}
        </Link>
      </div>

      {open && children.length > 0 && depth < 4 && (
        <div className="ml-3 border-l border-white/12 pl-1">
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

function CategoryTreeItem({ category }: { category: Category }) {
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
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/8"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/15 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{category.categoryName}</p>
          <p className="text-xs text-white/55">Voir les sous-catégories</p>
        </div>
        <CaretDown
          size={18}
          weight="bold"
          className={`shrink-0 text-white/60 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2">
          <Link
            href={`/produits?categoryId=${category.id}`}
            className="mb-2 block rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wider transition hover:bg-white/10"
            style={{ color: HOME_COLORS.accent }}
          >
            Tous les produits →
          </Link>
          {loading && (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-white/10" />
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
              className="block py-2 text-sm text-white/70 hover:text-white"
            >
              Parcourir la catégorie →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeNav({ categories }: { categories: Category[] }) {
  if (!categories.length) {
    return <p className="px-3 py-4 text-sm text-white/60">Aucune catégorie.</p>;
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <CategoryTreeItem key={cat.id} category={cat} />
      ))}
    </div>
  );
}
