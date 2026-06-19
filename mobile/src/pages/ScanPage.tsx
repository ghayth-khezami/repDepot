import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { ArrowLeft, Keyboard, RotateCcw } from 'lucide-react';
import { useLazyGetProductByBarcodeQuery, useUpdateProductMutation } from '../store/api/productApi';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { playScanBeep, playSuccessBeep, vibrateScan } from '../lib/beep';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

const SCANNER_ID = 'barcode-scanner-region';
const SCAN_COOLDOWN_MS = 2500;

type LookupState = 'idle' | 'loading' | 'not_found' | 'error';

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lastFailedCode, setLastFailedCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausedRef = useRef(false);
  const lookupStateRef = useRef<LookupState>('idle');
  const lastScanRef = useRef('');
  const lastScanAtRef = useRef(0);
  const [fetchByBarcode] = useLazyGetProductByBarcodeQuery();
  const [updateProduct] = useUpdateProductMutation();
  const { showToast } = useToast();

  useEffect(() => {
    lookupStateRef.current = lookupState;
  }, [lookupState]);

  const pauseScanner = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeScanner = useCallback(() => {
    pausedRef.current = false;
    lastScanRef.current = '';
  }, []);

  const lookupCode = useCallback(
    async (code: string, fromRetry = false) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      if (!fromRetry && trimmed === lastScanRef.current && now - lastScanAtRef.current < SCAN_COOLDOWN_MS) {
        return;
      }

      pauseScanner();
      setLookupState('loading');
      setLastFailedCode(trimmed);
      setProduct(null);

      if (!fromRetry) {
        playScanBeep();
        vibrateScan();
      }

      try {
        const result = await fetchByBarcode(trimmed).unwrap();
        lastScanRef.current = trimmed;
        lastScanAtRef.current = Date.now();
        setProduct(result);
        setLookupState('idle');
        setLastFailedCode('');
      } catch {
        setLookupState('not_found');
        // Stay paused — user must tap Réessayer (no automatic re-scan spam)
      }
    },
    [fetchByBarcode, pauseScanner],
  );

  const handleScanDecoded = useCallback(
    (decoded: string) => {
      if (pausedRef.current || lookupStateRef.current === 'loading') return;
      void lookupCode(decoded);
    },
    [lookupCode],
  );

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 260, height: 160 } },
          (decoded) => {
            if (!cancelled) handleScanDecoded(decoded);
          },
          () => {},
        );
        if (!cancelled) setCameraReady(true);
      } catch {
        showToast('Caméra inaccessible — utilisez la saisie manuelle', 'error');
        setCameraReady(false);
      }
    };
    void start();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        void s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [handleScanDecoded, showToast]);

  const retryLookup = () => {
    if (!lastFailedCode) {
      resumeScanner();
      setLookupState('idle');
      return;
    }
    void lookupCode(lastFailedCode, true);
  };

  const dismissError = () => {
    setLookupState('idle');
    setLastFailedCode('');
    resumeScanner();
  };

  const closeProduct = () => {
    setProduct(null);
    resumeScanner();
  };

  const markSold = async () => {
    if (!product) return;
    try {
      await updateProduct({
        id: product.id,
        data: { isDispo: false, stockQuantity: 0 },
      }).unwrap();
      playSuccessBeep();
      showToast('Produit marqué comme vendu ✓', 'success');
      setProduct({ ...product, isDispo: false, stockQuantity: 0 });
    } catch {
      showToast('Erreur lors de la vente', 'error');
    }
  };

  const showFailure = lookupState === 'not_found' || lookupState === 'error';

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-black">
      <div className="flex items-center gap-3 bg-black/80 px-4 py-3 text-white">
        <Link to="/" className="rounded-lg p-2 hover:bg-white/10">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <p className="font-bold">Scanner</p>
          <p className="text-xs text-white/70">
            {lookupState === 'loading' ? 'Recherche en cours…' : 'Scannez l\'étiquette prix + code-barres'}
          </p>
        </div>
      </div>

      <div className="relative min-h-[50dvh] flex-1">
        <div id={SCANNER_ID} className="h-full w-full" />
        {lookupState === 'loading' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        ) : null}
      </div>

      {!cameraReady ? (
        <p className="px-4 py-2 text-center text-sm text-white/80">Caméra non disponible</p>
      ) : null}

      {showFailure ? (
        <div className="border-t border-amber-500/30 bg-amber-950/90 px-4 py-4 text-white">
          <p className="text-center text-sm font-medium">
            {lookupState === 'not_found'
              ? `Aucun produit pour le code « ${lastFailedCode} »`
              : 'Erreur de connexion au serveur'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={retryLookup}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-bold"
            >
              <RotateCcw size={18} />
              Réessayer
            </button>
            <button
              type="button"
              onClick={dismissError}
              className="rounded-xl border border-white/30 px-5 py-3 font-semibold"
            >
              Scanner à nouveau
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/10 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Saisir le code-barres…"
              disabled={lookupState === 'loading'}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 py-3 pl-10 pr-4 text-white disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            disabled={lookupState === 'loading' || !manualCode.trim()}
            onClick={() => void lookupCode(manualCode)}
            className="rounded-xl bg-primary-600 px-5 font-semibold text-white disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>

      {product ? (
        <ProductDetailSheet
          product={product}
          onClose={closeProduct}
          onMarkSold={() => void markSold()}
        />
      ) : null}
    </div>
  );
}
