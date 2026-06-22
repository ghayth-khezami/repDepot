"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Heart, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fr } from "@/lib/fr";
import { fadeUp } from "@/lib/motion";

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: fr.trustVerified, desc: fr.trustVerifiedDesc },
  { icon: Truck, title: fr.trustDelivery, desc: fr.trustDeliveryDesc },
  { icon: Heart, title: fr.trustBaby, desc: fr.trustBabyDesc },
] as const;

const ROTATE_MS = 4500;

export function HeroVideoCarousel() {
  const [activeTrust, setActiveTrust] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTrust((i) => (i + 1) % TRUST_ITEMS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const current = TRUST_ITEMS[activeTrust];

  return (
    <section className="hero-trust-section relative isolate overflow-hidden">
      <div className="hero-trust-backdrop" aria-hidden />
      <div className="hero-overlay-purple pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <div className="hero-overlay-purple-side pointer-events-none absolute inset-0 z-[1]" aria-hidden />

      <div className="page-container relative z-10 flex flex-col gap-8 py-16 md:gap-10 md:py-24 lg:py-28">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Sparkles size={14} className="text-lilac" />
            {fr.heroEyebrow}
          </span>
          <h1 className="display mt-6 text-[2.35rem] leading-[0.92] text-white sm:text-5xl lg:text-[4.25rem]">
            Pour les <span className="italic text-lilac">{fr.heroTitleHighlight}</span>, soigneusement
            sélectionné.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/90">{fr.heroSub}</p>

          <div className="mt-6 min-h-[4.5rem] overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md sm:min-h-[5rem] sm:px-5 sm:py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="flex items-start gap-3"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <current.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white sm:text-base">{current.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/85 sm:text-sm">{current.desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8">
            <Link href="/produits" className="btn-primary shadow-glow">
              {fr.discoverShop}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </motion.div>

        <div className="hero-trust-cards grid gap-3 sm:grid-cols-3 sm:gap-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="hero-trust-card flex gap-3 sm:flex-col sm:gap-3 md:flex-row md:gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
                style={{ background: "var(--gradient-brand)" }}
              >
                <item.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
