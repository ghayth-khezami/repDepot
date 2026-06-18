"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, ClipboardList, User } from "lucide-react";
import { useShop } from "@/context/ShopContext";

function Tab({
  href,
  label,
  active,
  children,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
        active ? "text-white" : "text-white/65"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`rounded-2xl px-3 py-1 ${active ? "bg-white/15" : ""}`}>{children}</span>
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="absolute right-5 top-1 rounded-full bg-white px-1.5 text-[10px] font-black text-slate-900">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { cart } = useShop();
  const cartCount = cart.length;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-6xl px-4 md:hidden">
      <div className="mb-3 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-[0_18px_70px_-46px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="flex items-stretch">
          <Tab href="/" label="Accueil" active={pathname === "/"}>
            <Home size={18} />
          </Tab>
          <Tab href="/cart" label="Panier" active={pathname?.startsWith("/cart")} badge={cartCount}>
            <ShoppingCart size={18} />
          </Tab>
          <Tab href="/history" label="Commandes" active={pathname?.startsWith("/history")}>
            <ClipboardList size={18} />
          </Tab>
          <Tab href="/login" label="Compte" active={pathname?.startsWith("/login")}>
            <User size={18} />
          </Tab>
        </div>
      </div>
    </div>
  );
}

