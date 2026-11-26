import Image from "next/image";
import { SearchX } from "lucide-react";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/social";

/** Friendly 404 for an unknown or mistyped tracking link. */
export default function SuiviNotFound() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Image src="/depot.png" alt="Bébé Dépôt" width={56} height={56} className="h-14 w-14 rounded-2xl bg-white object-contain p-1 shadow-card" />
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-3xl bg-grad-pink text-white shadow-glow-pink">
        <SearchX className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-black text-bd-ink">Lien de suivi introuvable</h1>
      <p className="text-sm font-bold text-bd-muted">
        Ce lien n&apos;existe pas ou a été mal recopié. Scannez à nouveau le QR code de votre contrat, ou appelez-nous.
      </p>
      <a href={`tel:${STORE_PHONE_TEL}`} className="inline-flex min-h-[48px] items-center rounded-full bg-grad-pink-strong px-6 font-black text-white shadow-glow-pink">
        Appeler la boutique · {STORE_PHONE_DISPLAY}
      </a>
      <a href="https://bebedepot.tn" className="text-sm font-extrabold text-bd-violet-strong hover:underline">
        Aller sur bebedepot.tn
      </a>
    </div>
  );
}
