"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fr } from "@/lib/fr";

const STEPS_VIDEO = "/stepsdepot.mp4";
const STEPS_PLAYBACK_RATE = 0.6;
const STEP_DURATIONS = [5500, 3500, 6000] as const;

type Props = {
  onDeposit: () => void;
};

export function DepositBannerSection({ onDeposit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = STEPS_PLAYBACK_RATE;
    v.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = (index: number) => {
      timer = setTimeout(() => {
        step = (index + 1) % 3;
        setActiveStep(step);
        schedule(step);
      }, STEP_DURATIONS[index]);
    };

    setActiveStep(0);
    schedule(0);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    { n: "01", title: fr.step1Title, desc: fr.step1Desc },
    { n: "02", title: fr.step2Title, desc: fr.step2Desc },
    { n: "03", title: fr.step3Title, desc: fr.step3Desc },
  ];

  return (
    <section className="page-container">
      <div
        className="deposit-banner-card rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16"
        style={{ background: "var(--gradient-soft)" }}
      >
        <div className="deposit-banner-intro">
          <p className="tag-eyebrow">{fr.depositBannerEyebrow}</p>
          <h2 className="display mt-3 text-4xl text-plum-deep md:text-5xl">{fr.depositBannerTitle}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {fr.depositBannerDesc}
          </p>
          <button type="button" className="btn-primary mt-8" onClick={onDeposit}>
            {fr.becomeDepositor}
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="deposit-banner-row">
          <div className="deposit-banner-video-cell">
            <div className="deposit-steps-video-frame">
              <video
                ref={videoRef}
                src={STEPS_VIDEO}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                className="deposit-steps-video"
                aria-label="Dépôt-vente en boutique"
              />
            </div>
          </div>

          <div className="deposit-banner-steps space-y-3 sm:space-y-4">
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <div
                  key={step.n}
                  className={`deposit-step-card rounded-2xl border bg-background/70 p-4 sm:p-5 backdrop-blur transition-all duration-500 ease-out ${
                    isActive
                      ? "deposit-step-card--active border-primary/25 opacity-100 shadow-[var(--shadow-lift)]"
                      : "border-black/5 opacity-35 blur-[2px] saturate-[0.8]"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="display text-2xl text-primary">{step.n}</span>
                  <p className="mt-1 font-semibold text-plum-deep">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
