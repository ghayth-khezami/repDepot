import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";
import { photoAbsoluteUrl } from "@/lib/server-api";

export function defaultOpenGraph(path = "/", title?: string, description?: string, image?: string) {
  const url = absoluteUrl(path);
  const images = image ? [{ url: image, width: 1200, height: 630, alt: title || SITE_NAME }] : undefined;
  return {
    type: "website" as const,
    locale: "fr_TN",
    siteName: SITE_NAME,
    title: title || SITE_NAME,
    description: description || SITE_DESCRIPTION,
    url,
    images,
  };
}

export function buildProductMetadata(product: {
  id: string;
  productName: string;
  description?: string | null;
  PrixVente: number;
  photos?: Array<{ photoDoc: string }>;
}): Metadata {
  const title = `${product.productName} — ${SITE_NAME}`;
  const description =
    product.description?.slice(0, 160) ||
    `${product.productName} à ${product.PrixVente.toFixed(2)} TND. Boutique bébé Bébé Dépôt, livraison Tunisie.`;
  const image = photoAbsoluteUrl(product.photos?.[0]?.photoDoc);
  const path = `/products/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: defaultOpenGraph(path, title, description, image || undefined),
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function productJsonLd(product: {
  id: string;
  productName: string;
  description?: string | null;
  PrixVente: number;
  stockQuantity?: number;
  isDispo?: boolean;
  photos?: Array<{ photoDoc: string }>;
  category?: { categoryName?: string };
}) {
  const image = photoAbsoluteUrl(product.photos?.[0]?.photoDoc);
  const inStock = product.isDispo !== false && (product.stockQuantity ?? 0) > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.productName,
    description: product.description || product.productName,
    image: image ? [image] : undefined,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category?.categoryName,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.id}`),
      priceCurrency: "TND",
      price: product.PrixVente,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}
