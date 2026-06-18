import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { ArrowLeft, Keyboard } from 'lucide-react';
import { useLazyGetProductByBarcodeQuery, useUpdateProductMutation } from '../store/api/productApi';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { playScanBeep, playSuccessBeep, vibrateScan } from '../lib/beep';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

const SCANNER_ID = 'barcode-scanner-region';

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef('');
  const lastScanAtRef = useRef(0);
  const [fetchByBarcode] = useLazyGetProductByBarcodeQuery();
  const [updateProduct] = useUpdateProductMutation();
  const { showToast } = useToast();

  const handleCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const now = Date.now();
      if (trimmed === lastScanRef.current && now - lastScanAtRef.current < 2000) return;
      lastScanRef.current = trimmed;
      lastScanAtRef.current = now;

      playScanBeep();
      vibrateScan();

      try {
        const result = await fetchByBarcode(trimmed).unwrap();
        setProduct(result);
      } catch {
        showToast('Aucun produit pour ce code-barres', 'error');
      }
    },
    [fetchByBarcode, showToast],
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
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decoded) => {
            if (!cancelled) void handleCode(decoded);
          },
          () => {},
        );
        if (!cancelled) setScanning(true);
      } catch {
        showToast('Caméra inaccessible — utilisez la saisie manuelle', 'error');
        setScanning(false);
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
  }, [handleCode, showToast]);

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

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-black">
      <div className="flex items-center gap-3 bg-black/80 px-4 py-3 text-white">
        <Link to="/" className="rounded-lg p-2 hover:bg-white/10">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <p className="font-bold">Scanner</p>
          <p className="text-xs text-white/70">Scannez l'étiquette prix + code-barres</p>
        </div>
      </div>

      <div id={SCANNER_ID} className="relative min-h-[50dvh] w-full flex-1" />

      {!scanning ? (
        <p className="px-4 py-2 text-center text-sm text-white/80">Caméra non disponible</p>
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
              className="w-full rounded-xl border border-slate-600 bg-slate-800 py-3 pl-10 pr-4 text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleCode(manualCode)}
            className="rounded-xl bg-primary-600 px-5 font-semibold text-white"
          >
            OK
          </button>
        </div>
      </div>

      {product ? (
        <ProductDetailSheet
          product={product}
          onClose={() => setProduct(null)}
          onMarkSold={() => void markSold()}
        />
      ) : null}
    </div>
  );
}
