"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Heart, ShoppingBag, User } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { fr } from "@/lib/fr";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, authHydrated } = useShop();

  useEffect(() => {
    if (!authHydrated) return;
    if (!token) {
      const t = window.setTimeout(() => router.replace("/login"), 0);
      return () => window.clearTimeout(t);
    }
  }, [authHydrated, token, router]);

  if (!authHydrated) {
    return (
      <div className="page-container py-16 text-center text-muted-foreground">Chargement…</div>
    );
  }

  if (!token || !user) return null;

  const initial = (user.username || user.email || "?").charAt(0).toUpperCase();

  const quickLinks = [
    { href: "/history", label: "Mes commandes", desc: "Suivi et historique", icon: ShoppingBag },
    { href: "/articles-preferes", label: "Articles préférés", desc: "Vos coups de cœur", icon: Heart },
  ];

  return (
    <div className="page-container py-6 md:py-10">
      <div className="profile-shell mx-auto max-w-5xl space-y-6 md:space-y-8">
        <section className="profile-hero overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="profile-avatar flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold text-white">
                {initial}
              </div>
              <div>
                <p className="tag-eyebrow">{fr.profile}</p>
                <h1 className="display mt-1 text-3xl text-plum-deep md:text-4xl">
                  {user.username || "Mon compte"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2 text-xs font-semibold text-primary">
              <User size={14} />
              Compte connecté
            </span>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="profile-quick-card group flex flex-col gap-3 rounded-2xl p-5 transition hover:-translate-y-0.5"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                <item.icon size={18} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ArrowUpRight
                size={16}
                className="mt-auto text-muted-foreground transition group-hover:text-primary"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
