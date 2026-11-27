"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Check, ClipboardCheck, MapPin, Package, PackageCheck, Phone, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import type { MyOrder, OrderStatus } from "@/types";

const STEPS: Array<{ key: OrderStatus; label: string; hint: string; icon: typeof Check }> = [
  { key: "NOT_DELIVERED", label: "Reçue", hint: "Nous avons bien reçu votre commande", icon: ClipboardCheck },
  { key: "ACCEPTED", label: "Acceptée", hint: "Votre commande est préparée", icon: PackageCheck },
  { key: "DELIVERED", label: "Livrée", hint: "Bonne utilisation 💖", icon: Truck },
];
const stepIndex = (s: OrderStatus) => Math.max(0, STEPS.findIndex((x) => x.key === s));
const frDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }) : null;
const tnd = (v: number) => `${Number(v || 0).toFixed(3)} TND`;

function OrderStepper({ order }: { order: MyOrder }) {
  if (order.status === "CANCELLED") {
    return (
      <p className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
        <Ban size={18} aria-hidden /> Commande annulée
      </p>
    );
  }
  const idx = stepIndex(order.status);
  const dates = [order.createdAt, order.acceptedAt, order.deliveredAt];
  return (
    <ol className="order-stepper relative mt-5 grid grid-cols-3" aria-label={`Statut : ${STEPS[idx].label}`}>
      {/* track + animated progress */}
      <span aria-hidden className="absolute left-[16.66%] right-[16.66%] top-5 h-1.5 rounded-full bg-[#F3E8FF]" />
      <span
        aria-hidden
        className="order-progress absolute left-[16.66%] top-5 h-1.5 rounded-full bg-gradient-to-r from-[#E04672] to-[#8B5CF6]"
        style={{ width: `${(idx / (STEPS.length - 1)) * 66.66}%` }}
      />
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            <span
              className={`relative z-[1] flex h-11 w-11 items-center justify-center rounded-full transition-all duration-500 ${
                done ? "bg-gradient-to-br from-[#E04672] to-[#8B5CF6] text-white shadow-[0_8px_20px_rgba(224,70,114,0.35)]" : "bg-white text-[#2D2346]/35 ring-2 ring-[#F3E8FF]"
              } ${current ? "order-step-now" : ""}`}
              style={{ transitionDelay: `${i * 160}ms` }}
            >
              {done && !current ? <Check size={20} strokeWidth={3} aria-hidden /> : <Icon size={20} aria-hidden />}
            </span>
            <span className={`mt-2 text-sm font-bold ${done ? "text-[#2D2346]" : "text-[#2D2346]/40"}`}>{s.label}</span>
            <span className="text-[11px] font-semibold text-[#2D2346]/50">{done ? frDate(dates[i]) ?? "" : "À venir"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PhonePrompt({ onSaved }: { onSaved: () => void }) {
  const { token, updateUser } = useShop();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const digits = phone.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "");
    if (!/^\d{8}$/.test(digits)) {
      toast.error("Le téléphone doit contenir 8 chiffres.");
      return;
    }
    setBusy(true);
    try {
      const u = await api.setMyPhone(token!, digits);
      updateUser(u);
      toast.success("Téléphone enregistré", { description: "Vos commandes passées avec ce numéro sont maintenant visibles." });
      onSaved();
    } catch {
      toast.error("Ce numéro est déjà utilisé par un autre compte.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Phone size={16} aria-hidden /> Ajoutez votre téléphone pour retrouver vos commandes
        </span>
        <input className="field-input" type="tel" inputMode="numeric" placeholder="8 chiffres" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <button type="button" disabled={busy} onClick={() => void save()} className="btn-primary">
        {busy ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const { token, user } = useShop();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api.getMyOrders(token));
    } catch {
      /* keep the last list */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    void load();
    // The shop updates the status: refresh when the page comes back and every minute while open.
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const t = window.setInterval(() => void load(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(t);
    };
  }, [token, user, load]);

  if (!user) {
    return (
      <div className="page-container py-8">
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">Connectez-vous pour suivre vos commandes.</p>
          <p className="mt-1 text-sm text-muted-foreground">Vous avez commandé sans compte ? Créez-en un avec le même numéro de téléphone.</p>
          <Link href="/login?redirect=/history" className="btn-primary mt-4 inline-flex">
            Se connecter / Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 py-4">
      <div>
        <h1 className="display text-4xl text-plum-deep md:text-5xl">Mes commandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suivez chaque commande : reçue, acceptée, livrée.</p>
      </div>
      {!user.phoneNumber ? <PhonePrompt onSaved={() => void load()} /> : null}
      {loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="surface-card h-56 animate-pulse" />)}</div>
      ) : orders.length ? (
        orders.map((o, n) => (
          <article key={o.id} className="order-card surface-card p-5 sm:p-6" style={{ animationDelay: `${n * 80}ms` }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E04672]">Commande #{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="mt-1 text-sm text-muted-foreground">Passée le {frDate(o.createdAt)}</p>
              </div>
              <p className="display text-2xl text-foreground">{tnd(o.PrixVente)}</p>
            </div>
            <OrderStepper order={o} />
            {o.status !== "CANCELLED" ? <p className="mt-4 rounded-2xl bg-[#FFF5F8] px-4 py-3 text-sm font-semibold text-[#2D2346]">{STEPS[stepIndex(o.status)].hint}</p> : null}
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden /> {o.adresseLivraison || "Adresse non renseignée"}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {o.products.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-white">
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={api.normalizePhotoUrl(p.photo)} alt={p.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <span className="flex aspect-square items-center justify-center bg-[#F3E8FF] text-[#8B5CF6]">
                      <Package size={28} aria-hidden />
                    </span>
                  )}
                  <p className="truncate px-2 pt-1.5 text-xs font-semibold text-foreground">{p.name}</p>
                  <p className="px-2 pb-2 text-xs text-muted-foreground">{tnd(p.price)}</p>
                </li>
              ))}
            </ul>
          </article>
        ))
      ) : (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <ShoppingBag size={36} className="text-[#E04672]" aria-hidden />
          <p className="font-semibold text-foreground">Aucune commande pour le moment</p>
          <p className="max-w-sm text-sm text-muted-foreground">Vos commandes passées avec le numéro {user.phoneNumber ?? "de votre compte"} apparaîtront ici.</p>
          <Link href="/produits" className="btn-primary mt-2 inline-flex">Découvrir la boutique</Link>
        </div>
      )}
    </div>
  );
}
