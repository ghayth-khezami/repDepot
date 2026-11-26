import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Mic, Square } from 'lucide-react';
import { cn } from '../lib/cn';
import { DICTATION_ERROR_LABEL, normalizeForField, setNativeValue, useDictation } from '../lib/speech';

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

/** Animated waveform (decorative). */
export function Waveform({ active = true, bars = 7, className }: { active?: boolean; bars?: number; className?: string }) {
  return (
    <span aria-hidden className={cn('bd-wave', !active && 'is-idle', className)}>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/** The recording state of a field: gradient border, waveform, live words + caret, pulsing stop. */
function RecordingBar({ live, onStop, style, className }: { live: string; onStop: () => void; style?: CSSProperties; className?: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    // Keep the latest words visible.
    textRef.current?.scrollTo({ left: textRef.current.scrollWidth });
  }, [live]);
  return (
    <div
      role="status"
      aria-live="polite"
      style={style}
      className={cn('bd-rec-bar flex items-center gap-2.5 rounded-2xl pl-3 pr-1.5 shadow-glow-pink', className)}
    >
      <Waveform />
      <span ref={textRef} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[15px] font-bold text-bd-ink">
        {live ? live : <span className="text-bd-muted">Je vous écoute…</span>}
        <span className="bd-caret" aria-hidden />
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onStop}
        aria-label="Arrêter la dictée"
        className="bd-stop-btn bd-focus isolate flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grad-pink-strong text-white"
      >
        <Square size={13} fill="currentColor" aria-hidden />
      </button>
    </div>
  );
}

/** Green confirmation under a field after dictation, or a red error. */
function DictationNote({ kind, text }: { kind: 'done' | 'error'; text: string }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'bd-anim-pop absolute left-1 top-full z-10 mt-1 flex items-center gap-1 whitespace-nowrap text-xs font-extrabold',
        kind === 'done' ? 'text-bd-success' : 'text-bd-danger',
      )}
    >
      {kind === 'done' ? <CheckCircle2 size={13} aria-hidden /> : null}
      {text}
    </p>
  );
}

function useFieldDictation(getField: () => FieldEl | null) {
  const [note, setNote] = useState<{ kind: 'done' | 'error'; text: string } | null>(null);
  const noteTimer = useRef<number>();
  const flash = useCallback((n: { kind: 'done' | 'error'; text: string }) => {
    setNote(n);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 4500);
  }, []);
  useEffect(() => () => window.clearTimeout(noteTimer.current), []);

  const d = useDictation({
    continuous: true,
    onEnd: (full) => {
      const el = getField();
      if (!el || !full) return;
      const value = normalizeForField(full, el);
      const next = el instanceof HTMLTextAreaElement && el.value.trim() ? `${el.value.trim()} ${value}` : value;
      setNativeValue(el, next);
      el.focus({ preventScroll: true });
      try {
        el.setSelectionRange?.(el.value.length, el.value.length);
      } catch {
        /* type=email/number don't support selection */
      }
      flash({ kind: 'done', text: 'Transcrit · touchez le texte pour corriger' });
    },
  });

  useEffect(() => {
    if (d.error && d.error !== 'no-speech') flash({ kind: 'error', text: DICTATION_ERROR_LABEL[d.error] });
    else if (d.error === 'no-speech') flash({ kind: 'error', text: DICTATION_ERROR_LABEL['no-speech'] });
  }, [d.error, flash]);

  return { ...d, note };
}

/**
 * Mic button at the end of a field. Put it inside the field's `relative` wrapper,
 * next to the input; the recording bar covers the input while listening.
 */
export function FieldMic({ inputRef, className, label = 'Dicter' }: { inputRef: RefObject<FieldEl>; className?: string; label?: string }) {
  const d = useFieldDictation(() => inputRef.current);
  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => (d.listening ? d.stop() : d.start())}
        aria-label={`${label} (saisie vocale)`}
        title="Saisie vocale"
        className={cn(
          'bd-focus absolute right-1.5 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-bd-lilac/80 text-bd-violet transition hover:bg-bd-lilac hover:text-bd-pink-strong active:scale-90',
          className,
        )}
      >
        <Mic size={17} aria-hidden />
      </button>
      {d.listening ? <RecordingBar live={d.live} onStop={d.stop} className="absolute inset-0 z-20" /> : null}
      {d.note ? <DictationNote {...d.note} /> : null}
    </>
  );
}

/* ───────────────────────── App-wide fallback ───────────────────────── */

function eligible(el: EventTarget | null): el is FieldEl {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled && !el.closest('[data-dictation="off"],[data-dictation="builtin"]');
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.readOnly || el.disabled) return false;
  if (!['text', 'search', 'email', 'tel', 'number', 'url', ''].includes(el.type)) return false;
  return !el.closest('[data-dictation="off"],[data-dictation="builtin"]');
}

/**
 * For legacy pages whose inputs don't have a built-in mic: when a field is focused,
 * a mic appears at its end; tapping it turns that field into the recording bar.
 */
export function AutoFieldMic() {
  const [field, setField] = useState<FieldEl | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const fieldRef = useRef<FieldEl | null>(null);
  fieldRef.current = field;
  const d = useFieldDictation(() => fieldRef.current);
  const listeningRef = useRef(false);
  listeningRef.current = d.listening;

  useEffect(() => {
    const onIn = (e: FocusEvent) => {
      if (eligible(e.target)) setField(e.target);
    };
    const onOut = () => {
      window.setTimeout(() => {
        if (listeningRef.current) return;
        if (!eligible(document.activeElement)) setField(null);
      }, 120);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  useEffect(() => {
    if (!field) {
      setRect(null);
      return;
    }
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => (field.isConnected ? setRect(field.getBoundingClientRect()) : setField(null)));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    ro.observe(field);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [field]);

  if (!field || !rect || rect.width < 90) return null;
  const isArea = field instanceof HTMLTextAreaElement;
  const btnSize = 32;
  const top = isArea ? rect.top + 6 : rect.top + rect.height / 2 - btnSize / 2;

  return createPortal(
    <>
      {d.listening ? (
        <RecordingBar
          live={d.live}
          onStop={d.stop}
          className="fixed z-[60]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: Math.max(44, Math.min(rect.height, 56)) }}
        />
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => d.start()}
          aria-label="Saisie vocale pour ce champ"
          title="Saisie vocale"
          style={{ top, left: rect.right - btnSize - 6, width: btnSize, height: btnSize }}
          className="bd-anim-pop fixed z-[60] flex items-center justify-center rounded-xl bg-bd-lilac text-bd-violet shadow-card transition hover:text-bd-pink-strong active:scale-90"
        >
          <Mic size={16} aria-hidden />
        </button>
      )}
      {d.note ? (
        <div className="fixed z-[60]" style={{ top: rect.bottom - 2, left: rect.left }}>
          <div className="relative">
            <DictationNote {...d.note} />
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
