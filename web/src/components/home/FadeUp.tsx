"use client";

import { motion } from "framer-motion";
import { EASE_PRIMARY } from "@/lib/motion";

export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, ease: EASE_PRIMARY, delay }}
    >
      {children}
    </motion.div>
  );
}
