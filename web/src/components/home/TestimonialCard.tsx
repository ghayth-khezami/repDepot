"use client";

import { Star } from "lucide-react";
import { ClientFeedback } from "@/types";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={n <= rating ? "fill-[#E04672] text-[#E04672]" : "text-[#E04672]/20"}
          strokeWidth={n <= rating ? 0 : 1.5}
        />
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E04672] to-[#FF6B8A] text-sm font-bold text-white">
      {initial}
    </div>
  );
}

export function TestimonialCard({ item }: { item: ClientFeedback }) {
  return (
    <article className="flex h-full min-h-[220px] flex-col rounded-[1.75rem] bg-white p-6 shadow-[0_8px_32px_rgba(45,35,70,0.07)] md:p-7">
      <Stars rating={item.rating} />
      <p className="mt-4 flex-1 text-sm leading-relaxed text-[#2D2346]/70 md:text-[15px]">
        &ldquo;{item.description}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3 border-t border-[#FFF0F4] pt-4">
        <Avatar name={item.clientName} />
        <p className="font-semibold text-[#2D2346]">{item.clientName}</p>
      </div>
    </article>
  );
}
