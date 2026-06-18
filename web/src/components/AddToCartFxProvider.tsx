"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type RectLike = { left: number; top: number; width: number; height: number };

type FxBurst = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

type AddToCartFxContextValue = {
  setCartEl: (el: HTMLElement | null) => void;
  burstFrom: (el: HTMLElement | null) => void;
};

const AddToCartFxContext = createContext<AddToCartFxContextValue | null>(null);

function centerOfRect(r: RectLike) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AddToCartFxProvider({ children }: { children: React.ReactNode }) {
  const cartElRef = useRef<HTMLElement | null>(null);
  const [bursts, setBursts] = useState<FxBurst[]>([]);

  const value = useMemo<AddToCartFxContextValue>(
    () => ({
      setCartEl: (el) => {
        cartElRef.current = el;
      },
      burstFrom: (el) => {
        if (!el) return;
        const cartEl = cartElRef.current;
        if (!cartEl) return;

        const fromRect = el.getBoundingClientRect();
        const toRect = cartEl.getBoundingClientRect();
        const from = centerOfRect(fromRect);
        const to = centerOfRect(toRect);

        const id = uid();
        setBursts((b) => [...b, { id, from, to }]);
        window.setTimeout(() => {
          setBursts((b) => b.filter((x) => x.id !== id));
        }, 900);
      },
    }),
    [],
  );

  return (
    <AddToCartFxContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <AnimatePresence>
          {bursts.map((b) => (
            <FxParticles key={b.id} from={b.from} to={b.to} />
          ))}
        </AnimatePresence>
      </div>
    </AddToCartFxContext.Provider>
  );
}

function FxParticles({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const particles = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }).map((_, i) => {
      const t = i / (count - 1);
      const spread = 40;
      const jitterX = (Math.random() - 0.5) * spread;
      const jitterY = (Math.random() - 0.5) * spread;
      const midX = from.x + (to.x - from.x) * (0.45 + 0.1 * t) + jitterX;
      const midY = from.y + (to.y - from.y) * (0.45 + 0.1 * t) + jitterY - 24;
      const size = 8 + Math.round(Math.random() * 8);
      return { i, midX, midY, size, delay: t * 0.02 };
    });
  }, [from.x, from.y, to.x, to.y]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.i}
          initial={{ x: from.x, y: from.y, scale: 0.4, opacity: 0 }}
          animate={{
            x: [from.x, p.midX, to.x],
            y: [from.y, p.midY, to.y],
            scale: [0.4, 1.15, 0.15],
            opacity: [0, 1, 0],
            rotate: [0, 140, 260],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: "easeOut", delay: p.delay }}
          className="rounded-full shadow-[0_8px_24px_-6px_oklch(0.55_0.14_300_/_0.55)]"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            background: "var(--gradient-brand)",
          }}
        />
      ))}
      <motion.div
        initial={{ x: from.x, y: from.y, scale: 0.85, opacity: 0.0 }}
        animate={{ x: to.x, y: to.y, scale: 0.15, opacity: 0.0 }}
        transition={{ duration: 0.85, ease: "easeOut" }}
        className="rounded-full blur-[3px]"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 18,
          height: 18,
          background: "oklch(0.55 0.14 300 / 0.45)",
        }}
      />
    </>
  );
}

export function useAddToCartFx() {
  const ctx = useContext(AddToCartFxContext);
  if (!ctx) throw new Error("useAddToCartFx must be used within AddToCartFxProvider");
  return ctx;
}

