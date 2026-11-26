import { useEffect, useRef, useState } from 'react';
import { Check, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { Blobs } from './ui';

const LENGTH = 6;

/**
 * Quick-unlock screen shown when the app is reopened with a saved session.
 * Six OTP-style boxes, auto-advance, paste support; the phone's own number keyboard does the typing.
 */
export default function PinLockScreen() {
  const { unlock, logout, user } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [status, setStatus] = useState<'idle' | 'error' | 'ok'>('idle');
  const [attempts, setAttempts] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const submit = (code: string) => {
    if (unlock(code)) {
      setStatus('ok');
      return;
    }
    setStatus('error');
    setAttempts((a) => a + 1);
    navigator.vibrate?.(120);
    window.setTimeout(() => {
      setDigits(Array(LENGTH).fill(''));
      setStatus('idle');
      inputs.current[0]?.focus();
    }, 550);
  };

  const fill = (start: number, chars: string) => {
    const clean = chars.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    let i = start;
    for (const c of clean) {
      if (i >= LENGTH) break;
      next[i++] = c;
    }
    setDigits(next);
    if (next.every(Boolean)) submit(next.join(''));
    else inputs.current[Math.min(i, LENGTH - 1)]?.focus();
  };

  const backspace = (i: number) => {
    const next = [...digits];
    const at = next[i] ? i : Math.max(0, i - 1);
    next[at] = '';
    setDigits(next);
    inputs.current[at]?.focus();
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
            if (digits.every(Boolean)) submit(digits.join(''));
          }}
          className={cn('mt-8 flex justify-center gap-2 sm:gap-3', status === 'error' && 'bd-anim-shake')}
          aria-label="Code de déverrouillage"
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              data-dictation="off"
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              type="password"
              pattern="[0-9]*"
              maxLength={LENGTH}
              aria-label={`Chiffre ${i + 1}`}
              disabled={status === 'ok'}
              onChange={(e) => fill(i, e.target.value.slice(d ? 1 : 0) || e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                fill(0, e.clipboardData.getData('text'));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault();
                  backspace(i);
                } else if (e.key === 'ArrowLeft') inputs.current[i - 1]?.focus();
                else if (e.key === 'ArrowRight') inputs.current[i + 1]?.focus();
              }}
              onFocus={(e) => {
                const first = digits.findIndex((x) => !x);
                if (first !== -1 && first < i) inputs.current[first]?.focus();
                else e.target.select();
              }}
              className={cn(
                'h-14 w-11 rounded-2xl border-2 bg-bd-surface text-center text-2xl font-black text-bd-ink shadow-card outline-none transition duration-200 sm:h-16 sm:w-12',
                status === 'error'
                  ? 'border-bd-danger text-bd-danger'
                  : status === 'ok'
                    ? 'border-bd-success'
                    : d
                      ? 'scale-[1.04] border-bd-violet'
                      : 'border-bd-line/15 focus:border-bd-pink focus:ring-4 focus:ring-bd-pink/15',
              )}
            />
          ))}
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
