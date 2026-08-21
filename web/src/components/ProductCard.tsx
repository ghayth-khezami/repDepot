"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Product } from "@/types";
import { useShop } from "@/context/ShopContext";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductPhotoGallery } from "@/components/ProductPhotoGallery";
import { fr } from "@/lib/fr";
import { fadeUp } from "@/lib/motion";

export function ProductCard({
  product,
  onFavoriteChange,
  compact = false,
}: {
  product: Product;
  onFavoriteChange?: (result: "added" | "removed" | false, productId: string) => void;
  compact?: boolean;
}) {
  const { toggleLike, isLiked, addToCart, cart } = useShop();
  const fx = useAddToCartFx();
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
      <article className={`group flex h-full flex-col overflow-hidden rounded-xl border border-[#182044]/8 bg-white shadow-[0_5px_18px_rgba(45,35,70,0.05)] transition hover:-translate-y-1 ${compact ? "product-card-compact" : ""}`}>
        <div className={`relative overflow-hidden ${compact ? "aspect-[1.08/1]" : "aspect-[4/5]"}`}>
          <ProductPhotoGallery photos={product.photos} alt={product.productName} className="h-full" />
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
            className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
            aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart
              size={18}
              className={liked ? "fill-[#FF6B8A] text-[#FF6B8A]" : "text-[#2D2346]/60"}
              strokeWidth={liked ? 0 : 1.75}
            />
          </button>
        </div>
        <div className={`flex flex-1 flex-col ${compact ? "p-2.5" : "p-4 md:p-5"}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[#E04672]">
              {categoryName}
            </span>
            <span className={`shrink-0 font-display text-[#2D2346] ${compact ? "text-sm" : "text-lg"}`}>
              {product.PrixVente.toFixed(0)}{" "}
              <span className="text-xs font-sans font-normal text-[#2D2346]/50">DT</span>
            </span>
          </div>
          <Link
            href={`/products/${product.id}`}
            className={`line-clamp-2 flex-1 font-medium leading-tight text-[#2D2346] transition hover:text-[#E04672] ${compact ? "min-h-[2.2rem] text-[11px]" : "min-h-[2.6rem] text-[15px]"}`}
          >
            {product.productName}
          </Link>
          <AddToCartButton
            onClick={onAddToCart}
            disabled={outOfStock || inCart}
            inCart={inCart}
            outOfStock={outOfStock}
            className="mt-3"
          />
        </div>
      </article>
    </motion.div>
  );
}
