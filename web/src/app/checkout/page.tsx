"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/context/ShopContext";
import { CheckoutOrderForm } from "@/components/CheckoutOrderForm";
import { OrderSuccessModal } from "@/components/OrderSuccessModal";
import { fr } from "@/lib/fr";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useShop();
  const [successOpen, setSuccessOpen] = useState(false);

  return (
    <>
      <OrderSuccessModal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          router.push("/");
        }}
      />

      <div className="page-container max-w-2xl space-y-8 py-4">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft size={16} />
          {fr.backToCart}
        </Link>

        <div>
          <p className="tag-eyebrow">{fr.payment}</p>
          <h1 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.finalizeOrder}</h1>
        </div>

        <div className="surface-card p-8">
          <CheckoutOrderForm
            onSuccess={() => setSuccessOpen(true)}
            className={cart.length === 0 ? "pointer-events-none opacity-50" : ""}
          />
        </div>
      </div>
    </>
  );
}
