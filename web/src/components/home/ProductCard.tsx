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

export function ProductCard({ product }: { product: Product }) {
  const { toggleLike, isLiked, addToCart, cart } = useShop();
  const fx = useAddToCartFx();
  const liked = isLiked(product.id);
  const inCart = cart.some((item) => item.product.id === product.id);
  const outOfStock = product.isDispo === false || product.stockQuantity <= 0;

  const onAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || inCart) return;
    addToCart(product);
    fx.burstFrom(e.currentTarget);
  };

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_8px_32px_rgba(45,35,70,0.07)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <ProductPhotoGallery photos={product.photos} alt={product.productName} className="h-full" />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleLike(product.id);
          }}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:scale-110"
          aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart
            size={18}
            className={liked ? "fill-[#FF6B8A] text-[#FF6B8A]" : "text-[#2D2346]/60"}
            strokeWidth={liked ? 0 : 1.75}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <Link
            href={`/products/${product.id}`}
            className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-[#2D2346] transition hover:text-[#E04672] md:text-[15px]"
          >
            {product.productName}
          </Link>
          <p className="shrink-0 font-display text-lg text-[#2D2346]">
            {product.PrixVente.toFixed(0)}{" "}
            <span className="text-xs font-sans font-normal text-[#2D2346]/50">DT</span>
          </p>
        </div>

        <AddToCartButton
          onClick={onAddToCart}
          disabled={outOfStock || inCart}
          inCart={inCart}
          outOfStock={outOfStock}
        />
      </div>
    </motion.article>
  );
}
