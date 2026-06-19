import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

export function OfflineOverlay() {
  const online = useOnline();
  const [checking, setChecking] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      return;
    }
    // Only reload when coming back online — never on initial page load
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      window.location.reload();
    }
  }, [online]);

  if (online) return null;

  const retry = () => {
    setChecking(true);
    if (navigator.onLine) {
      wasOfflineRef.current = true;
      window.location.reload();
      return;
    }
    setTimeout(() => setChecking(false), 1500);
  };

  return (
    <div className="offline-overlay fixed inset-0 z-[250] flex flex-col items-center justify-center px-8 text-center">
      <div className="offline-liquid" aria-hidden />
      <div className="offline-liquid offline-liquid--2" aria-hidden />
      <div className="relative z-10 max-w-xs">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
          <WifiOff size={36} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Vous êtes hors ligne</h2>
        <p className="mt-2 text-sm text-white/85">
          Connexion internet requise. L&apos;écran se rafraîchira dès que vous serez en ligne.
        </p>
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          className="btn-pill mt-8 inline-flex w-full items-center justify-center gap-2 bg-white/95 px-6 py-4 font-bold text-primary-800 shadow-xl disabled:opacity-70"
        >
          <RefreshCw size={20} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Vérification…' : 'Réessayer'}
        </button>
      </div>
    </div>
  );
}
