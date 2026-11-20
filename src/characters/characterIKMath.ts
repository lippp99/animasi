import type { CharacterBeat, CharacterSpec } from '../types/character';
import type { TerrainConfig } from '../types/world';
import { applyEasing, clamp, lerp } from '../core/math';
import { PAPER_CUTOUT_TOKENS, TOON_WORLD_TOKENS } from '../core/tokens';
import { getTerrainHeightAt } from '../world/terrainHeight';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface TwoBoneIK2DResult {
  readonly joint: Vec2;
  readonly end: Vec2;
}

export interface PropSocket2D {
  readonly x: number;
  readonly y: number;
  readonly angleRad: number;
}

export interface CharacterBeatSample {
  readonly beat: CharacterBeat;
  readonly beatProgress: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly worldZ: number;
  readonly facingYaw: number;
  readonly travelDist: number;
  readonly travelProgress: number;
  readonly energy: number;
}

/** Analytical 2D Two-Bone IK solver with strict fixed-length limb invariance. */
export function solveTwoBoneIK2D(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: 1 | -1,
): TwoBoneIK2DResult {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy);
  const maxReach = (len1 + len2) * TOON_WORLD_TOKENS.ikReachLimitRatio;
  const minReach = Math.max(2, Math.abs(len1 - len2) + 2);
  const dist = clamp(rawDist, minReach, maxReach);

  const baseAngle = rawDist > 1e-4 ? Math.atan2(dy, dx) : Math.PI * 0.5;
  const cosA = clamp((len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist), -1, 1);
  const upperAngle = baseAngle + bendDir * Math.acos(cosA);

  const jx = root.x + Math.cos(upperAngle) * len1;
  const jy = root.y + Math.sin(upperAngle) * len1;
  const endAngle = Math.atan2(target.y - jy, target.x - jx);
  return {
    joint: { x: jx, y: jy },
    end: { x: jx + Math.cos(endAngle) * len2, y: jy + Math.sin(endAngle) * len2 },
  };
}

/** Analytical damped spring for cloth, turban tails, and cape sway. */
export function evaluateDampedSpring2D(
  timeSec: number,
  phase: number,
  velocityImpulse: number,
  stiffness: number = TOON_WORLD_TOKENS.springStiffness,
): number {
  const omega = Math.sqrt(stiffness);
  const zeta = TOON_WORLD_TOKENS.springDamping * 0.08;
  const beatCycle = timeSec % 1.4;
  const decay = Math.exp(-zeta * beatCycle * 3.0);
  return clamp(
    Math.sin(timeSec * omega * 0.92 + phase) * 0.62 +
      Math.sin(beatCycle * omega * 1.45 + phase) * decay * velocityImpulse,
    -1.5,
    1.5,
  );
}

/** Smooth Paper-Mario spring horizontal flip between +1 and -1. */
export function evaluateFlipSpring(targetSign: 1 | -1, prevSign: 1 | -1, transitionT: number): number {
  if (targetSign === prevSign || transitionT >= 1) return targetSign;
  const raw = lerp(prevSign, targetSign, applyEasing('easeOutBack', clamp(transitionT, 0, 1)));
  if (Math.abs(raw) < PAPER_CUTOUT_TOKENS.minFlipScaleX) {
    return raw >= 0 ? PAPER_CUTOUT_TOKENS.minFlipScaleX : -PAPER_CUTOUT_TOKENS.minFlipScaleX;
  }
  return clamp(raw, -1.06, 1.06);
}

export function sampleCharacterBeat(
  spec: CharacterSpec,
  simFrame: number,
  terrain: TerrainConfig,
): CharacterBeatSample {
  const activeBeat =
    spec.beats.find((b) => simFrame >= b.startFrame && simFrame < b.endFrame) ??
    spec.beats[spec.beats.length - 1];
  if (activeBeat === undefined) {
    throw new Error(`Character "${spec.id}" must have at least one CharacterBeat.`);
  }
  const span = Math.max(1, activeBeat.endFrame - activeBeat.startFrame);
  const rawProgress = clamp((simFrame - activeBeat.startFrame) / span, 0, 1);
  const eased = applyEasing('easeInOutCubic', rawProgress);
  const worldX = lerp(activeBeat.fromPosition[0], activeBeat.toPosition[0], eased);
  const baseY = lerp(activeBeat.fromPosition[1], activeBeat.toPosition[1], eased);
  const worldZ = lerp(activeBeat.fromPosition[2], activeBeat.toPosition[2], eased);
  const worldY =
    spec.lockToGround !== false && baseY < 0.5 ? getTerrainHeightAt(worldX, worldZ, terrain) : baseY;
  const travelDist = Math.hypot(
    activeBeat.toPosition[0] - activeBeat.fromPosition[0],
    activeBeat.toPosition[2] - activeBeat.fromPosition[2],
  );
  return {
    beat: activeBeat,
    beatProgress: rawProgress,
    worldX,
    worldY,
    worldZ,
    facingYaw: activeBeat.facingYaw,
    travelDist,
    travelProgress: eased,
    energy: activeBeat.energy ?? 1.0,
  };
}
