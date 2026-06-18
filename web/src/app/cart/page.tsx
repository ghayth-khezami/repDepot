"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { fr } from "@/lib/fr";
import { api } from "@/lib/api";

export default function CartPage() {
  const { cart, removeFromCart } = useShop();
  const total = cart.reduce((sum, item) => sum + item.product.PrixVente, 0);
  const itemsCount = cart.length;

  return (
    <div className="page-container space-y-8 py-4">
      <h1 className="display text-4xl text-plum-deep md:text-5xl">{fr.cart}</h1>

      {cart.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground">
          {fr.cartEmpty}{" "}
          <Link href="/produits" className="font-medium text-primary underline-offset-4 hover:underline">
            {fr.discoverShop}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cart.map((item) => {
              const photo = item.product.photos?.[0]?.photoDoc
                ? api.normalizePhotoUrl(item.product.photos[0].photoDoc)
                : "";
              return (
                <div
                  key={item.product.id}
                  className="surface-card flex min-h-[7.5rem] flex-row items-stretch gap-0 overflow-hidden p-0"
                >
                  <div className="w-28 shrink-0 bg-muted sm:w-32">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={item.product.productName}
                        className="h-full min-h-[7.5rem] w-full object-cover"
                      />
                    ) : (
                      <div className="h-full min-h-[7.5rem] w-full bg-muted" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="display line-clamp-2 text-lg leading-tight text-foreground sm:text-xl">
                        {item.product.productName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">Qté {item.quantity}</p>
                      <p className="display mt-2 text-lg text-foreground sm:text-xl">
                        {item.product.PrixVente.toFixed(2)} TND
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
                      aria-label="Retirer du panier"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="surface-card h-fit space-y-4 p-6">
            <p className="tag-eyebrow">{fr.summary}</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{fr.products}</dt>
                <dd className="font-medium">{itemsCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{fr.subtotal}</dt>
                <dd className="font-medium">{total.toFixed(2)} TND</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{fr.delivery}</dt>
                <dd className="font-medium text-primary">{fr.deliveryFree}</dd>
              </div>
            </dl>
            <div className="flex justify-between border-t border-border pt-4">
              <span className="text-muted-foreground">{fr.total}</span>
              <span className="display text-3xl text-foreground">
                {total.toFixed(2)}{" "}
                <span className="text-sm font-sans text-muted-foreground">TND</span>
              </span>
            </div>
            <Link href="/checkout" className="btn-primary w-full">
              {fr.checkout}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
