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
    title: "Produits vérifiés",
    description: "Qualité & sécurité avant tout",
  },
  {
    icon: Truck,
    title: "Livraison rapide",
    description: "Partout en Tunisie",
  },
  {
    icon: Heart,
    title: "Pensé pour bébé",
    description: "Douceur, sécurité et tendance",
  },
  {
    icon: Medal,
    title: "Marques de confiance",
    description: "Les meilleurs choix pour votre bébé",
  },
];

export type HeroSlideData = {
  id: string;
  image: string;
  imageAlt: string;
  arabicWelcome?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  description: string;
  cta: { type: "link" | "phone"; label: string; href?: string };
  align?: "start" | "center";
};

export const HERO_SLIDES: HeroSlideData[] = [
  {
    id: "welcome",
    image: "/header.png",
    imageAlt: "Mme Khezami avec bébé dans la boutique Bébé Dépôt",
    arabicWelcome: "مرحبا بكم في",
    title: "Bébé Dépôt",
    subtitle: "by Mme Khezami",
    description:
      "Des produits de qualité, sélectionnés avec soin pour accompagner les mamans et leurs bébés à chaque étape.",
    cta: { type: "link", label: "Découvrir la boutique", href: "/produits" },
  },
  {
    id: "sell-ar",
    image: "/header2.png",
    imageAlt: "Façade de la boutique Bébé Dépôt",
    title: "كان عندك حوايج متع صغار\nوتحب تبيعهم ؟",
    titleClassName: "font-arabic-display text-3xl font-semibold leading-snug md:text-4xl lg:text-[2.75rem]",
    description: "إتصل بينا و أحنا نتكفلوا بالباقي.",
    cta: { type: "phone", label: "55 863 578" },
    align: "center",
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
] as const;

export const STORE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10";
