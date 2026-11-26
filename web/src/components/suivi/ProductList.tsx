"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Baby, Package, Puzzle, Shirt, Sparkles } from "lucide-react";
import type { SuiviItem } from "@/lib/suivi";
import { formatTnd, frShortDate } from "./format";

type Filter = "ALL" | "EN_VENTE" | "VENDU" | "RETIRE";

const TABS: Array<{ key: Filter; label: string }> = [
  { key: "ALL", label: "Tous" },
  { key: "EN_VENTE", label: "En vente" },
  { key: "VENDU", label: "Vendus" },
  { key: "RETIRE", label: "Retirés" },
];

/** Placeholder icon picked from the category name (static elements, no component creation in render). */
function CategoryIcon({ category, className }: { category: string | null; className: string }) {
  const c = (category ?? "").toLowerCase();
  const props = { "aria-hidden": true, className, strokeWidth: 1.8 } as const;
  if (/v[êe]t|habit|body|pyjama/.test(c)) return <Shirt {...props} />;
  if (/jou|jeu|peluche/.test(c)) return <Puzzle {...props} />;
  if (/pouss|lit|chaise|parc|si[èe]ge|b[ée]b[ée]/.test(c)) return <Baby {...props} />;
  return <Package {...props} />;
}

function StatusChip({ item }: { item: SuiviItem }) {
  if (item.status === "VENDU" && item.payoutStatus === "PAYE") {
    return <Chip className="bg-violet-100 text-bd-violet-strong" dot="bg-bd-violet">Payé</Chip>;
  }
  if (item.status === "VENDU") return <Chip className="bg-bd-success-bg text-bd-success" dot="bg-bd-success">Vendu</Chip>;
  if (item.status === "RETIRE") return <Chip className="bg-gray-100 text-gray-700" dot="bg-gray-400">Retiré</Chip>;
  return <Chip className="bg-bd-blush text-bd-pink-strong" dot="bg-bd-pink">En vente</Chip>;
}

function Chip({ children, className, dot }: { children: React.ReactNode; className: string; dot: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function ProductCard({ item }: { item: SuiviItem }) {
  const sold = item.status === "VENDU";
  return (
    <li className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ${item.status === "RETIRE" ? "opacity-60" : ""}`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        {item.photo ? (
          <Image src={item.photo} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bd-blush via-white to-bd-lilac">
            <CategoryIcon category={item.category} className="h-7 w-7 text-bd-violet/70" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-extrabold text-bd-ink">{item.name}</h3>
        <p className="mt-0.5 text-sm font-bold text-bd-muted">
          Votre part <span className="font-black text-bd-success">{formatTnd(item.depositorMillimes)}</span>
        </p>
        {sold && item.soldAt ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-extrabold text-bd-success">
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> Vendu le {frShortDate(item.soldAt)}
          </p>
        ) : null}
      </div>
      <StatusChip item={item} />
    </li>
  );
}

export function ProductList({ items }: { items: SuiviItem[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const counts = useMemo(
    () => ({
      ALL: items.length,
      EN_VENTE: items.filter((i) => i.status === "EN_VENTE").length,
      VENDU: items.filter((i) => i.status === "VENDU").length,
      RETIRE: items.filter((i) => i.status === "RETIRE").length,
    }),
    [items],
  );
  const visible = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  return (
    <section aria-labelledby="articles-title" className="mt-6">
      <h2 id="articles-title" className="mb-3 text-lg font-black text-bd-ink">Vos articles</h2>
      <div role="tablist" aria-label="Filtrer les articles" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {TABS.filter((t) => t.key === "ALL" || counts[t.key] > 0).map((t) => {
          const active = t.key === filter;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(t.key)}
              className={`unstyled inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bd-pink/30 ${
                active ? "bg-grad-pink-strong text-white shadow-glow-pink" : "border border-bd-line/15 bg-white text-bd-ink"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-bd-lilac"}`}>{counts[t.key]}</span>
            </button>
          );
        })}
      </div>
      {visible.length ? (
        <ul className="grid gap-2.5">
          {visible.map((item) => (
            <ProductCard key={item.ref} item={item} />
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-white px-5 py-8 text-center text-sm font-bold text-bd-muted shadow-card">Aucun article dans cette catégorie.</p>
      )}
    </section>
  );
}
