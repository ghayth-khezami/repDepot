import { useState } from 'react';
import { Check, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { Blobs, OtpInput } from './ui';

const LENGTH = 4;

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

  return (
    <div className="bd-ui relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-bd-bg px-5 py-10">
      <Blobs />
      <div className="bd-anim-fade-up w-full max-w-sm text-center">
        <div className="relative mx-auto mb-6 h-24 w-24">
          <span aria-hidden className={cn('absolute inset-0 rounded-[28px] bg-grad-brand shadow-glow-violet transition duration-500', status === 'ok' && 'scale-110 bg-grad-green')} />
          <span className="absolute inset-0 flex items-center justify-center text-white">
            {status === 'ok' ? <Check size={44} strokeWidth={3} className="bd-anim-check" aria-hidden /> : <ShieldCheck size={42} aria-hidden />}
          </span>
        </div>
        <h1 className="text-2xl font-black text-bd-ink sm:text-3xl">Bon retour{name ? `, ${name}` : ''} !</h1>
        <p className="mt-2 text-sm font-semibold text-bd-muted">Saisissez votre code rapide pour déverrouiller</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === LENGTH) submit(code);
          }}
          className="mt-8"
        >
          <OtpInput length={LENGTH} value={code} onChange={setCode} onComplete={submit} status={status} label="Code de déverrouillage" />
        </form>
        <p className="mt-3 h-5 text-sm font-bold text-bd-danger" role="alert">
          {status === 'error' ? 'Code incorrect' : attempts >= 3 ? 'Code oublié ? Reconnectez-vous avec votre mot de passe.' : ''}
        </p>

        <button type="button" onClick={logout} className="bd-focus mx-auto mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-extrabold text-bd-muted hover:text-bd-pink-strong">
          <LogOut size={16} aria-hidden /> Se connecter avec un autre compte
        </button>
      </div>
    </div>
  );
}
