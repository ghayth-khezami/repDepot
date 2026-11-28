import { useEffect, useRef, useState } from 'react';
import { Check, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { OtpInput } from './ui';

const LENGTH = 4;
const COMPACT_BELOW = 560; // px of visible height: the keyboard is open

/**
 * Keeps the lock screen exactly over the visible area (what the phone keyboard leaves free), so the
 * code boxes stay centred ABOVE the keyboard.
 * Fast on phones: the size is written straight on the element once per frame (no React re-render, no
 * animation); React only re-renders when switching between normal and compact layout.
 */
function useFitVisibleArea(ref: React.RefObject<HTMLDivElement | null>) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    let frame = 0;
    let lastH = -1;
    let lastTop = -1;
    const apply = () => {
      frame = 0;
      const h = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);
      if (h === lastH && top === lastTop) return;
      lastH = h;
      lastTop = top;
      el.style.height = `${h}px`;
      el.style.transform = top ? `translate3d(0, ${top}px, 0)` : '';
      setCompact(h < COMPACT_BELOW); // same value → React skips the render
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
    };
  }, [ref]);
  return compact;
}

/**
 * Quick-unlock screen shown when the app is reopened with a saved session.
 * One hidden real input (OtpInput) receives the phone keyboard, paste and SMS autofill;
 * the 4 boxes are only visual. Submits by itself on the 4th digit.
 */
export default function PinLockScreen() {
  const { unlock, logout } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'ok'>('idle');
  const [attempts, setAttempts] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = useFitVisibleArea(rootRef);

  const submit = (value: string) => {
    if (unlock(value)) {
      setStatus('ok');
      return;
    }
    setStatus('error');
    setAttempts((a) => a + 1);
    navigator.vibrate?.(120);
    window.setTimeout(() => {
      setCode('');
      setStatus('idle');
    }, 450);
  };

  return (
    <div
      ref={rootRef}
      // Soft colour spots as plain gradients: same look as the blurred blobs, nothing heavy to repaint.
      className="bd-ui fixed inset-x-0 top-0 flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-bd-bg bg-[radial-gradient(circle_at_8%_6%,rgba(233,221,251,0.85),transparent_42%),radial-gradient(circle_at_96%_22%,rgba(252,231,243,0.9),transparent_45%),radial-gradient(circle_at_45%_105%,rgba(233,221,251,0.7),transparent_45%)] px-5 dark:bg-none"
    >
      <div className="bd-anim-fade-up w-full max-w-sm text-center">
        <div className={cn('relative mx-auto', compact ? 'mb-3 h-14 w-14' : 'mb-6 h-24 w-24')}>
          <span aria-hidden className={cn('absolute inset-0 bg-grad-brand shadow-glow-violet transition duration-300', compact ? 'rounded-[18px]' : 'rounded-[28px]', status === 'ok' && 'scale-110 bg-grad-green')} />
          <span className="absolute inset-0 flex items-center justify-center text-white">
            {status === 'ok' ? <Check size={compact ? 28 : 44} strokeWidth={3} className="bd-anim-check" aria-hidden /> : <ShieldCheck size={compact ? 26 : 42} aria-hidden />}
          </span>
        </div>
        <h1 className={cn('font-black text-bd-ink', compact ? 'text-xl' : 'text-2xl sm:text-3xl')}>Bon retour, Mme Khezami !</h1>
        <p className={cn('text-sm font-semibold text-bd-muted', compact ? 'mt-1' : 'mt-2')}>Saisissez votre code rapide pour déverrouiller</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === LENGTH) submit(code);
          }}
          className={compact ? 'mt-5' : 'mt-8'}
        >
          <OtpInput length={LENGTH} size="lg" value={code} onChange={setCode} onComplete={submit} status={status} label="Code de déverrouillage" />
        </form>
        <p className="mt-3 h-5 text-sm font-bold text-bd-danger" role="alert">
          {status === 'error' ? 'Code incorrect' : attempts >= 3 ? 'Code oublié ? Reconnectez-vous avec votre mot de passe.' : ''}
        </p>

        <button
          type="button"
          onClick={logout}
          className={cn('bd-focus mx-auto inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-extrabold text-bd-muted hover:text-bd-pink-strong', compact ? 'mt-2' : 'mt-8')}
        >
          <LogOut size={16} aria-hidden /> Se connecter avec un autre compte
        </button>
      </div>
    </div>
  );
}
