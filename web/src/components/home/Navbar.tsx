"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";
import { LOGO_SRC } from "@/lib/fr";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/social";
import { AnnouncementBar } from "./AnnouncementBar";

const NAV = [
  { href: "/", label: "Accueil", match: (p: string) => p === "/" },
  { href: "/produits", label: "Produits", match: (p: string) => p.startsWith("/produits") },
  { href: "/#categories", label: "Catégories", match: () => false },
  { href: "/magasin", label: "Magasin", match: (p: string) => p === "/magasin" },
  { href: "/#trust", label: "À propos", match: () => false },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { cart } = useShop();
  const fx = useAddToCartFx();
  const cartRef = useRef<HTMLAnchorElement>(null);
  const cartCount = cart.length;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fx.setCartEl(cartRef.current);
  }, [fx]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <AnnouncementBar />

      <div className="border-b border-white/60 bg-white/80 px-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3 md:py-3.5">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
            <Image
              src={LOGO_SRC}
              alt="Bébé Dépôt"
              width={44}
              height={44}
              className="h-10 w-10 rounded-full object-contain md:h-11 md:w-11"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base text-[#2D2346] md:text-lg">
                Bébé Dépôt
              </p>
              <p className="truncate font-script text-sm text-[#FF8DAA] md:text-base">
                by Mme Khezami
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "text-[#8D6BFF]" : "text-[#2D2346]/70 hover:text-[#2D2346]"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#FF8DAA]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <a
              href={`tel:${STORE_PHONE_TEL}`}
              className="hidden items-center gap-2 rounded-full bg-[#8D6BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(141,107,255,0.2)] transition hover:brightness-105 lg:inline-flex"
            >
              <Phone size={15} />
              {STORE_PHONE_DISPLAY}
            </a>

            <Link
              ref={cartRef}
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#8D6BFF]/12 bg-[#F7F2FF]/80 text-[#2D2346] transition hover:border-[#8D6BFF]/25"
              aria-label="Panier"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D6D] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:block">
              <UserMenuDropdown />
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#8D6BFF]/12 bg-white text-[#2D2346] lg:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="border-b border-[#8D6BFF]/10 bg-white/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#2D2346]/80 hover:bg-[#F7F2FF]"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={`tel:${STORE_PHONE_TEL}`}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#8D6BFF] px-4 py-3 text-sm font-semibold text-white"
            >
              <Phone size={15} />
              {STORE_PHONE_DISPLAY}
            </a>
          </nav>
        </div>
      )}
    </motion.header>
  );
}
