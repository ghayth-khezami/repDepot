"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Lock, Phone, ShieldCheck, Truck } from "lucide-react";
import { fr } from "@/lib/fr";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/social";
import { fadeUp } from "@/lib/motion";

const HERO_IMAGE = "/hero.jpg";

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: fr.trustVerified, desc: fr.trustVerifiedDesc },
  { icon: Truck, title: fr.trustDelivery, desc: fr.trustDeliveryDesc },
  { icon: Lock, title: fr.trustPayment, desc: fr.trustPaymentDesc },
  { icon: Heart, title: fr.trustBaby, desc: fr.trustBabyDesc },
] as const;

export function HeroVideoCarousel() {
  return (
    <section className="home-hero-section">
      <div className="page-container space-y-5 pt-4 md:space-y-6 md:pt-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="home-hero-card"
        >
          <div className="home-hero-copy">
            <p className="home-hero-welcome-ar">{fr.heroWelcomeAr}</p>
            <h1 className="display home-hero-brand">{fr.heroBrandLine}</h1>
            <p className="home-hero-by">{fr.heroBrandBy}</p>
            <p className="home-hero-sub">{fr.heroSub}</p>
            <p className="home-hero-sell-ar">{fr.depositSellAr}</p>
            <a href={`tel:${STORE_PHONE_TEL}`} className="btn-primary home-hero-call-btn">
              <Phone size={18} strokeWidth={2} />
              {STORE_PHONE_DISPLAY}
            </a>
          </div>

          <div className="home-hero-image-wrap">
            <Image
              src={HERO_IMAGE}
              alt={fr.brand}
              width={640}
              height={480}
              className="home-hero-image"
              priority
            />
          </div>
        </motion.div>

        <div className="home-hero-trust-grid">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="home-hero-trust-card">
              <div className="home-hero-trust-icon">
                <item.icon size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-plum-deep">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
