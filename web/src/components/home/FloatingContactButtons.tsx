"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { SOCIAL, STORE_PHONE_TEL } from "@/lib/social";

const SCROLL_HIDE_AFTER = 80;

export function FloatingContactButtons() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < SCROLL_HIDE_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-4 z-40 flex flex-col gap-3 md:bottom-8 md:right-6"
        >
          <motion.a
            href={`tel:${STORE_PHONE_TEL}`}
            aria-label="Appeler"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E04672] text-white shadow-[0_4px_16px_rgba(224,70,114,0.25)]"
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
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#25D366] shadow-[0_4px_16px_rgba(37,211,102,0.35)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SOCIAL.whatsapp.logoSrc} alt="" className="h-8 w-8 object-contain" />
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
