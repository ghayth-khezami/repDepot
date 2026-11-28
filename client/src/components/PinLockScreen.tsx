import { useEffect, useState } from 'react';
import { Check, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { Blobs, OtpInput } from './ui';

const LENGTH = 4;

/**
 * Visible area of the screen (what the phone keyboard leaves free). The lock screen is sized to it, so
 * the code boxes are always centred ABOVE the keyboard instead of hidden under it.
 */
function useVisibleArea() {
  const [area, setArea] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setArea({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return area;
}

/**
 * Quick-unlock screen shown when the app is reopened with a saved session.
 * One hidden real input (OtpInput) receives the phone keyboard, paste and SMS autofill;
 * the 4 boxes are only visual. Submits by itself on the 4th digit.
 */
export default function PinLockScreen() {
  const { unlock, logout, user } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'ok'>('idle');
  const [attempts, setAttempts] = useState(0);

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
    }, 550);
  };

  const name = user?.username || user?.email?.split('@')[0] || '';
  const area = useVisibleArea();
  // Keyboard open (little room left): smaller header, the boxes stay big and visible.
  const compact = !!area && area.height < 560;

  return (
    <div
      className="bd-ui fixed inset-x-0 top-0 isolate flex flex-col items-center justify-center overflow-hidden bg-bd-bg px-5 transition-[height] duration-200"
      style={{ height: area ? area.height : '100dvh', transform: area?.top ? `translateY(${area.top}px)` : undefined }}
    >
      <Blobs />
      <div className="bd-anim-fade-up w-full max-w-sm text-center">
        <div className={cn('relative mx-auto transition-all duration-300', compact ? 'mb-3 h-14 w-14' : 'mb-6 h-24 w-24')}>
          <span aria-hidden className={cn('absolute inset-0 bg-grad-brand shadow-glow-violet transition duration-500', compact ? 'rounded-[18px]' : 'rounded-[28px]', status === 'ok' && 'scale-110 bg-grad-green')} />
          <span className="absolute inset-0 flex items-center justify-center text-white">
            {status === 'ok' ? <Check size={compact ? 28 : 44} strokeWidth={3} className="bd-anim-check" aria-hidden /> : <ShieldCheck size={compact ? 26 : 42} aria-hidden />}
          </span>
        </div>
        <h1 className={cn('font-black text-bd-ink', compact ? 'text-xl' : 'text-2xl sm:text-3xl')}>Bon retour{name ? `, ${name}` : ''} !</h1>
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
