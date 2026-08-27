"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useShop } from "@/context/ShopContext";

const TABS = [
  { href: "/", label: "Accueil", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/produits",
    label: "Produits",
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/produits"),
  },
  {
    href: "/cart",
    label: "Panier",
    icon: ShoppingCart,
    match: (p: string) => p === "/cart",
    badge: true,
  },
  {
    href: "/login",
    label: "Compte",
    icon: User,
    match: (p: string) => p === "/login" || p === "/profile",
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cart } = useShop();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E04672]/10 bg-white/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Navigation mobile"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badge = "badge" in tab && tab.badge ? cart.length : 0;

          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className={`relative flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition ${
                active ? "text-[#E04672]" : "text-[#2D2346]/55"
              }`}
            >
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  active ? "bg-[#FFF0F4]" : ""
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B8A] px-1 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
