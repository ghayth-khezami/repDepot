import {
  ApiPaginated,
  AuthUser,
  Category,
  CategoryHierarchyNode,
  ClientProfile,
  CheckoutCommandPayload,
  Product,
  SubCategory,
  SubSubCategory1,
  SubSubCategory2,
  SubSubCategory3,
  ClientFeedback,
  Mark,
} from "@/types";
import { getClientApiUrl, getRemoteApiUrl } from "@/lib/api-url";

const API_URL = getClientApiUrl();
const REMOTE_API_URL = getRemoteApiUrl();

type HttpMethod = "GET" | "POST" | "DELETE";

async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `API inaccessible (${API_URL}). Démarrez le serveur Nest sur le port 3000.`,
    );
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCategories: async () => {
    const all: Category[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await request<ApiPaginated<Category>>(`/categories?limit=10&page=${page}`);
      all.push(...res.data);
      totalPages = res.meta.totalPages;
      page += 1;
    }
    return all;
  },
  getCategoryHierarchy: () => request<CategoryHierarchyNode[]>("/categories/hierarchy"),
  getSubCategories: (opts?: { page?: number; limit?: number; categoryId?: string }) => {
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(Math.min(Math.max(Number(opts?.limit ?? 10), 1), 50)),
    });
    if (opts?.categoryId) params.set("categoryId", opts.categoryId);
    return request<ApiPaginated<SubCategory>>(`/sub-categories?${params.toString()}`);
  },
  getSubSubCategories1: (opts?: { page?: number; limit?: number; subCategoryId?: string }) => {
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(Math.min(Math.max(Number(opts?.limit ?? 10), 1), 50)),
    });
    if (opts?.subCategoryId) params.set("subCategoryId", opts.subCategoryId);
    return request<ApiPaginated<SubSubCategory1>>(`/sub-sub-categories-1?${params.toString()}`);
  },
  getSubSubCategories2: (opts?: { page?: number; limit?: number; subSubCategory1Id?: string }) => {
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(Math.min(Math.max(Number(opts?.limit ?? 10), 1), 50)),
    });
    if (opts?.subSubCategory1Id) params.set("subSubCategory1Id", opts.subSubCategory1Id);
    return request<ApiPaginated<SubSubCategory2>>(`/sub-sub-categories-2?${params.toString()}`);
  },
  getSubSubCategories3: (opts?: { page?: number; limit?: number; subSubCategory2Id?: string }) => {
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(Math.min(Math.max(Number(opts?.limit ?? 10), 1), 50)),
    });
    if (opts?.subSubCategory2Id) params.set("subSubCategory2Id", opts.subSubCategory2Id);
    return request<ApiPaginated<SubSubCategory3>>(`/sub-sub-categories-3?${params.toString()}`);
  },
  getCategory: (id: string) =>
    request<
      Category & {
        subCategories?: Array<SubCategory & { _count?: { products: number } }>;
      }
    >(`/categories/${id}`),
  getProductsPage: (
    opts?: {
      page?: number;
      limit?: number;
      categoryId?: string;
      subCategoryId?: string;
      subSubCategory1Id?: string;
      subSubCategory2Id?: string;
      subSubCategory3Id?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
    },
    token?: string | null,
  ) => {
    const safeLimit = Math.min(Math.max(Number(opts?.limit ?? 10), 1), 10);
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(safeLimit),
    });
    if (opts?.categoryId) params.set("categoryId", opts.categoryId);
    if (opts?.subCategoryId) params.set("subCategoryId", opts.subCategoryId);
    if (opts?.subSubCategory1Id) params.set("subSubCategory1Id", opts.subSubCategory1Id);
    if (opts?.subSubCategory2Id) params.set("subSubCategory2Id", opts.subSubCategory2Id);
    if (opts?.subSubCategory3Id) params.set("subSubCategory3Id", opts.subSubCategory3Id);
    if (opts?.search) params.set("search", opts.search);
    if (opts?.minPrice !== undefined) params.set("minPrice", String(opts.minPrice));
    if (opts?.maxPrice !== undefined) params.set("maxPrice", String(opts.maxPrice));
    if (opts?.sort) params.set("sort", opts.sort);
    return request<ApiPaginated<Product>>(`/products?${params.toString()}`, "GET", undefined, token);
  },
  getFeaturedProducts: () => request<Product[]>("/products/featured"),
  getProduct: (id: string, token?: string | null) =>
    request<Product>(`/products/${id}`, "GET", undefined, token),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: AuthUser }>("/auth/login", "POST", {
      email,
      password,
    }),
  register: (email: string, password: string, username?: string) =>
    request<{ message: string }>("/auth/register", "POST", {
      email,
      password,
      username,
    }),
  verifyRegister: (email: string, code: string) =>
    request<{ access_token: string; user: AuthUser }>("/auth/verify", "POST", { email, code }),
  findClients: (token: string, search: string) =>
    request<ApiPaginated<ClientProfile>>(
      `/clients?page=1&limit=10&search=${encodeURIComponent(search)}`,
      "GET",
      undefined,
      token,
    ),
  createClient: (token: string, payload: Omit<ClientProfile, "id">) =>
    request<ClientProfile>("/clients", "POST", payload, token),
  getClientHistory: (token: string, clientId: string) =>
    request<Array<Record<string, unknown>>>(`/clients/${clientId}/commands`, "GET", undefined, token),
  createCommand: (token: string, payload: CheckoutCommandPayload) =>
    request<Record<string, unknown>>("/commands/checkout", "POST", payload, token),
  createCommandAsGuest: (payload: CheckoutCommandPayload) =>
    request<Record<string, unknown>>("/commands/checkout", "POST", payload),
  googleLogin: (idToken: string, intent?: "CLIENT" | "DEPOSER") =>
    request<{ access_token: string; user: AuthUser }>("/auth/google", "POST", {
      idToken,
      intent,
    }),
  createDepositRequest: async (
    payload: {
      fullName: string;
      phoneNumber: string;
      proposedPrice: number;
      message?: string;
      photos: File[];
    },
    token?: string | null,
  ) => {
    const formData = new FormData();
    formData.append("fullName", payload.fullName);
    formData.append("phoneNumber", payload.phoneNumber);
    formData.append("proposedPrice", String(payload.proposedPrice));
    if (payload.message) formData.append("message", payload.message);
    payload.photos.forEach((file) => formData.append("photos", file));

    const path = token ? "/deposit-requests/me" : "/deposit-requests";
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  getMyDepositRequests: (token: string) =>
    request<unknown[]>(`/deposit-requests/me`, "GET", undefined, token),
  checkLikedProducts: (token: string, productIds: string[]) =>
    request<{ likedIds: string[] }>("/likes/check", "POST", { productIds }, token),
  getLikedProductsPage: (token: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: String(opts?.limit ?? 12),
    });
    return request<ApiPaginated<Product>>(`/likes/me?${params.toString()}`, "GET", undefined, token);
  },
  likeProduct: (token: string, productId: string) =>
    request<{ liked: true }>(`/likes/${productId}`, "POST", undefined, token),
  unlikeProduct: (token: string, productId: string) =>
    request<{ liked: false }>(`/likes/${productId}`, "DELETE", undefined, token),
  getClientFeedbacks: () => request<ClientFeedback[]>("/client-feedbacks"),
  getMarks: () => request<Mark[]>("/marks/published"),
  subscribeNewsletter: (email: string) =>
    request<{ id: string; email: string }>("/newsletter/subscribe", "POST", { email }),
  getStoreHours: () =>
    request<
      Array<{
        id: string;
        weekday: string;
        isClosed: boolean;
        openTime: string | null;
        closeTime: string | null;
      }>
    >("/store-hours"),
  getHeroSlides: () =>
    request<
      Array<{
        id: string;
        imageDoc: string;
        imageAlt: string;
        sortOrder: number;
        isPublished: boolean;
        imageOnly: boolean;
        arabicWelcome?: string | null;
        title?: string | null;
        subtitle?: string | null;
        description?: string | null;
        ctaLabel?: string | null;
        ctaHref?: string | null;
        ctaType?: string | null;
        align?: string | null;
      }>
    >("/hero-carousel-slides/published"),
  getSiteSettings: () =>
    request<{ youtubeUrl: string | null }>("/site-settings/public"),
  normalizePhotoUrl: (photo?: string | null) => {
    if (!photo) return "";
    if (photo.startsWith("http")) {
      // Optimize Cloudinary delivery: insert auto format/quality transformation if missing
      try {
        const url = new URL(photo);
        if (url.hostname.endsWith("res.cloudinary.com") && url.pathname.includes("/upload/")) {
          const afterUpload = url.pathname.split("/upload/")[1] || "";
          // If transformations already present (e.g., contain f_auto or q_auto), return as-is
          if (!/f_auto|q_auto/.test(afterUpload)) {
            const newPath = url.pathname.replace("/upload/", "/upload/q_auto,f_auto/");
            return `${url.protocol}//${url.host}${newPath}${url.search}${url.hash}`;
          }
        }
      } catch {
        // ignore URL parsing errors and fall back to original
      }
      return photo;
    }
    const base = API_URL === "/api-proxy" ? REMOTE_API_URL : API_URL;
    return `${base}${photo.startsWith("/") ? photo : `/${photo}`}`;
  },
};
