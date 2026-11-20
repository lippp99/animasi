import type { TerrainConfig } from '../types/world';
import { clamp, valueNoise2D } from '../core/math';

/**
 * Deterministic Jezreel Valley terrain contour shared by terrain geometry,
 * cutaway earth cap, prop placement, characters, and crowd ground locking.
 * Keeps central battle corridor smooth while sculpting dramatic flanking ambush ridges.
 */
export function getTerrainHeightAt(x: number, z: number, terrain: TerrainConfig): number {
  const distFromCenter = Math.hypot(x, z);
  const hillMask = clamp((distFromCenter - 11) / 16, 0, 1);

  let y =
    (valueNoise2D(x * 0.055, z * 0.055, terrain.seed) * 2.7 +
      valueNoise2D(x * 0.14, z * 0.14, terrain.seed + 9) * 0.55) *
    hillMask;

  // Sculpt western & eastern ambush ridges (x < -6.2 and x > 6.5) for unmistakable 3D cutaway depth
  if (x < -6.2 && z > -10 && z < 11) {
    const ridgeX = clamp((-x - 6.2) / 5.5, 0, 1);
    const ridgeZ = 1 - clamp(Math.abs(z - 0.5) / 11.5, 0, 1);
    y += Math.sin(ridgeX * Math.PI * 0.5) * ridgeZ * 2.85;
  } else if (x > 6.8 && z > -10 && z < 10) {
    const ridgeX = clamp((x - 6.8) / 5.5, 0, 1);
    const ridgeZ = 1 - clamp(Math.abs(z - 0.2) / 10.5, 0, 1);
    y += Math.sin(ridgeX * Math.PI * 0.5) * ridgeZ * 2.15;
  }

  // Carve a shoreline / spring channel on the far eastern edge when water is enabled
  if (terrain.showWater && x > 13.5) {
    const channelDepth = clamp((x - 13.5) / 6.0, 0, 1) * 2.4;
    y -= channelDepth;
  }

  return y;
}
