"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LOGO_SRC, fr } from "@/lib/fr";

const LOADER_MS = 1400;

export function LogoLoader({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(t);
    }
    setShow(true);
  }, [visible]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="logo-loader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ backgroundColor: "var(--cream)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: visible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          aria-busy={visible}
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              className="absolute h-52 w-52 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.82 0.09 300 / 0.45) 0%, transparent 70%)" }}
              animate={{ scale: [0.85, 1.12, 0.85], opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <motion.div
              animate={{ rotate: [0, 4, 0, -4, 0], y: [0, -8, 0] }}
              transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={LOGO_SRC}
                  alt={fr.brand}
                  width={168}
                  height={168}
                  className="relative z-10 h-36 w-36 object-contain drop-shadow-[0_20px_40px_oklch(0.55_0.16_295_/_0.25)] sm:h-40 sm:w-40"
                  priority
                />
              </motion.div>
            </motion.div>
            <motion.p
              className="relative z-10 mt-6 display text-xl text-gradient sm:text-2xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
            >
              {fr.brand}
            </motion.p>
            <motion.div
              className="relative z-10 mt-5 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ y: [0, -6, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{
                    duration: 0.9,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
