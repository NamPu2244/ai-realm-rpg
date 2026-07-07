// Web Audio API sound synthesis — no external files needed.
// All functions are fire-and-forget; call from event handlers or effects.
// Silently no-ops in environments where AudioContext is unavailable (SSR, old browsers).

const MUTE_KEY = "storyweave-muted";

let _muted = globalThis.localStorage?.getItem(MUTE_KEY) === "1";

export function isSoundMuted(): boolean { return _muted; }
export function setSoundMuted(value: boolean): void {
  _muted = value;
  if (globalThis.localStorage !== undefined) globalThis.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  if (value) stopAllAmbient(); // muting kills any looping weather immediately
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

// ─────────────────────────────────────────────────────────────────────────────
// Cinematic FX sound (paired with the visual FX in FXManager). Synthesized, no files.
// ─────────────────────────────────────────────────────────────────────────────

// Filtered noise burst helper (explosions, cracks, impacts).
function noiseBurst(duration: number, filterType: BiquadFilterType, freq: number, gainPeak: number) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, t);
  const gain = c.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(gainPeak, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.start(t);
  src.stop(t + duration);
  return { filter, t };
}

/** impact_fx 'shake' — deep explosion / heavy impact boom (noise + downward low-pass sweep). */
export function playBoom() {
  const res = noiseBurst(0.5, "lowpass", 220, 0.5);
  const c = getCtx();
  if (res && c) res.filter.frequency.exponentialRampToValueAtTime(50, res.t + 0.5); // rumble down
}

/** impact_fx 'flash' — bright crack / thunderclap (sharp high burst + low tail). */
export function playThunder() {
  noiseBurst(0.12, "highpass", 2500, 0.35);   // sharp crack
  noiseBurst(0.6, "lowpass", 180, 0.28);      // rolling tail
}

// ── Ambient weather loops (environment_fx) ──────────────────────────────────
// Looping filtered noise, one node-chain per active effect. setAmbientLoops() diffs
// against what's playing and fades in/out. Kept low-gain so it sits under the prose.
type Loop = { src: AudioBufferSourceNode; gain: GainNode };
const activeLoops = new Map<string, Loop>();

const LOOP_SPECS: Record<string, { type: BiquadFilterType; freq: number; q: number; gain: number }> = {
  rain:   { type: "bandpass", freq: 1600, q: 0.5, gain: 0.05 },
  snow:   { type: "lowpass",  freq: 520,  q: 0.5, gain: 0.015 },
  fog:    { type: "lowpass",  freq: 220,  q: 0.6, gain: 0.03 },
  embers: { type: "lowpass",  freq: 380,  q: 1.1, gain: 0.03 },
};

function startLoop(name: string) {
  const c = getCtx();
  const spec = LOOP_SPECS[name];
  if (!c || !spec || activeLoops.has(name)) return;
  const bufferSize = Math.floor(c.sampleRate * 2);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = spec.type;
  filter.frequency.value = spec.freq;
  filter.Q.value = spec.q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(spec.gain, c.currentTime + 1.2); // fade in
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start();
  activeLoops.set(name, { src, gain });
}

function stopLoop(name: string) {
  const loop = activeLoops.get(name);
  if (!loop) return;
  activeLoops.delete(name);
  try {
    const c = getCtx();
    if (c) {
      loop.gain.gain.cancelScheduledValues(c.currentTime);
      loop.gain.gain.setValueAtTime(loop.gain.gain.value, c.currentTime);
      loop.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6); // fade out
      loop.src.stop(c.currentTime + 0.7);
    } else {
      loop.src.stop();
    }
  } catch {
    // node may already be stopped
  }
}

/** Reconcile the looping weather to exactly `desired` (subset of LOOP_SPECS keys). */
export function setAmbientLoops(desired: string[]) {
  // Snapshot keys first — stopLoop() mutates activeLoops mid-iteration.
  const playing = Array.from(activeLoops.keys());
  for (const name of playing) {
    if (!desired.includes(name)) stopLoop(name);
  }
  for (const name of desired) startLoop(name);
}

/** Stop every looping ambient sound (on mute or leaving the game). */
export function stopAllAmbient() {
  const playing = Array.from(activeLoops.keys());
  for (const name of playing) stopLoop(name);
}
