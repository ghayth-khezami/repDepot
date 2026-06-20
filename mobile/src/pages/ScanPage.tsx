import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Keyboard, RotateCcw, Volume2 } from 'lucide-react';
import { useLazyGetProductByBarcodeQuery, useUpdateProductMutation } from '../store/api/productApi';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { PageHeader } from '../components/ui';
import { playScanBeep, playSuccessBeep, playErrorBeep, vibrateScan, unlockAudio } from '../lib/beep';
import { barcodeLookupCandidates, normalizeBarcodeInput } from '../lib/barcode';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

const SCANNER_ID = 'barcode-scanner-region';
const SCAN_COOLDOWN_MS = 1800;

type LookupState = 'idle' | 'loading' | 'not_found' | 'error';

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lastFailedCode, setLastFailedCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausedRef = useRef(false);
  const lookupStateRef = useRef<LookupState>('idle');
  const lastScanRef = useRef('');
  const lastScanAtRef = useRef(0);
  const resumeTimerRef = useRef<number | null>(null);
  const [fetchByBarcode] = useLazyGetProductByBarcodeQuery();
  const [updateProduct] = useUpdateProductMutation();
  const { showToast } = useToast();

  useEffect(() => {
    lookupStateRef.current = lookupState;
  }, [lookupState]);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const resumeScanner = useCallback(() => {
    pausedRef.current = false;
    lastScanRef.current = '';
    clearResumeTimer();
  }, []);

  const pauseScanner = useCallback(() => {
    pausedRef.current = true;
    clearResumeTimer();
  }, []);

  const scheduleAutoResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      if (!product) {
        setLookupState('idle');
        setLastFailedCode('');
        resumeScanner();
      }
    }, 3500);
  }, [product, resumeScanner]);

  const enableAudio = useCallback(async () => {
    await unlockAudio();
    setAudioReady(true);
    playScanBeep();
  }, []);

  useEffect(() => {
    const warm = () => void unlockAudio().then(() => setAudioReady(true));
    document.addEventListener('touchstart', warm, { once: true, passive: true });
    document.addEventListener('click', warm, { once: true });
    return () => {
      document.removeEventListener('touchstart', warm);
      document.removeEventListener('click', warm);
    };
  }, []);

  const lookupCode = useCallback(
    async (code: string, fromRetry = false) => {
      const trimmed = normalizeBarcodeInput(code);
      if (!trimmed) return;

      const now = Date.now();
      if (!fromRetry && trimmed === lastScanRef.current && now - lastScanAtRef.current < SCAN_COOLDOWN_MS) {
        return;
      }

      void unlockAudio();
      pauseScanner();
      setLookupState('loading');
      setLastFailedCode(trimmed);
      setProduct(null);

      if (!fromRetry) {
        playScanBeep();
        vibrateScan();
      }

      try {
        const candidates = barcodeLookupCandidates(trimmed);
        let result: Product | null = null;
        let lastError: unknown;

        for (const candidate of candidates) {
          try {
            result = await fetchByBarcode(candidate).unwrap();
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!result) throw lastError ?? new Error('not found');

        lastScanRef.current = trimmed;
        lastScanAtRef.current = Date.now();
        setProduct(result);
        setLookupState('idle');
        setLastFailedCode('');
        playSuccessBeep();
        vibrateScan();
      } catch {
        setLookupState('not_found');
        playErrorBeep();
        scheduleAutoResume();
      }
    },
    [fetchByBarcode, pauseScanner, scheduleAutoResume],
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
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            disableFlip: false,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.floor(Math.min(viewfinderWidth * 0.94, 360));
              const height = Math.floor(Math.min(viewfinderHeight * 0.42, 180));
              return { width, height };
            },
          },
          (decoded) => {
            if (!cancelled) handleScanDecoded(decoded);
          },
          () => {},
        );
        if (!cancelled) setCameraReady(true);
      } catch {
        showToast('Caméra inaccessible — saisie manuelle ci-dessous', 'error');
        setCameraReady(false);
      }
    };
    void start();
    return () => {
      cancelled = true;
      clearResumeTimer();
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        void s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [handleScanDecoded, showToast]);

  const markSold = async () => {
    if (!product) return;
    try {
      await updateProduct({
        id: product.id,
        data: { isDispo: false, stockQuantity: 0 },
      }).unwrap();
      playSuccessBeep();
      showToast('Produit marqué comme vendu', 'success');
      setProduct({ ...product, isDispo: false, stockQuantity: 0 });
    } catch {
      showToast('Erreur lors de la vente', 'error');
    }
  };

  const showFailure = lookupState === 'not_found' || lookupState === 'error';

  return (
    <div className="pb-4" onClick={() => void unlockAudio()}>
      <PageHeader
        title="Scanner"
        subtitle={cameraReady ? 'Alignez le code-barres dans le cadre' : 'Caméra indisponible — saisie manuelle'}
      />

      {!audioReady ? (
        <div className="mx-4 mb-3">
          <button
            type="button"
            onClick={() => void enableAudio()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 py-2.5 text-sm font-semibold text-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-300"
          >
            <Volume2 size={16} />
            Activer le son du scan
          </button>
        </div>
      ) : null}

      <div className="relative mx-4 overflow-hidden rounded-2xl border border-primary-100 bg-black shadow-sm dark:border-slate-700">
        <div id={SCANNER_ID} className="min-h-[240px] w-full" />
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-[42%] -translate-y-1/2 rounded-xl border-2 border-primary-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        {lookupState === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : null}
      </div>

      {showFailure ? (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-center text-sm text-amber-900 dark:text-amber-100">
            Aucun produit pour « {lastFailedCode} »
          </p>
          <p className="mt-1 text-center text-xs text-amber-800/80 dark:text-amber-200/80">
            Reprise automatique du scan dans quelques secondes…
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void lookupCode(lastFailedCode, true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white"
            >
              <RotateCcw size={16} />
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => {
                setLookupState('idle');
                setLastFailedCode('');
                resumeScanner();
              }}
              className="rounded-xl border border-primary-200 px-4 py-2.5 text-sm font-semibold text-primary-700 dark:border-slate-600"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-4 mt-4 rounded-2xl border border-primary-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Saisie manuelle</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Code-barres…"
              disabled={lookupState === 'loading'}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 dark:border-slate-600 dark:bg-slate-800 disabled:opacity-60"
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
          onClose={() => {
            setProduct(null);
            resumeScanner();
          }}
          onMarkSold={() => void markSold()}
        />
      ) : null}
    </div>
  );
}
