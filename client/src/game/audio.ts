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
  playNoise(ac, { duration: 0.04, attack: 0.001, gain: 0.22, filter: "highpass", frequency: 1900, q: 0.62 }, volume);
  playTone(ac, { frequency: 126, endFrequency: 42, duration: 0.12, gain: 0.12, type: "triangle", attack: 0.001 }, volume);
  playNoise(ac, { duration: 0.09, attack: 0.003, gain: 0.085, filter: "lowpass", frequency: 1050, endFrequency: 260, q: 0.64, delay: 0.006 }, volume);
  playNoise(ac, { duration: 0.01, attack: 0.001, gain: 0.05, filter: "highpass", frequency: 4200, q: 0.58 }, volume);
}

function playSniperShot(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.07, attack: 0.001, gain: 0.28, filter: "highpass", frequency: 1250, q: 0.6 }, volume);
  playTone(ac, { frequency: 110, endFrequency: 30, duration: 0.34, gain: 0.18, type: "triangle", attack: 0.002 }, volume);
  playNoise(ac, { duration: 0.3, attack: 0.004, gain: 0.14, filter: "lowpass", frequency: 680, endFrequency: 115, q: 0.62, delay: 0.012 }, volume);
  playTone(ac, { frequency: 52, endFrequency: 26, duration: 0.28, gain: 0.055, type: "triangle", attack: 0.004, delay: 0.035 }, volume);
}

function playShotgunBlast(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.045, attack: 0.001, gain: 0.18, filter: "highpass", frequency: 900, q: 0.58 }, volume);
  playNoise(ac, { duration: 0.2, attack: 0.002, gain: 0.24, filter: "lowpass", frequency: 940, endFrequency: 180, q: 0.66 }, volume);
  playTone(ac, { frequency: 118, endFrequency: 34, duration: 0.24, gain: 0.15, type: "triangle", attack: 0.002 }, volume);
  playNoise(ac, { duration: 0.13, attack: 0.003, gain: 0.11, filter: "lowpass", frequency: 520, endFrequency: 145, q: 0.72, delay: 0.02 }, volume);
}

function playGrenadeLaunch(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.018, attack: 0.001, gain: 0.07, filter: "highpass", frequency: 900, q: 0.58 }, volume);
  playNoise(ac, { duration: 0.22, attack: 0.004, gain: 0.15, filter: "lowpass", frequency: 360, endFrequency: 115, q: 0.66 }, volume);
  playTone(ac, { frequency: 100, endFrequency: 40, duration: 0.2, gain: 0.14, type: "triangle", attack: 0.002 }, volume);
  playNoise(ac, { duration: 0.18, attack: 0.006, gain: 0.08, filter: "lowpass", frequency: 260, endFrequency: 95, q: 0.62, delay: 0.035 }, volume);
}

function playExplosion(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.055, attack: 0.001, gain: 0.28, filter: "highpass", frequency: 760, q: 0.58 }, volume);
  playTone(ac, { frequency: 78, endFrequency: 24, duration: 0.66, gain: 0.25, type: "triangle", attack: 0.003 }, volume);
  playNoise(ac, { duration: 0.56, attack: 0.005, gain: 0.28, filter: "lowpass", frequency: 540, endFrequency: 75, q: 0.62 }, volume);
  playNoise(ac, { duration: 0.72, attack: 0.008, gain: 0.16, filter: "lowpass", frequency: 220, endFrequency: 45, q: 0.58, delay: 0.06 }, volume);
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
