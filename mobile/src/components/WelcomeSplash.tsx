import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { APP_NAME, APP_SUBTITLE, GREETING, LOGO_URL } from '../lib/brand';

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
    <div className="welcome-splash fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white px-8">
      <img
        src={LOGO_URL}
        alt={APP_NAME}
        className="mb-6 h-44 w-44 max-w-[70vw] object-contain"
      />
      {data ? (
        <Lottie animationData={data} loop className="h-32 w-32 max-w-[50vw]" />
      ) : null}
      <p className="mt-6 text-xl font-bold text-primary-800">{GREETING}</p>
      <p className="mt-1 text-sm font-semibold tracking-wide text-primary-600">{APP_NAME}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gray-400">{APP_SUBTITLE}</p>
    </div>
  );
}
