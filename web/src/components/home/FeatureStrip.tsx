"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HOME_FEATURES, HERO_RADIUS } from "@/lib/home";
import { FeatureCard } from "./FeatureCard";

export function FeatureStrip() {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFocusedIndex((index) => (index + 1) % HOME_FEATURES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative z-10 mt-4">
      <div
        className={`overflow-hidden border border-[#E8E4F0]/90 bg-white shadow-[0_4px_24px_rgba(45,35,70,0.05)] ${HERO_RADIUS}`}
      >
        {/* Desktop: 4 columns with vertical dividers */}
        <div className="hidden divide-x divide-[#EBE7F2] md:grid md:grid-cols-4">
          {HOME_FEATURES.map((f, index) => (
            <motion.div
              key={f.title}
              animate={{
                opacity: focusedIndex === index ? 1 : 0.52,
                scale: focusedIndex === index ? 1.035 : 1,
                y: focusedIndex === index ? -4 : 0,
                rotate: focusedIndex === index ? [0, index % 2 ? 1 : -1, 0] : 0,
              }}
              transition={{ duration: 0.7, ease: "easeInOut", rotate: { duration: 0.9 } }}
              className="px-5 py-5 lg:px-6 lg:py-6"
            >
              <FeatureCard {...f} />
            </motion.div>
          ))}
        </div>

        {/* Mobile: stacked list — no 2×2 banner grid */}
        <div className="divide-y divide-[#EBE7F2] md:hidden">
          {HOME_FEATURES.map((f, index) => (
            <motion.div
              key={f.title}
              animate={{
                opacity: focusedIndex === index ? 1 : 0.52,
                scale: focusedIndex === index ? 1.02 : 1,
                x: focusedIndex === index ? (index % 2 ? 3 : -3) : 0,
              }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="px-4 py-4"
            >
              <FeatureCard {...f} compact />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
