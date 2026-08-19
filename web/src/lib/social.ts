export const STORE_PHONE_DISPLAY = "55 863 578";
export const STORE_PHONE_TEL = "+21655863578";
export const STORE_EMAIL = "contact@bebedepot.tn";

export const SOCIAL = {
  instagram: {
    href: "https://www.instagram.com/bebe_depot_by_mme_khezami/",
    logoSrc: "/insta",
  },
  facebook: {
    href: "https://www.facebook.com/people/B%C3%A9b%C3%A9-d%C3%A9p%C3%B4t-by-Mme-Khezami/61580299927872/?locale=fr_CA#",
    logoSrc: "/fb",
  },
  tiktok: {
    href: "https://www.tiktok.com/@bbdepot.by.mme.kh",
    logoSrc: "/tiktok.png",
  },
  whatsapp: {
    href: "https://wa.me/21655863578",
    logoSrc: "/whatsapp",
  },
} as const;

export const STORE_LAT = 36.808611;
export const STORE_LON = 10.076833;

/** Google Maps embed: set NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC in .env to the iframe src from Maps → Partager → Intégrer une carte. */
export function getGoogleMapsEmbedSrc(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC?.trim();
  if (fromEnv) return fromEnv;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${STORE_LAT},${STORE_LON}&zoom=17&language=fr`;
  }
  return `https://maps.google.com/maps?q=${STORE_LAT},${STORE_LON}&z=17&hl=fr&output=embed`;
}

export function getGoogleMapsOpenUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${STORE_LAT},${STORE_LON}`;
}
