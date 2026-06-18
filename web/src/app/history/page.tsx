"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { getCommandStatusBadge } from "@/lib/status-badges";

export default function HistoryPage() {
  const { token, user, ensureClient } = useShop();
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!token || !user) {
        setLoading(false);
        return;
      }
      try {
        const client = await ensureClient();
        const data = await api.getClientHistory(token, client.id);
        setHistory(data);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token, user, ensureClient]);

  if (!user) {
    return (
      <div className="page-container py-8">
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">Connectez-vous pour voir votre historique.</p>
          <Link href="/login" className="btn-primary mt-4 inline-flex">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 py-4">
      <h1 className="display text-4xl text-plum-deep md:text-5xl">Historique des commandes</h1>
      {loading && <p className="text-muted-foreground">Chargement…</p>}
      {!loading &&
        history.map((cmd) => {
          const badge = getCommandStatusBadge(String(cmd.status));
          return (
            <div key={String(cmd.id)} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-semibold text-foreground">
                  Commande #{String(cmd.id).slice(0, 8)}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Adresse : {String(cmd.adresseLivraison || "")}
              </p>
              <p className="display mt-2 text-xl text-foreground">
                {Number(cmd.PrixVente || 0).toFixed(2)} TND
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.isArray(cmd.products)
                  ? (cmd.products as Array<Record<string, unknown>>).map((p) => {
                      const photos = p.photos as Array<{ photoDoc: string }> | undefined;
                      const photo = photos?.[0]?.photoDoc
                        ? api.normalizePhotoUrl(photos[0].photoDoc)
                        : "";
                      return (
                        <div key={String(p.id)} className="rounded-xl border border-border p-2">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt={String(p.productName || "Produit")}
                              className="h-20 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-20 rounded-lg bg-muted" />
                          )}
                          <p className="mt-1 line-clamp-2 text-xs font-medium">
                            {String(p.productName || "")}
                          </p>
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>
          );
        })}
      {!loading && history.length === 0 && (
        <p className="text-muted-foreground">Aucune commande.</p>
      )}
    </div>
  );
}
