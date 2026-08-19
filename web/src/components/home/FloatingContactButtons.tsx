"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { SOCIAL, STORE_EMAIL, STORE_PHONE_TEL } from "@/lib/social";

export function FloatingContactButtons() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY < 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed bottom-6 right-4 z-40 flex flex-col gap-2 md:bottom-8 md:right-6"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.a
            href={`tel:${STORE_PHONE_TEL}`}
            aria-label="Appeler"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E04672] text-white shadow-[0_4px_10px_rgba(224,70,114,0.25)]"
          >
            <Phone size={16} strokeWidth={2} />
          </motion.a>

          <motion.a
            href={SOCIAL.whatsapp.href}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#25D366] shadow-[0_4px_10px_rgba(37,211,102,0.35)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SOCIAL.whatsapp.logoSrc} alt="" className="h-5 w-5 object-contain" />
          </motion.a>

          <motion.a
            href={`mailto:${STORE_EMAIL}`}
            aria-label="Envoyer un e-mail"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EA4335] text-white shadow-[0_4px_10px_rgba(234,67,53,0.3)]"
          >
            <Mail size={16} strokeWidth={2} />
          </motion.a>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
