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
    playNoise(ac, { duration: 0.11, attack: 0.004, gain: 0.028, filter: "bandpass", frequency: 1350, q: 1.4 }, volume);
    playTone(ac, { frequency: 520, endFrequency: 390, duration: 0.1, gain: 0.018, type: "sine" }, volume);
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
  const profile = {
    revolver: { crack: 0.13, body: 105, gain: 0.16, filter: 1850 },
    sniper: { crack: 0.2, body: 72, gain: 0.22, filter: 1350 },
    shottie: { crack: 0.18, body: 88, gain: 0.24, filter: 980 },
    grenade: { crack: 0.1, body: 120, gain: 0.12, filter: 1250 }
  }[weapon];
  playNoise(ac, { duration: profile.crack, attack: 0.002, gain: profile.gain, filter: "highpass", frequency: profile.filter, q: 0.8 }, volume);
  playTone(ac, { frequency: profile.body, endFrequency: 45, duration: profile.crack + 0.08, gain: profile.gain * 0.6, type: "triangle" }, volume);
  playTone(ac, { frequency: 2300, endFrequency: 1200, duration: 0.035, gain: 0.035, type: "square" }, volume);
}

function playExplosion(ac: AudioContext, volume: number) {
  playTone(ac, { frequency: 68, endFrequency: 28, duration: 0.7, gain: 0.28, type: "sawtooth" }, volume);
  playNoise(ac, { duration: 0.62, attack: 0.006, gain: 0.23, filter: "lowpass", frequency: 520, q: 0.7 }, volume);
  window.setTimeout(() => playNoise(ac, { duration: 0.28, attack: 0.004, gain: 0.09, filter: "bandpass", frequency: 180, q: 1.1 }, volume), 55);
}

function playTone(ac: AudioContext, options: { frequency: number; endFrequency?: number; duration: number; gain: number; type: OscillatorType }, volume: number) {
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = options.type;
  osc.frequency.setValueAtTime(options.frequency, now);
  if (options.endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + options.duration);
  gain.gain.setValueAtTime(options.gain * volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);
  osc.start(now);
  osc.stop(now + options.duration + 0.02);
}

function playNoise(ac: AudioContext, options: { duration: number; attack: number; gain: number; filter: BiquadFilterType; frequency: number; q: number }, volume: number) {
  const now = ac.currentTime;
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  source.buffer = getNoiseBuffer(ac);
  filter.type = options.filter;
  filter.frequency.setValueAtTime(options.frequency, now);
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
