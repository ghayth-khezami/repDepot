"use client";

import Link from "next/link";
import { SHOP_AGES, shopAgeHref } from "@/lib/shop-ages";
import { FadeUp } from "./FadeUp";

function AgePills({ tone }: { tone: "boy" | "girl" }) {
  const pill =
    tone === "boy"
      ? "border-[#c5daf8] bg-white/90 text-[#4f78c7] shadow-[0_6px_16px_rgba(90,130,200,0.12)] hover:border-[#8fb4ea] hover:bg-white"
      : "border-[#f5c4d4] bg-white/90 text-[#d36b8c] shadow-[0_6px_16px_rgba(210,90,130,0.12)] hover:border-[#ee9fb6] hover:bg-white";

  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        {SHOP_AGES.slice(0, 3).map((age) => (
          <Link
            key={`${tone}-${age.slug}`}
            href={shopAgeHref(age.slug)}
            className={`flex h-[58px] w-[84px] flex-col items-center justify-center rounded-[1.35rem] border text-center transition sm:h-[62px] sm:w-[90px] ${pill}`}
          >
            <span className="text-[11px] font-bold leading-tight sm:text-xs">{age.labelLine1}</span>
            <span className="text-[10px] font-semibold leading-tight">{age.labelLine2}</span>
          </Link>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {SHOP_AGES.slice(3).map((age) => (
          <Link
            key={`${tone}-${age.slug}`}
            href={shopAgeHref(age.slug)}
            className={`flex h-[58px] w-[84px] flex-col items-center justify-center rounded-[1.35rem] border text-center transition sm:h-[62px] sm:w-[90px] ${pill}`}
          >
            <span className="text-[11px] font-bold leading-tight sm:text-xs">{age.labelLine1}</span>
            <span className="text-[10px] font-semibold leading-tight">{age.labelLine2}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ShopByAgeSection() {
  return (
    <FadeUp>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[#f4ddd0] bg-[#fffdfb] px-3 py-6 shadow-[0_12px_36px_rgba(45,35,70,0.06)] sm:px-5 sm:py-8 md:rounded-[2.2rem] md:px-8">
        <div className="mb-5 text-center md:mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#c9a48a]">Notre sélection</p>
          <h2 className="mt-1 font-arabic-display text-2xl text-[#4b3a78] sm:text-3xl md:text-[2.35rem]" dir="rtl">
            <span className="text-[#e58aa8]">♥</span> نشري حسب عمر <span className="text-[#e58aa8]">♥</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-4">
          <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#eaf4ff] to-[#f7fbff] px-2 py-4 sm:px-4 sm:py-5">
            <div className="flex items-center gap-1 sm:gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/babyboy.png"
                alt="Pour mon garçon"
                className="h-[160px] w-[125px] shrink-0 object-contain sm:h-[220px] sm:w-[175px] md:h-[250px] md:w-[195px]"
              />
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <p className="mb-3 font-arabic text-lg font-semibold text-[#5d7fc4] sm:text-xl" dir="rtl">
                  لولدي ♥
                </p>
                <AgePills tone="boy" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-bl from-[#ffeef4] to-[#fff8fb] px-2 py-4 sm:px-4 sm:py-5">
            <div className="flex flex-row-reverse items-center gap-1 sm:gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/babygirl.png"
                alt="Pour ma fille"
                className="h-[160px] w-[125px] shrink-0 object-contain sm:h-[220px] sm:w-[175px] md:h-[250px] md:w-[195px]"
              />
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <p className="mb-3 font-arabic text-lg font-semibold text-[#d36b8c] sm:text-xl" dir="rtl">
                  لبنتي ♥
                </p>
                <AgePills tone="girl" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
