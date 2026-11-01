// Silent Web Audio keepalive: audio-active pages are exempt from intensive
// hidden-tab timer throttling in Chromium (research §4). Gain stays at 0.
let ctx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;

export function startKeepalive() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0; // silent
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  void ctx.resume();
}

export function stopKeepalive() {
  try {
    oscillator?.stop();
  } catch {
    /* already stopped */
  }
  oscillator = null;
  void ctx?.close();
  ctx = null;
}
