"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Moon, ShoppingCart, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useShop } from "@/context/ShopContext";

export function Navbar() {
  const router = useRouter();
  const { cart, user, logout } = useShop();
  const cartCount = cart.length;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  return (
    <header className="sticky top-0 z-30">
      <nav className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-3xl border border-white/15 bg-white/10 px-4 py-3 shadow-[0_18px_70px_-46px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            router.push("/");
          }}
          className="inline-flex cursor-pointer items-center gap-2"
        >
          <Image src="/depot.jpg" alt="Bebe-Depot logo" width={34} height={34} className="rounded-full border border-white/15" />
          <span className="text-lg font-extrabold tracking-tight text-white">Bebe-Depot</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-white shadow-sm backdrop-blur hover:bg-white/15"
            aria-label="Basculer theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link href="/" className="hidden md:inline-flex px-2 py-1 text-white/80 hover:text-white">
            Accueil
          </Link>
          <Link href="/history" className="hidden md:inline-flex px-2 py-1 text-white/80 hover:text-white">
            Commandes
          </Link>
          <Link
            href="/cart"
            id="cart-anchor"
            className="relative inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-white shadow-sm backdrop-blur hover:bg-white/15"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Panier</span>
            {cartCount > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-white px-1.5 text-xs font-black text-slate-900">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-slate-900 shadow-sm hover:bg-white/90">
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-slate-900 shadow-sm hover:bg-white/90">
              <User size={16} />
              <span className="hidden sm:inline">Connexion</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
