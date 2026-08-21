import type { Icon } from "@phosphor-icons/react";
import { Heart, Medal, ShieldCheck, Truck } from "@phosphor-icons/react";

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

export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: ShieldCheck,
    title: "Achats sécurisés",
    description: "Articles vérifiés avant chaque mise en vente",
  },
  {
    icon: Truck,
    title: "Paiement à la livraison",
    description: "Payez à réception en toute sérénité",
  },
  {
    icon: Heart,
    title: "Retour facile",
    description: "Échanges simples selon nos conditions",
  },
  {
    icon: Medal,
    title: "Support réactif",
    description: "Une équipe à votre écoute au quotidien",
  },
];

export type HeroSlideData = {
  id: string;
  image: string;
  imageAlt: string;
  imageOnly?: boolean;
  arabicWelcome?: string;
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  description?: string;
  cta?: { type: "link" | "phone"; label: string; href?: string };
  align?: "start" | "center";
};

export const HERO_SLIDES: HeroSlideData[] = [
  {
    id: "welcome",
    image: "/car1.png",
    imageAlt: "Mme Khezami avec bébé dans la boutique Bébé Dépôt",
    arabicWelcome: "مرحبا بكم في",
    title: "Bébé Dépôt",
    subtitle: "by Mme Khezami",
    description:
      "Des produits de qualité, sélectionnés avec soin pour accompagner les mamans et leurs bébés à chaque étape.",
    cta: { type: "link", label: "Découvrir la boutique", href: "/produits" },
  },
  {
    id: "car-2",
    image: "/car2.png",
    imageAlt: "Bébé Dépôt — sélection produits",
    imageOnly: true,
  },
  {
    id: "car-3",
    image: "/car3.png",
    imageAlt: "Bébé Dépôt — sélection produits",
    imageOnly: true,
  },
  {
    id: "car-4",
    image: "/car4.png",
    imageAlt: "Bébé Dépôt — sélection produits",
    imageOnly: true,
  },
  {
    id: "car-5",
    image: "/car5.png",
    imageAlt: "Bébé Dépôt — sélection produits",
    imageOnly: true,
  },
];

export const TRUST_ITEMS = [
  {
    icon: "CreditCard" as const,
    title: "Paiement à la livraison",
    description: "Payez à réception en toute sérénité",
  },
  {
    icon: "ArrowCounterClockwise" as const,
    title: "Retour facile",
    description: "Échanges simples selon nos conditions",
  },
  {
    icon: "ChatCircleDots" as const,
    title: "Support réactif",
    description: "Une équipe à votre écoute au quotidien",
  },
  {
    icon: "ShieldCheck" as const,
    title: "Achats sécurisés",
    description: "Articles vérifiés avant chaque mise en vente",
  },
] as const;

export const FOOTER_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/produits", label: "Produits" },
  { href: "/magasin", label: "Magasin" },
  { href: "/cart", label: "Panier" },
  { href: "/login", label: "Mon compte" },
  { href: "/categories", label: "Catégories" },
] as const;

export const STORE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10";
