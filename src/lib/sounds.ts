// Web Audio API sound synthesis — no external files needed.
// All functions are fire-and-forget; call from event handlers or effects.
// Silently no-ops in environments where AudioContext is unavailable (SSR, old browsers).

const MUTE_KEY = "ai-realm-muted";

let _muted = globalThis.localStorage?.getItem(MUTE_KEY) === "1";

export function isSoundMuted(): boolean { return _muted; }
export function setSoundMuted(value: boolean): void {
  _muted = value;
  if (globalThis.localStorage !== undefined) globalThis.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (_muted || globalThis.window === undefined) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainPeak: number,
  startTime?: number,
) {
  const c = getCtx();
  if (!c) return;
  const t = startTime ?? c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

/** เสียงเตือน QTE — urgent buzzing alarm */
export function playQteAlert() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  // สามจังหวะ beep เร็ว
  for (let i = 0; i < 3; i++) {
    playTone(880, "square", 0.08, 0.08, t + i * 0.12);
  }
}

/** เสียงเลือกตัวเลือก QTE */
export function playQteSelect() {
  playTone(660, "sine", 0.12, 0.12);
}

/** เสียง QTE timeout — low thud */
export function playQteTimeout() {
  playTone(120, "sawtooth", 0.25, 0.15);
}

/** เสียงโดนดาเมจ — low impact thud */
export function playDamage() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  // noise burst
  const bufferSize = c.sampleRate * 0.15;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(300, t);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  src.start(t);
}

/** เสียง level up — ascending fanfare */
export function playLevelUp() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(freq, "sine", 0.18, 0.1, t + i * 0.12);
  });
}

/** เสียงบรรยากาศ ambient — soft chime */
export function playAmbient() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  playTone(440, "sine", 0.8, 0.04, t);
  playTone(554, "sine", 0.8, 0.03, t + 0.05);
}
