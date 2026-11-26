import type { CategoryHierarchyNode } from "@/types";

export const SHOP_AGES = [
  { slug: "4plus", labelLine1: "04 Ans", labelLine2: "Et plus" },
  { slug: "2-3", labelLine1: "2-3", labelLine2: "Ans" },
  { slug: "12-24", labelLine1: "12-24", labelLine2: "M" },
  { slug: "6-12", labelLine1: "6-12", labelLine2: "M" },
  { slug: "0-6", labelLine1: "0-6", labelLine2: "M" },
] as const;

export type ShopAgeSlug = (typeof SHOP_AGES)[number]["slug"];

export const AGE_MATCH_TITLES: Record<ShopAgeSlug, string[]> = {
  "0-6": ["0-3 mois", "3-6 mois", "0-6 mois", "0-6"],
  "6-12": ["6-9 mois", "9-12 mois", "6-12 mois", "6-12"],
  "12-24": ["12-24 mois", "12-24"],
  "2-3": ["24-36 mois", "2-3 ans", "2 ans", "3 ans"],
  "4plus": ["4 ans", "5 ans", "6 ans", "4 ans et plus"],
};

export function shopAgeHref(slug: ShopAgeSlug) {
  return `/produits?age=${encodeURIComponent(slug)}`;
}

export function isShopAgeSlug(value: string | null | undefined): value is ShopAgeSlug {
  return SHOP_AGES.some((age) => age.slug === value);
}

function titleMatches(title: string, needles: string[]) {
  const normalized = title.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()) || needle.toLowerCase().includes(normalized));
}

export function resolveAgeFilter(tree: CategoryHierarchyNode[], slug: ShopAgeSlug) {
  const needles = AGE_MATCH_TITLES[slug];
  for (const category of tree) {
    for (const sub of category.subCategories ?? []) {
      for (const ss1 of sub.subSubCategories1 ?? []) {
        if (titleMatches(ss1.title, needles)) {
          return {
            categoryId: category.id,
            subCategoryId: sub.id,
            subSubCategory1Id: ss1.id,
          };
        }
      }
    }
  }
  return { search: needles[0] };
}
