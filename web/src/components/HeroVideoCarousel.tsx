"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { fr } from "@/lib/fr";
import { fadeUp } from "@/lib/motion";

export function HeroVideoCarousel() {
  return (
    <section className="hero-trust-section relative isolate overflow-hidden">
      <div className="hero-trust-backdrop" aria-hidden />
      <div className="hero-overlay-purple pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <div className="hero-overlay-purple-side pointer-events-none absolute inset-0 z-[1]" aria-hidden />

      <div className="page-container relative z-10 py-16 md:py-24 lg:py-28">
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
          <div className="mt-8">
            <Link href="/produits" className="btn-primary shadow-glow">
              {fr.discoverShop}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
