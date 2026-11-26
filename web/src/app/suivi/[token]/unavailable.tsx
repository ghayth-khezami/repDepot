import { RefreshCw } from "lucide-react";

/** API unreachable (not a bad token): friendly retry screen. */
export default function SuiviUnavailable() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-3xl bg-grad-violet text-white shadow-glow-violet">
        <RefreshCw className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-black text-bd-ink">Suivi momentanément indisponible</h1>
      <p className="text-sm font-bold text-bd-muted">Nous n&apos;arrivons pas à charger vos articles. Réessayez dans un instant.</p>
      <a href="" className="inline-flex min-h-[48px] items-center rounded-full bg-grad-pink-strong px-6 font-black text-white shadow-glow-pink">
        Réessayer
      </a>
    </div>
  );
}
