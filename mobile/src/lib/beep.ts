/** Shared audio context — mobile browsers require resume() after user gesture. */
let audioCtx: AudioContext | null = null;

export async function unlockAudio(): Promise<void> {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch {
    /* silent */
  }
}

function playTone(freq: number, startAt: number, durationSec: number, volume: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = 'square';
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

/** Classic scanner "pip" — short double beep. */
export function playScanBeep() {
  void unlockAudio().then(() => {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(2100, t, 0.07, 0.35);
    playTone(2600, t + 0.09, 0.09, 0.4);
  });
}

export function playSuccessBeep() {
  void unlockAudio().then(() => {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(880, t, 0.12, 0.3);
    playTone(1320, t + 0.14, 0.18, 0.32);
  });
}

export function playErrorBeep() {
  void unlockAudio().then(() => {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(320, t, 0.2, 0.28);
  });
}

export function vibrateScan() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([30, 40, 30]);
  }
}
