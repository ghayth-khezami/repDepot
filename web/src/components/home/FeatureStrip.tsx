"use client";

import { HOME_FEATURES, HERO_RADIUS } from "@/lib/home";
import { FeatureCard } from "./FeatureCard";

export function FeatureStrip() {
  return (
    <section className="relative z-10 mt-4">
      <div
        className={`overflow-hidden border border-[#E8E4F0]/90 bg-white shadow-[0_4px_24px_rgba(45,35,70,0.05)] ${HERO_RADIUS}`}
      >
        {/* Desktop: 4 columns with vertical dividers */}
        <div className="hidden divide-x divide-[#EBE7F2] md:grid md:grid-cols-4">
          {HOME_FEATURES.map((f) => (
            <div key={f.title} className="px-5 py-5 lg:px-6 lg:py-6">
              <FeatureCard {...f} />
            </div>
          ))}
        </div>

        {/* Mobile: stacked list — no 2×2 banner grid */}
        <div className="divide-y divide-[#EBE7F2] md:hidden">
          {HOME_FEATURES.map((f) => (
            <div key={f.title} className="px-4 py-4">
              <FeatureCard {...f} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
