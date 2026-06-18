"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { StoreHoursRow } from "@/components/StoreHoursRow";
import { fr } from "@/lib/fr";
import { api } from "@/lib/api";
import { StoreHour } from "@/lib/store-hours";

const RADIUS = "rounded-[var(--radius)]";

export default function MagasinPage() {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStoreHours()
      .then((data) => setHours(data as StoreHour[]))
      .catch(() => setHours([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-container space-y-10 py-6 md:space-y-14 md:py-10">
        <section className="space-y-5 text-center">
          <h1 className="display text-4xl text-plum-deep md:text-5xl">{fr.visitStore}</h1>
          <div className={`mx-auto max-w-3xl overflow-hidden ${RADIUS} shadow-[var(--shadow-lift)]`}>
            <Image
              src="/depoo.jpg"
              alt={fr.visitStore}
              width={1200}
              height={800}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="display text-center text-2xl text-plum-deep md:text-3xl">{fr.locatedAt}</h2>
          <div className={`mx-auto max-w-3xl overflow-hidden ${RADIUS} shadow-[var(--shadow-soft)]`}>
            <Image
              src="/POSITION.png"
              alt="Bébé dépôt — Manouba"
              width={1200}
              height={700}
              className="h-auto w-full object-cover"
            />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="display text-center text-2xl text-plum-deep md:text-3xl">{fr.hoursTitle}</h2>
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">{fr.loading}</p>
          ) : (
            <StoreHoursRow hours={hours} />
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
