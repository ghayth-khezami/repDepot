import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { APP_NAME, APP_SUBTITLE, GREETING, LOGO_URL } from '../lib/brand';

const LOTTIE_URL = `${import.meta.env.BASE_URL}Baby%20loading.json`;
const MIN_MS = 2400;

export function WelcomeSplash({ onDone }: { onDone?: () => void }) {
  const [data, setData] = useState<object | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(LOTTIE_URL)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, MIN_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="welcome-splash fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden">
      <div className="welcome-splash-bg" aria-hidden />
      <div className="welcome-splash-wave" aria-hidden />
      <div className="welcome-splash-orb welcome-splash-orb--1" aria-hidden />
      <div className="welcome-splash-orb welcome-splash-orb--2" aria-hidden />

      <div className="relative z-10 flex flex-col items-center px-8 text-center animate-fade-in">
        <div className="splash-logo-ring mb-5">
          <img
            src={LOGO_URL}
            alt={APP_NAME}
            className="h-36 w-36 object-contain drop-shadow-2xl"
          />
        </div>

        {data ? (
          <Lottie
            animationData={data}
            loop
            className="h-28 w-28 max-w-[40vw] opacity-90"
          />
        ) : null}

        <p className="mt-5 text-2xl font-bold tracking-tight text-lavender-300">
          {GREETING}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-[0.2em] text-primary-300/90">
          {APP_NAME}
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.35em] text-white/45">
          {APP_SUBTITLE}
        </p>
      </div>
    </div>
  );
}
