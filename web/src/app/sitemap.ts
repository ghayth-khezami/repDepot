import type { MetadataRoute } from "next";
import { fetchAllCategories, fetchAllProductIds, fetchPublishedMarks } from "@/lib/server-api";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/produits`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/magasin`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  try {
    const [categories, products, marks] = await Promise.all([
      fetchAllCategories(),
      fetchAllProductIds(),
      fetchPublishedMarks(),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${base}/categories/${c.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    const markEntries: MetadataRoute.Sitemap = marks.map((m) => ({
      url: `${base}/marques/${m.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...categoryEntries, ...productEntries, ...markEntries];
  } catch {
    return staticRoutes;
  }
}
