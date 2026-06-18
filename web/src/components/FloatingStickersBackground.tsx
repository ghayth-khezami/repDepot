"use client";

import type { CSSProperties } from "react";

type StickerSpec = {
  src: string;
  top: string;
  side: "left" | "right";
  offset: string;
  size: number;
  blur: number;
  rotate: number;
  duration: number;
  delay: number;
};

const STICKERS: StickerSpec[] = [
  { src: "/sticker 2.png", top: "8%", side: "left", offset: "5%", size: 112, blur: 3, rotate: -14, duration: 8, delay: 0 },
  { src: "/sticker 3.png", top: "16%", side: "right", offset: "6%", size: 100, blur: 4, rotate: 12, duration: 9.5, delay: 0.6 },
  { src: "/sticker 4.png", top: "24%", side: "left", offset: "8%", size: 92, blur: 2, rotate: 8, duration: 10, delay: 1.2 },
  { src: "/sticker 5.png", top: "32%", side: "right", offset: "4%", size: 108, blur: 3, rotate: -10, duration: 11, delay: 0.3 },
  { src: "/sticker 6.png", top: "40%", side: "left", offset: "3%", size: 98, blur: 4, rotate: 16, duration: 8.5, delay: 1.8 },
  { src: "/sticker 7.png", top: "48%", side: "right", offset: "7%", size: 88, blur: 2, rotate: -6, duration: 12, delay: 0.9 },
  { src: "/sticker 9.png", top: "56%", side: "left", offset: "6%", size: 114, blur: 3, rotate: 12, duration: 9, delay: 2.4 },
  { src: "/sticker 10.png", top: "64%", side: "right", offset: "5%", size: 94, blur: 4, rotate: -12, duration: 10.5, delay: 0.5 },
  { src: "/sticker 11.png", top: "72%", side: "left", offset: "4%", size: 90, blur: 3, rotate: 4, duration: 8, delay: 2.9 },
  { src: "/sticket 1 .png", top: "80%", side: "right", offset: "8%", size: 106, blur: 2, rotate: -8, duration: 11.5, delay: 1.5 },
  { src: "/stiker 8.png", top: "88%", side: "left", offset: "7%", size: 102, blur: 3, rotate: 14, duration: 9.5, delay: 2.1 },
];

export function FloatingStickersBackground() {
  return (
    <div className="floating-stickers-layer" aria-hidden>
      {STICKERS.map((sticker) => (
        <div
          key={sticker.src}
          className="floating-sticker"
          style={
            {
              top: sticker.top,
              left: sticker.side === "left" ? sticker.offset : undefined,
              right: sticker.side === "right" ? sticker.offset : undefined,
              width: sticker.size,
              "--sticker-blur": `${sticker.blur}px`,
              "--sticker-rotate": `${sticker.rotate}deg`,
              "--float-duration": `${sticker.duration}s`,
              "--float-delay": `${sticker.delay}s`,
            } as CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sticker.src} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}
