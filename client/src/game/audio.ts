import type { WeaponId } from "@veck/shared";

type AudioBus = {
  input: GainNode;
  reverb: AudioNode;
};

type LayerRoute = {
  reverb?: number;
  saturate?: number;
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
const saturationCurves = new Map<number, Float32Array<ArrayBuffer>>();

function audio() {
  ctx ??= new AudioContext();
  return ctx;
}

export function beep(type: "ui" | "hit" | "kill" | "reload" | "heal" | "explosion" | WeaponId, muted: boolean, volume = 1) {
  if (muted || volume <= 0) return;
  const ac = audio();
  if (ac.state === "suspended") ac.resume().catch(() => undefined);
  if (type === "explosion") {
    playExplosion(ac, volume);
    return;
  }
  if (type === "revolver" || type === "sniper" || type === "shottie" || type === "grenade") {
    playGunshot(ac, type, volume);
    return;
  }
  if (type === "watergun") {
    playNoise(ac, { duration: 0.075, attack: 0.0015, gain: 0.024, filter: "bandpass", frequency: jitter(1650, 0.04), endFrequency: jitter(760, 0.04), q: 1.7 }, volume);
    playNoise(ac, { duration: 0.11, attack: 0.005, gain: 0.012, filter: "lowpass", frequency: jitter(620, 0.03), q: 0.8 }, volume);
    playTone(ac, { frequency: jitter(620, 0.03), endFrequency: jitter(360, 0.04), duration: 0.09, gain: 0.013, type: "sine", attack: 0.002 }, volume);
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
  input.gain.value = 0.92;

  const compressor = ac.createDynamicsCompressor();
  compressor.threshold.value = -13;
  compressor.knee.value = 8;
  compressor.ratio.value = 5.5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;

  const convolver = ac.createConvolver();
  convolver.buffer = getReverbBuffer(ac);

  const reverb = ac.createGain();
  reverb.gain.value = 0.24;

  input.connect(compressor);
  convolver.connect(reverb);
  reverb.connect(compressor);
  compressor.connect(ac.destination);

  mainBus = { input, reverb: convolver };
  return mainBus;
}

function playGunshot(ac: AudioContext, weapon: "revolver" | "sniper" | "shottie" | "grenade", volume: number) {
  if (weapon === "grenade") {
    playGrenadeLaunch(ac, volume);
    return;
  }
  if (weapon === "revolver") {
    playRevolverShot(ac, volume);
    return;
  }
  if (weapon === "sniper") {
    playSniperShot(ac, volume);
    return;
  }
  playShotgunBlast(ac, volume);
}

function playRevolverShot(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.2, duration: 0.0055, delay: t, reverb: 0.1 }, volume);
  playNoise(ac, { duration: randomRange(0.028, 0.038), attack: 0.0007, gain: jitter(0.17, 0.05), filter: "highpass", frequency: jitter(2550, 0.05), q: 0.7, delay: t, reverb: 0.13 }, volume);
  playTone(ac, { frequency: jitter(138, 0.04), endFrequency: jitter(48, 0.06), duration: randomRange(0.09, 0.12), gain: jitter(0.105, 0.05), type: "triangle", attack: 0.001, delay: t + randomRange(0, 0.002), saturate: 2.4, reverb: 0.05 }, volume);
  playNoise(ac, { duration: randomRange(0.07, 0.095), attack: 0.002, gain: jitter(0.07, 0.06), filter: "lowpass", frequency: jitter(1150, 0.05), endFrequency: jitter(260, 0.06), q: 0.65, delay: t + randomRange(0.004, 0.008), saturate: 1.7, reverb: 0.2 }, volume);
}

function playSniperShot(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.25, duration: 0.006, delay: t, reverb: 0.22 }, volume);
  playNoise(ac, { duration: randomRange(0.045, 0.062), attack: 0.0006, gain: jitter(0.22, 0.05), filter: "highpass", frequency: jitter(2100, 0.05), q: 0.62, delay: t, reverb: 0.34 }, volume);
  playTone(ac, { frequency: jitter(96, 0.04), endFrequency: jitter(30, 0.06), duration: randomRange(0.29, 0.36), gain: jitter(0.16, 0.05), type: "triangle", attack: 0.0015, delay: t + randomRange(0, 0.003), saturate: 3.1, reverb: 0.16 }, volume);
  playNoise(ac, { duration: randomRange(0.28, 0.38), attack: 0.003, gain: jitter(0.11, 0.06), filter: "lowpass", frequency: jitter(780, 0.05), endFrequency: jitter(120, 0.07), q: 0.6, delay: t + randomRange(0.012, 0.02), saturate: 2, reverb: 0.46 }, volume);
  playNoise(ac, { duration: randomRange(0.14, 0.22), attack: 0.002, gain: jitter(0.052, 0.08), filter: "bandpass", frequency: jitter(2400, 0.08), endFrequency: jitter(1180, 0.08), q: 0.9, delay: t + randomRange(0.055, 0.085), reverb: 0.5 }, volume);
}

function playShotgunBlast(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.24, duration: 0.0065, delay: t, reverb: 0.18 }, volume);
  playNoise(ac, { duration: randomRange(0.03, 0.045), attack: 0.0006, gain: jitter(0.16, 0.06), filter: "highpass", frequency: jitter(2850, 0.07), q: 0.64, delay: t, reverb: 0.2 }, volume);
  playNoise(ac, { duration: randomRange(0.1, 0.135), attack: 0.001, gain: jitter(0.26, 0.05), filter: "lowpass", frequency: jitter(1750, 0.06), endFrequency: jitter(310, 0.07), q: 0.7, delay: t + randomRange(0, 0.002), saturate: 3, reverb: 0.3 }, volume);
  playTone(ac, { frequency: jitter(112, 0.04), endFrequency: jitter(35, 0.07), duration: randomRange(0.28, 0.35), gain: jitter(0.18, 0.05), type: "triangle", attack: 0.0012, delay: t + randomRange(0.001, 0.003), saturate: 3.3, reverb: 0.14 }, volume);
  playNoise(ac, { duration: randomRange(0.18, 0.25), attack: 0.0025, gain: jitter(0.12, 0.06), filter: "bandpass", frequency: jitter(620, 0.07), endFrequency: jitter(230, 0.08), q: 0.72, delay: t + randomRange(0.008, 0.014), saturate: 2.2, reverb: 0.36 }, volume);
  playNoise(ac, { duration: randomRange(0.34, 0.43), attack: 0.005, gain: jitter(0.09, 0.07), filter: "lowpass", frequency: jitter(430, 0.06), endFrequency: jitter(120, 0.08), q: 0.58, delay: t + randomRange(0.025, 0.04), saturate: 1.8, reverb: 0.48 }, volume);
}

function playGrenadeLaunch(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.07, duration: 0.005, delay: t, reverb: 0.05 }, volume);
  playNoise(ac, { duration: randomRange(0.15, 0.22), attack: 0.003, gain: jitter(0.12, 0.06), filter: "lowpass", frequency: jitter(340, 0.06), endFrequency: jitter(105, 0.07), q: 0.65, delay: t, saturate: 2.1, reverb: 0.1 }, volume);
  playTone(ac, { frequency: jitter(92, 0.05), endFrequency: jitter(38, 0.07), duration: randomRange(0.18, 0.23), gain: jitter(0.12, 0.05), type: "triangle", attack: 0.002, delay: t, saturate: 2.6, reverb: 0.06 }, volume);
  playNoise(ac, { duration: randomRange(0.16, 0.22), attack: 0.006, gain: jitter(0.06, 0.08), filter: "lowpass", frequency: jitter(245, 0.07), endFrequency: jitter(88, 0.08), q: 0.62, delay: t + randomRange(0.026, 0.045), reverb: 0.12 }, volume);
}

function playExplosion(ac: AudioContext, volume: number) {
  const t = randomTiming();
  playTransient(ac, { gain: 0.24, duration: 0.009, delay: t, reverb: 0.28 }, volume);
  playNoise(ac, { duration: randomRange(0.05, 0.07), attack: 0.0008, gain: jitter(0.2, 0.05), filter: "highpass", frequency: jitter(780, 0.05), q: 0.58, delay: t, reverb: 0.32 }, volume);
  playTone(ac, { frequency: jitter(74, 0.04), endFrequency: jitter(24, 0.05), duration: randomRange(0.58, 0.72), gain: jitter(0.2, 0.05), type: "triangle", attack: 0.003, delay: t + randomRange(0, 0.004), saturate: 3.2, reverb: 0.2 }, volume);
  playNoise(ac, { duration: randomRange(0.48, 0.62), attack: 0.005, gain: jitter(0.22, 0.06), filter: "lowpass", frequency: jitter(560, 0.05), endFrequency: jitter(76, 0.07), q: 0.62, delay: t + randomRange(0.004, 0.012), saturate: 2.5, reverb: 0.5 }, volume);
  playNoise(ac, { duration: randomRange(0.66, 0.82), attack: 0.008, gain: jitter(0.12, 0.07), filter: "lowpass", frequency: jitter(225, 0.06), endFrequency: jitter(45, 0.08), q: 0.58, delay: t + randomRange(0.05, 0.075), saturate: 1.8, reverb: 0.48 }, volume);
}

function playTone(ac: AudioContext, options: ToneOptions, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const attack = options.attack ?? 0.002;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const output = ac.createGain();
  const audioBus = getBus(ac);

  osc.type = options.type;
  osc.frequency.setValueAtTime(Math.max(20, options.frequency), now);
  if (options.endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);

  amp.gain.setValueAtTime(0.001, now);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, options.gain * volume), now + attack);
  amp.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

  osc.connect(amp);
  const saturator = connectLayer(ac, amp, output, options);
  output.connect(audioBus.input);
  const reverbSend = connectReverb(ac, output, audioBus, options.reverb);

  osc.start(now);
  osc.stop(now + options.duration + 0.03);
  osc.onended = () => disconnectNodes(osc, amp, saturator, output, reverbSend);
}

function playNoise(ac: AudioContext, options: NoiseOptions, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const source = ac.createBufferSource();
  const amp = ac.createGain();
  const output = ac.createGain();
  const audioBus = getBus(ac);

  source.buffer = getNoiseBuffer(ac);
  amp.gain.setValueAtTime(0.001, now);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, options.gain * volume), now + options.attack);
  amp.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

  let filter: BiquadFilterNode | null = null;
  if (options.filter && options.frequency) {
    filter = ac.createBiquadFilter();
    filter.type = options.filter;
    filter.frequency.setValueAtTime(Math.max(20, options.frequency), now);
    if (options.endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
    filter.Q.setValueAtTime(options.q ?? 0.7, now);
    source.connect(filter);
    filter.connect(amp);
  } else {
    source.connect(amp);
  }

  const saturator = connectLayer(ac, amp, output, options);
  output.connect(audioBus.input);
  const reverbSend = connectReverb(ac, output, audioBus, options.reverb);

  source.start(now);
  source.stop(now + options.duration + 0.04);
  source.onended = () => disconnectNodes(source, filter, amp, saturator, output, reverbSend);
}

function playTransient(ac: AudioContext, options: { gain: number; duration: number; delay: number; reverb: number }, volume: number) {
  const now = ac.currentTime + options.delay;
  const source = ac.createBufferSource();
  const amp = ac.createGain();
  const audioBus = getBus(ac);

  source.buffer = getTransientBuffer(ac);
  amp.gain.setValueAtTime(Math.max(0.001, options.gain * volume), now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

  source.connect(amp);
  amp.connect(audioBus.input);
  const reverbSend = connectReverb(ac, amp, audioBus, options.reverb);
  source.start(now);
  source.stop(now + options.duration + 0.01);
  source.onended = () => disconnectNodes(source, amp, reverbSend);
}

function connectLayer(ac: AudioContext, source: AudioNode, output: GainNode, options: LayerRoute) {
  if (options.saturate) {
    const saturator = ac.createWaveShaper();
    saturator.curve = getSaturationCurve(options.saturate);
    saturator.oversample = "2x";
    source.connect(saturator);
    saturator.connect(output);
    return saturator;
  }
  source.connect(output);
  return null;
}

function connectReverb(ac: AudioContext, source: AudioNode, audioBus: AudioBus, amount = 0) {
  if (amount <= 0) return null;
  const send = ac.createGain();
  send.gain.value = amount;
  source.connect(send);
  send.connect(audioBus.reverb);
  return send;
}

function disconnectNodes(...nodes: Array<AudioNode | null>) {
  for (const node of nodes) {
    try {
      node?.disconnect();
    } catch {
      // Node was already disconnected.
    }
  }
}

function getNoiseBuffer(ac: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function getTransientBuffer(ac: AudioContext) {
  if (transientBuffer && transientBuffer.sampleRate === ac.sampleRate) return transientBuffer;
  const length = Math.max(1, Math.floor(ac.sampleRate * 0.012));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const decay = Math.exp(-i / (ac.sampleRate * 0.0016));
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  transientBuffer = buffer;
  return buffer;
}

function getReverbBuffer(ac: AudioContext) {
  if (reverbBuffer && reverbBuffer.sampleRate === ac.sampleRate) return reverbBuffer;
  const length = Math.floor(ac.sampleRate * 1.15);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const noise = Math.random() * 2 - 1;
      const filtered = previous * 0.58 + noise * 0.42;
      const earlyReflection = i < ac.sampleRate * 0.045 ? 1.25 : 1;
      previous = filtered;
      data[i] = filtered * earlyReflection * Math.pow(1 - t, 2.7) * 0.58;
    }
  }
  reverbBuffer = buffer;
  return buffer;
}

function getSaturationCurve(amount: number) {
  const key = Math.round(amount * 10);
  const cached = saturationCurves.get(key);
  if (cached) return cached;
  const samples = 512;
  const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
  const drive = Math.max(1, amount);
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  saturationCurves.set(key, curve);
  return curve;
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jitter(value: number, amount: number) {
  return value * randomRange(1 - amount, 1 + amount);
}

function randomTiming() {
  return randomRange(0, 0.004);
}
