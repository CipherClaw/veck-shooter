import type { WeaponId } from "@veck/shared";

let ctx: AudioContext | null = null;

function audio() {
  ctx ??= new AudioContext();
  return ctx;
}

export function beep(type: "ui" | "hit" | "kill" | "reload" | "explosion" | WeaponId, muted: boolean) {
  if (muted) return;
  const ac = audio();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  const freq = type === "sniper" ? 90 : type === "shottie" ? 120 : type === "watergun" ? 520 : type === "explosion" ? 55 : type === "hit" ? 720 : type === "reload" ? 260 : 340;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(35, freq * 0.35), now + 0.12);
  gain.gain.setValueAtTime(type === "watergun" ? 0.03 : 0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (type === "explosion" ? 0.5 : 0.16));
  osc.type = type === "watergun" ? "sine" : "square";
  osc.start(now);
  osc.stop(now + (type === "explosion" ? 0.5 : 0.18));
}
