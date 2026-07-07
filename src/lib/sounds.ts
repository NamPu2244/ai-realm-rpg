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

// ── Ambient loops (environment_fx) ──────────────────────────────────────────
// A looping synthesized ambience per active effect. setAmbientLoops() diffs against
// what's playing and fades each in/out. Every ambience connects into a per-effect master
// GainNode (which startLoop fades) and returns a stop() that halts its sources. All gains
// are kept low so the ambience sits under the prose. No audio files — pure Web Audio.
// KEEP THE KEYS IN SYNC with ENVIRONMENT_FX in @/lib/fx and the extraction prompt.
type StopFn = () => void;
type Loop = { gain: GainNode; stop: StopFn };
const activeLoops = new Map<string, Loop>();

function loopingNoise(c: AudioContext): AudioBufferSourceNode {
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

// Filtered-noise ambience: one noise source through a biquad into dest.
function noiseBed(c: AudioContext, dest: AudioNode, type: BiquadFilterType, freq: number, q: number): StopFn {
  const src = loopingNoise(c);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter);
  filter.connect(dest);
  src.start();
  return () => { try { src.stop(); } catch { /* already stopped */ } };
}

// A slow LFO oscillator modulating a target AudioParam (for wave swell / wind gusts).
function modulate(c: AudioContext, target: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = c.createOscillator();
  osc.frequency.value = rate;
  const g = c.createGain();
  g.gain.value = depth;
  osc.connect(g);
  g.connect(target);
  osc.start();
  return osc;
}

// name → { peak gain, builder that wires its graph into `dest` and returns a stop() }.
const AMBIENTS: Record<string, { peak: number; build: (c: AudioContext, dest: AudioNode) => StopFn }> = {
  // Weather / outdoors
  rain:   { peak: 0.05,  build: (c, d) => noiseBed(c, d, "bandpass", 1600, 0.5) },
  snow:   { peak: 0.015, build: (c, d) => noiseBed(c, d, "lowpass", 520, 0.5) },
  fog:    { peak: 0.03,  build: (c, d) => noiseBed(c, d, "lowpass", 220, 0.6) },
  wind:   { peak: 0.05,  build: (c, d) => {
    const src = loopingNoise(c);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 480; filter.Q.value = 0.9;
    src.connect(filter); filter.connect(d); src.start();
    const gust = modulate(c, filter.frequency, 0.12, 260); // howling gusts
    return () => { try { src.stop(); } catch {} try { gust.stop(); } catch {} };
  } },
  // Fire
  embers: { peak: 0.03,  build: (c, d) => noiseBed(c, d, "lowpass", 380, 1.1) },
  // Water
  water:      { peak: 0.04,  build: (c, d) => noiseBed(c, d, "bandpass", 720, 0.7) },
  underwater: { peak: 0.045, build: (c, d) => noiseBed(c, d, "lowpass", 180, 0.9) },
  ocean:  { peak: 0.06,  build: (c, d) => {
    const src = loopingNoise(c);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 650; filter.Q.value = 0.5;
    const wave = c.createGain(); wave.gain.value = 0.6;
    src.connect(filter); filter.connect(wave); wave.connect(d); src.start();
    const swell = modulate(c, wave.gain, 0.12, 0.4); // waves rolling in/out
    return () => { try { src.stop(); } catch {} try { swell.stop(); } catch {} };
  } },
  // Places
  cave:   { peak: 0.04,  build: (c, d) => noiseBed(c, d, "lowpass", 130, 0.7) },
  crowd:  { peak: 0.035, build: (c, d) => noiseBed(c, d, "bandpass", 500, 0.4) },
  machinery: { peak: 0.04, build: (c, d) => {
    const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 55;
    const oscF = c.createBiquadFilter(); oscF.type = "lowpass"; oscF.frequency.value = 200;
    osc.connect(oscF); oscF.connect(d); osc.start();
    const hiss = loopingNoise(c);
    const hf = c.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 1400;
    const hg = c.createGain(); hg.gain.value = 0.25;
    hiss.connect(hf); hf.connect(hg); hg.connect(d); hiss.start();
    return () => { try { osc.stop(); } catch {} try { hiss.stop(); } catch {} };
  } },
  magic:  { peak: 0.03,  build: (c, d) => {
    const o1 = c.createOscillator(); o1.type = "sine"; o1.frequency.value = 528;
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = 533; // detuned shimmer
    const trem = c.createGain(); trem.gain.value = 0.6;
    o1.connect(trem); o2.connect(trem); trem.connect(d);
    o1.start(); o2.start();
    const shimmer = modulate(c, trem.gain, 0.3, 0.3);
    return () => { for (const o of [o1, o2, shimmer]) { try { o.stop(); } catch {} } };
  } },
};

function startLoop(name: string) {
  const c = getCtx();
  const spec = AMBIENTS[name];
  if (!c || !spec || activeLoops.has(name)) return;
  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(spec.peak, c.currentTime + 1.2); // fade in
  master.connect(c.destination);
  const stop = spec.build(c, master);
  activeLoops.set(name, { gain: master, stop });
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
      setTimeout(loop.stop, 700);
    } else {
      loop.stop();
    }
  } catch {
    loop.stop();
  }
}

/** Reconcile the looping ambience to exactly `desired` (subset of AMBIENTS keys). */
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
