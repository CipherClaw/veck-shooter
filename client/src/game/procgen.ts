/** Deterministic, periodic procedural noise helpers. All coordinates wrap at period. */
const mod = (value: number, period: number) => ((value % period) + period) % period;
const fade = (t: number) => t * t * (3 - 2 * t);

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x5f356495) ^ Math.imul(seed | 0, 0x6c8e9cf5);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0xffffffff;
}

export function valueNoise(x: number, y: number, period: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const tx = fade(x - ix);
  const ty = fade(y - iy);
  const a = hash2(mod(ix, period), mod(iy, period), seed);
  const b = hash2(mod(ix + 1, period), mod(iy, period), seed);
  const c = hash2(mod(ix, period), mod(iy + 1, period), seed);
  const d = hash2(mod(ix + 1, period), mod(iy + 1, period), seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

export function fbm(x: number, y: number, period: number, seed = 0, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.54;
  let total = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise(x * frequency, y * frequency, period * frequency, seed + octave * 37) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
}

export function ridged(x: number, y: number, period: number, seed = 0): number {
  return 1 - Math.abs(valueNoise(x, y, period, seed) * 2 - 1);
}

/** Distance to the nearest and second-nearest periodic feature points. */
export function worley(x: number, y: number, period: number, seed = 0): [number, number] {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let nearest = Infinity;
  let second = Infinity;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const cx = ix + ox;
      const cy = iy + oy;
      const dx = cx + hash2(mod(cx, period), mod(cy, period), seed) - x;
      const dy = cy + hash2(mod(cx, period), mod(cy, period), seed + 101) - y;
      const distance = dx * dx + dy * dy;
      if (distance < nearest) {
        second = nearest;
        nearest = distance;
      } else if (distance < second) second = distance;
    }
  }
  return [nearest, second];
}

export function fillPeriodicField(size: number, period: number, seed: number, sampler: (x: number, y: number, period: number, seed: number) => number): Float32Array {
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) field[y * size + x] = sampler(x * period / size, y * period / size, period, seed);
  }
  return field;
}
