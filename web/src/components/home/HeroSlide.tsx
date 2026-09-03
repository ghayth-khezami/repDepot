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
  priority = false,
}: {
  slide: HeroSlideData;
  isActive: boolean;
  priority?: boolean;
}) {
  const alignCenter = slide.align === "center";
  const imageOnly = slide.imageOnly === true;

  const copyBlock = (
    <>
      {slide.arabicWelcome && (
        <p
          className="font-arabic-display text-[1.35rem] font-bold leading-tight tracking-wide md:text-[2.15rem] lg:text-[2.5rem]"
          style={{ color: HOME_COLORS.primary }}
        >
          {slide.arabicWelcome}
        </p>
      )}

      {slide.title && (
        <h1
          className={
            slide.titleClassName ??
            "mt-1 font-display text-[2rem] font-semibold leading-[1.05] text-[#2D2346] md:mt-2 md:text-[3.65rem] md:leading-[0.98] lg:text-[4.35rem]"
          }
        >
          {slide.title.split("\n").map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
      )}

      {slide.subtitle && (
        <p
          className="mt-1 font-script text-[1.25rem] md:mt-2 md:text-[2.15rem] lg:text-[2.65rem]"
          style={{ color: HOME_COLORS.accent }}
        >
          {slide.subtitle}
        </p>
      )}

      {slide.description && (
        <p
          className={`mt-2.5 max-w-md text-[13px] leading-relaxed text-[#2D2346]/72 md:mt-4 md:text-[15px] md:text-[#2D2346]/68 ${
            slide.titleClassName ? "font-arabic-display text-sm md:text-lg" : ""
          } ${alignCenter ? "mx-auto md:mx-0" : ""}`}
        >
          {slide.description}
        </p>
      )}

      {slide.cta && (
        <div
          className={`mt-4 flex flex-wrap items-center gap-3 md:mt-6 ${
            alignCenter ? "justify-center md:justify-start" : ""
          }`}
        >
          {slide.cta.type === "link" ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={slide.cta.href ?? "/produits"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(224,70,114,0.25)] transition hover:brightness-105 sm:w-auto md:px-8 md:py-4 md:text-base"
                style={{ backgroundColor: HOME_COLORS.primary }}
              >
                {slide.cta.label}
                <ArrowRight size={18} weight="bold" />
              </Link>
            </motion.div>
          ) : (
            <PhoneButton label={slide.cta.label} size="md" className="w-full sm:w-auto" />
          )}
        </div>
      )}
    </>
  );

  if (imageOnly) {
    return (
      <>
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-[#F8F4F1] md:hidden">
          <motion.div
            className="absolute inset-0"
            animate={isActive ? { opacity: [0.96, 1] } : { opacity: 1 }}
            transition={isActive ? { duration: 5.5, ease: "easeOut" } : { duration: 0.3 }}
          >
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              priority={priority}
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </div>

        <div className="relative hidden h-full min-h-[420px] w-full bg-[#F8F4F1] lg:min-h-[460px] md:block">
          <motion.div
            className="absolute inset-0"
            animate={isActive ? { opacity: [0.96, 1] } : { opacity: 1 }}
            transition={isActive ? { duration: 5.5, ease: "easeOut" } : { duration: 0.3 }}
          >
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              priority={priority}
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-center"
            />
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Mobile: photo + panel (no text on image) ── */}
      <div className="flex flex-col md:hidden">
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-[#F8F4F1]">
          <motion.div
            className="absolute inset-0"
            animate={isActive ? { opacity: [0.96, 1] } : { opacity: 1 }}
            transition={isActive ? { duration: 5.5, ease: "easeOut" } : { duration: 0.3 }}
          >
            <Image
              src={slide.mobileImage ?? slide.image}
              alt={slide.imageAlt}
              fill
              priority={priority}
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </div>

        <motion.div
          className={`hero-mobile-panel relative z-10 -mt-5 rounded-t-[1.75rem] bg-[#FFFDFB] px-5 pb-10 pt-5 shadow-[0_-12px_40px_rgba(45,35,70,0.07)] ${
            alignCenter ? "text-center" : "text-left"
          }`}
          initial={false}
          animate={
            isActive
              ? { opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.06 } }
              : { opacity: 0, y: 12 }
          }
        >
          {copyBlock}
        </motion.div>
      </div>

      {/* ── Desktop: overlay on photo ── */}
      <div className="relative hidden h-full min-h-[420px] w-full bg-[#F8F4F1] lg:min-h-[460px] md:block">
        <motion.div
          className="absolute inset-0"
          animate={isActive ? { opacity: [0.96, 1] } : { opacity: 1 }}
          transition={isActive ? { duration: 5.5, ease: "easeOut" } : { duration: 0.3 }}
        >
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
          />
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,253,251,0.88)_0%,rgba(255,253,251,0.62)_22%,rgba(255,253,251,0.22)_36%,rgba(255,253,251,0.06)_46%,transparent_60%)]"
          aria-hidden
        />

        <div className="relative z-10 flex h-full min-h-[420px] items-center px-10 py-12 lg:min-h-[460px] lg:px-14">
          <motion.div
            className={`w-full max-w-[48%] lg:max-w-[44%] ${
              alignCenter ? "text-center md:text-left" : "text-left"
            }`}
            initial={false}
            animate={
              isActive
                ? { opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.08 } }
                : { opacity: 0, x: -16 }
            }
          >
            {copyBlock}
          </motion.div>
        </div>
      </div>
    </>
  );
}
