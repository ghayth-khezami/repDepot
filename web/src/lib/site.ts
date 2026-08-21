export const SITE_NAME = "Bébé Dépôt";

export const SITE_DESCRIPTION =
  "Boutique bébé sélectionnée à la main par Mme Khezami. Produits vérifiés, dépôt-vente et livraison en Tunisie.";

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://bebedepot.tn";
  return url.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
