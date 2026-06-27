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
  playGunSnap(ac, volume, 0.18, 3400, 0);
  playNoise(ac, { duration: 0.042, attack: 0.001, gain: 0.092, filter: "bandpass", frequency: 4300, endFrequency: 2400, q: 1.15, delay: 0.001 }, volume);
  playLowThump(ac, volume, 128, 42, 0.13, 0.105, "triangle", 0);
  playNoise(ac, { duration: 0.08, attack: 0.002, gain: 0.045, filter: "lowpass", frequency: 980, endFrequency: 380, q: 0.72, delay: 0.005 }, volume);
  playShotTail(ac, volume, 0.055, 0.035, 1100, 0.024);
  playShotTail(ac, volume, 0.038, 0.05, 680, 0.058);
}

function playSniperShot(ac: AudioContext, volume: number) {
  playGunSnap(ac, volume, 0.25, 4600, 0);
  playNoise(ac, { duration: 0.075, attack: 0.001, gain: 0.13, filter: "bandpass", frequency: 2500, endFrequency: 1050, q: 0.9, delay: 0.002 }, volume);
  playLowThump(ac, volume, 118, 30, 0.36, 0.17, "sawtooth", 0);
  playTone(ac, { frequency: 56, endFrequency: 24, duration: 0.34, gain: 0.06, type: "triangle", attack: 0.004, delay: 0.03 }, volume);
  playNoise(ac, { duration: 0.28, attack: 0.004, gain: 0.082, filter: "lowpass", frequency: 760, endFrequency: 150, q: 0.68, delay: 0.012 }, volume);
  playShotTail(ac, volume, 0.09, 0.072, 920, 0.045);
  playShotTail(ac, volume, 0.06, 0.11, 520, 0.105);
  playShotTail(ac, volume, 0.034, 0.16, 340, 0.18);
}

function playShotgunBlast(ac: AudioContext, volume: number) {
  playGunSnap(ac, volume, 0.14, 1900, 0);
  playGunSnap(ac, volume, 0.075, 2600, 0.012);
  playNoise(ac, { duration: 0.21, attack: 0.002, gain: 0.14, filter: "lowpass", frequency: 900, endFrequency: 210, q: 0.7 }, volume);
  playNoise(ac, { duration: 0.18, attack: 0.002, gain: 0.085, filter: "bandpass", frequency: 520, endFrequency: 290, q: 1.1, delay: 0.008 }, volume);
  playNoise(ac, { duration: 0.115, attack: 0.001, gain: 0.055, filter: "bandpass", frequency: 2600, endFrequency: 1200, q: 1.25, delay: 0.016 }, volume);
  playLowThump(ac, volume, 132, 34, 0.25, 0.13, "triangle", 0);
  playTone(ac, { frequency: 74, endFrequency: 27, duration: 0.23, gain: 0.052, type: "sawtooth", attack: 0.005, delay: 0.018 }, volume);
  playShotTail(ac, volume, 0.07, 0.075, 620, 0.035);
  playShotTail(ac, volume, 0.043, 0.095, 360, 0.09);
}

function playGrenadeLaunch(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.12, attack: 0.003, gain: 0.08, filter: "bandpass", frequency: 470, endFrequency: 240, q: 0.9 }, volume);
  playNoise(ac, { duration: 0.25, attack: 0.006, gain: 0.092, filter: "lowpass", frequency: 330, endFrequency: 130, q: 0.72 }, volume);
  playNoise(ac, { duration: 0.045, attack: 0.001, gain: 0.024, filter: "highpass", frequency: 1200, q: 0.62 }, volume);
  playLowThump(ac, volume, 116, 44, 0.22, 0.092, "triangle", 0);
  playShotTail(ac, volume, 0.032, 0.07, 420, 0.045);
}

function playExplosion(ac: AudioContext, volume: number) {
  playNoise(ac, { duration: 0.018, attack: 0.001, gain: 0.12, filter: "highpass", frequency: 980, q: 0.62 }, volume);
  playLowThump(ac, volume, 88, 24, 0.58, 0.22, "sawtooth", 0);
  playTone(ac, { frequency: 42, endFrequency: 21, duration: 0.52, gain: 0.11, type: "triangle", attack: 0.008, delay: 0.03 }, volume);
  playNoise(ac, { duration: 0.46, attack: 0.005, gain: 0.18, filter: "lowpass", frequency: 560, endFrequency: 100, q: 0.68 }, volume);
  playShotTail(ac, volume, 0.078, 0.18, 280, 0.07);
  playShotTail(ac, volume, 0.046, 0.24, 180, 0.16);
}

function playGunSnap(ac: AudioContext, volume: number, gain: number, frequency: number, delay: number) {
  playNoise(ac, { duration: 0.012, attack: 0.001, gain, filter: "highpass", frequency, q: 0.7, delay }, volume);
  playNoise(ac, { duration: 0.018, attack: 0.001, gain: gain * 0.45, filter: "bandpass", frequency: Math.max(900, frequency * 0.55), q: 1.1, delay: delay + 0.001 }, volume);
}

function playLowThump(ac: AudioContext, volume: number, frequency: number, endFrequency: number, duration: number, gain: number, type: OscillatorType, delay: number) {
  playTone(ac, { frequency, endFrequency, duration, gain, type, attack: 0.001, delay }, volume);
}

function playShotTail(ac: AudioContext, volume: number, gain: number, duration: number, frequency: number, delay: number) {
  playNoise(ac, { duration, attack: 0.003, gain, filter: "lowpass", frequency, endFrequency: Math.max(80, frequency * 0.42), q: 0.62, delay }, volume);
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
