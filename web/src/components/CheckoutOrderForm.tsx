"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { fr } from "@/lib/fr";
import { HOME_COLORS } from "@/lib/home";
import { Product } from "@/types";

type CheckoutOrderFormProps = {
  productIds?: string[];
  singleProduct?: Product;
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
};

export function CheckoutOrderForm({
  productIds: productIdsProp,
  singleProduct,
  onSuccess,
  className = "",
  compact = false,
}: CheckoutOrderFormProps) {
  const router = useRouter();
  const { token, user, cart, ensureClient, clearCart } = useShop();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const productIds = useMemo(() => {
    if (productIdsProp?.length) return productIdsProp;
    if (singleProduct) return [singleProduct.id];
    return cart.map((item) => item.product.id);
  }, [productIdsProp, singleProduct, cart]);

  const totalVente = useMemo(() => {
    if (singleProduct) return singleProduct.PrixVente;
    if (productIdsProp?.length) {
      return cart
        .filter((item) => productIdsProp.includes(item.product.id))
        .reduce((s, i) => s + i.product.PrixVente, 0);
    }
    return cart.reduce((s, i) => s + i.product.PrixVente, 0);
  }, [singleProduct, productIdsProp, cart]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (productIds.length === 0) {
      setStatus("Aucun produit sélectionné.");
      return;
    }
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 8);
    if (!/^[0-9]{8}$/.test(normalizedPhone)) {
      setStatus("Le numéro de téléphone doit contenir exactement 8 chiffres.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      if (token && user) {
        const client = await ensureClient({
          firstName,
          lastName,
          address,
          phoneNumber: normalizedPhone,
        });
        await api.createCommand(token, {
          productIds,
          clientId: client.id,
          adresseLivraison: address,
        });
      } else {
        await api.createCommandAsGuest({
          productIds,
          guestClient: {
            firstName,
            lastName,
            address,
            phoneNumber: normalizedPhone,
          },
          adresseLivraison: address,
        });
      }
      if (!singleProduct && !productIdsProp) clearCart();
      onSuccess?.();
      if (!onSuccess) {
        setTimeout(() => router.push("/history"), 1200);
      }
    } catch (err) {
      setStatus(`Erreur commande : ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = compact
    ? "w-full rounded-2xl border border-[#E04672]/15 bg-white px-4 py-3 text-sm text-[#2D2346] outline-none transition focus:border-[#E04672]/40 focus:ring-2 focus:ring-[#E04672]/12"
    : "field-input";

  return (
    <form onSubmit={submit} className={`space-y-4 ${className}`}>
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div>
          <label className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#E04672]">
            {fr.lastName}
          </label>
          <input
            className={inputClass}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#E04672]">
            {fr.firstName}
          </label>
          <input
            className={inputClass}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#E04672]">
          {fr.phone}
        </label>
        <input
          className={inputClass}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          maxLength={8}
          pattern="[0-9]{8}"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#E04672]">
          {fr.address}
        </label>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="flex items-baseline justify-between border-t border-[#E04672]/10 pt-4">
        <span className="text-sm text-[#2D2346]/60">{fr.total}</span>
        <span className="font-display text-2xl text-[#2D2346] md:text-3xl">
          {totalVente.toFixed(2)}{" "}
          <span className="text-sm font-sans text-[#2D2346]/50">TND</span>
        </span>
      </div>

      <button
        type="submit"
        disabled={submitting || productIds.length === 0}
        className="w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.25)] transition hover:brightness-105 disabled:opacity-50"
        style={{ backgroundColor: HOME_COLORS.primary }}
      >
        {submitting ? fr.loading : fr.confirmOrder}
      </button>
      {status ? <p className="text-sm text-red-600">{status}</p> : null}
    </form>
  );
}
