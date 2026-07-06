"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { HeroSlideData } from "@/lib/home";
import { HOME_COLORS } from "@/lib/home";
import { PhoneButton } from "./PhoneButton";

const MOBILE_TEXT_GLOW =
  "0 2px 16px rgba(255,253,251,0.95), 0 0 28px rgba(255,253,251,0.82), 0 1px 3px rgba(255,253,251,0.9)";

export function HeroSlide({
  slide,
  isActive,
}: {
  slide: HeroSlideData;
  isActive: boolean;
}) {
  const alignCenter = slide.align === "center";

  return (
    <div className="relative h-full min-h-[360px] w-full md:min-h-[420px] lg:min-h-[460px]">
      <motion.div
        className="absolute inset-0"
        animate={isActive ? { scale: [1, 1.03] } : { scale: 1 }}
        transition={isActive ? { duration: 5.5, ease: "easeOut" } : { duration: 0.3 }}
      >
        <Image
          src={slide.image}
          alt={slide.imageAlt}
          fill
          priority={slide.id === "welcome"}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-[center_30%] md:object-[76%_center]"
        />
      </motion.div>

      {/* Mobile: light bottom scrim — photo stays clear above */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[42%] bg-[linear-gradient(to_top,rgba(255,253,251,0.72)_0%,rgba(255,253,251,0.38)_42%,rgba(255,253,251,0.1)_68%,transparent_100%)] md:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] hidden bg-[linear-gradient(to_right,rgba(255,253,251,0.88)_0%,rgba(255,253,251,0.62)_22%,rgba(255,253,251,0.22)_36%,rgba(255,253,251,0.06)_46%,transparent_60%)] md:block"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-[360px] items-end px-5 pb-12 pt-6 md:min-h-[420px] md:items-center md:px-10 md:py-12 lg:min-h-[460px] lg:px-14">
        <motion.div
          className={`w-full max-w-xl md:max-w-[48%] lg:max-w-[44%] ${
            alignCenter ? "mx-auto text-center md:mx-0 md:text-left" : "text-left"
          }`}
          initial={false}
          animate={
            isActive
              ? { opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.08 } }
              : { opacity: 0, x: -16 }
          }
        >
          {slide.arabicWelcome && (
            <p
              className="font-arabic-display text-[1.5rem] font-bold leading-tight tracking-wide md:text-[2.15rem] lg:text-[2.5rem]"
              style={{ color: HOME_COLORS.primary, textShadow: MOBILE_TEXT_GLOW }}
            >
              {slide.arabicWelcome}
            </p>
          )}

          <h1
            className={
              slide.titleClassName ??
              "mt-1.5 font-display text-[2.4rem] font-semibold leading-[1.02] text-[#2D2346] md:mt-2 md:text-[3.65rem] md:leading-[0.98] md:[text-shadow:none] lg:text-[4.35rem]"
            }
            style={{ textShadow: MOBILE_TEXT_GLOW }}
          >
            {slide.title.split("\n").map((line, i) => (
              <span key={i} className="block md:[text-shadow:none]">
                {line}
              </span>
            ))}
          </h1>

          {slide.subtitle && (
            <p
              className="mt-1.5 font-script text-[1.4rem] md:mt-2 md:text-[2.15rem] md:[text-shadow:none] lg:text-[2.65rem]"
              style={{ color: HOME_COLORS.accent, textShadow: MOBILE_TEXT_GLOW }}
            >
              {slide.subtitle}
            </p>
          )}

          <p
            className={`mt-3 max-w-md text-[13px] leading-relaxed text-[#2D2346]/82 md:mt-4 md:text-[15px] md:text-[#2D2346]/68 md:[text-shadow:none] ${
              slide.titleClassName ? "font-arabic-display text-sm md:text-lg" : ""
            } ${alignCenter ? "mx-auto md:mx-0" : ""}`}
            style={{ textShadow: MOBILE_TEXT_GLOW }}
          >
            {slide.description}
          </p>

          <div
            className={`mt-5 flex flex-wrap items-center gap-3 md:mt-6 ${
              alignCenter ? "justify-center md:justify-start" : ""
            }`}
          >
            {slide.cta.type === "link" ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={slide.cta.href ?? "/produits"}
                  className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.25)] transition hover:brightness-105 md:px-8 md:py-4 md:text-base"
                  style={{ backgroundColor: HOME_COLORS.primary }}
                >
                  {slide.cta.label}
                  <ArrowRight size={18} weight="bold" />
                </Link>
              </motion.div>
            ) : (
              <PhoneButton label={slide.cta.label} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
