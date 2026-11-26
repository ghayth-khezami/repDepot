import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsRight, Keyboard, Mic, PencilLine, Plus, Square, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatTnd, toMillimes } from '../lib/money';
import {
  DICTATION_ERROR_LABEL,
  matchOption,
  parseFrenchNumber,
  parseYesNo,
  speak,
  speechSupported,
  spokenDigits,
  spokenEmail,
  useDictation,
} from '../lib/speech';
import { Waveform } from './Dictation';

/* ───────────────────────────── Types ───────────────────────────── */

export interface FlowOption {
  value: string;
  label: string;
}
export interface FlowValue {
  value: string;
  display: string;
}
export type FlowValues = Record<string, FlowValue | undefined>;

export interface FlowStep {
  id: string;
  section?: string;
  prompt: string | ((v: FlowValues) => string);
  hint?: string | ((v: FlowValues) => string);
  kind: 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'price' | 'percent' | 'yesno' | 'choice';
  /** "Passer" leaves it empty (for yes/no: means "non"). */
  optional?: boolean;
  when?: (v: FlowValues) => boolean;
  options?: (v: FlowValues) => FlowOption[];
  /** Dynamic lookup for choices (e.g. search déposants by spoken name). */
  resolve?: (spoken: string, v: FlowValues) => Promise<FlowOption | null>;
  /** Choice not found → offer to create it. */
  create?: { noun: string; run: (name: string, v: FlowValues) => Promise<FlowOption> };
  /** For 'percent' / 'number': only these values (also shown as tappable chips). */
  allowed?: readonly number[];
  /** Shortcut words mapped to a value, e.g. "comme d'habitude" → 25. */
  aliases?: Array<{ match: RegExp; value: string; display?: string }>;
}

const cap = (t: string) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1);
const text = (x: string | ((v: FlowValues) => string) | undefined, v: FlowValues) => (typeof x === 'function' ? x(v) : (x ?? ''));

/* ───────────────────────────── Engine ───────────────────────────── */

export default function GuidedFlow({
  title,
  subtitle,
  steps,
  initial,
  doneLabel = 'Remplir le formulaire',
  greeting,
  onDone,
  onClose,
}: {
  /** Said (and shown) once, before the first question. */
  greeting?: string | null;
  title: string;
  subtitle?: string;
  steps: FlowStep[];
  initial?: FlowValues;
  doneLabel?: string;
  onDone: (values: FlowValues) => void | Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FlowValues>(initial ?? {});
  const answered = useRef(new Set<string>(Object.keys(initial ?? {})));
  const active = useMemo(() => steps.filter((s) => !s.when || s.when(values)), [steps, values]);
  const [cursor, setCursor] = useState<string | null>(() => active.find((s) => !answered.current.has(s.id))?.id ?? null);
  const step = active.find((s) => s.id === cursor) ?? null;
  const idx = step ? active.indexOf(step) : active.length;
  const review = !step;

  const [phase, setPhase] = useState<'speaking' | 'listening' | 'idle' | 'confirmed'>('idle');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingCreate, setPendingCreate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'voice' | 'keyboard'>(() => (speechSupported() ? 'voice' : 'keyboard'));
  const [typed, setTyped] = useState('');
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('bd-wizard-muted') === '1';
    } catch {
      return false;
    }
  });
  const cancelSpeech = useRef<() => void>(() => {});
  const timer = useRef<number>();
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const greeted = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goNext = useCallback(
    (v: FlowValues, fromId: string) => {
      const list = steps.filter((s) => !s.when || s.when(v));
      const from = list.findIndex((s) => s.id === fromId);
      const next = list.slice(from + 1).find((s) => !answered.current.has(s.id)) ?? list.find((s) => !answered.current.has(s.id));
      setCursor(next?.id ?? null);
      setFeedback(null);
      setTyped('');
      setPendingCreate(null);
    },
    [steps],
  );

  const accept = useCallback(
    (st: FlowStep, val: FlowValue | undefined) => {
      const next = { ...valuesRef.current, [st.id]: val };
      // A changed parent choice invalidates its dependants (e.g. category → sub-category).
      steps.forEach((s) => {
        if (s.when && !s.when(next)) {
          delete next[s.id];
          answered.current.delete(s.id);
        }
      });
      answered.current.add(st.id);
      setValues(next);
      setFeedback(val ? { ok: true, text: val.display } : { ok: true, text: 'Passé' });
      setPhase('confirmed');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => goNext(next, st.id), 800);
    },
    [goNext, steps],
  );

  const commit = useCallback(
    async (raw: string): Promise<boolean> => {
      const st = step;
      const t = raw.trim();
      if (!st || !t) return false;
      const v = valuesRef.current;

      // "Do you want to add it?" answer
      if (pendingCreate !== null && st.create) {
        const yn = parseYesNo(t);
        if (!yn) {
          setFeedback({ ok: false, text: 'Oui pour l’ajouter, non pour choisir une autre.' });
          return false;
        }
        if (yn === 'no') {
          setPendingCreate(null);
          setFeedback(null);
          return true;
        }
        setBusy(true);
        try {
          const created = await st.create.run(pendingCreate, v);
          setPendingCreate(null);
          accept(st, { value: created.value, display: `${created.label} (nouvelle)` });
          return true;
        } catch {
          setFeedback({ ok: false, text: 'Création impossible. Réessayez ou choisissez dans la liste.' });
          return false;
        } finally {
          setBusy(false);
        }
      }

      for (const a of st.aliases ?? []) {
        if (a.match.test(t)) {
          accept(st, { value: a.value, display: a.display ?? a.value });
          return true;
        }
      }
      if (st.optional && /^(passer|non|aucune?|rien|pas de|sans)\b/i.test(t) && st.kind !== 'yesno') {
        accept(st, undefined);
        return true;
      }

      switch (st.kind) {
        case 'yesno': {
          const yn = parseYesNo(t);
          if (!yn) return setFeedback({ ok: false, text: 'Répondez par oui ou par non.' }), false;
          accept(st, { value: yn, display: yn === 'yes' ? 'Oui' : 'Non' });
          return true;
        }
        case 'choice': {
          const opts = st.options?.(v) ?? [];
          let m = matchOption(t, opts);
          if (!m && st.resolve) m = await st.resolve(t, v);
          if (m) {
            accept(st, { value: m.value, display: m.label });
            return true;
          }
          if (st.create) {
            setPendingCreate(cap(t));
            setFeedback(null);
            if (!muted) cancelSpeech.current = speak(`${st.create.noun} ${cap(t)} n'existe pas. Voulez-vous l'ajouter ?`, () => listenRef.current());
            return true;
          }
          setFeedback({ ok: false, text: `« ${t} » introuvable — touchez un choix.` });
          return false;
        }
        case 'price':
        case 'number':
        case 'percent': {
          const n = parseFrenchNumber(t);
          if (n === null || n < 0 || (st.kind === 'percent' && n > 100)) return setFeedback({ ok: false, text: `Nombre non compris (« ${t} »).` }), false;
          if (st.allowed && !st.allowed.includes(n)) return setFeedback({ ok: false, text: `Choisissez : ${st.allowed.join(', ')} %.` }), false;
          accept(st, { value: String(n), display: st.kind === 'price' ? formatTnd(toMillimes(n)) : st.kind === 'percent' ? `${n} %` : String(n) });
          return true;
        }
        case 'email': {
          const e = spokenEmail(t);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setFeedback({ ok: false, text: `« ${e} » n'est pas un email valide.` }), false;
          accept(st, { value: e, display: e });
          return true;
        }
        case 'tel': {
          const d = spokenDigits(t).slice(-8);
          if (d.length !== 8) return setFeedback({ ok: false, text: 'Il faut 8 chiffres.' }), false;
          accept(st, { value: d, display: d.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3') });
          return true;
        }
        default:
          accept(st, { value: cap(t), display: cap(t) });
          return true;
      }
    },
    [accept, muted, pendingCreate, step],
  );

  const dict = useDictation({
    continuous: false,
    onEnd: (txt) => {
      if (!txt) return setPhase('idle');
      void commit(txt).then((ok) => !ok && setPhase('idle'));
    },
  });
  const listen = useCallback(() => {
    cancelSpeech.current();
    setPhase(dict.start() ? 'listening' : 'idle');
  }, [dict]);
  const listenRef = useRef(listen);
  listenRef.current = listen;

  useEffect(() => {
    window.clearTimeout(timer.current);
    dict.abort();
    if (review) {
      setPhase('idle');
      if (!muted) cancelSpeech.current = speak('Vérifiez puis validez.');
      return;
    }
    if (mode !== 'voice' || !step) return setPhase('idle');
    if (!greeted.current && greeting === null) return; // wait for « vous venez d'ajouter… »
    const v = valuesRef.current;
    if (muted) {
      const t = window.setTimeout(listen, 300);
      return () => window.clearTimeout(t);
    }
    setPhase('speaking');
    const intro = !greeted.current && greeting ? `${greeting} ` : '';
    greeted.current = true;
    cancelSpeech.current = speak(`${intro}${text(step.prompt, v)}`, listen);
    return () => cancelSpeech.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, mode, greeting === null]);

  useEffect(() => {
    if (dict.error && dict.error !== 'no-speech') {
      setFeedback({ ok: false, text: DICTATION_ERROR_LABEL[dict.error] });
      if (dict.error === 'unsupported' || dict.error === 'denied') setMode('keyboard');
    }
  }, [dict.error]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      cancelSpeech.current();
    },
    [],
  );

  const close = () => {
    dict.abort();
    cancelSpeech.current();
    onClose();
  };
  const skip = () => {
    if (!step) return;
    cancelSpeech.current();
    dict.abort();
    if (pendingCreate !== null) {
      setPendingCreate(null);
      return;
    }
    accept(step, step.kind === 'yesno' ? { value: 'no', display: 'Non' } : undefined);
  };
  const jump = (id: string) => {
    answered.current.delete(id);
    setCursor(id);
    setFeedback(null);
    setPendingCreate(null);
  };

  const listening = phase === 'listening' && dict.listening;
  const progress = (idx / Math.max(1, active.length)) * 100;
  const v = values;
  const choices =
    pendingCreate !== null
      ? []
      : step?.kind === 'choice'
        ? (step.options?.(v) ?? [])
        : step?.allowed
          ? step.allowed.map((n) => ({ value: String(n), label: step.kind === 'percent' ? `${n} %` : String(n) }))
          : [];
  const yesNo = step?.kind === 'yesno' || pendingCreate !== null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Assistant IA — ${title}`} className="bd-ui fixed inset-0 z-[90] flex justify-center bg-bd-ink/40 backdrop-blur-sm md:items-center md:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-bd-bg md:h-[min(840px,94dvh)] md:max-w-md md:rounded-[32px] md:shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(192,132,252,0.35),transparent)]" />
        <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={close} aria-label="Fermer l'assistant" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-bd-surface shadow-card active:scale-95">
            <X size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight text-bd-ink">Assistant IA</p>
            <p className="truncate text-xs font-bold text-bd-muted">{step?.section ?? subtitle ?? title}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setMuted((m) => {
                try {
                  localStorage.setItem('bd-wizard-muted', m ? '0' : '1');
                } catch {
                  /* ignore */
                }
                if (!m) cancelSpeech.current();
                return !m;
              })
            }
            aria-pressed={muted}
            aria-label={muted ? 'Activer la voix' : 'Couper la voix'}
            className="bd-focus flex h-10 w-10 items-center justify-center rounded-full text-bd-violet hover:bg-bd-lilac/60"
          >
            {muted ? <VolumeX size={19} aria-hidden /> : <Volume2 size={19} aria-hidden />}
          </button>
          <span className="rounded-full bg-bd-surface px-3 py-1.5 text-sm font-black text-bd-violet-strong shadow-card tabular-nums">
            {Math.min(idx + 1, active.length)} / {active.length}
          </span>
        </header>
        <div className="relative z-10 mx-4 h-1.5 overflow-hidden rounded-full bg-bd-lilac">
          <div className="h-full rounded-full bg-grad-pink transition-[width] duration-500 ease-out" style={{ width: `${review ? 100 : Math.max(3, progress)}%` }} />
        </div>

        {review ? (
          /* ── Editable review ── */
          <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
            <div className="bd-anim-pop mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-grad-green text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)]">
                <Check size={26} strokeWidth={3} className="bd-anim-check" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-black leading-tight text-bd-ink">Vérifiez avant de valider</h2>
                <p className="text-sm font-semibold text-bd-muted">Modifiez directement, ou touchez ✎ pour redicter.</p>
              </div>
            </div>
            <ul className="space-y-2">
              {active.map((s, i) => {
                const val = v[s.id];
                const editable = !['choice', 'yesno'].includes(s.kind);
                return (
                  <li key={s.id} style={{ animationDelay: `${i * 40}ms` }} className="bd-anim-fade-up rounded-2xl bg-bd-surface p-3 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-bd-muted">{text(s.prompt, v).replace(/\s*\?$/, '')}</span>
                      <button type="button" onClick={() => jump(s.id)} aria-label="Redicter" className="bd-focus flex h-8 w-8 items-center justify-center rounded-lg text-bd-violet hover:bg-bd-lilac/60">
                        <PencilLine size={15} aria-hidden />
                      </button>
                    </div>
                    {editable ? (
                      <input
                        value={val?.value ?? ''}
                        inputMode={['price', 'number', 'percent'].includes(s.kind) ? 'decimal' : s.kind === 'tel' ? 'numeric' : undefined}
                        placeholder={s.optional ? 'Optionnel' : 'À compléter'}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setValues((x) => ({ ...x, [s.id]: raw ? { value: raw, display: raw } : undefined }));
                        }}
                        className={cn('bd-input mt-1 min-h-[42px] text-[15px] font-bold', !val && !s.optional && 'border-bd-danger')}
                      />
                    ) : (
                      <button type="button" onClick={() => jump(s.id)} className={cn('mt-1 block w-full truncate text-left text-[15px] font-extrabold', val ? 'text-bd-ink' : s.optional ? 'text-bd-muted' : 'text-bd-danger')}>
                        {val?.display ?? (s.optional ? '— (passé)' : 'À compléter')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </main>
        ) : (
          /* ── Question stage ── */
          <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-4 pt-6 text-center">
            <div className={cn('bd-orb', listening && 'is-listening', phase === 'speaking' && 'is-speaking', phase === 'confirmed' && 'is-done')} aria-hidden>
              <span className="bd-orb-ring" />
              <span className="bd-orb-ring" />
              <span className="bd-orb-ring" />
              <span className="bd-orb-halo" />
              <span className="bd-orb-core" />
              {phase === 'confirmed' ? <Check size={54} strokeWidth={3} className="bd-anim-check absolute inset-0 m-auto text-white drop-shadow" /> : null}
            </div>
            {greeting && idx === 0 && !Object.keys(v).length ? (
              <div className="bd-anim-pop mt-5 flex w-full items-start gap-2.5 rounded-2xl bg-bd-surface px-4 py-3 text-left shadow-card">
                <span aria-hidden className="text-xl leading-none">👋</span>
                <p className="text-sm font-bold leading-snug text-bd-ink">{greeting}</p>
              </div>
            ) : null}
            <div key={`${step?.id}-${pendingCreate ?? ''}`} className="bd-anim-slide-in mt-6 w-full">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-bd-violet">{step?.section ?? title}</p>
              <h2 className="mt-2 text-balance text-2xl font-black leading-tight text-bd-ink">
                {pendingCreate !== null && step?.create ? (
                  <>
                    {step.create.noun} « {pendingCreate} » n'existe pas. L'ajouter ?
                  </>
                ) : (
                  step && text(step.prompt, v)
                )}
              </h2>
              <p className="mt-2 text-sm font-semibold text-bd-muted">
                {pendingCreate !== null ? 'Oui pour la créer maintenant' : step ? text(step.hint, v) || (step.optional ? '« Passer » si aucune' : 'Parlez naturellement') : ''}
              </p>
            </div>
            <div className="mt-5 flex min-h-[52px] w-full items-center justify-center" aria-live="polite">
              {listening ? (
                <div className="bd-anim-pop flex max-w-full items-center gap-3 rounded-2xl bg-bd-surface px-4 py-3 shadow-card">
                  <Waveform />
                  <span className="truncate text-base font-bold text-bd-ink">
                    {dict.live || <span className="text-bd-muted">Je vous écoute…</span>}
                    <span className="bd-caret" aria-hidden />
                  </span>
                </div>
              ) : feedback ? (
                <div className={cn('max-w-full rounded-2xl px-4 py-3 text-base font-extrabold', feedback.ok ? 'bd-anim-pop bg-bd-success-bg text-bd-success' : 'bd-anim-shake bg-bd-danger-bg text-bd-danger')}>
                  {feedback.ok ? <Check size={18} className="mr-1.5 inline -translate-y-px" aria-hidden /> : null}
                  {feedback.text}
                </div>
              ) : null}
            </div>
            {yesNo ? (
              <div className="bd-anim-fade-up mt-2 grid w-full grid-cols-2 gap-3">
                <button type="button" disabled={busy} onClick={() => void commit('oui')} className="bd-focus min-h-[60px] rounded-2xl bg-grad-pink-strong text-lg font-black text-white shadow-glow-pink active:scale-95 disabled:opacity-60">
                  {pendingCreate !== null ? (
                    <>
                      <Plus size={18} className="mr-1 inline" aria-hidden />
                      Ajouter
                    </>
                  ) : (
                    'Oui'
                  )}
                </button>
                <button type="button" onClick={() => void commit('non')} className="bd-focus min-h-[60px] rounded-2xl border-2 border-bd-line/15 bg-bd-surface text-lg font-black text-bd-ink active:scale-95">
                  Non
                </button>
              </div>
            ) : null}
            {choices.length ? (
              <div className="bd-anim-fade-up mt-2 flex max-h-40 w-full flex-wrap justify-center gap-2 overflow-y-auto p-1">
                {choices.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => (step!.kind === 'choice' ? accept(step!, { value: o.value, display: o.label }) : void commit(o.value))}
                    className={cn(
                      'bd-focus min-h-[40px] rounded-full px-4 text-sm font-extrabold transition active:scale-95',
                      v[step!.id]?.value === o.value ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'border border-bd-line/15 bg-bd-surface text-bd-ink',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : null}
          </main>
        )}

        {review ? (
          <div className="relative z-10 border-t border-bd-line/10 bg-bd-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(76,29,149,0.12)]">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDone(values);
                } finally {
                  setBusy(false);
                }
              }}
              className="bd-focus flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-pink-strong text-base font-black text-white shadow-glow-pink active:scale-[0.98] disabled:opacity-60"
            >
              <Check size={20} aria-hidden /> {busy ? 'Un instant…' : doneLabel}
            </button>
          </div>
        ) : (
          <div className="relative z-10 px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {mode === 'keyboard' && !yesNo ? (
              <form
                className="bd-anim-pop mb-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void commit(typed);
                }}
              >
                <input autoFocus data-dictation="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Votre réponse…" aria-label={step ? text(step.prompt, v) : ''} className="bd-input flex-1" />
                <button type="submit" aria-label="Valider" className="bd-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-white">
                  <Check size={20} aria-hidden />
                </button>
              </form>
            ) : null}
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={skip} className="bd-focus flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-bd-surface text-[11px] font-extrabold text-bd-ink shadow-card active:scale-95">
                <ChevronsRight size={18} aria-hidden /> Passer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode !== 'voice') setMode('voice');
                  if (dict.listening) dict.stop();
                  else listen();
                }}
                aria-label={dict.listening ? "Arrêter l'écoute" : 'Parler'}
                className={cn(
                  'bd-focus relative isolate flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#6D28D9,#DB2777)] text-white shadow-[0_14px_40px_rgba(190,24,93,0.4)] transition active:scale-95',
                  dict.listening && 'bd-stop-btn',
                )}
              >
                {dict.listening ? <Square size={24} fill="currentColor" aria-hidden /> : <Mic size={30} aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => {
                  dict.abort();
                  cancelSpeech.current();
                  setPhase('idle');
                  setMode((m) => (m === 'keyboard' ? 'voice' : 'keyboard'));
                }}
                aria-pressed={mode === 'keyboard'}
                className={cn('bd-focus flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-extrabold shadow-card active:scale-95', mode === 'keyboard' ? 'bg-grad-violet-strong text-white' : 'bg-bd-surface text-bd-ink')}
              >
                <Keyboard size={18} aria-hidden /> Clavier
              </button>
            </div>
            {/* Answers so far — tap to redo */}
            {Object.keys(v).length ? (
              <div className="mt-3 flex max-h-20 flex-wrap justify-center gap-1.5 overflow-y-auto">
                {active
                  .filter((s) => v[s.id])
                  .map((s) => (
                    <button key={s.id} type="button" onClick={() => jump(s.id)} className="bd-anim-pop max-w-[200px] truncate rounded-full bg-bd-surface px-3 py-1 text-xs font-bold text-bd-ink shadow-card">
                      {v[s.id]!.display}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────────── Category steps (shared) ───────────────────────────── */

export interface CategoryTree {
  id: string;
  categoryName: string;
  subCategories?: Array<{ id: string; title: string; subSubCategories1?: Array<{ id: string; title: string }> }>;
}

/**
 * Catégorie → sous-catégorie (optional) → sous-sous-catégorie (optional), each creatable by voice
 * ("X n'existe pas, voulez-vous l'ajouter ?"). "Passer" = none.
 */
export function categorySteps({
  tree,
  prefix = '',
  section,
  createCategory,
  createSub,
  createSubSub,
  sameAs,
}: {
  tree: () => CategoryTree[];
  prefix?: string;
  section?: string;
  createCategory: (name: string) => Promise<FlowOption>;
  createSub: (name: string, categoryId: string) => Promise<FlowOption>;
  createSubSub: (name: string, subCategoryId: string) => Promise<FlowOption>;
  /** Previous category for "pareil". */
  sameAs?: (v: FlowValues) => FlowValue | undefined;
}): FlowStep[] {
  const cat = `${prefix}category`;
  const sub = `${prefix}sub`;
  const subsub = `${prefix}subsub`;
  const subsOf = (v: FlowValues) => tree().find((c) => c.id === v[cat]?.value)?.subCategories ?? [];
  return [
    {
      id: cat,
      section,
      prompt: 'Dans quelle catégorie ?',
      hint: 'Touchez ou dites la catégorie — une nouvelle peut être créée',
      kind: 'choice',
      options: () => tree().map((c) => ({ value: c.id, label: c.categoryName })),
      resolve: async (spoken, v) => (sameAs && /pareil|même|meme|idem/i.test(spoken) ? (sameAs(v) ? { value: sameAs(v)!.value, label: sameAs(v)!.display } : null) : null),
      create: { noun: 'La catégorie', run: (name) => createCategory(name) },
    },
    {
      id: sub,
      section,
      prompt: 'Une sous-catégorie ?',
      hint: '« Passer » si aucune',
      kind: 'choice',
      optional: true,
      when: (v) => !!v[cat],
      options: (v) => subsOf(v).map((s) => ({ value: s.id, label: s.title })),
      create: { noun: 'La sous-catégorie', run: (name, v) => createSub(name, v[cat]!.value) },
    },
    {
      id: subsub,
      section,
      prompt: 'Et une sous-sous-catégorie ?',
      hint: '« Passer » si aucune',
      kind: 'choice',
      optional: true,
      when: (v) => !!v[sub],
      options: (v) => (subsOf(v).find((s) => s.id === v[sub]?.value)?.subSubCategories1 ?? []).map((s) => ({ value: s.id, label: s.title })),
      create: { noun: 'La sous-sous-catégorie', run: (name, v) => createSubSub(name, v[sub]!.value) },
    },
  ];
}
