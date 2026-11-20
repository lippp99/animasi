import type { EasingName } from '../types/common';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function applyEasing(name: EasingName, rawT: number): number {
  const t = clamp(rawT, 0, 1);
  switch (name) {
    case 'linear':
      return t;
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'easeOutQuart':
      return 1 - Math.pow(1 - t, 4);
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'easeInOutSine':
      return -(Math.cos(Math.PI * t) - 1) / 2;
  }
}

/** Deterministic PRNG (Mulberry32) so every frame & texture is 100% reproducible. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function hashInt(n: number): number {
  let x = (n ^ 61) ^ (n >>> 16);
  x = Math.imul(x, 9);
  x = x ^ (x >>> 4);
  x = Math.imul(x, 0x27d4eb2d);
  x = x ^ (x >>> 15);
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

/** Smooth deterministic 1D value noise in [-1, 1] for camera trauma & organic drift. */
export function valueNoise1D(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hashInt(i + seed * 1013);
  const b = hashInt(i + 1 + seed * 1013);
  return lerp(a, b, u);
}

export function hash2D(ix: number, iz: number, seed: number): number {
  return hashInt(ix * 374761393 + iz * 668265263 + seed * 1442695041);
}

/** Smooth deterministic 2D value noise in [-1, 1] for terrain & procedural textures. */
export function valueNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const n00 = hash2D(ix, iz, seed);
  const n10 = hash2D(ix + 1, iz, seed);
  const n01 = hash2D(ix, iz + 1, seed);
  const n11 = hash2D(ix + 1, iz + 1, seed);
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uz);
}
