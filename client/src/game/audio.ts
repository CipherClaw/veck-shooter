import type { WeaponId } from "@veck/shared";

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

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
    playNoise(ac, { duration: 0.075, attack: 0.002, gain: 0.025, filter: "bandpass", frequency: 1650, endFrequency: 760, q: 1.7 }, volume);
    playNoise(ac, { duration: 0.11, attack: 0.006, gain: 0.013, filter: "lowpass", frequency: 620, q: 0.8 }, volume);
    playTone(ac, { frequency: 620, endFrequency: 360, duration: 0.09, gain: 0.014, type: "sine", attack: 0.002 }, volume);
    return;
  }
  if (type === "heal") {
    playTone(ac, { frequency: 420, endFrequency: 620, duration: 0.1, gain: 0.055, type: "sine" }, volume);
    window.setTimeout(() => playTone(ac, { frequency: 640, endFrequency: 880, duration: 0.12, gain: 0.045, type: "sine" }, volume), 75);
    return;
  }
  playTone(ac, {
    frequency: type === "hit" ? 720 : type === "reload" ? 260 : type === "kill" ? 180 : 340,
    endFrequency: type === "kill" ? 120 : undefined,
    duration: type === "reload" ? 0.13 : 0.16,
    gain: type === "hit" ? 0.08 : 0.07,
    type: "square"
  }, volume);
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
  playNoise(ac, { duration: 0.026, attack: 0.001, gain: 0.14, filter: "highpass", frequency: 2400, q: 0.9 }, volume);
  playNoise(ac, { duration: 0.052, attack: 0.001, gain: 0.075, filter: "bandpass", frequency: 3900, endFrequency: 2600, q: 1.4 }, volume);
  playNoise(ac, { duration: 0.16, attack: 0.004, gain: 0.048, filter: "lowpass", frequency: 1100, endFrequency: 420, q: 0.8, delay: 0.006 }, volume);
  playTone(ac, { frequency: 190, endFrequency: 48, duration: 0.11, gain: 0.095, type: "triangle", attack: 0.001 }, volume);
  playTone(ac, { frequency: 78, endFrequency: 36, duration: 0.14, gain: 0.035, type: "sine", attack: 0.003, delay: 0.008 }, volume);
}

function playSniperShot(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.018, attack: 0.001, gain: 0.19, filter: "highpass", frequency: 4200, q: 0.75 }, volume);
  playNoise(ac, { duration: 0.08, attack: 0.001, gain: 0.105, filter: "bandpass", frequency: 2100, endFrequency: 1200, q: 0.95, delay: 0.002 }, volume);
  playNoise(ac, { duration: 0.46, attack: 0.006, gain: 0.115, filter: "lowpass", frequency: 720, endFrequency: 190, q: 0.72, delay: 0.012 }, volume);
  playTone(ac, { frequency: 104, endFrequency: 30, duration: 0.32, gain: 0.15, type: "sawtooth", attack: 0.001 }, volume);
  playTone(ac, { frequency: 50, endFrequency: 24, duration: 0.34, gain: 0.065, type: "triangle", attack: 0.006, delay: 0.035 }, volume);
  playNoise(ac, { duration: 0.24, attack: 0.004, gain: 0.038, filter: "bandpass", frequency: 310, endFrequency: 130, q: 1.2, delay: 0.09 }, volume);
}

function playShotgunBlast(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.035, attack: 0.001, gain: 0.12, filter: "highpass", frequency: 1750, q: 0.8 }, volume);
  playNoise(ac, { duration: 0.22, attack: 0.002, gain: 0.155, filter: "lowpass", frequency: 960, endFrequency: 230, q: 0.72 }, volume);
  playNoise(ac, { duration: 0.17, attack: 0.002, gain: 0.075, filter: "bandpass", frequency: 520, endFrequency: 310, q: 1.15, delay: 0.01 }, volume);
  playNoise(ac, { duration: 0.12, attack: 0.001, gain: 0.042, filter: "bandpass", frequency: 2800, q: 1.4, delay: 0.018 }, volume);
  playTone(ac, { frequency: 125, endFrequency: 34, duration: 0.24, gain: 0.12, type: "triangle", attack: 0.001 }, volume);
  playTone(ac, { frequency: 72, endFrequency: 28, duration: 0.22, gain: 0.052, type: "sawtooth", attack: 0.006, delay: 0.02 }, volume);
}

function playGrenadeLaunch(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.09, attack: 0.002, gain: 0.07, filter: "bandpass", frequency: 560, endFrequency: 320, q: 1.0 }, volume);
  playNoise(ac, { duration: 0.22, attack: 0.006, gain: 0.085, filter: "lowpass", frequency: 380, endFrequency: 150, q: 0.75 }, volume);
  playNoise(ac, { duration: 0.055, attack: 0.001, gain: 0.032, filter: "highpass", frequency: 1300, q: 0.7 }, volume);
  playTone(ac, { frequency: 138, endFrequency: 48, duration: 0.2, gain: 0.085, type: "triangle", attack: 0.002 }, volume);
}

function playExplosion(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.028, attack: 0.001, gain: 0.17, filter: "highpass", frequency: 900, q: 0.65 }, volume);
  playTone(ac, { frequency: 82, endFrequency: 24, duration: 0.72, gain: 0.24, type: "sawtooth", attack: 0.003 }, volume);
  playTone(ac, { frequency: 39, endFrequency: 21, duration: 0.58, gain: 0.12, type: "triangle", attack: 0.008, delay: 0.035 }, volume);
  playNoise(ac, { duration: 0.66, attack: 0.006, gain: 0.21, filter: "lowpass", frequency: 620, endFrequency: 110, q: 0.7 }, volume);
  window.setTimeout(() => playNoise(ac, { duration: 0.34, attack: 0.004, gain: 0.08, filter: "bandpass", frequency: 180, endFrequency: 90, q: 1.1 }, volume), 55);
}

function playTone(ac: AudioContext, options: { frequency: number; endFrequency?: number; duration: number; gain: number; type: OscillatorType; attack?: number; delay?: number }, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const attack = options.attack ?? 0.002;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = options.type;
  osc.frequency.setValueAtTime(options.frequency, now);
  if (options.endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(options.gain * volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
  osc.start(now);
  osc.stop(now + options.duration + 0.02);
}

function playNoise(ac: AudioContext, options: { duration: number; attack: number; gain: number; filter: BiquadFilterType; frequency: number; endFrequency?: number; q: number; delay?: number }, volume: number) {
  const now = ac.currentTime + (options.delay ?? 0);
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  source.buffer = getNoiseBuffer(ac);
  filter.type = options.filter;
  filter.frequency.setValueAtTime(options.frequency, now);
  if (options.endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
  filter.Q.setValueAtTime(options.q, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(options.gain * volume, now + options.attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start(now);
  source.stop(now + options.duration + 0.03);
}

function getNoiseBuffer(ac: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}
