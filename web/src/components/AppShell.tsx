"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShop } from "@/context/ShopContext";
import { LogoLoader } from "@/components/LogoLoader";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMagasinPage = pathname === "/magasin";
  const { token, authHydrated } = useShop();
  const [routeLoading, setRouteLoading] = useState(true);
  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    setShellReady(true);
  }, []);

  useEffect(() => {
    setRouteLoading(true);
    const timer = setTimeout(() => setRouteLoading(false), 450);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!shellReady || !authHydrated) return;
    const protectedPaths = ["/profile", "/history", "/articles-preferes"];
    if (!token && pathname && protectedPaths.some((p) => pathname.startsWith(p))) {
      const t = window.setTimeout(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [shellReady, authHydrated, token, pathname, router]);

  const isHomePage = pathname === "/";

  return (
    <div className={`relative flex min-h-dvh flex-col ${isHomePage ? "home-app-root" : ""}`}>
      <LogoLoader visible={routeLoading} />
      <SiteHeader />
      {isHomePage ? (
        <div className="home-ambient-shell flex flex-1 flex-col">
          <div className="home-ambient-bg" aria-hidden>
            <div className="home-ambient-gradient" />
          </div>
          <main className="home-main-layer relative flex-1 pb-0 pt-0">{children}</main>
          {!isMagasinPage && <Footer connected />}
        </div>
      ) : (
        <>
          <main className="flex-1 pb-16 pt-4">{children}</main>
          {!isMagasinPage && <Footer />}
        </>
      )}
    </div>
  );
}
