"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";

export default function DepositerRequestPage() {
  const { token, user, authHydrated } = useShop();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;
  }, [authHydrated, token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createDepositRequest(
        {
          fullName,
          phoneNumber,
          proposedPrice: Number(proposedPrice),
          message: message || undefined,
          photos,
        },
        token,
      );
      setSuccessOpen(true);
      setFullName("");
      setPhoneNumber("");
      setProposedPrice("");
      setMessage("");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {successOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md p-6 text-center">
            <h2 className="display text-2xl text-plum-deep">Envoi réussi</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Restez joignable, nous vous contacterons le plus tôt possible.
            </p>
            <button type="button" onClick={() => setSuccessOpen(false)} className="btn-primary mt-4">
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      <div className="page-container max-w-3xl space-y-6 py-4">
        <div>
          <p className="tag-eyebrow">Dépôt-vente</p>
          <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">Demande de dépôt</h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {user ? (
            <Link href="/profile" className="btn-ghost text-sm">
              Suivre mes demandes
            </Link>
          ) : (
            <Link href="/login?redirect=/deposer/request" className="btn-ghost text-sm">
              Continuer avec votre compte
            </Link>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {user
            ? "Votre demande sera enregistrée dans Mon profil avec le statut Envoyé."
            : "Vous pouvez envoyer une demande sans vous connecter. Connectez-vous pour suivre l'historique."}
        </p>

        <form onSubmit={onSubmit} className="surface-card grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="tag-eyebrow text-[0.65rem]">Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              className="field-input file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
            <p className="text-xs text-muted-foreground">{photos.length} photo(s) sélectionnée(s)</p>
          </div>

          <div className="space-y-3">
            <input
              className="field-input"
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              className="field-input"
              placeholder="Numéro téléphone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              pattern="\d{8}"
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              placeholder="Prix proposé (TND)"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              required
            />
            <textarea
              className="field-input min-h-[100px]"
              placeholder="Message (optionnel)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              Envoyer la demande
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
