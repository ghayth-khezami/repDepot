"use client";

import { Plus, ShoppingCartSimple } from "@phosphor-icons/react";
import { HOME_COLORS } from "@/lib/home";
import { fr } from "@/lib/fr";

export function AddToCartButton({
  onClick,
  disabled,
  inCart,
  outOfStock,
  className = "",
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  inCart?: boolean;
  outOfStock?: boolean;
  className?: string;
}) {
  const label = inCart ? fr.alreadyInCart : outOfStock ? fr.outOfStock : fr.addToCart;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-auto flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: `${HOME_COLORS.secondary}cc`,
        color: HOME_COLORS.primary,
        boxShadow: "0 0 0 1px rgba(224,70,114,0.12), 0 4px 16px rgba(224,70,114,0.08)",
      }}
    >
      {!inCart && !outOfStock && <Plus size={16} weight="bold" />}
      <span>{label}</span>
      {!inCart && !outOfStock && <ShoppingCartSimple size={18} weight="bold" />}
    </button>
  );
}
