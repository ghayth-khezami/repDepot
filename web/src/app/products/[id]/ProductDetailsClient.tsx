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
import { fr, WANTED_IMG } from "@/lib/fr";
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
      <div className="page-container py-16 text-center text-muted-foreground">{fr.loading}</div>
    );
  }

  if (!product) {
    return (
      <div className="page-container py-16 text-center text-muted-foreground">
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
    <div className="page-container space-y-16 pb-16">
      <Link
        href="/produits"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft size={16} />
        {fr.backToShopLink}
      </Link>

      <div className="grid gap-12 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)]">
          {photos.length > 0 ? (
            <div className="relative">
              <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
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
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-card p-2 shadow-sm hover:bg-muted"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((v) => (v + 1) % photos.length)}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-card p-2 shadow-sm hover:bg-muted"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center text-muted-foreground">
              {fr.noImage}
            </div>
          )}
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {product.mark?.logoDoc ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.normalizePhotoUrl(product.mark.logoDoc)}
                  alt={product.mark.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            <p className="tag-eyebrow">{categoryLabel}</p>
          </div>
          <h1 className="display text-4xl text-plum-deep md:text-5xl">{product.productName}</h1>
          <div className="flex flex-wrap items-center gap-4">
            <p className="display text-4xl text-foreground">
              {product.PrixVente.toFixed(2)}{" "}
              <span className="text-sm font-sans text-muted-foreground">TND</span>
            </p>
            {!outOfStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {fr.inStock}
              </span>
            )}
          </div>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            {product.description || "Produit disponible à la commande avec livraison rapide."}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={(e) => onAdd(e.currentTarget)}
              disabled={outOfStock || inCart}
            >
              <ShoppingBag size={18} />
              {inCart ? fr.alreadyInCart : outOfStock ? fr.outOfStock : fr.addToCart}
            </button>
            <div className="flex items-end gap-2">
              <Link
                href="/checkout"
                className={`btn-ghost ${cart.length === 0 ? "pointer-events-none opacity-50" : ""}`}
              >
                {fr.buyNow}
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={WANTED_IMG}
                alt=""
                className="h-14 w-auto object-contain sm:h-16"
                aria-hidden
              />
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              {fr.verifiedBy}
            </li>
            <li className="flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              {fr.deliveryTime}
            </li>
          </ul>

          {photos.length > 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Autres photos
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`overflow-hidden rounded-xl border-2 transition hover:opacity-90 ${
                      i === activePhoto
                        ? "border-primary ring-2 ring-primary/25"
                        : "border-border hover:border-primary/50"
                    }`}
                    aria-label={`Voir photo ${i + 1}`}
                    aria-current={i === activePhoto ? "true" : undefined}
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
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary"
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
          <p className="tag-eyebrow">{fr.selectionEyebrow}</p>
          <h2 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.youMayLike}</h2>
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
