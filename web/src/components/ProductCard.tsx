"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { Product } from "@/types";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";
import { fr } from "@/lib/fr";
import { fadeUp } from "@/lib/motion";

export function ProductCard({
  product,
  onFavoriteChange,
}: {
  product: Product;
  onFavoriteChange?: (result: "added" | "removed" | false, productId: string) => void;
}) {
  const { toggleLike, isLiked, addToCart, cart } = useShop();
  const fx = useAddToCartFx();
  const photo = api.normalizePhotoUrl(product.photos?.[0]?.photoDoc);
  const liked = isLiked(product.id);
  const inCart = cart.some((item) => item.product.id === product.id);
  const outOfStock = product.isDispo === false || product.stockQuantity <= 0;
  const categoryName =
    product.subCategory?.title?.toUpperCase() ??
    product.category?.categoryName?.toUpperCase() ??
    fr.shopCategory;

  const onAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || inCart) return;
    addToCart(product);
    fx.burstFrom(e.currentTarget);
  };

  return (
    <motion.div
      className="h-full"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <div className="product-card-shell group overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
        <Link href={`/products/${product.id}`} className="flex h-full flex-col">
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={product.productName}
                className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {fr.noImage}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-plum-deep/35 opacity-0 backdrop-blur-[3px] transition-opacity duration-300 group-hover:opacity-100">
              <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-plum-deep shadow-md">
                Aperçu rapide
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void (async () => {
                  const r = await toggleLike(product.id);
                  onFavoriteChange?.(r, product.id);
                })();
              }}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur transition hover:scale-110"
              aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart
                size={16}
                className={liked ? "fill-primary text-primary" : "text-foreground/70"}
                strokeWidth={liked ? 0 : 1.75}
              />
            </button>
            <button
              type="button"
              onClick={onAddToCart}
              disabled={outOfStock || inCart}
              className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-cream shadow-[var(--shadow-glow)] transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              aria-label={inCart ? fr.alreadyInCart : fr.addToCart}
            >
              <ShoppingBag size={18} />
            </button>
          </div>
          <div className="product-card-body space-y-1.5 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="tag-eyebrow min-w-0 truncate text-[0.65rem]">{categoryName}</span>
              <span className="display shrink-0 text-lg text-foreground">
                {product.PrixVente.toFixed(2)}{" "}
                <span className="text-xs font-sans font-normal text-muted-foreground">TND</span>
              </span>
            </div>
            <p className="line-clamp-2 min-h-[2.6rem] text-[15px] font-medium leading-tight text-foreground">
              {product.productName}
            </p>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
