"use client";

import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { SOCIAL, STORE_PHONE_TEL } from "@/lib/social";

export function FloatingContactButtons() {
  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3 md:bottom-8 md:right-6">
      <motion.a
        href={`tel:${STORE_PHONE_TEL}`}
        aria-label="Appeler"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E04672] text-white shadow-[0_4px_16px_rgba(224,70,114,0.25)] md:h-15 md:w-15"
      >
        <Phone size={22} strokeWidth={2.25} />
      </motion.a>

      <motion.a
        href={SOCIAL.whatsapp.href}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#25D366] shadow-[0_4px_16px_rgba(37,211,102,0.35)] md:h-15 md:w-15"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SOCIAL.whatsapp.logoSrc} alt="" className="h-8 w-8 object-contain" />
      </motion.a>
    </div>
  );
}
