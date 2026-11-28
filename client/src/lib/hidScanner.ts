import { useEffect, useRef, useState } from 'react';

/**
 * USB / wireless barcode scanners ("douchettes", e.g. A8 1D/2D) act as a KEYBOARD: they type the code
 * very fast, then press Enter. This detects those bursts anywhere in the app.
 *
 * Keyboard layout: scanners send US-QWERTY key positions. On a French (AZERTY) PC, the browser would turn
 * "2001234567890" into "é&&&é'(-è_çà&". We rebuild every character from the PHYSICAL key (`event.code`)
 * with the US layout, so the code is right whatever the PC's layout is.
 *
 * Human typing is ignored: a scan is ≥ 4 characters, each < 45 ms apart, ended by Enter / Tab (or a short
 * pause after ≥ 6 characters, for scanners configured without suffix).
 */

const US: Record<string, [string, string]> = {
  Backquote: ['`', '~'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
  Space: [' ', ' '], IntlBackslash: ['<', '>'],
  Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'],
  Numpad0: ['0', '0'], Numpad1: ['1', '1'], Numpad2: ['2', '2'], Numpad3: ['3', '3'], Numpad4: ['4', '4'],
  Numpad5: ['5', '5'], Numpad6: ['6', '6'], Numpad7: ['7', '7'], Numpad8: ['8', '8'], Numpad9: ['9', '9'],
  NumpadDecimal: ['.', '.'], NumpadDivide: ['/', '/'], NumpadMultiply: ['*', '*'], NumpadSubtract: ['-', '-'], NumpadAdd: ['+', '+'],
};

/** Character of a key event in the US layout (null = not a printable key). */
export function usChar(e: Pick<KeyboardEvent, 'code' | 'key' | 'shiftKey' | 'getModifierState'>): string | null {
  const caps = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
  const m = e.code.match(/^Key([A-Z])$/);
  if (m) {
    const upper = e.shiftKey !== caps;
    return upper ? m[1] : m[1].toLowerCase();
  }
  const pair = US[e.code];
  if (pair) return e.shiftKey ? pair[1] : pair[0];
  // Unknown physical code (some Bluetooth stacks send none): fall back to the produced character.
  return e.key.length === 1 ? e.key : null;
}

/* ── Connection status ──
   A keyboard-type douchette cannot be "seen" by the browser before it scans (Windows treats it as a
   keyboard). So it counts as connected once a scan has been read on this PC in the last hours. */
const STATUS_KEY = 'bd-douchette-last';
const STATUS_EVENT = 'bd-douchette-scan';
const CONNECTED_FOR_MS = 12 * 60 * 60 * 1000;

export interface DouchetteRead {
  code: string;
  at: number;
}

export function lastDouchetteRead(): DouchetteRead | null {
  try {
    const v = JSON.parse(localStorage.getItem(STATUS_KEY) || 'null') as DouchetteRead | null;
    return v && Date.now() - v.at < CONNECTED_FOR_MS ? v : null;
  } catch {
    return null;
  }
}

function markDouchetteRead(code: string) {
  const read: DouchetteRead = { code, at: Date.now() };
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(read));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent<DouchetteRead>(STATUS_EVENT, { detail: read }));
}

/** Last douchette read (null = not detected yet), live. */
export function useDouchetteStatus() {
  const [read, setRead] = useState<DouchetteRead | null>(lastDouchetteRead);
  useEffect(() => {
    const on = (e: Event) => setRead((e as CustomEvent<DouchetteRead>).detail);
    window.addEventListener(STATUS_EVENT, on);
    return () => window.removeEventListener(STATUS_EVENT, on);
  }, []);
  return read;
}

const MAX_GAP_MS = 45; // scanners: 1–20 ms between keys; humans: 80+ ms
const MIN_LEN = 4;
const SILENT_END_MS = 80;

const isEditable = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !el.readOnly && !el.disabled;

/**
 * Douchette scans:
 *  - cursor in a text field → the field receives the code, correctly decoded (search, order articles…);
 *    fields marked `data-scan-input` also call `onScan`;
 *  - anywhere else → `onScan(code)`.
 */
export function useHidScanner(onScan: (code: string) => void, enabled = true) {
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = '';
    let last = 0;
    let fast = 0; // keys that arrived < MAX_GAP_MS after the previous one
    let field: HTMLInputElement | HTMLTextAreaElement | null = null;
    let fieldBefore = '';
    let silentTimer: number | null = null;

    const reset = () => {
      buffer = '';
      fast = 0;
      field = null;
      if (silentTimer) window.clearTimeout(silentTimer);
      silentTimer = null;
    };

    /** true = the scan was handled here (the Enter key must not do anything else). */
    const finish = (): boolean => {
      const code = buffer.trim();
      const isScan = code.length >= MIN_LEN && fast >= code.length - 1;
      if (!isScan) {
        reset();
        return false;
      }
      markDouchetteRead(code);
      const target = field;
      if (target) {
        // The field received the raw keys (garbled on AZERTY): replace them with the decoded code.
        const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(target, fieldBefore + code);
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      reset();
      if (target && !target.hasAttribute('data-scan-input')) return false; // the field handles it (search…)
      cb.current(code);
      return true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const now = performance.now();
      const gap = now - last;
      last = now;

      if (e.key === 'Enter' || e.key === 'Tab' || e.code === 'NumpadEnter') {
        if (buffer && gap < 120 && finish()) {
          e.preventDefault();
          e.stopPropagation();
        } else reset();
        return;
      }
      const ch = usChar(e);
      if (ch === null) return;

      if (!buffer || gap > MAX_GAP_MS) {
        // New possible burst: remember where it is typed and what the field contained before.
        reset();
        const el = document.activeElement;
        field = isEditable(el) ? el : null;
        fieldBefore = field?.value ?? '';
      } else {
        fast += 1;
      }
      buffer += ch;

      // Scanner without Enter suffix: end of burst after a short silence.
      if (silentTimer) window.clearTimeout(silentTimer);
      silentTimer = window.setTimeout(() => {
        if (buffer.length >= 6 && fast >= buffer.length - 1) finish();
        else reset();
      }, SILENT_END_MS);

      // Not in a field: the keys must not trigger anything else while a scan is coming in.
      if (!field && fast > 0) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (silentTimer) window.clearTimeout(silentTimer);
    };
  }, [enabled]);
}
