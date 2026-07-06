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
  const isArabic = Boolean(slide.titleClassName);

  return (
    <div className="relative h-full min-h-[380px] w-full md:min-h-[420px] lg:min-h-[460px]">
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
          className={`object-cover ${isArabic ? "object-[center_30%]" : "object-[80%_center]"} md:object-[76%_center]`}
        />
      </motion.div>

      {/* Mobile: strong bottom scrim */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,253,251,1)_0%,rgba(255,253,251,0.92)_18%,rgba(255,253,251,0.55)_38%,rgba(255,253,251,0.12)_55%,transparent_72%)] md:bg-[linear-gradient(to_right,rgba(255,253,251,0.88)_0%,rgba(255,253,251,0.55)_24%,rgba(255,253,251,0.15)_38%,transparent_58%)]"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-[380px] items-end px-4 pb-10 pt-16 md:min-h-[420px] md:items-center md:px-10 md:py-12 lg:min-h-[460px] lg:px-14">
        <motion.div
          className={`w-full md:max-w-[48%] lg:max-w-[44%] ${
            alignCenter ? "mx-auto text-center md:mx-0 md:text-left" : "text-left"
          }`}
          initial={false}
          animate={
            isActive
              ? { opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.08 } }
              : { opacity: 0, x: -16 }
          }
        >
          <div className="rounded-[1.35rem] bg-white/90 p-4 shadow-[0_8px_32px_rgba(45,35,70,0.1)] backdrop-blur-md md:max-w-lg md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            {slide.arabicWelcome && (
              <p
                className="font-arabic-display text-xl font-bold leading-tight md:text-[2.15rem] lg:text-[2.5rem]"
                style={{ color: HOME_COLORS.primary }}
              >
                {slide.arabicWelcome}
              </p>
            )}

            <h1
              className={
                slide.titleClassName
                  ? `${slide.titleClassName} !text-2xl !leading-snug sm:!text-3xl md:!text-4xl`
                  : "mt-1 font-display text-[2rem] font-semibold leading-[1.02] text-[#2D2346] sm:text-[2.35rem] md:mt-2 md:text-[3.65rem] lg:text-[4.35rem]"
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
                className="mt-1.5 font-script text-xl sm:text-2xl md:mt-2 md:text-[2.15rem] lg:text-[2.65rem]"
                style={{ color: HOME_COLORS.accent }}
              >
                {slide.subtitle}
              </p>
            )}

            <p
              className={`mt-3 max-w-md text-[13px] leading-relaxed text-[#2D2346]/75 sm:text-sm md:mt-4 md:text-[15px] ${
                slide.titleClassName ? "font-arabic-display text-sm sm:text-base md:text-lg" : ""
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
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.25)] transition hover:brightness-105 sm:px-7 sm:py-3.5 md:text-base"
                    style={{ backgroundColor: HOME_COLORS.primary }}
                  >
                    {slide.cta.label}
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                </motion.div>
              ) : (
                <PhoneButton label={slide.cta.label} size="md" />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
