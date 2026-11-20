import * as THREE from 'three';
import type { ProceduralMaterialKind } from '../types/world';
import { clamp, lerp, valueNoise2D } from '../core/math';
import { TOON_WORLD_TOKENS } from '../core/tokens';

export interface ProceduralTextureSet {
  readonly map: THREE.CanvasTexture;
  readonly bumpMap: THREE.CanvasTexture;
  readonly roughnessMap: THREE.CanvasTexture;
}

interface TextureOptions {
  readonly kind: ProceduralMaterialKind;
  readonly baseHex: number;
  readonly accentHex: number;
  readonly seed: number;
  readonly repeatX?: number;
  readonly repeatY?: number;
  readonly size?: number;
}

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Failed to create 2D canvas context for procedural texture.');
  return { canvas, ctx };
}

function fbm2D(x: number, y: number, seed: number): number {
  const n1 = valueNoise2D(x, y, seed) * 0.5 + 0.5;
  const n2 = valueNoise2D(x * 2.13, y * 2.13, seed + 19) * 0.5 + 0.5;
  const n3 = valueNoise2D(x * 4.4, y * 4.4, seed + 43) * 0.5 + 0.5;
  return clamp(n1 * 0.56 + n2 * 0.29 + n3 * 0.15, 0, 1);
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates high-detail procedural CanvasTextures (albedo, bump, roughness)
 * so every surface in the engine is rich with organic grain, fibers, masonry, or scratches.
 */
export function createProceduralTextureSet(opts: TextureOptions): ProceduralTextureSet {
  const size = opts.size ?? 256;
  const repeatX = opts.repeatX ?? 4;
  const repeatY = opts.repeatY ?? 4;

  const colCanvas = createCanvas(size);
  const bumpCanvas = createCanvas(size);
  const roughCanvas = createCanvas(size);
  const cImg = colCanvas.ctx.createImageData(size, size);
  const bImg = bumpCanvas.ctx.createImageData(size, size);
  const rImg = roughCanvas.ctx.createImageData(size, size);

  const base = new THREE.Color(opts.baseHex);
  const accent = new THREE.Color(opts.accentHex);
  const shadowTint = new THREE.Color(opts.baseHex).multiplyScalar(0.58);
  const warmLit = new THREE.Color(opts.accentHex).lerp(new THREE.Color(0xfff1d6), 0.28);

  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      let mixT = 0.5;
      let bumpVal = 0.5;
      let roughVal = 0.82;
      let shade = 1.0;
      let coolShadow = 0.0;

      switch (opts.kind) {
        case 'sand_dunes': {
          const warp = valueNoise2D(u * 5, v * 5, opts.seed) * 0.65;
          const ripple = Math.sin((u * 14 + v * 4 + warp) * Math.PI * 2) * 0.5 + 0.5;
          const fine = valueNoise2D(u * 42, v * 42, opts.seed + 7) * 0.5 + 0.5;
          mixT = clamp(ripple * 0.65 + fine * 0.35, 0, 1);
          bumpVal = clamp(ripple * 0.72 + fine * 0.28, 0, 1);
          roughVal = clamp(0.76 + (1 - ripple) * 0.2, 0, 1);
          coolShadow = (1 - ripple) * 0.24;
          break;
        }
        case 'earth_grass': {
          const macro = fbm2D(u * 6, v * 6, opts.seed);
          const blades = valueNoise2D(u * 38, v * 14, opts.seed + 23) * 0.5 + 0.5;
          const pebbles = valueNoise2D(u * 26, v * 26, opts.seed + 61) * 0.5 + 0.5;
          const trail = Math.exp(-Math.pow((u - 0.5 + Math.sin(v * Math.PI * 2) * 0.08) * 5.2, 2));
          mixT = clamp(macro * 0.52 + blades * 0.34 - trail * 0.28, 0, 1);
          bumpVal = clamp(blades * 0.5 + (pebbles > 0.78 ? 0.92 : macro * 0.5), 0, 1);
          roughVal = clamp(0.84 + (1 - macro) * 0.14, 0, 1);
          shade = 0.84 + macro * 0.26 + (pebbles > 0.82 ? 0.1 : 0);
          break;
        }
        case 'ancient_stone': {
          const rows = 8;
          const cols = 4;
          const rowIdx = Math.floor(v * rows);
          const rowFrac = (v * rows) % 1;
          const colShift = (rowIdx % 2) * 0.5;
          const colCoord = u * cols + colShift;
          const colIdx = Math.floor(colCoord);
          const colFrac = colCoord % 1;
          const mortar = rowFrac < 0.08 || rowFrac > 0.94 || colFrac < 0.05 || colFrac > 0.96;
          const blockVar = valueNoise2D(colIdx * 1.9, rowIdx * 2.3, opts.seed) * 0.5 + 0.5;
          const crack = Math.abs(valueNoise2D(u * 18, v * 18, opts.seed + 31));
          const isCrack = crack < 0.045;
          const moss = fbm2D(u * 9, v * 9, opts.seed + 71) > 0.72 && rowFrac < 0.26;
          mixT = mortar || isCrack ? 0.06 : moss ? 0.94 : clamp(0.28 + blockVar * 0.5, 0, 1);
          bumpVal = mortar ? 0.12 : isCrack ? 0.22 : clamp(0.55 + blockVar * 0.35 + crack * 0.15, 0, 1);
          roughVal = mortar ? 0.98 : clamp(0.78 + (1 - blockVar) * 0.18, 0, 1);
          shade = mortar ? 0.54 : isCrack ? 0.62 : 0.85 + blockVar * 0.28;
          break;
        }
        case 'weathered_wood': {
          const planks = 6;
          const plankIdx = Math.floor(u * planks);
          const plankFrac = (u * planks) % 1;
          const seam = plankFrac < 0.045 || plankFrac > 0.965;
          const grainWarp = valueNoise2D(u * 6, v * 2.5, opts.seed + plankIdx * 7) * 2.2;
          const rings = Math.sin((u * 38 + grainWarp) * Math.PI) * 0.5 + 0.5;
          const fiber = valueNoise2D(u * 48, v * 8, opts.seed + 13) * 0.5 + 0.5;
          mixT = seam ? 0.05 : clamp(rings * 0.55 + fiber * 0.45, 0, 1);
          bumpVal = seam ? 0.1 : clamp(rings * 0.45 + fiber * 0.55, 0, 1);
          roughVal = clamp(0.72 + (1 - rings) * 0.24, 0, 1);
          shade = seam ? 0.48 : 0.82 + fiber * 0.28;
          break;
        }
        case 'forged_metal': {
          const brush = valueNoise2D(u * 64, v * 6, opts.seed) * 0.5 + 0.5;
          const scratch = Math.abs(valueNoise2D((u + v * 0.6) * 32, (v - u * 0.5) * 8, opts.seed + 29));
          const hammer = fbm2D(u * 10, v * 10, opts.seed + 53);
          const brightScratch = scratch < 0.07 ? 0.32 : 0;
          mixT = clamp(hammer * 0.55 + brush * 0.35 + brightScratch, 0, 1);
          bumpVal = clamp(hammer * 0.5 + brush * 0.3 + brightScratch, 0, 1);
          roughVal = clamp(0.22 + (1 - brush) * 0.26 - brightScratch * 0.15, 0.14, 0.58);
          shade = 0.82 + mixT * 0.32;
          break;
        }
        case 'woven_fabric': {
          const warpThread = Math.sin(u * size * 0.78) * 0.5 + 0.5;
          const weftThread = Math.sin(v * size * 0.78) * 0.5 + 0.5;
          const checker = ((Math.floor(x / 3) + Math.floor(y / 3)) % 2) === 0;
          const weave = checker ? warpThread * 0.7 + 0.3 : weftThread * 0.7 + 0.3;
          const fold = fbm2D(u * 5, v * 3.5, opts.seed + 11);
          mixT = clamp(fold * 0.62 + weave * 0.38, 0, 1);
          bumpVal = clamp(weave * 0.65 + fold * 0.35, 0, 1);
          roughVal = clamp(0.76 + (1 - weave) * 0.2, 0, 1);
          shade = 0.8 + fold * 0.32;
          break;
        }
      }

      const rCol = lerp(base.r, accent.r, mixT) * shade;
      const gCol = lerp(base.g, accent.g, mixT) * shade;
      const bCol = lerp(base.b, accent.b, mixT) * shade;
      const finalR = clamp(lerp(rCol, shadowTint.r * 0.85, coolShadow) + (mixT > 0.82 ? warmLit.r * 0.08 : 0), 0, 1);
      const finalG = clamp(lerp(gCol, shadowTint.g * 0.9, coolShadow) + (mixT > 0.82 ? warmLit.g * 0.08 : 0), 0, 1);
      const finalB = clamp(lerp(bCol, shadowTint.b * 1.12, coolShadow) + (mixT > 0.82 ? warmLit.b * 0.05 : 0), 0, 1);

      const idx = (y * size + x) * 4;
      cImg.data[idx] = Math.round(finalR * 255);
      cImg.data[idx + 1] = Math.round(finalG * 255);
      cImg.data[idx + 2] = Math.round(finalB * 255);
      cImg.data[idx + 3] = 255;

      const bByte = Math.round(clamp(bumpVal, 0, 1) * 255);
      bImg.data[idx] = bByte;
      bImg.data[idx + 1] = bByte;
      bImg.data[idx + 2] = bByte;
      bImg.data[idx + 3] = 255;

      const rByte = Math.round(clamp(roughVal, 0, 1) * 255);
      rImg.data[idx] = rByte;
      rImg.data[idx + 1] = rByte;
      rImg.data[idx + 2] = rByte;
      rImg.data[idx + 3] = 255;
    }
  }

  colCanvas.ctx.putImageData(cImg, 0, 0);
  bumpCanvas.ctx.putImageData(bImg, 0, 0);
  roughCanvas.ctx.putImageData(rImg, 0, 0);

  return {
    map: configureTexture(colCanvas.canvas, repeatX, repeatY, true),
    bumpMap: configureTexture(bumpCanvas.canvas, repeatX, repeatY, false),
    roughnessMap: configureTexture(roughCanvas.canvas, repeatX, repeatY, false),
  };
}

let cachedCelGradient: THREE.DataTexture | null = null;

/** Crisp 3-step toon tone ramp (NearestFilter -> clean lit/mid/shadow bands). */
export function getCelGradientMap(steps = TOON_WORLD_TOKENS.toonSteps): THREE.DataTexture {
  if (cachedCelGradient !== null && steps === TOON_WORLD_TOKENS.toonSteps) {
    return cachedCelGradient;
  }
  const data = new Uint8Array(steps * 4);
  const levels = steps === 3 ? [102, 184, 255] : [82, 144, 208, 255];
  for (let i = 0; i < steps; i += 1) {
    const v = levels[i] ?? Math.round(((i + 1) / steps) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  if (steps === TOON_WORLD_TOKENS.toonSteps) cachedCelGradient = tex;
  return tex;
}

export function createWaterBumpTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const w1 = Math.sin((x / size) * Math.PI * 10 + valueNoise2D(x * 0.08, y * 0.08, seed) * 2.5);
      const w2 = Math.cos((y / size) * Math.PI * 14);
      const v = Math.round(clamp((w1 * 0.6 + w2 * 0.4) * 0.5 + 0.5, 0, 1) * 255);
      const idx = (y * size + x) * 4;
      img.data[idx] = v;
      img.data[idx + 1] = v;
      img.data[idx + 2] = v;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return configureTexture(canvas, 14, 14, false);
}

export function createSoftGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const { canvas, ctx } = createCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
