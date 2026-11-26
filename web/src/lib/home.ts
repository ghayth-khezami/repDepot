import type { Icon } from "@phosphor-icons/react";

export const HOME_COLORS = {
  primary: "#E04672",
  secondary: "#FFF0F4",
  accent: "#FF6B8A",
  background: "#FFFDFB",
  text: "#2D2346",
} as const;

export const FLOATING_STICKERS = [
  "/sticker 2.png",
  "/sticker 3.png",
  "/sticker 4.png",
  "/sticker 5.png",
  "/sticker 6.png",
  "/sticker 7.png",
  "/stiker 8.png",
  "/sticker 9.png",
  "/sticker 10.png",
  "/sticker 11.png",
  "/sticket 1 .png",
] as const;

/** Large radius used on hero + feature bar (mockup ~28–32px) */
export const HERO_RADIUS = "rounded-[1.75rem] md:rounded-[2rem]";

export type HomeFeature = {
  emoji?: string;
  icon?: Icon;
  title: string;
  description: string;
};

export const HOME_FEATURES: HomeFeature[] = [];

export type TrustItemKey = "CreditCard" | "ArrowCounterClockwise" | "ChatCircleDots" | "ShieldCheck";

export const TRUST_ITEMS: Array<{
  icon: TrustItemKey;
  title: string;
  description: string;
}> = [];

export const FOOTER_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/produits", label: "Produits" },
  { href: "/magasin", label: "Magasin" },
  { href: "/cart", label: "Panier" },
  { href: "/login", label: "Mon compte" },
  { href: "/#categories", label: "Catégories" },
] as const;

export const STORE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10";
