import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scanBeep, unlockBeep } from '../lib/beep';
import StageControl, { stageFrom } from '../features/products/StageControl';
import ProductDetailSheet from '../features/products/ProductDetailSheet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CameraOff, CheckCircle2, Eye, Package, Plug, ScanBarcode, ScanLine, Search, Sparkles, Usb, X, XCircle } from 'lucide-react';
import { useLazyLookupProductQuery } from '../store/api/productApi';
import type { Product } from '../types';
import { uploadUrl } from '../lib/apiBase';
import { apiErrorMessage } from '../lib/apiError';
import { formatTnd, toMillimes } from '../lib/money';
import { Button, Card, StatusChip, TextField } from '../components/ui';
import { useDouchetteStatus } from '../lib/hidScanner';
import { CameraArt, DouchetteArt } from '../features/scan/ScanArt';
import DeposantSuivi from '../features/depot/DeposantSuivi';
import { cn } from '../lib/cn';

const RECENT_KEY = 'bd-scan-recent';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

type ScanMode = 'choose' | 'douchette' | 'camera';
const MODE_KEY = 'bd-scan-mode';
const readLastMode = (): ScanMode | null => {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'douchette' || v === 'camera' ? v : null;
  } catch {
    return null;
  }
};
type CamState = 'checking' | 'ok' | 'none' | 'denied';
const hhmm = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Is there a camera on this device (and is it allowed)? Re-checked when a device is plugged in. */
function useCameraState(): CamState {
  const [state, setState] = useState<CamState>('checking');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const md = navigator.mediaDevices;
        if (!md?.enumerateDevices) return alive && setState('none');
        const devices = await md.enumerateDevices();
        let denied = false;
        try {
          denied = (await navigator.permissions?.query({ name: 'camera' as PermissionName }))?.state === 'denied';
        } catch {
          /* Safari / Firefox: no camera permission query */
        }
        if (alive) setState(denied ? 'denied' : devices.some((d) => d.kind === 'videoinput') ? 'ok' : 'none');
      } catch {
        if (alive) setState('none');
      }
    };
    void check();
    navigator.mediaDevices?.addEventListener?.('devicechange', check);
    return () => {
      alive = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', check);
    };
  }, []);
  return state;
}

function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'off'; children: React.ReactNode }) {
  const c = { ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', warn: 'bg-amber-500/15 text-amber-800 dark:text-amber-200', off: 'bg-bd-line/10 text-bd-muted' }[tone];
  const dot = { ok: 'bg-emerald-500', warn: 'bg-amber-500', off: 'bg-slate-400' }[tone];
  return (
    <span className={cn('inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold', c)}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {tone === 'ok' ? <span className={cn('absolute inset-0 rounded-full motion-safe:animate-ping', dot)} /> : null}
        <span className={cn('relative h-2.5 w-2.5 rounded-full', dot)} />
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export default function QrScannerPage() {
  const [searchParams] = useSearchParams();
  const [mode, setModeState] = useState<ScanMode>(() => (searchParams.get('code') ? 'douchette' : 'choose'));
  const lastMode = useMemo(readLastMode, []);
  const douchette = useDouchetteStatus();
  const camState = useCameraState();
  const [hit, setHit] = useState(false);
  const [lastResult, setLastResult] = useState<'ok' | 'ko' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState('Présentez le QR ou le code-barres du produit.');
  const [cameraOk, setCameraOk] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suiviToken, setSuiviToken] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [flash, setFlash] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lookup, { isFetching }] = useLazyLookupProductQuery();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const setMode = (m: ScanMode) => {
    unlockBeep();
    setError(null);
    setModeState(m);
    if (m !== 'choose') {
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {
        /* ignore */
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const find = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      setError(null);
      try {
        const p = await lookup(value).unwrap();
        scanBeep(true);
        setProduct(p);
        navigator.vibrate?.(60);
        const label = p.ref || value;
        setRecent((r) => {
          const next = [label, ...r.filter((x) => x !== label)].slice(0, 6);
          try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
        return true;
      } catch (e) {
        scanBeep(false);
        setError(apiErrorMessage(e, 'Produit introuvable.'));
        return false;
      }
    },
    [lookup],
  );

  /** A scan/entry is either a contract QR (→ déposant suivi) or a product code. */
  const handle = useCallback(
    async (raw: string) => {
      const token = raw.match(/\/suivi\/([A-Za-z0-9_-]{16,})/)?.[1];
      if (token) {
        setError(null);
        scanBeep(true);
        setSuiviToken(token);
        return true;
      }
      return find(raw);
    },
    [find],
  );
  const handleRef = useRef(handle);
  handleRef.current = handle;

  // Douchette (USB / wireless scanner): the global listener sends the code here as ?code=…
  const scanned = params.get('code');
  const scannedAt = params.get('t');
  useEffect(() => {
    if (!scanned) return;
    setModeState((m) => (m === 'choose' ? 'douchette' : m)); // she is using the douchette: show its screen
    setHit(true);
    window.setTimeout(() => setHit(false), 1400);
    setCode(scanned);
    setProduct(null);
    setSuiviToken(null);
    void handleRef.current(scanned).then((ok) => setLastResult(ok ? 'ok' : 'ko'));
    const next = new URLSearchParams(params);
    next.delete('code');
    next.delete('t');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned, scannedAt]);

  // Camera: zxing decodes QR + EAN/Code128 from the video in every browser (no BarcodeDetector needed).
  useEffect(() => {
    if (mode !== 'camera' || suiviToken || product) return;
    let cancelled = false;
    let controls: { stop: () => void } | null = null;
    let last = '';
    let lastAt = 0;
    setStatus('Démarrage de la caméra…');
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 600 });
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!result || busyRef.current) return;
            const value = result.getText().trim();
            const now = Date.now();
            if (!value || (value === last && now - lastAt < 2500)) return;
            last = value;
            lastAt = now;
            busyRef.current = true;
            navigator.vibrate?.(40);
            setStatus('Code détecté…');
            setFlash(true);
            window.setTimeout(() => setFlash(false), 450);
            void handleRef.current(value).finally(() => {
              busyRef.current = false;
              setStatus('Présentez le QR ou le code-barres.');
            });
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        setCameraOk(true);
        setStatus('Présentez le QR ou le code-barres.');
      } catch {
        if (cancelled) return;
        setCameraOk(false);
        setStatus('Caméra inaccessible : autorisez-la, ou saisissez la référence ci-dessous.');
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [mode, suiviToken, product]);

  const connected = !!douchette;
  const camLabel = { checking: 'Recherche de la caméra…', ok: 'Caméra disponible', none: 'Aucune caméra détectée', denied: 'Accès à la caméra refusé' }[camState];

  const refCard = (
    <Card className="bd-anim-fade-up p-4 sm:p-5" style={{ animationDelay: '0.18s' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handle(code);
        }}
        className="flex items-end gap-2"
      >
        <TextField
          label="Ou tapez la référence"
          icon={Search}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="P-00042, D-143-01, 2001234567890…"
          autoCapitalize="characters"
          autoComplete="off"
          data-scan-input=""
          fieldClassName="flex-1"
          error={error ?? undefined}
        />
        <Button type="submit" loading={isFetching} className={cn(error ? 'mb-7' : '')}>
          Chercher
        </Button>
      </form>
      {recent.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-bd-muted">Récents</span>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setCode(r);
                void find(r);
              }}
              className="bd-focus min-h-[32px] rounded-full bg-bd-lilac/70 px-3 text-xs font-extrabold text-bd-violet-strong tabular-nums active:scale-95"
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );

  return (
    <div className="bd-ui mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bd-pink-strong">Scanner</p>
          <h1 className="text-3xl font-black text-bd-ink">{mode === 'choose' ? 'Comment scanner ?' : mode === 'douchette' ? 'Douchette' : 'Caméra'}</h1>
          <p className="text-sm text-bd-muted">Étiquette produit, ou QR du contrat pour le suivi du déposant.</p>
        </div>
        {mode !== 'choose' ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode('choose')} className="bd-focus inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-bd-line/15 bg-bd-surface px-3 text-sm font-extrabold text-bd-ink active:scale-[0.97]">
              <ArrowLeft size={16} aria-hidden /> Changer de mode
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === 'douchette' ? 'camera' : 'douchette')}
              className="bd-focus inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-bd-lilac/70 px-3 text-sm font-extrabold text-bd-violet-strong active:scale-[0.97]"
            >
              {mode === 'douchette' ? <Camera size={16} aria-hidden /> : <ScanBarcode size={16} aria-hidden />}
              {mode === 'douchette' ? 'Caméra' : 'Douchette'}
            </button>
          </div>
        ) : null}
      </header>

      {mode === 'choose' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* ── Douchette ── */}
          <button
            type="button"
            onClick={() => setMode('douchette')}
            className="bd-mode-card bd-anim-fade-up bd-focus group relative flex flex-col overflow-hidden rounded-[28px] bg-bd-surface text-left shadow-card ring-1 ring-bd-line/10 hover:shadow-xl"
          >
            <span className="bd-scan-grid relative flex h-48 w-full items-center justify-center bg-[linear-gradient(140deg,#1E1B4B,#4C1D95_55%,#7C3AED)] px-4">
              <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-2xl" />
              <DouchetteArt connected={connected} className="relative h-full w-full max-w-[300px]" />
              {lastMode === 'douchette' ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-bd-violet-strong">Dernier utilisé</span> : null}
            </span>
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="flex items-center gap-2 text-xl font-black text-bd-ink">
                <ScanBarcode size={22} className="text-bd-violet" aria-hidden /> Connecter la douchette
              </span>
              <span className="text-sm font-semibold text-bd-muted">Lecteur USB ou sans fil branché au PC. Le plus rapide : scannez, le produit s'ouvre.</span>
              <StatusPill tone={connected ? 'ok' : 'warn'}>{connected ? `Connectée · dernière lecture à ${hhmm(douchette!.at)}` : 'Non détectée · scannez une étiquette pour la connecter'}</StatusPill>
              <span className="bd-mode-cta mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-extrabold text-bd-violet">
                Utiliser la douchette <ArrowRight size={16} aria-hidden />
              </span>
            </span>
          </button>

          {/* ── Camera ── */}
          <button
            type="button"
            onClick={() => setMode('camera')}
            style={{ animationDelay: '0.08s' }}
            className="bd-mode-card bd-anim-fade-up bd-focus group relative flex flex-col overflow-hidden rounded-[28px] bg-bd-surface text-left shadow-card ring-1 ring-bd-line/10 hover:shadow-xl"
          >
            <span className="bd-scan-grid relative flex h-48 w-full items-center justify-center bg-[linear-gradient(140deg,#831843,#DB2777_55%,#F472B6)] px-4">
              <span aria-hidden className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500/30 blur-2xl" />
              <CameraArt available={camState !== 'none' && camState !== 'denied'} className="relative h-full w-full max-w-[300px]" />
              {lastMode === 'camera' ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-bd-pink-strong">Dernier utilisé</span> : null}
            </span>
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="flex items-center gap-2 text-xl font-black text-bd-ink">
                <Camera size={22} className="text-bd-pink-strong" aria-hidden /> Continuer avec la caméra
              </span>
              <span className="text-sm font-semibold text-bd-muted">Caméra du téléphone ou webcam du PC : visez le QR ou le code-barres.</span>
              <StatusPill tone={camState === 'ok' ? 'ok' : camState === 'checking' ? 'off' : 'warn'}>{camLabel}</StatusPill>
              <span className="bd-mode-cta mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-extrabold text-bd-pink-strong">
                Ouvrir la caméra <ArrowRight size={16} aria-hidden />
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {mode === 'douchette' ? (
        <div className="bd-anim-pop bd-scan-grid relative overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#0F0C24,#2E1065_55%,#4C1D95)] p-5 text-white shadow-xl sm:p-7">
          <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <span aria-hidden className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="relative grid items-center gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <DouchetteArt connected={connected} hit={hit} className="mx-auto w-full max-w-[380px]" />
            <div className="min-w-0 space-y-4" aria-live="polite">
              <StatusPill tone={connected ? 'ok' : 'warn'}>
                <span className="text-white">{connected ? 'Douchette connectée' : 'Douchette non détectée'}</span>
              </StatusPill>

              {hit || lastResult ? (
                <div key={douchette?.at} className="bd-anim-pop rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="flex items-center gap-2 text-lg font-black">
                    {isFetching ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    ) : lastResult === 'ko' ? (
                      <XCircle size={22} className="text-rose-300" aria-hidden />
                    ) : (
                      <CheckCircle2 size={22} className="bd-anim-check text-emerald-300" aria-hidden />
                    )}
                    {isFetching ? 'Recherche…' : lastResult === 'ko' ? 'Code inconnu' : 'Lu avec succès'}
                  </p>
                  <p className="mt-1 truncate font-mono text-sm text-white/80">{douchette?.code}</p>
                  {lastResult === 'ko' && error ? <p className="mt-1 text-sm font-bold text-rose-200">{error}</p> : null}
                  {!hit ? (
                    <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/65">
                      Prête pour le suivant
                      <span className="bd-dots" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : connected ? (
                <div>
                  <p className="text-2xl font-black leading-tight">Prête : scannez une étiquette</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/75">
                    En attente
                    <span className="bd-dots text-white/80" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-white/70">Le produit s'ouvre tout seul, même depuis un autre écran du backoffice.</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white/60">
                    <Sparkles size={13} aria-hidden /> Dernière lecture à {hhmm(douchette!.at)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-black leading-tight">Connectez votre douchette</p>
                  <ol className="mt-3 space-y-2.5">
                    {[
                      { icon: Usb, t: 'Branchez le petit récepteur USB sur le PC', hint: 'Sur téléphone : avec un adaptateur USB-OTG' },
                      { icon: Plug, t: 'Allumez la douchette (gâchette)', hint: 'Elle bipe quand elle est prête' },
                      { icon: ScanLine, t: "Scannez l'étiquette d'un produit", hint: 'Cette page la détecte et ouvre le produit' },
                    ].map(({ icon: Icon, t, hint }, i) => (
                      <li key={t} className="bd-anim-fade-up flex items-start gap-3" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold">{t}</span>
                          <span className="block text-xs text-white/65">{hint}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'camera' ? (
        <div className="bd-anim-pop relative overflow-hidden rounded-[28px] bg-slate-950 shadow-xl">
          <video ref={videoRef} className="aspect-square w-full object-cover sm:aspect-[4/3]" muted playsInline />
          {/* Scan window: dimmed outside, corner brackets, red laser sweeping up and down */}
          <div className={cn('bd-scan-frame pointer-events-none absolute inset-x-[14%] top-1/2 aspect-square max-h-[76%] -translate-y-1/2 rounded-3xl shadow-[0_0_0_999px_rgba(0,0,0,0.45)] sm:inset-x-[26%]', flash && 'is-hit')}>
            <span className="bd-scan-corner left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl" />
            <span className="bd-scan-corner right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl" />
            <span className="bd-scan-corner bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl" />
            <span className="bd-scan-corner bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl" />
            {cameraOk ? <span className="bd-scan-laser" /> : null}
          </div>
          {!cameraOk ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/90">
              <CameraOff size={40} aria-hidden />
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-2xl bg-black/60 px-4 py-3 text-center text-sm font-bold text-white backdrop-blur">
            <ScanLine size={16} aria-hidden /> {status}
          </div>
        </div>
      ) : null}

      {refCard}

      {detailId ? (
        <ProductDetailSheet
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(p) => {
            setDetailId(null);
            navigate(`/products?edit=${p.id}`);
          }}
        />
      ) : null}
      {suiviToken ? <DeposantSuivi token={suiviToken} onClose={() => setSuiviToken(null)} /> : null}

      {product ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bd-ink/50 p-3 backdrop-blur-sm sm:items-center" onClick={() => setProduct(null)}>
          <div className="bd-anim-fade-up bd-ui w-full max-w-md rounded-[28px] bg-bd-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={product.productName}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-bd-muted tabular-nums">{product.ref}</p>
                <h2 className="text-lg font-black leading-tight text-bd-ink">{product.productName}</h2>
              </div>
              <button type="button" onClick={() => setProduct(null)} aria-label="Fermer" className="bd-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-bd-lilac/60">
                <X size={20} aria-hidden />
              </button>
            </div>
            {product.photos?.[0] ? (
              <img src={uploadUrl(product.photos[0].photoDoc)} alt="" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" />
            ) : (
              <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-2xl bg-bd-lilac/60 text-bd-violet">
                <Package size={42} aria-hidden />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xl font-black text-bd-pink-strong tabular-nums">{formatTnd(toMillimes(product.PrixVente))}</p>
              {product.status ? <StatusChip status={product.status} payout={product.payoutStatus} /> : null}
            </div>
            <p className="mt-2 text-sm font-bold text-bd-muted">
              {product.category?.categoryName || 'Sans catégorie'}
              {product.coClient ? ` · Déposant ${product.coClient.firstName} ${product.coClient.lastName}` : ''}
            </p>
            {product.description ? <p className="mt-2 line-clamp-3 text-sm text-bd-ink">{product.description}</p> : null}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" icon={Eye} onClick={() => setDetailId(product.id)}>
                Voir la fiche
              </Button>
              {/* Marquer comme vendu → (créer la commande | vendu en boutique) ; vendu → Marquer comme payé */}
              <StageControl key={product.id} variant="action" productId={product.id} stage={stageFrom(product)} isDepot={product.isDepot} inOrder={(product as { inOrder?: boolean }).inOrder} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
