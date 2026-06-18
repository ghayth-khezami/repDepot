"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { fr } from "@/lib/fr";
import { ClientFeedback } from "@/types";
import { fadeUp } from "@/lib/motion";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={n <= rating ? "fill-primary text-primary" : "text-border"}
          strokeWidth={n <= rating ? 0 : 1.5}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ item }: { item: ClientFeedback }) {
  return (
    <article className="glass-card w-[min(85vw,300px)] shrink-0 space-y-4 p-6 shadow-[var(--shadow-soft)] sm:w-[300px]">
      <Stars rating={item.rating} />
      <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{item.description}&rdquo;</p>
      <p className="display text-lg text-plum-deep">— {item.clientName}</p>
    </article>
  );
}

export function ClientFeedbacksCarousel() {
  const [items, setItems] = useState<ClientFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getClientFeedbacks()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  const loopItems = [...items, ...items];
  const duration = Math.max(items.length * 10, 28);

  return (
    <section className="py-4">
      <div className="page-container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <p className="tag-eyebrow">{fr.clientFeedbacksEyebrow}</p>
          <h2 className="display mt-2 text-4xl text-plum-deep md:text-5xl">{fr.clientFeedbacksTitle}</h2>
        </motion.div>
      </div>

      <div className="full-bleed-track mt-10 overflow-hidden">
        <div
          className="feedback-marquee flex w-max gap-4 md:gap-5"
          style={{ animationDuration: `${duration}s` }}
        >
          {loopItems.map((item, i) => (
            <FeedbackCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
