/**
 * Supermarket-style "bip" for a successful scan (Web Audio, no file to load).
 * Browsers only allow sound after a user gesture: call `unlockBeep()` from a tap (it is also hooked on
 * the first pointerdown of the page).
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function unlockBeep() {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockBeep, { once: true, passive: true });
}

export function scanBeep(ok = true) {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  const t = a.currentTime;
  const tone = (freq: number, start: number, dur: number) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t + start);
    g.gain.exponentialRampToValueAtTime(0.18, t + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
    o.connect(g).connect(a.destination);
    o.start(t + start);
    o.stop(t + start + dur + 0.02);
  };
  if (ok) tone(1760, 0, 0.12);
  else {
    tone(320, 0, 0.14);
    tone(240, 0.16, 0.18);
  }
}
