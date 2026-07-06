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

      {/* Mobile: bottom-half scrim only — top of photo stays clear */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] md:hidden"
        style={{
          background:
            "linear-gradient(to top, rgba(255,253,251,0.78) 0%, rgba(255,253,251,0.42) 42%, rgba(255,253,251,0.12) 72%, transparent 100%)",
        }}
        aria-hidden
      />
      {/* Desktop: left-side fade */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(255,253,251,0.88)_0%,rgba(255,253,251,0.62)_22%,rgba(255,253,251,0.22)_36%,rgba(255,253,251,0.06)_46%,transparent_60%)] md:block"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-end px-5 pb-11 pt-6 md:min-h-[420px] md:justify-center md:px-10 md:py-12 lg:min-h-[460px] lg:px-14">
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
              style={{ color: HOME_COLORS.primary }}
            >
              {slide.arabicWelcome}
            </p>
          )}

          <h1
            className={
              slide.titleClassName ??
              "mt-1.5 font-display text-[2.4rem] font-semibold leading-[1.02] text-[#2D2346] md:mt-2 md:text-[3.65rem] md:leading-[0.98] lg:text-[4.35rem]"
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
              className="mt-1.5 font-script text-[1.4rem] md:mt-2 md:text-[2.15rem] lg:text-[2.65rem]"
              style={{ color: HOME_COLORS.accent }}
            >
              {slide.subtitle}
            </p>
          )}

          <p
            className={`mt-3 max-w-md text-[13px] leading-relaxed text-[#2D2346]/75 md:mt-4 md:text-[15px] md:text-[#2D2346]/68 ${
              slide.titleClassName ? "font-arabic-display text-sm md:text-lg" : ""
            } ${alignCenter ? "mx-auto md:mx-0" : ""}`}
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
