import { useCallback, useEffect, useRef, useState } from 'react';

/* ───────────────────────── Web Speech API (fr-FR) ───────────────────────── */

type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function speechSupported() {
  if (typeof window === 'undefined') return false;
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Only one recognizer at a time across the app: starting a new one stops the current one. */
let activeStop: (() => void) | null = null;

export type DictationError = 'unsupported' | 'denied' | 'no-speech' | 'failed';

export interface DictationOptions {
  /** Keep listening across pauses (per-field mic). The guided assistant uses single-utterance mode. */
  continuous?: boolean;
  onFinal?: (text: string) => void;
  onEnd?: (text: string) => void;
}

/**
 * Live dictation: `interim` updates while speaking, `text` accumulates final segments.
 * `stop()` resolves the session and calls onEnd with the full transcript.
 */
export function useDictation({ continuous = true, onFinal, onEnd }: DictationOptions = {}) {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const cbRef = useRef({ onFinal, onEnd });
  cbRef.current = { onFinal, onEnd };
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<DictationError | null>(null);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onend = null;
    rec.onresult = null;
    rec.abort();
    recRef.current = null;
    if (activeStop === abort) activeStop = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setError(null);
    if (!Ctor) {
      setError('unsupported');
      return false;
    }
    activeStop?.();
    abort();
    finalRef.current = '';
    interimRef.current = '';
    setText('');
    setInterim('');

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = continuous;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      let live = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) {
          finalRef.current = `${finalRef.current} ${t}`.replace(/\s+/g, ' ').trim();
          cbRef.current.onFinal?.(finalRef.current);
        } else live += t;
      }
      interimRef.current = live.trim();
      setText(finalRef.current);
      setInterim(interimRef.current);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('denied');
      else if (e.error === 'no-speech') setError('no-speech');
      else if (e.error !== 'aborted') setError('failed');
    };
    rec.onend = () => {
      const full = `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim();
      recRef.current = null;
      if (activeStop === stopThis) activeStop = null;
      setListening(false);
      setInterim('');
      setText(full);
      cbRef.current.onEnd?.(full);
    };
    const stopThis = () => rec.stop();
    recRef.current = rec;
    activeStop = stopThis;
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      recRef.current = null;
      setError('failed');
      return false;
    }
  }, [abort, continuous]);

  useEffect(() => () => abort(), [abort]);

  return { start, stop, abort, listening, text, interim, error, live: `${text} ${interim}`.trim() };
}

export const DICTATION_ERROR_LABEL: Record<DictationError, string> = {
  unsupported: 'Dictée non disponible sur ce navigateur (utilisez Chrome ou Edge).',
  denied: 'Micro refusé : autorisez-le dans les réglages du navigateur.',
  'no-speech': "Je n'ai rien entendu. Réessayez.",
  failed: 'La dictée a échoué. Réessayez.',
};

/* ───────────────────────── Text-to-speech ───────────────────────── */

export function speak(text: string, onDone?: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) {
    onDone?.();
    return () => {};
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 1.08;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('fr'));
  if (voice) u.voice = voice;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone?.();
  };
  u.onend = finish;
  u.onerror = finish;
  // Some browsers never fire onend: fall back on a length-based timer.
  const t = window.setTimeout(finish, 900 + text.length * 70);
  synth.speak(u);
  return () => {
    window.clearTimeout(t);
    done = true;
    synth.cancel();
  };
}

/* ───────────────────────── Writing into inputs ───────────────────────── */

/** Sets a React-controlled input's value and fires the input event React listens to. */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Adapts a raw transcript to the field type (email, phone, numbers). */
export function normalizeForField(text: string, el?: HTMLInputElement | HTMLTextAreaElement | null) {
  const t = text.trim();
  if (!el || el instanceof HTMLTextAreaElement) return t;
  const kind = el.type === 'email' ? 'email' : el.type === 'tel' ? 'tel' : el.inputMode === 'numeric' || el.inputMode === 'decimal' || el.type === 'number' ? 'number' : 'text';
  if (kind === 'email') return spokenEmail(t);
  if (kind === 'tel') return spokenDigits(t);
  if (kind === 'number') {
    const n = parseFrenchNumber(t);
    return n === null ? t : String(n);
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function spokenEmail(t: string) {
  return t
    .toLowerCase()
    .replace(/\s*(arobase|arrobase|at)\s*/g, '@')
    .replace(/\s*(point|dot)\s*/g, '.')
    .replace(/\s*(tiret du bas|underscore)\s*/g, '_')
    .replace(/\s*(tiret)\s*/g, '-')
    .replace(/\s+/g, '');
}

export function spokenDigits(t: string) {
  const stripCountry = (d: string) => (d.length > 8 && /^(00)?216/.test(d) ? d.replace(/^(00)?216/, '') : d);
  const direct = stripCountry(t.replace(/\D/g, ''));
  if (direct.length >= 6) return direct;
  // "cinquante-cinq huit cent soixante-trois…" → read word groups as numbers.
  return t
    .split(/[\s,]+/)
    .map((w) => {
      if (/^\d+$/.test(w)) return w;
      const n = parseFrenchNumber(w);
      return n === null ? '' : String(n);
    })
    .join('');
}

/* ───────────────────────── French parsing ───────────────────────── */

const UNITS: Record<string, number> = {
  zero: 0, zéro: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, septante: 70, huitante: 80, octante: 80, nonante: 90,
};

/** "trois cent quatre-vingts" → 380, "12,5" → 12.5, "deux mille cinq cents" → 2500. Returns null when nothing numeric. */
export function parseFrenchNumber(raw: string): number | null {
  const s = raw.toLowerCase().replace(/(dinars?|dt|tnd|pour ?cent|%|pourcents?)/g, ' ').trim();
  const digit = s.match(/-?\d+(?:[.,]\d+)?/);
  if (digit) {
    let n = Number(digit[0].replace(',', '.'));
    // "120 et 500 millimes" / "120 virgule 5"
    const virg = s.match(/virgule\s+(\d+)/);
    if (virg && Number.isInteger(n)) n = Number(`${n}.${virg[1]}`);
    return Number.isFinite(n) ? n : null;
  }
  const words = s.replace(/-/g, ' ').split(/\s+/).filter((w) => w && w !== 'et');
  let total = 0; // thousands and above
  let group = 0; // hundreds inside the current thousand group
  let small = 0; // 0–99 part
  let found = false;
  let decimals: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === 'virgule' || w === 'point') {
      decimals = parseFrenchNumber(words.slice(i + 1).join(' '));
      break;
    }
    if (w in UNITS) {
      const v = UNITS[w];
      // quatre-vingt(s) = 4 × 20
      if (v === 20 && small > 0 && small < 10) small *= 20;
      else small += v;
      found = true;
    } else if (w === 'cent' || w === 'cents') {
      group += (small || 1) * 100;
      small = 0;
      found = true;
    } else if (w === 'mille') {
      total += (group + small || 1) * 1000;
      group = 0;
      small = 0;
      found = true;
    } else if (w === 'million' || w === 'millions') {
      total += (group + small || 1) * 1_000_000;
      group = 0;
      small = 0;
      found = true;
    }
  }
  if (!found) return null;
  const whole = total + group + small;
  if (decimals !== null) return Number(`${whole}.${String(decimals).replace('.', '')}`);
  return whole;
}

export type YesNo = 'yes' | 'no' | null;

export function parseYesNo(raw: string): YesNo {
  const s = ` ${raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
  if (/\b(non|nan|no|pas besoin|pas maintenant|c'est tout|c est tout|fini|termine|stop|arrete|aucun)\b/.test(s)) return 'no';
  if (/\b(oui|ouais|yes|ok|okay|d'accord|daccord|bien sur|vas-y|vas y|allez|suivant|continue|absolument|exact|carrement)\b/.test(s)) return 'yes';
  return null;
}

/** Light fuzzy match of a spoken label against options (accents/case-insensitive). */
export function matchOption<T extends { label: string }>(raw: string, options: T[]): T | null {
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
  const said = norm(raw);
  if (!said) return null;
  let best: { o: T; score: number } | null = null;
  for (const o of options) {
    const l = norm(o.label);
    let score = 0;
    if (l === said) score = 100;
    else if (said.includes(l) || l.includes(said)) score = 60 + Math.min(l.length, said.length);
    else {
      const sw = new Set(said.split(/\s+/).filter((w) => w.length > 2));
      const lw = l.split(/\s+/).filter((w) => w.length > 2);
      const hits = lw.filter((w) => [...sw].some((x) => x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))).length;
      score = hits * 20;
    }
    if (score > (best?.score ?? 0)) best = { o, score };
  }
  return best && best.score >= 20 ? best.o : null;
}
