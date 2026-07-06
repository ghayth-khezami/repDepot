"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ClientFeedback } from "@/types";
import { fr } from "@/lib/fr";
import { STORE_CONTAINER } from "@/lib/home";
import { FadeUp } from "./FadeUp";
import { TestimonialCard } from "./TestimonialCard";

export function TestimonialsCarousel() {
  const [items, setItems] = useState<ClientFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getClientFeedbacks()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <FadeUp>
        <section className={`space-y-8 ${STORE_CONTAINER}`}>
          <div className="h-10 w-48 animate-pulse rounded-full bg-[#FFF0F4]" />
        </section>
      </FadeUp>
    );
  }

  if (items.length === 0) return null;

  const loopItems = [...items, ...items];
  const duration = Math.max(items.length * 18, 40);

  return (
    <FadeUp>
      <section className="space-y-8">
        <div className={STORE_CONTAINER}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E04672]">
            {fr.clientFeedbacksEyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl text-[#2D2346] md:text-4xl">
            Elles nous aiment
          </h2>
        </div>

        <div className="full-bleed-track overflow-hidden">
          <div
            className="feedback-marquee flex w-max gap-4 md:gap-5"
            style={{ animationDuration: `${duration}s` }}
          >
            {loopItems.map((item, i) => (
              <div key={`${item.id}-${i}`} className="w-[min(85vw,340px)] shrink-0 sm:w-[340px] md:w-[380px]">
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
