"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Heart, PackagePlus, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fr } from "@/lib/fr";
import { fadeUp } from "@/lib/motion";

const HERO_VIDEO = "/location.mp4";
const VIDEO_PLAYBACK_RATE = 0.5;
const VIDEO_START_DELAY_MS = 2000;
const LOOP_CROSSFADE_MS = 900;

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: fr.trustVerified, desc: fr.trustVerifiedDesc },
  { icon: Truck, title: fr.trustDelivery, desc: fr.trustDeliveryDesc },
  { icon: Heart, title: fr.trustBaby, desc: fr.trustBabyDesc },
] as const;

type Props = {
  onDeposit: () => void;
};

function VideoLayer({
  videoRef,
  visible,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  visible: boolean;
}) {
  return (
    <div
      className="absolute inset-0 transition-opacity ease-in-out"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${LOOP_CROSSFADE_MS}ms`,
      }}
      aria-hidden={!visible}
    >
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        muted
        playsInline
        preload="auto"
        className="hero-video-crop"
      />
    </div>
  );
}

export function HeroVideoCarousel({ onDeposit }: Props) {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<"a" | "b">("a");
  const [canPlay, setCanPlay] = useState(false);
  const transitioning = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setCanPlay(true), VIDEO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const activeVideo = useCallback(() => {
    return front === "a" ? videoA.current : videoB.current;
  }, [front]);

  useEffect(() => {
    const v = activeVideo();
    if (!v || !canPlay) return;
    v.playbackRate = VIDEO_PLAYBACK_RATE;
    v.play().catch(() => {
      /* autoplay may be blocked until interaction */
    });
  }, [activeVideo, canPlay]);

  useEffect(() => {
    const v = activeVideo();
    if (!v) return;

    const onEnded = async () => {
      if (transitioning.current) return;
      transitioning.current = true;

      const nextFront = front === "a" ? "b" : "a";
      const next = nextFront === "a" ? videoA.current : videoB.current;
      const cur = activeVideo();
      if (!next || !cur) {
        transitioning.current = false;
        if (cur) {
          cur.currentTime = 0;
          cur.play().catch(() => undefined);
        }
        return;
      }

      next.currentTime = 0;
      next.playbackRate = VIDEO_PLAYBACK_RATE;
      try {
        await next.play();
      } catch {
        /* ignore */
      }

      setFront(nextFront);

      window.setTimeout(() => {
        cur.pause();
        cur.currentTime = 0;
        transitioning.current = false;
      }, LOOP_CROSSFADE_MS);
    };

    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("ended", onEnded);
    };
  }, [front, activeVideo]);

  return (
    <section className="hero-video-section relative isolate flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden">
      <div className="hero-video-backdrop">
        <VideoLayer videoRef={videoA} visible={front === "a"} />
        <VideoLayer videoRef={videoB} visible={front === "b"} />
      </div>

      <div className="hero-overlay-purple pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <div className="hero-overlay-purple-side pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <div className="hero-overlay-purple-top pointer-events-none absolute inset-0 z-[1]" aria-hidden />

      <div className="hero-exit-fade pointer-events-none absolute inset-x-0 bottom-0 z-[2]" aria-hidden />

      <div className="page-container hero-content-pad relative z-10 flex min-h-0 flex-1 flex-col justify-center pb-44 md:pb-48">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Sparkles size={14} className="text-lilac" />
            {fr.heroEyebrow}
          </span>
          <h1 className="display mt-6 text-[2.35rem] leading-[0.92] text-white sm:text-5xl lg:text-[4.25rem]">
            Pour les <span className="italic text-lilac">{fr.heroTitleHighlight}</span>, soigneusement
            sélectionné.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/90">{fr.heroSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/produits" className="btn-primary shadow-glow">
              {fr.discoverShop}
              <ArrowUpRight size={16} />
            </Link>
            <button type="button" className="btn-ghost-hero" onClick={onDeposit}>
              <PackagePlus size={16} />
              {fr.depositProduct}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="page-container pointer-events-none absolute inset-x-0 bottom-16 z-10 md:bottom-20">
        <div className="hero-trust-cards pointer-events-auto grid gap-3 sm:grid-cols-3 sm:gap-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="hero-trust-card flex gap-3 sm:flex-col sm:gap-3 md:flex-row md:gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
                style={{ background: "var(--gradient-brand)" }}
              >
                <item.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
