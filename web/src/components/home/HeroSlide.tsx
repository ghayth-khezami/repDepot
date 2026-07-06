"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { HeroSlideData } from "@/lib/home";
import { HOME_COLORS } from "@/lib/home";
import { PhoneButton } from "./PhoneButton";

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
          className="object-cover object-[80%_center] md:object-[76%_center]"
        />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,253,251,0.95)_0%,rgba(255,253,251,0.72)_22%,rgba(255,253,251,0.28)_42%,transparent_58%)] md:bg-[linear-gradient(to_right,rgba(255,253,251,0.82)_0%,rgba(255,253,251,0.55)_22%,rgba(255,253,251,0.18)_34%,rgba(255,253,251,0.04)_44%,transparent_58%)]"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-[360px] items-end px-5 pb-8 pt-14 md:min-h-[420px] md:items-center md:px-10 md:py-12 lg:min-h-[460px] lg:px-14">
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
          <div className="inline-block max-w-full rounded-[1.25rem] px-1 py-1 md:bg-transparent md:p-0">
          {slide.arabicWelcome && (
            <p
              className="font-arabic-display text-[1.65rem] font-bold leading-tight tracking-wide md:text-[2.15rem] lg:text-[2.5rem]"
              style={{ color: HOME_COLORS.primary }}
            >
              {slide.arabicWelcome}
            </p>
          )}

          <h1
            className={
              slide.titleClassName ??
              "mt-2 font-display text-[2.85rem] font-semibold leading-[0.98] text-[#2D2346] md:text-[3.65rem] lg:text-[4.35rem]"
            }
          >
            {slide.title.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>

          {slide.subtitle && (
            <p
              className="mt-2 font-script text-[1.65rem] md:text-[2.15rem] lg:text-[2.65rem]"
              style={{ color: HOME_COLORS.accent }}
            >
              {slide.subtitle}
            </p>
          )}

          <p
            className={`mt-4 max-w-md text-sm leading-relaxed text-[#2D2346]/68 md:text-[15px] ${
              slide.titleClassName ? "font-arabic-display text-base md:text-lg" : ""
            } ${alignCenter ? "mx-auto md:mx-0" : ""}`}
          >
            {slide.description}
          </p>

          <div
            className={`mt-6 flex flex-wrap items-center gap-3 ${
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
