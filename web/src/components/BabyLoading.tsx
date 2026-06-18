"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

export function BabyLoading({
  visible,
  message,
}: {
  visible: boolean;
  /** Omit or pass undefined for Lottie only (no caption). */
  message?: string;
}) {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetch("/baby-loading.json")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setAnimationData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-md"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex w-[min(260px,78vw)] flex-col items-center">
        <div className="w-[min(220px,70vw)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {animationData ? (
            <Lottie animationData={animationData} loop />
          ) : (
            <div className="mx-auto aspect-square w-full max-w-[200px] rounded-full bg-white/5" />
          )}
        </div>
        {message ? (
          <p className="mt-3 text-center text-sm font-semibold text-white/90">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
