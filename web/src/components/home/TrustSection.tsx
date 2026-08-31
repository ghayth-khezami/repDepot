"use client";

import Image from "next/image";
import {
  ArrowCounterClockwise,
  ChatCircleDots,
  CreditCard,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";
import { TRUST_ITEMS, HOME_COLORS, type TrustItemKey } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { FloatingStickers } from "./FloatingStickers";

const TRUST_ICONS: Record<TrustItemKey, Icon> = {
  CreditCard,
  ArrowCounterClockwise,
  ChatCircleDots,
  ShieldCheck,
};

export function TrustSection() {
  if (!TRUST_ITEMS.length) return null;

  return (
    <FadeUp>
      <section id="trust" className="home-stickers-zone relative scroll-mt-28">
        <FloatingStickers seed={3} />

        <div className="home-stickers-content w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FFF0F4] via-white to-[#FFF5F0] p-6 shadow-[0_8px_32px_rgba(224,70,114,0.08)] md:rounded-[2.5rem] md:p-10 lg:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] shadow-[0_20px_50px_rgba(45,35,70,0.12)] lg:max-w-none">
              <Image
                src="/header.png"
                alt="Mme Khezami avec bébé"
                fill
                sizes="(max-width: 1024px) 80vw, 45vw"
                className="object-cover"
              />
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="font-display text-3xl leading-tight text-[#2D2346] md:text-4xl lg:text-[2.75rem]">
                  Pourquoi les mamans
                  <br />
                  nous font confiance{" "}
                  <span style={{ color: HOME_COLORS.accent }}>❤️</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {TRUST_ITEMS.map((item) => {
                  const IconComp = TRUST_ICONS[item.icon];
                  return (
                    <div
                      key={item.title}
                      className="flex gap-4 rounded-2xl bg-white/80 p-4 shadow-[0_4px_20px_rgba(45,35,70,0.05)] backdrop-blur-sm md:p-5"
                    >
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: HOME_COLORS.secondary }}
                      >
                        <IconComp
                          size={24}
                          weight="duotone"
                          style={{ color: HOME_COLORS.primary }}
                        />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#2D2346] md:text-base">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#2D2346]/60 md:text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
