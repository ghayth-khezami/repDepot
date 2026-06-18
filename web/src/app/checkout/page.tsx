"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { fr } from "@/lib/fr";

export default function CheckoutPage() {
  const router = useRouter();
  const { token, user, cart, ensureClient, clearCart } = useShop();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");

  const totalVente = useMemo(
    () => cart.reduce((s, i) => s + i.product.PrixVente, 0),
    [cart],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setStatus("Panier vide.");
      return;
    }
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 8);
    if (!/^[0-9]{8}$/.test(normalizedPhone)) {
      setStatus("Le numéro de téléphone doit contenir exactement 8 chiffres.");
      return;
    }

    try {
      const productIds = cart.map((item) => item.product.id);
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
      clearCart();
      setStatus("Commande créée avec succès.");
      setTimeout(() => router.push("/history"), 800);
    } catch (err) {
      setStatus(`Erreur commande : ${(err as Error).message}`);
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-8 py-4">
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft size={16} />
        {fr.backToCart}
      </Link>

      <div>
        <p className="tag-eyebrow">{fr.payment}</p>
        <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.finalizeOrder}</h1>
      </div>

      <form onSubmit={submit} className="surface-card space-y-5 p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="tag-eyebrow mb-2 block text-[0.65rem]">{fr.lastName}</label>
            <input
              className="field-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="tag-eyebrow mb-2 block text-[0.65rem]">{fr.firstName}</label>
            <input
              className="field-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="tag-eyebrow mb-2 block text-[0.65rem]">{fr.phone}</label>
          <input
            className="field-input"
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
          <label className="tag-eyebrow mb-2 block text-[0.65rem]">{fr.address}</label>
          <textarea
            className="field-input min-h-[100px] resize-y"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-muted-foreground">{fr.total}</span>
          <span className="display text-3xl text-foreground">
            {totalVente.toFixed(2)}{" "}
            <span className="text-sm font-sans text-muted-foreground">TND</span>
          </span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={cart.length === 0}>
          {fr.confirmOrder}
        </button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </form>
    </div>
  );
}
