"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_PRIMARY } from "@/lib/motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function ScrollReveal({ children, className, delay = 0 }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.7, ease: EASE_PRIMARY, delay }}
    >
      {children}
    </motion.div>
  );
}
