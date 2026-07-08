import type { ApiPaginated, Category, Mark, Product } from "@/types";
import { getSiteUrl } from "@/lib/site";
import { getServerApiUrl } from "@/lib/api-url";

const API_URL = getServerApiUrl();

async function serverFetch<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export function photoAbsoluteUrl(photo?: string | null): string {
  if (!photo) return "";
  if (photo.startsWith("http")) return photo;
  return `${API_URL}${photo.startsWith("/") ? photo : `/${photo}`}`;
}

export async function fetchProduct(id: string): Promise<Product | null> {
  try {
    return await serverFetch<Product>(`/products/${id}`, 120);
  } catch {
    return null;
  }
}

export async function fetchCategory(id: string) {
  try {
    return await serverFetch<Category & { subCategories?: unknown[] }>(`/categories/${id}`, 600);
  } catch {
    return null;
  }
}

export async function fetchMark(id: string): Promise<Mark | null> {
  try {
    return await serverFetch<Mark>(`/marks/${id}`, 600);
  } catch {
    return null;
  }
}

export async function fetchAllCategories(): Promise<Category[]> {
  const all: Category[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await serverFetch<ApiPaginated<Category>>(`/categories?limit=10&page=${page}`, 3600);
    all.push(...res.data);
    totalPages = res.meta.totalPages;
    page += 1;
  }
  return all;
}

export async function fetchAllProductIds(): Promise<Array<{ id: string; updatedAt?: string }>> {
  const all: Array<{ id: string; updatedAt?: string }> = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 50) {
    const res = await serverFetch<ApiPaginated<Product>>(`/products?limit=10&page=${page}`, 3600);
    all.push(...res.data.map((p) => ({ id: p.id, updatedAt: p.updatedAt })));
    totalPages = res.meta.totalPages;
    page += 1;
  }
  return all;
}

export async function fetchPublishedMarks(): Promise<Mark[]> {
  try {
    return await serverFetch<Mark[]>("/marks/published", 3600);
  } catch {
    return [];
  }
}

export { getSiteUrl };
