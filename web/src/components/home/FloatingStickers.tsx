"use client";

import { FLOATING_STICKERS } from "@/lib/home";

function seededRandom(seed: number, i: number) {
  const x = Math.sin(seed * 9999 + i * 127.1) * 10000;
  return x - Math.floor(x);
}

type Placement = {
  src: string;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  delay: number;
  duration: number;
};

function buildPlacements(seed: number, count = 14): Placement[] {
  return Array.from({ length: count }, (_, i) => {
    const r = seededRandom(seed, i);
    const r2 = seededRandom(seed + 3, i);
    const r3 = seededRandom(seed + 7, i);
    const side = r > 0.5 ? "right" : "left";
    const top = 4 + r2 * 82;
    const size = 28 + Math.floor(r3 * 28);
    const offset = 2 + r * 14;

    return {
      src: FLOATING_STICKERS[(i + seed) % FLOATING_STICKERS.length],
      top: `${top}%`,
      ...(side === "left" ? { left: `${offset}%` } : { right: `${offset}%` }),
      size,
      rotate: -24 + r * 48,
      delay: r2 * 3,
      duration: 8 + r3 * 6,
    };
  });
}

export function FloatingStickers({ seed = 0 }: { seed?: number }) {
  const placements = buildPlacements(seed);

  return (
    <div className="floating-stickers-viewport" aria-hidden>
      {placements.map((p, i) => (
        <div
          key={`${p.src}-${i}`}
          className="floating-sticker"
          style={{
            top: p.top,
            left: p.left,
            right: p.right,
            width: p.size,
            ["--float-delay" as string]: `${p.delay}s`,
            ["--float-duration" as string]: `${p.duration}s`,
            ["--sticker-rotate" as string]: `${p.rotate}deg`,
            ["--sticker-blur" as string]: "2px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt="" width={p.size} height={p.size} />
        </div>
      ))}
    </div>
  );
}
