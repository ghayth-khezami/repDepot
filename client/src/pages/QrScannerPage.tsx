import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, Hash, Package, ScanLine, Search, ShoppingCart, X } from 'lucide-react';
import { useLazyLookupProductQuery } from '../store/api/productApi';
import type { Product } from '../types';
import { uploadUrl } from '../lib/apiBase';
import { apiErrorMessage } from '../lib/apiError';
import { formatTnd, toMillimes } from '../lib/money';
import { Button, Card, SegmentedControl, StatusChip, TextField } from '../components/ui';
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
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState('Présentez le QR ou le code-barres du produit.');
  const [cameraOk, setCameraOk] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const findRef = useRef(find);
  findRef.current = find;

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;
    const start = async () => {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) {
        setCameraOk(false);
        setStatus('Scan caméra non pris en charge ici : saisissez la référence.');
        setMode('ref');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOk(true);
        const supported: string[] = (await Detector.getSupportedFormats?.()) ?? ['qr_code'];
        const wanted = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a'].filter((f) => supported.includes(f));
        const detector = new Detector({ formats: wanted.length ? wanted : ['qr_code'] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          if (!busyRef.current) {
            try {
              const codes = await detector.detect(videoRef.current);
              const value = codes[0]?.rawValue?.trim();
              if (value && /\/suivi\/[A-Za-z0-9_-]{22,}/.test(value)) {
                setStatus('QR de contrat détecté : ouverture du suivi…');
                window.open(value, '_blank', 'noopener');
                return;
              }
              if (value) {
                busyRef.current = true;
                setStatus('Code détecté…');
                await findRef.current(value);
                setStatus('Présentez le QR ou le code-barres du produit.');
                window.setTimeout(() => (busyRef.current = false), 1500);
              }
            } catch {
              /* keep scanning */
            }
          }
          frameRef.current = window.requestAnimationFrame(scan);
        };
        frameRef.current = window.requestAnimationFrame(scan);
      } catch {
        setCameraOk(false);
        setStatus('Caméra inaccessible. Vérifiez les permissions ou saisissez la référence.');
      }
    };
    void start();
    return () => {
      cancelled = true;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  return (
    <div className="bd-ui mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bd-pink-strong">Scanner</p>
          <h1 className="text-3xl font-black text-bd-ink">Trouver un produit</h1>
          <p className="text-sm text-bd-muted">Scannez l'étiquette ou tapez / dictez sa référence.</p>
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
            void find(code);
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
