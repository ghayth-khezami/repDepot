"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Product } from "@/types";
import { api } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { useAddToCartFx } from "@/components/AddToCartFxProvider";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getPhoto(product: Product) {
  const normalized = api.normalizePhotoUrl(product.photos?.[0]?.photoDoc);
  if (normalized) return normalized;
  return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=70";
}

export function HeroProductCarousel({
  products,
  loading,
}: {
  products: Product[];
  loading?: boolean;
}) {
  const { addToCart } = useShop();
  const fx = useAddToCartFx();
  const items = useMemo(() => products.slice(0, 8), [products]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(320);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      // card is ~78% of viewport width on mobile, fixed-ish on desktop
      setStep(clamp(Math.round(Math.min(420, Math.max(280, w * 0.78))), 280, 420));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    x.set(-active * step);
  }, [active, step, x]);

  const maxIndex = Math.max(0, items.length - 1);
  const canNav = items.length > 1;

  const snapToNearest = (rawX: number) => {
    const next = clamp(Math.round(-rawX / step), 0, maxIndex);
    setActive(next);
  };

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-white/5 p-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-8">
      <div className="absolute inset-0 -z-10 opacity-70">
        <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-extrabold tracking-[0.18em] text-white/70">
            DISCOVER
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            Swipe your products
          </h2>
          <p className="max-w-lg text-sm font-semibold text-white/70">
            A modern, single-screen experience. Drag left/right to browse.
          </p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            disabled={!canNav || active === 0}
            onClick={() => setActive((v) => clamp(v - 1, 0, maxIndex))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur disabled:opacity-40"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            disabled={!canNav || active === maxIndex}
            onClick={() => setActive((v) => clamp(v + 1, 0, maxIndex))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur disabled:opacity-40"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="mt-6 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 rounded-[2rem] border border-white/10 bg-white/5" />
            <div className="hidden h-64 rounded-[2rem] border border-white/10 bg-white/5 md:block" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
            No products yet.
          </div>
        ) : (
          <motion.div
            className="flex cursor-grab gap-5 active:cursor-grabbing"
            style={{ x }}
            drag="x"
            dragElastic={0.08}
            dragConstraints={{
              left: -maxIndex * step,
              right: 0,
            }}
            onDragEnd={() => snapToNearest(x.get())}
            animate={{ x: -active * step }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {items.map((p, idx) => {
              const photo = getPhoto(p);
              const isActive = idx === active;
              return (
                <motion.article
                  key={p.id}
                  className="relative shrink-0 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-[0_18px_70px_-46px_rgba(0,0,0,0.65)] backdrop-blur"
                  style={{ width: step }}
                  animate={{ scale: isActive ? 1 : 0.96, opacity: isActive ? 1 : 0.78 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                >
                  <div className="relative h-56 w-full md:h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={p.productName}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="line-clamp-1 text-lg font-black tracking-tight text-white hover:underline"
                      >
                        {p.productName}
                      </Link>
                      <span className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-1 text-sm font-black text-white">
                        {p.PrixVente.toFixed(2)} TND
                      </span>
                    </div>

                    <p className="line-clamp-2 min-h-10 text-sm font-semibold text-white/70">
                      {p.description || "Produit disponible en stock."}
                    </p>

                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            addToCart(p);
                            fx.burstFrom(e.currentTarget);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm transition hover:bg-white/90"
                        >
                          <ShoppingCart size={16} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>

      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition ${
                i === active ? "w-7 bg-white" : "w-2 bg-white/35 hover:bg-white/55"
              }`}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

