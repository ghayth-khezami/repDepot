import { useState } from 'react';
import { Download, Plus, Share, Smartphone } from 'lucide-react';
import { useInstallApp } from '../lib/install';
import { cn } from '../lib/cn';
import { BottomSheet } from './ui';

/**
 * Installs the backoffice as an app (icon on the home screen, full screen).
 * Android/Chrome: native prompt. iPhone/iPad: step-by-step sheet (Safari has no install API).
 */
export default function InstallAppButton({ variant = 'row', className }: { variant?: 'row' | 'card'; className?: string }) {
  const app = useInstallApp();
  const [help, setHelp] = useState(false);
  if (app.installed) return null;

  const onClick = async () => {
    if (app.mode === 'prompt') await app.prompt();
    else setHelp(true);
  };

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => void onClick()}
          className={cn('bd-focus flex w-full items-center gap-3 rounded-3xl bg-[linear-gradient(120deg,#6D28D9,#9333EA_60%,#DB2777)] p-4 text-left text-white shadow-glow-violet active:scale-[0.99]', className)}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Smartphone size={24} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Installer l'app BebeDepot</span>
            <span className="block text-sm font-semibold text-white/85">Sur votre téléphone, iPhone ou Android — en un geste.</span>
          </span>
          <Download size={20} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => void onClick()} className={cn('bd-focus flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 font-bold text-bd-ink transition hover:bg-bd-lilac/60', className)}>
          <Download className="h-5 w-5 text-bd-violet" aria-hidden />
          <span>Installer l'app</span>
        </button>
      )}

      <BottomSheet open={help} onClose={() => setHelp(false)} title={app.mode === 'ios' ? 'Installer sur iPhone / iPad' : "Installer l'application"}>
        {app.mode === 'ios' ? (
          <ol className="space-y-3 text-[15px] font-bold text-bd-ink">
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet">
                <Share size={20} aria-hidden />
              </span>
              Dans Safari, touchez « Partager » (en bas)
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet">
                <Plus size={20} aria-hidden />
              </span>
              Choisissez « Sur l'écran d'accueil », puis « Ajouter »
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bd-lilac text-bd-violet">
                <Smartphone size={20} aria-hidden />
              </span>
              Ouvrez « BebeDepot » depuis l'icône
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-[15px] font-bold text-bd-ink">
            <li>1. Ouvrez le menu ⋮ de Chrome (en haut à droite).</li>
            <li>2. Touchez « Installer l'application » ou « Ajouter à l'écran d'accueil ».</li>
            <li>3. Ouvrez « BebeDepot » depuis l'icône.</li>
          </ol>
        )}
      </BottomSheet>
    </>
  );
}
