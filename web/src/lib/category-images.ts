import { api } from "@/lib/api";
import { Category } from "@/types";

const COVER_BY_NAME: Record<string, string> = {
  jouets: "/cat-jouets.jpg",
  vetements: "/cat-vetements.jpg",
  vêtements: "/cat-vetements.jpg",
  poussettes: "/cat-poussettes.jpg",
  accessoires: "/cat-maman.jpg",
  "chambre bébé": "/cat-poussettes.jpg",
  "chambre enfant": "/cat-poussettes.jpg",
  "éveil et jeux": "/cat-jouets.jpg",
  "eveil et jeux": "/cat-jouets.jpg",
  puériculture: "/cat-maman.jpg",
  puericulture: "/cat-maman.jpg",
  maman: "/cat-maman.jpg",
  equipement: "/cat-maman.jpg",
  équipement: "/cat-maman.jpg",
};

export function getCategoryCoverImage(categoryName: string): string {
  const key = categoryName.toLowerCase().trim();
  for (const [part, src] of Object.entries(COVER_BY_NAME)) {
    if (key.includes(part)) return src;
  }
  return "/cat-jouets.jpg";
}

export function getCategoryCardImage(category: Category): string {
  if (category.coverDoc) {
    const url = api.normalizePhotoUrl(category.coverDoc);
    if (url) return url;
  }
  if (
    category.icon &&
    (category.icon.startsWith("/uploads") || category.icon.startsWith("http"))
  ) {
    const url = api.normalizePhotoUrl(category.icon);
    if (url) return url;
  }
  return getCategoryCoverImage(category.categoryName);
}
