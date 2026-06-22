"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Heart,
  PackagePlus,
  ShoppingBag,
  User,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { getDepositStatusBadge } from "@/lib/status-badges";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, authHydrated } = useShop();
  const [depositRequests, setDepositRequests] = useState<Array<Record<string, unknown>>>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [expandedDepositId, setExpandedDepositId] = useState<string | null>(null);

  useEffect(() => {
    if (!authHydrated) return;
    if (!token) {
      const t = window.setTimeout(() => router.replace("/login"), 0);
      return () => window.clearTimeout(t);
    }
  }, [authHydrated, token, router]);

  useEffect(() => {
    if (!token) return;
    setLoadingDeposits(true);
    api
      .getMyDepositRequests(token)
      .then((data) =>
        setDepositRequests(Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []),
      )
      .catch(() => setDepositRequests([]))
      .finally(() => setLoadingDeposits(false));
  }, [token]);

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
    { href: "/deposer/request", label: "Déposer un article", desc: "Nouvelle demande", icon: PackagePlus },
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

        <div className="grid gap-4 sm:grid-cols-3">
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

        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-5 md:px-8">
            <div>
              <h2 className="font-semibold text-foreground">Mes demandes de dépôt</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Suivez l&apos;état de vos dépôts-vente
              </p>
            </div>
            <Link href="/deposer/request" className="btn-primary px-4 py-2 text-sm">
              Nouvelle demande
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="p-6 md:p-8">
            {loadingDeposits ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : depositRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
                <Link href="/deposer/request" className="btn-ghost mt-4 inline-flex">
                  Déposer un article
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {depositRequests.map((r) => {
                  const badge = getDepositStatusBadge(String(r.status));
                  const id = String(r.id);
                  const expanded = expandedDepositId === id;
                  return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExpandedDepositId(expanded ? null : id)}
                    className="w-full rounded-2xl border border-border/80 bg-background/80 p-4 text-left transition hover:border-primary/30 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{String(r.fullName || "")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(String(r.createdAt)).toLocaleDateString("fr-FR")} ·{" "}
                          {String(r.phoneNumber || "")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    {expanded ? (
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                        {r.description ? <p>{String(r.description)}</p> : null}
                        {r.email ? <p>Email: {String(r.email)}</p> : null}
                        {r.address ? <p>Adresse: {String(r.address)}</p> : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-primary">Appuyez pour voir le détail</p>
                    )}
                    {Array.isArray(r.photos) && r.photos.length > 0 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {(r.photos as string[]).slice(0, 6).map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p}
                            src={api.normalizePhotoUrl(p)}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
