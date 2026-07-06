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
      className={`mt-auto flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-[11px] font-semibold transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${className}`}
      style={{
        backgroundColor: `${HOME_COLORS.secondary}cc`,
        color: HOME_COLORS.primary,
        boxShadow: "0 0 0 1px rgba(224,70,114,0.12), 0 4px 16px rgba(224,70,114,0.08)",
      }}
    >
      {!inCart && !outOfStock && <Plus size={14} weight="bold" className="shrink-0 sm:hidden" />}
      {!inCart && !outOfStock && <Plus size={16} weight="bold" className="hidden shrink-0 sm:block" />}
      <span className="truncate">
        {inCart || outOfStock ? label : (
          <>
            <span className="sm:hidden">Ajouter</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        )}
      </span>
      {!inCart && !outOfStock && (
        <ShoppingCartSimple size={16} weight="bold" className="hidden shrink-0 sm:block" />
      )}
    </button>
  );
}
