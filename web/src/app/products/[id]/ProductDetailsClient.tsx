"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Camera,
  Users,
  ShoppingBag,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { Product } from "@/types";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";
import { ProductCard } from "@/components/ProductCard";
import { fadeUp } from "@/lib/motion";
import { STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";
import { safeExternalUrl } from "@/lib/safe-url";

export function ProductDetailsClient({
  productId,
  initialProduct,
}: {
  productId: string;
  initialProduct?: Product | null;
}) {
  const { token, addToCart, cart } = useShop();
  const fx = useAddToCartFx();
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const [activePhoto, setActivePhoto] = useState(0);

  const socialLinks = useMemo(
    () =>
      [
        { label: "Instagram", href: safeExternalUrl(product?.instagramLink), icon: Camera },
        { label: "Facebook", href: safeExternalUrl(product?.facebookLink), icon: Users },
        { label: "TikTok", href: safeExternalUrl(product?.tiktokLink), icon: null },
      ].filter((link) => link.href),
    [product?.instagramLink, product?.facebookLink, product?.tiktokLink],
  );

  useEffect(() => {
    const load = async () => {
      if (!initialProduct) setLoading(true);
      try {
        const data = await api.getProduct(productId, token);
        setProduct(data);
        const catId = data.category?.id;
        if (catId) {
          const row = await api.getProductsPage({ categoryId: catId, limit: 8 });
          setSimilar(row.data.filter((p) => p.id !== data.id).slice(0, 4));
        } else setSimilar([]);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [productId, token, initialProduct]);

  useEffect(() => setActivePhoto(0), [product?.id]);

  const photos = useMemo(() => {
    if (!product?.photos?.length) return [];
    return product.photos
      .map((p) => api.normalizePhotoUrl(p.photoDoc))
      .filter((url): url is string => Boolean(url));
  }, [product]);

  const outOfStock = !product || product.isDispo === false || product.stockQuantity <= 0;
  const inCart = product ? cart.some((item) => item.product.id === product.id) : false;

  const onAdd = (el?: HTMLElement | null) => {
    if (!product || outOfStock || inCart) return;
    addToCart(product);
    if (el) fx.burstFrom(el);
  };

  if (loading) {
    return (
      <div className={`py-16 text-center text-[#2D2346]/60 ${STORE_CONTAINER}`}>{fr.loading}</div>
    );
  }

  if (!product) {
    return (
      <div className={`py-16 text-center text-[#2D2346]/60 ${STORE_CONTAINER}`}>
        Produit introuvable.
      </div>
    );
  }

  const activePhotoUrl = photos[activePhoto];
  const categoryLabel =
    product.subCategory?.title?.toUpperCase() ??
    product.category?.categoryName?.toUpperCase() ??
    fr.shopCategory;

  return (
    <div className={`w-full space-y-16 bg-[#FFFDFB] pb-16 text-[#2D2346] ${STORE_CONTAINER}`}>
      <Link
        href="/produits"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#2D2346]/60 transition hover:text-[#8D6BFF]"
      >
        <ArrowLeft size={16} />
        {fr.backToShopLink}
      </Link>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_32px_rgba(45,35,70,0.07)]">
          {photos.length > 0 ? (
            <div className="relative">
              <div className="aspect-[4/5] w-full overflow-hidden bg-[#F7F2FF]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhotoUrl}
                  alt={product.productName}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((v) => (v - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#8D6BFF]/15 bg-white p-2.5 shadow-sm hover:bg-[#F7F2FF]"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((v) => (v + 1) % photos.length)}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#8D6BFF]/15 bg-white p-2.5 shadow-sm hover:bg-[#F7F2FF]"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center text-[#2D2346]/50">
              {fr.noImage}
            </div>
          )}
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {product.mark?.logoDoc ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8D6BFF]/10 bg-white p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.normalizePhotoUrl(product.mark.logoDoc)}
                  alt={product.mark.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8D6BFF]">
              {categoryLabel}
            </p>
          </div>

          <h1 className="font-display text-4xl text-[#2D2346] md:text-5xl">
            {product.productName}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <p className="font-display text-4xl text-[#2D2346]">
              {product.PrixVente.toFixed(2)}{" "}
              <span className="text-sm font-sans text-[#2D2346]/50">TND</span>
            </p>
            {!outOfStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {fr.inStock}
              </span>
            )}
          </div>

          <p className="max-w-md text-base leading-relaxed text-[#2D2346]/65">
            {product.description || "Produit disponible à la commande avec livraison rapide."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#8D6BFF] px-8 py-4 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(141,107,255,0.22)] transition hover:brightness-105 disabled:opacity-50"
              onClick={(e) => onAdd(e.currentTarget)}
              disabled={outOfStock || inCart}
            >
              <ShoppingBag size={18} />
              {inCart ? fr.alreadyInCart : outOfStock ? fr.outOfStock : fr.addToCart}
            </button>
            <Link
              href="/checkout"
              className={`inline-flex items-center rounded-full border border-[#8D6BFF]/25 bg-white px-6 py-3.5 text-sm font-semibold text-[#8D6BFF] transition hover:bg-[#F7F2FF] ${
                cart.length === 0 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {fr.buyNow}
            </Link>
          </div>

          <ul className="space-y-2 text-sm text-[#2D2346]/65">
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#8D6BFF]" />
              {fr.verifiedBy}
            </li>
            <li className="flex items-center gap-2">
              <Truck size={16} className="text-[#8D6BFF]" />
              {fr.deliveryTime}
            </li>
          </ul>

          {photos.length > 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2D2346]/50">
                Autres photos
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      i === activePhoto
                        ? "border-[#8D6BFF] ring-2 ring-[#8D6BFF]/20"
                        : "border-[#8D6BFF]/10 hover:border-[#8D6BFF]/40"
                    }`}
                    aria-label={`Voir photo ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${product.productName} — photo ${i + 1}`}
                      className="h-16 w-16 object-cover sm:h-[4.5rem] sm:w-[4.5rem]"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#8D6BFF]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#2D2346]/70 hover:border-[#8D6BFF]/35 hover:text-[#8D6BFF]"
                >
                  {link.icon ? <link.icon size={14} /> : null}
                  {link.label}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {similar.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8D6BFF]">
            {fr.selectionEyebrow}
          </p>
          <h2 className="mt-2 font-display text-4xl text-[#2D2346] md:text-5xl">{fr.youMayLike}</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
