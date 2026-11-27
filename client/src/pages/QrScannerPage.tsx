import { useCallback, useEffect, useRef, useState } from 'react';
import { scanBeep, unlockBeep } from '../lib/beep';
import StageControl, { stageFrom } from '../features/products/StageControl';
import ProductDetailSheet from '../features/products/ProductDetailSheet';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, Eye, Hash, Package, ScanLine, Search, X } from 'lucide-react';
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
  const [flash, setFlash] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lookup, { isFetching }] = useLazyLookupProductQuery();
  const navigate = useNavigate();

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

  return (
    <div className="bd-ui mx-auto w-full max-w-4xl space-y-5">
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
            unlockBeep();
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
              <StageControl key={product.id} variant="action" productId={product.id} stage={stageFrom(product)} isDepot={product.isDepot} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
