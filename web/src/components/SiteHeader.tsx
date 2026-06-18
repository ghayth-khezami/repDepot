"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  History,
  Home,
  LogOut,
  MapPin,
  Menu,
  PackagePlus,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";
import { fr, LOGO_SRC } from "@/lib/fr";
import { EASE_PRIMARY, logoSpring } from "@/lib/motion";

const NAV = [
  { href: "/", label: fr.navHome, icon: Home, match: (p: string) => p === "/" },
  {
    href: "/produits",
    label: fr.navProducts,
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/produits"),
  },
  {
    href: "/deposer/request",
    label: fr.navDeposit,
    icon: PackagePlus,
    match: (p: string) => p.startsWith("/deposer"),
  },
  { href: "/magasin", label: fr.navStore, icon: MapPin, match: (p: string) => p === "/magasin" },
] as const;

const MOBILE_ACCOUNT = [
  { href: "/cart", label: fr.cart, icon: ShoppingBag },
  { href: "/articles-preferes", label: "Articles préférés", icon: Heart },
  { href: "/history", label: "Mes commandes", icon: History },
  { href: "/profile", label: fr.profile, icon: User },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, token, user, logout } = useShop();
  const cartCount = cart.length;
  const fx = useAddToCartFx();
  const cartRef = useRef<HTMLAnchorElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fx.setCartEl(cartRef.current);
  }, [fx]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const initial = (user?.username || user?.email || "?").charAt(0).toUpperCase();

  const mobileMenu =
    menuOpen && mounted
      ? createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[90] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                aria-label="Fermer le menu"
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="mobile-drawer absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col shadow-2xl"
                initial={{ x: "-105%" }}
                animate={{ x: 0 }}
                exit={{ x: "-105%" }}
                transition={{ duration: 0.38, ease: EASE_PRIMARY }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/15 px-5 pb-5 pt-6">
                  {token && user ? (
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-semibold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {user.username || "Mon compte"}
                        </p>
                        <p className="truncate text-sm text-white/75">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <Image
                        src={LOGO_SRC}
                        alt={fr.brand}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-contain ring-2 ring-white/25"
                      />
                      <div>
                        <p className="display text-lg text-white">{fr.brand}</p>
                        <p className="text-xs text-white/70">{fr.byKhezami}</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Fermer le menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  {NAV.map((item) => {
                    const active = pathname ? item.match(pathname) : false;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-drawer-link ${active ? "mobile-drawer-link--active" : ""}`}
                      >
                        <item.icon size={20} strokeWidth={1.75} />
                        {item.label}
                      </Link>
                    );
                  })}

                  {token ? (
                    <>
                      <div className="my-3 h-px bg-white/12" />
                      {MOBILE_ACCOUNT.map((item) => (
                        <Link key={item.href} href={item.href} className="mobile-drawer-link">
                          <item.icon size={20} strokeWidth={1.75} />
                          {item.label}
                        </Link>
                      ))}
                    </>
                  ) : (
                    <Link href="/login" className="mobile-drawer-link mt-2">
                      <User size={20} strokeWidth={1.75} />
                      {fr.login}
                    </Link>
                  )}
                </nav>

                {token ? (
                  <div className="border-t border-white/15 p-4">
                    <button
                      type="button"
                      className="mobile-drawer-logout flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        router.push("/");
                      }}
                    >
                      <LogOut size={20} strokeWidth={1.75} />
                      {fr.logout}
                    </button>
                  </div>
                ) : null}
              </motion.aside>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="site-header-shell">
        <motion.header
          className="site-header-bar"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_PRIMARY }}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2 lg:gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-foreground/80 transition hover:border-primary hover:text-primary lg:hidden"
              aria-label="Ouvrir le menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <motion.div whileHover={{ rotate: -6, scale: 1.08 }} transition={logoSpring}>
                <Image
                  src={LOGO_SRC}
                  alt={fr.brand}
                  width={40}
                  height={40}
                  className="h-9 w-9 rounded-full object-contain ring-1 ring-primary/15 sm:h-9 sm:w-9"
                />
              </motion.div>
              <div className="min-w-0 leading-tight">
                <span className="display block truncate text-sm text-gradient sm:text-base lg:text-lg">
                  {fr.brand}
                </span>
                <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block sm:text-[10px]">
                  {fr.byKhezami}
                </span>
              </div>
            </Link>
          </div>

          <nav className="site-header-nav hidden lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`site-header-nav-link ${
                  pathname && item.match(pathname) ? "site-header-nav-link--active" : ""
                }`}
              >
                <item.icon size={16} strokeWidth={1.75} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <UserMenuDropdown />
            <Link
              ref={cartRef}
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-cream shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
              style={{ background: "var(--gradient-brand)" }}
              aria-label={fr.cart}
            >
              <ShoppingBag size={18} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-plum-deep">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </motion.header>
      </div>
      {mobileMenu}
    </>
  );
}
