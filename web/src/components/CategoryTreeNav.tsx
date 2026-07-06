"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { Category } from "@/types";
import { api } from "@/lib/api";
import { getCategoryCardImage } from "@/lib/category-images";
import { HOME_COLORS } from "@/lib/home";

type Path = { sub?: string; ss1?: string; ss2?: string; ss3?: string };
type Theme = "drawer" | "panel";

const themeStyles = {
  drawer: {
    card: "border-white/12 bg-white/8",
    cardHover: "hover:bg-white/8",
    title: "text-white",
    muted: "text-white/55",
    icon: "text-white/60",
    divider: "border-white/10",
    line: "bg-white/18",
    branchLine: "border-white/12",
    link: "text-white/88 hover:bg-white/10",
    expandBtn: "text-white/65 hover:bg-white/10",
    skeleton: "bg-white/10",
    empty: "text-white/70 hover:text-white",
  },
  panel: {
    card: "border-[#E04672]/12 bg-white shadow-[0_4px_16px_rgba(224,70,114,0.06)]",
    cardHover: "hover:bg-[#FFF8FA]",
    title: "text-[#2D2346]",
    muted: "text-[#2D2346]/55",
    icon: "text-[#E04672]/60",
    divider: "border-[#E04672]/8",
    line: "bg-[#E04672]/15",
    branchLine: "border-[#E04672]/12",
    link: "text-[#2D2346]/85 hover:bg-[#FFF0F4]",
    expandBtn: "text-[#E04672]/70 hover:bg-[#FFF0F4]",
    skeleton: "bg-[#FFF0F4]",
    empty: "text-[#2D2346]/65 hover:text-[#E04672]",
  },
} as const;

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
  theme,
}: {
  id: string;
  title: string;
  depth: 1 | 2 | 3 | 4;
  categoryId: string;
  path: Path;
  theme: Theme;
}) {
  const s = themeStyles[theme];
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
        setChildren(res.data.map((x) => ({ id: x.id, title: x.title })));
      } else if (depth === 2) {
        const res = await api.getSubSubCategories2({ subSubCategory1Id: id, limit: 50, page: 1 });
        setChildren(res.data.map((x) => ({ id: x.id, title: x.title })));
      } else if (depth === 3) {
        const res = await api.getSubSubCategories3({ subSubCategory2Id: id, limit: 50, page: 1 });
        setChildren(res.data.map((x) => ({ id: x.id, title: x.title })));
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
      <div className={`absolute bottom-0 left-1.5 top-0 w-px ${s.line}`} aria-hidden />
      <div className="relative flex items-center gap-1 py-0.5">
        {canExpand ? (
          <button
            type="button"
            onClick={toggle}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${s.expandBtn}`}
          >
            {loading ? (
              <span className={`h-2 w-2 animate-pulse rounded-full ${s.skeleton}`} />
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
          className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-sm transition ${s.link}`}
        >
          {title}
        </Link>
      </div>

      {open && children.length > 0 && depth < 4 && (
        <div className={`ml-3 border-l pl-1 ${s.branchLine}`}>
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
                theme={theme}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryTreeItem({ category, theme }: { category: Category; theme: Theme }) {
  const s = themeStyles[theme];
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const image = getCategoryCardImage(category);

  useEffect(() => {
    if (!open || subs.length) return;
    setLoading(true);
    api
      .getSubCategories({ categoryId: category.id, limit: 50, page: 1 })
      .then((res) => setSubs(res.data.map((x) => ({ id: x.id, title: x.title }))))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [open, category.id, subs.length]);

  return (
    <div className={`overflow-hidden rounded-2xl border ${s.card}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 p-3 text-left transition ${s.cardHover}`}
      >
        <div
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl p-1.5 ${
            theme === "panel" ? "bg-[#FFF0F4]" : "bg-white/15"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${s.title}`}>{category.categoryName}</p>
          <p className={`text-xs ${s.muted}`}>Sous-catégories</p>
        </div>
        <CaretDown
          size={18}
          weight="bold"
          className={`shrink-0 transition ${s.icon} ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={`border-t px-3 pb-3 pt-2 ${s.divider}`}>
          <Link
            href={`/produits?categoryId=${category.id}`}
            className={`mb-2 block rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wider transition ${
              theme === "panel" ? "text-[#E04672] hover:bg-[#FFF0F4]" : ""
            }`}
            style={theme === "drawer" ? { color: HOME_COLORS.accent } : undefined}
          >
            Tous les produits →
          </Link>
          {loading && (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`h-8 animate-pulse rounded-lg ${s.skeleton}`} />
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
                theme={theme}
              />
            ))}
          {!loading && subs.length === 0 && (
            <Link href={`/categories/${category.id}`} className={`block py-2 text-sm ${s.empty}`}>
              Parcourir la catégorie →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeNav({
  categories,
  theme = "drawer",
}: {
  categories: Category[];
  theme?: Theme;
}) {
  const s = themeStyles[theme];

  if (!categories.length) {
    return <p className={`px-3 py-4 text-sm ${s.muted}`}>Aucune catégorie.</p>;
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <CategoryTreeItem key={cat.id} category={cat} theme={theme} />
      ))}
    </div>
  );
}
