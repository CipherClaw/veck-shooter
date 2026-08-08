import type { WeaponId } from "@veck/shared";

type AudioBus = {
  input: GainNode;
  saturated: WaveShaperNode;
  reverb: AudioNode;
  reflection: AudioNode;
};

type LayerRoute = {
  reverb?: number;
  reflection?: number;
  saturate?: boolean;
};

type ToneOptions = {
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  attack?: number;
  delay?: number;
} & LayerRoute;

type NoiseOptions = {
  duration: number;
  attack: number;
  gain: number;
  filter?: BiquadFilterType;
  frequency?: number;
  endFrequency?: number;
  q?: number;
  delay?: number;
} & LayerRoute;

let ctx: AudioContext | null = null;
let mainBus: AudioBus | null = null;
let noiseBuffer: AudioBuffer | null = null;
let reverbBuffer: AudioBuffer | null = null;
let transientBuffer: AudioBuffer | null = null;
const activeSources = new Set<AudioScheduledSourceNode>();
const MAX_ACTIVE_SOURCES = 48;

function audio() {
  ctx ??= new AudioContext();
  return ctx;
}

export function beep(type: "ui" | "hit" | "kill" | "reload" | "heal" | "explosion" | WeaponId, muted: boolean, volume = 1) {
  if (muted || volume <= 0) return;
  const ac = audio();
  if (ac.state === "suspended") ac.resume().catch(() => undefined);
  if (type === "explosion") return playExplosion(ac, volume);
  if (type === "revolver") return playRevolverShot(ac, volume);
  if (type === "sniper") return playSniperShot(ac, volume);
  if (type === "shottie") return playShotgunBlast(ac, volume);
  if (type === "grenade") return playGrenadeLaunch(ac, volume);
  if (type === "watergun") {
    playNoise(ac, { duration: 0.055, attack: 0.001, gain: 0.09, filter: "bandpass", frequency: jitter(1850, 0.08), endFrequency: jitter(720, 0.08), q: 1.1 }, volume);
    playNoise(ac, { duration: 0.085, attack: 0.003, gain: 0.045, filter: "lowpass", frequency: 620, endFrequency: 230, q: 0.7 }, volume);
    playTone(ac, { frequency: jitter(540, 0.05), endFrequency: 280, duration: 0.065, gain: 0.026, type: "sine", attack: 0.002 }, volume);
    return;
  }
  if (type === "fist") {
    playNoise(ac, { duration: 0.065, attack: 0.001, gain: 0.075, filter: "lowpass", frequency: jitter(520, 0.08), endFrequency: 130, q: 0.7, saturate: true }, volume);
    playTone(ac, { frequency: jitter(88, 0.05), endFrequency: 48, duration: 0.075, gain: 0.035, type: "sine", attack: 0.001 }, volume);
    return;
  }
  if (type === "heal") {
    playTone(ac, { frequency: 420, endFrequency: 620, duration: 0.1, gain: 0.052, type: "sine" }, volume);
    window.setTimeout(() => playTone(ac, { frequency: 640, endFrequency: 880, duration: 0.12, gain: 0.042, type: "sine" }, volume), 75);
    return;
  }
  playTone(ac, {
    frequency: type === "hit" ? 720 : type === "reload" ? 260 : type === "kill" ? 180 : 340,
    endFrequency: type === "kill" ? 120 : undefined,
    duration: type === "reload" ? 0.13 : 0.16,
    gain: type === "hit" ? 0.075 : 0.064,
    type: "square"
  }, volume);
}

function getBus(ac: AudioContext) {
  if (mainBus) return mainBus;
  const input = ac.createGain();
  input.gain.value = 0.78;

  const saturated = ac.createWaveShaper();
  saturated.curve = saturationCurve();
  saturated.oversample = "none";
  saturated.connect(input);

  const compressor = ac.createDynamicsCompressor();
  compressor.threshold.value = -4;
  compressor.knee.value = 2;
  compressor.ratio.value = 2;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.045;

  const convolver = ac.createConvolver();
  convolver.buffer = getReverbBuffer(ac);
  const reverbGain = ac.createGain();
  reverbGain.gain.value = 0.18;
  convolver.connect(reverbGain);
  reverbGain.connect(compressor);

  const reflection = ac.createDelay(0.05);
  reflection.delayTime.value = 0.024;
  const reflectionFilter = ac.createBiquadFilter();
  reflectionFilter.type = "highpass";
  reflectionFilter.frequency.value = 540;
  const reflectionGain = ac.createGain();
  reflectionGain.gain.value = 0.22;
  reflection.connect(reflectionFilter);
  reflectionFilter.connect(reflectionGain);
  reflectionGain.connect(compressor);

  input.connect(compressor);
  compressor.connect(ac.destination);
  mainBus = { input, saturated, reverb: convolver, reflection };
  return mainBus;
}

function playRevolverShot(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.19, duration: 0.0045, delay: t, reverb: 0.04, reflection: 0.12 }, volume);
  playNoise(ac, { duration: 0.032, attack: 0.0005, gain: 0.13, filter: "highpass", frequency: jitter(2400, 0.07), q: 0.65, delay: t, reflection: 0.16 }, volume);
  playTone(ac, { frequency: jitter(155, 0.05), endFrequency: 55, duration: 0.085, gain: 0.085, type: "triangle", attack: 0.001, delay: t, saturate: true, reverb: 0.06 }, volume);
  playNoise(ac, { duration: 0.028, attack: 0.001, gain: 0.035, filter: "bandpass", frequency: jitter(3300, 0.1), endFrequency: 1450, q: 1.4, delay: t + randomRange(0.04, 0.052), reflection: 0.08 }, volume);
}

function playSniperShot(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.23, duration: 0.0055, delay: t, reverb: 0.11, reflection: 0.2 }, volume);
  playNoise(ac, { duration: 0.052, attack: 0.0005, gain: 0.16, filter: "highpass", frequency: jitter(1900, 0.07), q: 0.6, delay: t, reflection: 0.22 }, volume);
  playTone(ac, { frequency: jitter(108, 0.04), endFrequency: 31, duration: 0.27, gain: 0.12, type: "triangle", attack: 0.001, delay: t, saturate: true, reverb: 0.18 }, volume);
  playNoise(ac, { duration: 0.22, attack: 0.003, gain: 0.06, filter: "bandpass", frequency: jitter(1050, 0.08), endFrequency: 260, q: 0.7, delay: t + 0.018, reverb: 0.38, reflection: 0.15 }, volume);
  playNoise(ac, { duration: 0.035, attack: 0.001, gain: 0.03, filter: "bandpass", frequency: 2700, endFrequency: 1200, q: 1.5, delay: t + randomRange(0.15, 0.19) }, volume);
}

function playShotgunBlast(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.21, duration: 0.006, delay: t, reverb: 0.08, reflection: 0.16 }, volume);
  playNoise(ac, { duration: 0.105, attack: 0.0007, gain: 0.17, filter: "lowpass", frequency: jitter(1450, 0.08), endFrequency: 240, q: 0.62, delay: t, saturate: true, reflection: 0.18 }, volume);
  playTone(ac, { frequency: jitter(120, 0.05), endFrequency: 38, duration: 0.25, gain: 0.13, type: "triangle", attack: 0.001, delay: t, saturate: true, reverb: 0.12 }, volume);
  playNoise(ac, { duration: 0.27, attack: 0.004, gain: 0.065, filter: "bandpass", frequency: 520, endFrequency: 145, q: 0.65, delay: t + 0.012, reverb: 0.27, reflection: 0.12 }, volume);
  playNoise(ac, { duration: 0.045, attack: 0.001, gain: 0.035, filter: "bandpass", frequency: 2100, endFrequency: 850, q: 1.1, delay: t + randomRange(0.17, 0.22) }, volume);
}

function playGrenadeLaunch(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.12, duration: 0.005, delay: t, reverb: 0.04, reflection: 0.08 }, volume);
  playNoise(ac, { duration: 0.055, attack: 0.001, gain: 0.075, filter: "bandpass", frequency: jitter(850, 0.08), endFrequency: 260, q: 0.7, delay: t, saturate: true }, volume);
  playTone(ac, { frequency: jitter(92, 0.05), endFrequency: 39, duration: 0.19, gain: 0.105, type: "sine", attack: 0.002, delay: t, saturate: true, reverb: 0.08 }, volume);
  playNoise(ac, { duration: 0.16, attack: 0.004, gain: 0.045, filter: "lowpass", frequency: 340, endFrequency: 82, q: 0.6, delay: t + 0.018, reverb: 0.17, reflection: 0.08 }, volume);
}

function playExplosion(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.27, duration: 0.008, delay: t, reverb: 0.18, reflection: 0.2 }, volume);
  playNoise(ac, { duration: 0.075, attack: 0.0007, gain: 0.22, filter: "highpass", frequency: 720, q: 0.55, delay: t, reflection: 0.22 }, volume);
  playTone(ac, { frequency: jitter(76, 0.05), endFrequency: 24, duration: 0.62, gain: 0.21, type: "triangle", attack: 0.002, delay: t, saturate: true, reverb: 0.2 }, volume);
  playNoise(ac, { duration: 0.58, attack: 0.004, gain: 0.19, filter: "lowpass", frequency: 580, endFrequency: 68, q: 0.6, delay: t + 0.006, saturate: true, reverb: 0.38, reflection: 0.18 }, volume);
  playNoise(ac, { duration: 0.76, attack: 0.008, gain: 0.1, filter: "lowpass", frequency: 220, endFrequency: 42, q: 0.58, delay: t + 0.045, reverb: 0.4 }, volume);
}

function playTone(ac: AudioContext, options: ToneOptions, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const bus = getBus(ac);
  osc.type = options.type;
  osc.frequency.setValueAtTime(Math.max(20, options.frequency), now);
  if (options.endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
  shapeEnvelope(amp, now, options.attack ?? 0.002, options.duration, options.gain * volume);
  osc.connect(amp);
  const sends = routeLayer(ac, amp, bus, options);
  registerSource(osc);
  osc.start(now);
  osc.stop(now + options.duration + 0.02);
  osc.onended = () => disconnectSource(osc, amp, ...sends);
}

function playNoise(ac: AudioContext, options: NoiseOptions, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const source = ac.createBufferSource();
  const amp = ac.createGain();
  const bus = getBus(ac);
  const buffer = getNoiseBuffer(ac);
  source.buffer = buffer;
  shapeEnvelope(amp, now, options.attack, options.duration, options.gain * volume);
  let filter: BiquadFilterNode | null = null;
  if (options.filter && options.frequency) {
    filter = ac.createBiquadFilter();
    filter.type = options.filter;
    filter.frequency.setValueAtTime(Math.max(20, options.frequency), now);
    if (options.endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
    filter.Q.value = options.q ?? 0.7;
    source.connect(filter);
    filter.connect(amp);
  } else source.connect(amp);
  const sends = routeLayer(ac, amp, bus, options);
  registerSource(source);
  const offset = randomRange(0, Math.max(0.001, buffer.duration - options.duration - 0.03));
  source.start(now, offset, options.duration + 0.02);
  source.onended = () => disconnectSource(source, filter, amp, ...sends);
}

function playTransient(ac: AudioContext, options: { gain: number; duration: number; delay: number; reverb: number; reflection: number }, volume: number) {
  const now = ac.currentTime + options.delay;
  const source = ac.createBufferSource();
  const amp = ac.createGain();
  source.buffer = getTransientBuffer(ac);
  amp.gain.setValueAtTime(Math.max(0.001, options.gain * volume), now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
  source.connect(amp);
  const sends = routeLayer(ac, amp, getBus(ac), options);
  registerSource(source);
  source.start(now);
  source.stop(now + options.duration + 0.005);
  source.onended = () => disconnectSource(source, amp, ...sends);
}

function shapeEnvelope(amp: GainNode, now: number, attack: number, duration: number, gain: number) {
  amp.gain.setValueAtTime(0.001, now);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + attack);
  amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
}

function routeLayer(ac: AudioContext, source: AudioNode, bus: AudioBus, options: LayerRoute) {
  source.connect(options.saturate ? bus.saturated : bus.input);
  return [connectSend(ac, source, bus.reverb, options.reverb), connectSend(ac, source, bus.reflection, options.reflection)].filter((node): node is GainNode => Boolean(node));
}

function connectSend(ac: AudioContext, source: AudioNode, destination: AudioNode, amount = 0) {
  if (amount <= 0) return null;
  const send = ac.createGain();
  send.gain.value = amount;
  source.connect(send);
  send.connect(destination);
  return send;
}

function registerSource(source: AudioScheduledSourceNode) {
  while (activeSources.size >= MAX_ACTIVE_SOURCES) {
    const oldest = activeSources.values().next().value as AudioScheduledSourceNode | undefined;
    if (!oldest) break;
    activeSources.delete(oldest);
    try { oldest.stop(); } catch { /* Source already ended. */ }
  }
  activeSources.add(source);
}

function disconnectSource(source: AudioScheduledSourceNode, ...nodes: Array<AudioNode | null>) {
  activeSources.delete(source);
  for (const node of [source, ...nodes]) {
    try { node?.disconnect(); } catch { /* Node was already disconnected. */ }
  }
}

function getNoiseBuffer(ac: AudioContext) {
  if (noiseBuffer?.sampleRate === ac.sampleRate) return noiseBuffer;
  const buffer = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function getTransientBuffer(ac: AudioContext) {
  if (transientBuffer?.sampleRate === ac.sampleRate) return transientBuffer;
  const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * 0.012)), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.0015));
  transientBuffer = buffer;
  return buffer;
}

function getReverbBuffer(ac: AudioContext) {
  if (reverbBuffer?.sampleRate === ac.sampleRate) return reverbBuffer;
  const length = Math.floor(ac.sampleRate * 0.9);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      previous = previous * 0.48 + (Math.random() * 2 - 1) * 0.52;
      data[i] = previous * Math.pow(1 - i / length, 3.4) * 0.48;
    }
  }
  reverbBuffer = buffer;
  return buffer;
}

function saturationCurve() {
  const curve = new Float32Array(512) as Float32Array<ArrayBuffer>;
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i * 2) / (curve.length - 1) - 1;
    curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8);
  }
  return curve;
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jitter(value: number, amount: number) {
  return value * randomRange(1 - amount, 1 + amount);
}

function randomTiming() {
  return randomRange(0, 0.003);
}
