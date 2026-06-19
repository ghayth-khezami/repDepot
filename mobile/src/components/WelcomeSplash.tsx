import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

const LOTTIE_URL = `${import.meta.env.BASE_URL}Baby%20loading.json`;
const MIN_MS = 2200;

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
      <div className="welcome-splash-orb welcome-splash-orb--1" aria-hidden />
      <div className="welcome-splash-orb welcome-splash-orb--2" aria-hidden />
      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {data ? (
          <Lottie
            animationData={data}
            loop
            className="h-44 w-44 max-w-[55vw] drop-shadow-lg"
          />
        ) : (
          <div className="h-44 w-44 animate-pulse rounded-full bg-primary-200/40" />
        )}
        <p className="mt-6 font-display text-2xl font-bold tracking-tight text-primary-900 dark:text-white">
          Salut madame Khezami
        </p>
        <p className="mt-2 text-sm font-medium text-primary-700/80 dark:text-primary-200/80">
          BÉBÉ-DÉPÔT Admin
        </p>
      </div>
    </div>
  );
}
