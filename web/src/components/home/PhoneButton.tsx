"use client";

import { motion } from "framer-motion";
import { Phone } from "@phosphor-icons/react";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/social";
import { HOME_COLORS } from "@/lib/home";

export function PhoneButton({
  label = STORE_PHONE_DISPLAY,
  className = "",
  size = "lg",
}: {
  label?: string;
  className?: string;
  size?: "md" | "lg";
}) {
  const sizes =
    size === "lg"
      ? "gap-3 px-8 py-4 text-base md:text-lg"
      : "gap-2 px-5 py-3 text-sm";

  return (
    <motion.a
      href={`tel:${STORE_PHONE_TEL}`}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shadow-[0_4px_16px_rgba(224,70,114,0.22)] transition-shadow hover:shadow-[0_6px_20px_rgba(224,70,114,0.28)] ${sizes} ${className}`}
      style={{ backgroundColor: HOME_COLORS.primary }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
        <Phone size={18} weight="fill" />
      </span>
      <span>{label}</span>
    </motion.a>
  );
}
