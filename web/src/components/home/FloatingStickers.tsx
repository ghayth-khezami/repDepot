"use client";

import { FLOATING_STICKERS } from "@/lib/home";

const PLACEMENTS = [
  { src: 0, side: "left" as const, top: 6, size: 44, rotate: -12, delay: 0, duration: 11 },
  { src: 1, side: "right" as const, top: 14, size: 38, rotate: 8, delay: 1.2, duration: 9 },
  { src: 2, side: "left" as const, top: 28, size: 52, rotate: -20, delay: 0.5, duration: 13 },
  { src: 3, side: "right" as const, top: 38, size: 42, rotate: 14, delay: 2, duration: 10 },
  { src: 4, side: "left" as const, top: 48, size: 36, rotate: -8, delay: 1.8, duration: 12 },
  { src: 5, side: "right" as const, top: 58, size: 48, rotate: -16, delay: 0.8, duration: 8 },
  { src: 6, side: "left" as const, top: 68, size: 40, rotate: 18, delay: 2.5, duration: 11 },
  { src: 7, side: "right" as const, top: 22, size: 34, rotate: -10, delay: 1.5, duration: 14 },
  { src: 8, side: "left" as const, top: 78, size: 46, rotate: 6, delay: 3, duration: 9 },
  { src: 9, side: "right" as const, top: 72, size: 50, rotate: -22, delay: 0.3, duration: 12 },
  { src: 10, side: "left" as const, top: 18, size: 32, rotate: 12, delay: 2.2, duration: 10 },
];

export function FloatingStickers({ seed = 0 }: { seed?: number }) {
  const offset = seed * 7;

  return (
    <div className="floating-stickers-viewport hidden lg:block" aria-hidden>
      {PLACEMENTS.map((p, i) => {
        const src = FLOATING_STICKERS[(p.src + seed) % FLOATING_STICKERS.length];
        const top = `${Math.min(85, p.top + (offset % 12))}%`;
        return (
          <div
            key={`${src}-${i}`}
            className={`floating-sticker ${p.side === "left" ? "floating-sticker--left" : "floating-sticker--right"}`}
            style={{
              top,
              width: p.size,
              ["--float-delay" as string]: `${p.delay}s`,
              ["--float-duration" as string]: `${p.duration}s`,
              ["--sticker-rotate" as string]: `${p.rotate + (seed % 5)}deg`,
              ["--sticker-blur" as string]: "2px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" width={p.size} height={p.size} />
          </div>
        );
      })}
    </div>
  );
}
