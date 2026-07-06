"use client";

import type { HomeFeature } from "@/lib/home";
import { HOME_COLORS } from "@/lib/home";

export function FeatureCard({
  emoji,
  icon: Icon,
  title,
  description,
  compact = false,
}: HomeFeature & { compact?: boolean }) {
  return (
    <div className={`flex items-start ${compact ? "gap-2.5" : "gap-3 md:gap-3.5"}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-full ${
          compact ? "h-9 w-9" : "h-10 w-10 md:h-11 md:w-11"
        }`}
        style={{ backgroundColor: HOME_COLORS.secondary }}
      >
        {Icon ? (
          <Icon
            size={compact ? 18 : 22}
            weight="duotone"
            style={{ color: HOME_COLORS.primary }}
          />
        ) : (
          <span className="text-base">{emoji}</span>
        )}
      </div>
      <div className="min-w-0">
        <h3
          className={`font-semibold leading-tight text-[#2D2346] ${
            compact ? "text-xs" : "text-sm md:text-[15px]"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-0.5 leading-snug text-[#2D2346]/55 ${
            compact ? "text-[11px]" : "text-xs md:text-[13px]"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
