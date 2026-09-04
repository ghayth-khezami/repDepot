import { useEffect, useRef, useState } from 'react';
import { Camera, Package, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLazyGetProductQuery } from '../store/api/productApi';
import type { Product } from '../types';
import { uploadUrl } from '../lib/apiBase';

export default function QrScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState('Autorisez la caméra puis présentez un QR produit.');
  const [product, setProduct] = useState<Product | null>(null);
  const [getProduct] = useLazyGetProductQuery();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) {
        setStatus('Votre navigateur ne prend pas en charge le scan QR. Utilisez la saisie manuelle du code produit.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled || !videoRef.current) return;
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({ formats: ['qr_code'] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              setStatus('Produit trouvé.');
              const result = await getProduct(value).unwrap();
              setProduct(result);
              return;
            }
          } catch {
            // Keep scanning while the camera is active.
          }
          frameRef.current = window.requestAnimationFrame(scan);
        };
        frameRef.current = window.requestAnimationFrame(scan);
      } catch {
        setStatus('Impossible d’accéder à la caméra. Vérifiez les permissions.');
      }
    };
    void start();
    return () => {
      cancelled = true;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [getProduct]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Scanner</p>
        <h1 className="mt-1 text-2xl font-bold">Scanner un produit</h1>
        <p className="mt-1 text-sm text-gray-500">Scannez le QR imprimé dans le catalogue produits.</p>
      </header>
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-xl">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/60 px-4 py-3 text-center text-sm text-white">{status}</div>
      </div>
      {product ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3"><h2 className="text-lg font-bold">{product.productName}</h2><button type="button" onClick={() => setProduct(null)} aria-label="Fermer"><X /></button></div>
            {product.photos?.[0] ? <img src={uploadUrl(product.photos[0].photoDoc)} alt="" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" /> : <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-2xl bg-pink-50"><Package size={42} /></div>}
            <div className="space-y-2"><p className="text-lg font-bold text-primary-700">{product.PrixVente.toFixed(2)} TND</p><p className="text-sm font-semibold text-gray-600">{product.isDispo === false ? 'Rupture de stock' : 'Disponible'}</p><p className="text-sm text-gray-600">{product.description || 'Aucune description.'}</p><p className="text-sm text-gray-500">{product.category?.categoryName || 'Sans catégorie'}</p></div>
            <button type="button" onClick={() => navigate(`/commands?productId=${encodeURIComponent(product.id)}`)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3 font-semibold text-white"><ShoppingCart size={18} /> Passer commande</button>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-white p-4 text-sm text-gray-500"><Camera size={18} /> Caméra arrière recommandée</div>
    </div>
  );
}
