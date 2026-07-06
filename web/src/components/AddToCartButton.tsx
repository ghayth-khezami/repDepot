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
  compact = false,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  inCart?: boolean;
  outOfStock?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const label = inCart ? fr.alreadyInCart : outOfStock ? fr.outOfStock : fr.addToCart;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-full font-semibold transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "py-2 text-[10px] leading-none sm:py-2.5 sm:text-xs" : "gap-2.5 py-3 text-sm"
      } ${className}`}
      style={{
        backgroundColor: `${HOME_COLORS.secondary}cc`,
        color: HOME_COLORS.primary,
        boxShadow: "0 0 0 1px rgba(224,70,114,0.12), 0 4px 16px rgba(224,70,114,0.08)",
      }}
    >
      {!inCart && !outOfStock && (
        <Plus size={compact ? 12 : 16} weight="bold" className="shrink-0" />
      )}
      <span className="truncate whitespace-nowrap">{label}</span>
      {!inCart && !outOfStock && (
        <ShoppingCartSimple size={compact ? 14 : 18} weight="bold" className="shrink-0" />
      )}
    </button>
  );
}
