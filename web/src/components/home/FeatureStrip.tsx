"use client";

import { HOME_FEATURES, HERO_RADIUS } from "@/lib/home";
import { FeatureCard } from "./FeatureCard";

const MOBILE_FLOAT = [
  { top: "8%", left: "4%", rotate: -4 },
  { top: "6%", right: "6%", rotate: 5 },
  { top: "48%", left: "2%", rotate: 3 },
  { top: "44%", right: "4%", rotate: -6 },
] as const;

export function FeatureStrip() {
  return (
    <section className="relative z-10 mt-4">
      <div
        className={`overflow-hidden border border-[#E8E4F0]/90 bg-white shadow-[0_4px_24px_rgba(45,35,70,0.05)] ${HERO_RADIUS}`}
      >
        <div className="hidden divide-x divide-[#EBE7F2] md:grid md:grid-cols-4">
          {HOME_FEATURES.map((f) => (
            <div key={f.title} className="px-5 py-5 lg:px-6 lg:py-6">
              <FeatureCard {...f} />
            </div>
          ))}
        </div>

        {/* Mobile: scattered floating chips */}
        <div className="relative min-h-[220px] md:hidden">
          {HOME_FEATURES.map((f, i) => {
            const pos = MOBILE_FLOAT[i % MOBILE_FLOAT.length];
            const isRight = "right" in pos;
            return (
              <div
                key={f.title}
                className="feature-float-chip absolute w-[46%] max-w-[168px] animate-[float-sticker_9s_ease-in-out_infinite] rounded-2xl border border-[#E04672]/10 bg-white/95 p-3 shadow-[0_6px_20px_rgba(224,70,114,0.08)] backdrop-blur-sm"
                style={{
                  top: pos.top,
                  left: isRight ? undefined : pos.left,
                  right: isRight ? pos.right : undefined,
                  transform: `rotate(${pos.rotate}deg)`,
                  animationDelay: `${i * 0.6}s`,
                }}
              >
                <FeatureCard {...f} compact />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
