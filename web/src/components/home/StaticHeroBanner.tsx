"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

export function StaticHeroBanner() {
  return (
    <section className="px-0 pb-4 pt-2 sm:px-5 sm:pb-5 md:px-8 md:pb-8 md:pt-6">
      <div className="relative mx-auto w-full max-w-[2078px] overflow-hidden rounded-none shadow-[0_12px_36px_rgba(45,35,70,0.12)] sm:rounded-[1.35rem] md:rounded-[2rem]">
        <Image
          src="/carrousel.png"
          alt="Bienvenue chez Bébé Dépôt"
          width={2078}
          height={768}
          priority
          sizes="100vw"
          className="block h-[250px] w-full object-cover object-center sm:h-[320px] sm:object-cover md:h-auto md:object-contain lg:h-auto"
        />
      </div>
      <div className="mx-auto mt-3 flex max-w-[2078px] justify-center px-3 sm:mt-4 sm:justify-start sm:px-1 md:mt-5">
        <Link
          href="/produits"
          className="inline-flex items-center gap-2 rounded-full bg-[#7f1d1d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(69,10,10,0.3)] transition hover:bg-[#991b1b] hover:shadow-[0_7px_20px_rgba(69,10,10,0.4)] sm:px-6 sm:py-3 md:text-base"
        >
          Découvrir les produits
          <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
