"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { HOME_COLORS } from "@/lib/home";

export function OrderSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#2D2346]/40 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-white p-8 text-center shadow-[0_20px_60px_rgba(45,35,70,0.18)]"
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${HOME_COLORS.secondary}` }}
            >
              <CheckCircle size={36} weight="fill" style={{ color: HOME_COLORS.primary }} />
            </div>
            <h2 className="mt-5 font-display text-2xl text-[#2D2346]">Commande confirmée !</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#2D2346]/65">
              Merci pour votre confiance. Nous vous contacterons très bientôt pour confirmer la
              livraison.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/history"
                className="rounded-full py-3 text-sm font-semibold text-white transition hover:brightness-105"
                style={{ backgroundColor: HOME_COLORS.primary }}
                onClick={onClose}
              >
                Voir mes commandes
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full py-3 text-sm font-medium text-[#2D2346]/70 transition hover:text-[#E04672]"
              >
                Continuer mes achats
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
