"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
import { ProductPhotoGallery } from "@/components/ProductPhotoGallery";
import { CheckoutOrderForm } from "@/components/CheckoutOrderForm";
import { OrderSuccessModal } from "@/components/OrderSuccessModal";
import { fadeUp } from "@/lib/motion";
import { HOME_COLORS, STORE_CONTAINER } from "@/lib/home";
import { fr } from "@/lib/fr";
import { safeExternalUrl } from "@/lib/safe-url";

const PINK = HOME_COLORS.primary;

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
  const [orderSuccess, setOrderSuccess] = useState(false);

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

  const categoryLabel =
    product.subCategory?.title?.toUpperCase() ??
    product.category?.categoryName?.toUpperCase() ??
    fr.shopCategory;

  return (
    <>
      <OrderSuccessModal open={orderSuccess} onClose={() => setOrderSuccess(false)} />

      <div className={`w-full space-y-16 bg-[#FFFDFB] pb-16 text-[#2D2346] ${STORE_CONTAINER}`}>
        <Link
          href="/produits"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#2D2346]/60 transition hover:text-[#E04672]"
        >
          <ArrowLeft size={16} />
          {fr.backToShopLink}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_32px_rgba(45,35,70,0.07)]">
              <div className="aspect-[4/5] w-full">
                {photos.length > 0 ? (
                  <ProductPhotoGallery
                    photos={product.photos}
                    alt={product.productName}
                    className="h-full"
                    autoplayMs={2000}
                    selectedIndex={activePhoto}
                    onIndexChange={setActivePhoto}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#FFF0F4] text-[#2D2346]/50">
                    {fr.noImage}
                  </div>
                )}
              </div>
            </div>

            {photos.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2D2346]/50">
                  Autres photos
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        i === activePhoto
                          ? "border-[#E04672] ring-2 ring-[#E04672]/20"
                          : "border-[#E04672]/10 hover:border-[#E04672]/40"
                      }`}
                      aria-label={`Voir photo ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${product.productName} — photo ${i + 1}`}
                        className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: PINK }}>
                {categoryLabel}
              </p>
            </div>

            <h1 className="font-display text-3xl text-[#2D2346] md:text-4xl lg:text-5xl">
              {product.productName}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <p className="font-display text-3xl text-[#2D2346] md:text-4xl">
                {product.PrixVente.toFixed(2)}{" "}
                <span className="text-sm font-sans text-[#2D2346]/50">TND</span>
              </p>
              {!outOfStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  {fr.inStock}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2D2346]/8 px-3 py-1 text-xs font-semibold text-[#2D2346]/70 ring-1 ring-[#2D2346]/12">
                  {fr.outOfStock}
                </span>
              )}
            </div>

            <p className="max-w-md text-base leading-relaxed text-[#2D2346]/65">
              {product.description || "Produit disponible à la commande avec livraison rapide."}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.25)] transition hover:brightness-105 disabled:opacity-50"
                style={{ backgroundColor: PINK }}
                onClick={(e) => onAdd(e.currentTarget)}
                disabled={outOfStock || inCart}
              >
                <ShoppingBag size={18} />
                {inCart ? fr.alreadyInCart : outOfStock ? fr.outOfStock : fr.addToCart}
              </button>
            </div>

            <ul className="space-y-2 text-sm text-[#2D2346]/65">
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: PINK }} />
                {fr.verifiedBy}
              </li>
              <li className="flex items-center gap-2">
                <Truck size={16} style={{ color: PINK }} />
                {fr.deliveryTime}
              </li>
            </ul>

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#E04672]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#2D2346]/70 hover:border-[#E04672]/35 hover:text-[#E04672]"
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

        {!outOfStock && (
          <section className="overflow-hidden rounded-[2rem] border border-[#E04672]/10 bg-white p-6 shadow-[0_8px_32px_rgba(45,35,70,0.06)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: PINK }}>
              {fr.payment}
            </p>
            <h2 className="mt-2 font-display text-2xl text-[#2D2346] md:text-3xl">J&apos;achète</h2>
            <p className="mt-1 text-sm text-[#2D2346]/60">
              Passez commande directement pour ce produit — livraison partout en Tunisie.
            </p>
            <div className="mt-6">
              <CheckoutOrderForm
                singleProduct={product}
                compact
                onSuccess={() => setOrderSuccess(true)}
              />
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: PINK }}>
              {fr.selectionEyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">{fr.youMayLike}</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
              {similar.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
