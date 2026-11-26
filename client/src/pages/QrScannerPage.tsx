import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, Hash, Package, ScanLine, Search, ShoppingCart, X } from 'lucide-react';
import { useLazyLookupProductQuery } from '../store/api/productApi';
import type { Product } from '../types';
import { uploadUrl } from '../lib/apiBase';
import { apiErrorMessage } from '../lib/apiError';
import { formatTnd, toMillimes } from '../lib/money';
import { Button, Card, SegmentedControl, StatusChip, TextField } from '../components/ui';
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

export default function QrScannerPage() {
  const [mode, setMode] = useState<'camera' | 'ref'>('camera');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState('Présentez le QR ou le code-barres du produit.');
  const [cameraOk, setCameraOk] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suiviToken, setSuiviToken] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [lookup, { isFetching }] = useLazyLookupProductQuery();
  const navigate = useNavigate();

  const find = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      setError(null);
      try {
        const p = await lookup(value).unwrap();
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
        setSuiviToken(token);
        return true;
      }
      return find(raw);
    },
    [find],
  );
  const handleRef = useRef(handle);
  handleRef.current = handle;

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

  return (
    <div className="bd-ui mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bd-pink-strong">Scanner</p>
          <h1 className="text-3xl font-black text-bd-ink">Trouver un produit</h1>
          <p className="text-sm text-bd-muted">Étiquette produit, ou QR du contrat pour le suivi du déposant.</p>
        </div>
        <SegmentedControl
          label="Mode de recherche"
          value={mode}
          onChange={(m) => {
            setError(null);
            setMode(m);
          }}
          size="sm"
          options={[
            { value: 'camera', label: 'Caméra', icon: Camera },
            { value: 'ref', label: 'Référence', icon: Hash },
          ]}
        />
      </header>

      {mode === 'camera' ? (
        <div className="bd-anim-pop relative overflow-hidden rounded-[28px] bg-slate-950 shadow-xl">
          <video ref={videoRef} className="aspect-square w-full object-cover sm:aspect-[4/3]" muted playsInline />
          <div className="pointer-events-none absolute inset-[12%] rounded-3xl border-2 border-white/85 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]">
            <span className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse rounded-full bg-gradient-to-r from-transparent via-pink-400 to-transparent" />
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

      <Card className="p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handle(code);
          }}
          className="flex items-end gap-2"
        >
          <TextField
            label="Référence, code-barres ou ID"
            icon={Search}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="P-00042, D-143-01, 2001234567890…"
            autoFocus={mode === 'ref'}
            autoCapitalize="characters"
            autoComplete="off"
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
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => navigate(`/products?search=${encodeURIComponent(product.ref || product.productName)}`)}>
                Voir la fiche
              </Button>
              <Button icon={ShoppingCart} disabled={product.status === 'VENDU'} onClick={() => navigate(`/commands?productId=${encodeURIComponent(product.id)}`)}>
                Commander
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
