"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { fr, WANTED_IMG_2, WANTED_IMG_5 } from "@/lib/fr";
import { Mark } from "@/types";

export function MarksCarousel() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const visible = 6;

  useEffect(() => {
    api
      .getMarks()
      .then(setMarks)
      .catch(() => setMarks([]));
  }, []);

  if (marks.length === 0) return null;

  const maxIndex = Math.max(0, marks.length - visible);

  const shift = () => {
    const w = trackRef.current?.firstElementChild?.clientWidth ?? 128;
    return index * (w + 16);
  };

  return (
    <section className="page-container py-6">
      <div className="marks-title-row mb-10 md:mb-20">
        <div className="marks-title-side marks-title-side--left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WANTED_IMG_2}
            alt=""
            className="marks-title-baby marks-title-baby--left"
            draggable={false}
          />
          <span className="marks-title-line" aria-hidden />
        </div>
        <h2 className="marks-title-text">{fr.ourBrands}</h2>
        <div className="marks-title-side marks-title-side--right">
          <span className="marks-title-line" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WANTED_IMG_5}
            alt=""
            className="marks-title-baby marks-title-baby--right"
            draggable={false}
          />
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition hover:border-primary disabled:opacity-30 md:left-0"
          aria-label="Marques précédentes"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
          disabled={index >= maxIndex}
          className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition hover:border-primary disabled:opacity-30 md:right-0"
          aria-label="Marques suivantes"
        >
          <ChevronRight size={20} />
        </button>

        <div className="overflow-hidden px-10 md:px-12">
          <div
            ref={trackRef}
            className="flex gap-4 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${shift()}px)` }}
          >
            {marks.map((mark) => {
              const logo = api.normalizePhotoUrl(mark.logoDoc);
              return (
                <Link
                  key={mark.id}
                  href={`/marques/${mark.id}`}
                  title={mark.name}
                  className="group flex h-28 w-28 shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-[var(--shadow-lift)] md:h-32 md:w-32"
                >
                  <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden p-3">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt={mark.name}
                        className="max-h-14 max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105 md:max-h-16"
                      />
                    ) : (
                      <span className="line-clamp-2 px-1 text-center text-xs text-muted-foreground">
                        {mark.name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
