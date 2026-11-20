import type { PropKind, PropPlacement, TerrainConfig } from '../types/world';
import { SPATIAL_TOKENS } from '../core/tokens';
import { getTerrainHeightAt } from './terrainHeight';

export interface SpatialObstacle {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface MutableActorFootprint {
  readonly id: string;
  x: number;
  y: number;
  z: number;
  readonly radius: number;
}

const PROP_FOOTPRINT_RADII: Readonly<Record<PropKind, number>> = {
  fortress_wall: 1.15,
  stone_tower: 2.15,
  obelisk: 0.9,
  banner_pole: 0.35,
  brazier: 0.68,
  tent: 1.95,
  war_cart: 1.55,
  ship_hull: 2.15,
  timber_log: 0.72,
  boulder: 1.05,
  pine_tree: 0.85,
};

const PROP_HEIGHTS: Readonly<Record<PropKind, number>> = {
  fortress_wall: 4.55,
  stone_tower: 9.8,
  obelisk: 6.2,
  banner_pole: 4.5,
  brazier: 2.0,
  tent: 2.6,
  war_cart: 1.4,
  ship_hull: 3.2,
  timber_log: 0.7,
  boulder: 1.4,
  pine_tree: 4.8,
};

export function getPropFootprintRadius(prop: PropPlacement): number {
  const base = prop.footprintRadius ?? PROP_FOOTPRINT_RADII[prop.kind];
  return base * prop.scale;
}

/**
 * Converts world props into vertical-bounded spatial obstacles.
 * Fortress walls expand along their width into multiple circular spheres so actors never clip any segment.
 */
export function buildPropObstacles(
  props: readonly PropPlacement[],
  terrain: TerrainConfig,
): readonly SpatialObstacle[] {
  const obstacles: SpatialObstacle[] = [];

  props.forEach((prop, idx) => {
    const groundY =
      prop.lockToGround !== false && prop.position[1] < 0.25
        ? getTerrainHeightAt(prop.position[0], prop.position[2], terrain)
        : prop.position[1];
    const maxY = groundY + PROP_HEIGHTS[prop.kind] * prop.scale;
    const radius = getPropFootprintRadius(prop);

    if (prop.kind === 'fortress_wall') {
      const cosR = Math.cos(prop.rotationY);
      const sinR = Math.sin(prop.rotationY);
      for (const offset of [-3.6, -1.2, 1.2, 3.6]) {
        obstacles.push({
          id: `prop-${idx}-${offset}`,
          x: prop.position[0] + cosR * offset * prop.scale,
          z: prop.position[2] - sinR * offset * prop.scale,
          radius: 1.1 * prop.scale,
          minY: groundY,
          maxY,
        });
      }
      return;
    }

    obstacles.push({
      id: `prop-${idx}`,
      x: prop.position[0],
      z: prop.position[2],
      radius,
      minY: groundY,
      maxY,
    });
  });

  return obstacles;
}

function pushApart(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minDist: number,
): { dx: number; dz: number } | null {
  const vx = ax - bx;
  const vz = az - bz;
  const distSq = vx * vx + vz * vz;
  if (distSq >= minDist * minDist) return null;

  const dist = Math.sqrt(distSq);
  const overlap = minDist - dist;
  if (dist < 0.0001) {
    return { dx: overlap, dz: 0 };
  }
  return { dx: (vx / dist) * overlap, dz: (vz / dist) * overlap };
}

/**
 * Deterministic multi-pass spatial clearance solver preventing character-prop
 * and character-character interpenetration while respecting vertical elevation.
 */
export function solveSpatialClearance(
  actors: readonly MutableActorFootprint[],
  obstacles: readonly SpatialObstacle[],
): void {
  const pad = SPATIAL_TOKENS.minClearancePadding;

  for (let iter = 0; iter < SPATIAL_TOKENS.solverIterations; iter += 1) {
    for (const actor of actors) {
      for (const obs of obstacles) {
        if (actor.y >= obs.maxY - 0.1 || actor.y + 1.8 <= obs.minY) continue;
        const push = pushApart(actor.x, actor.z, obs.x, obs.z, actor.radius + obs.radius + pad);
        if (push !== null) {
          actor.x += push.dx;
          actor.z += push.dz;
        }
      }
    }

    for (let i = 0; i < actors.length; i += 1) {
      const a = actors[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < actors.length; j += 1) {
        const b = actors[j];
        if (b === undefined) continue;
        if (Math.abs(a.y - b.y) > SPATIAL_TOKENS.elevationToleranceY) continue;
        const push = pushApart(a.x, a.z, b.x, b.z, a.radius + b.radius + pad);
        if (push !== null) {
          a.x += push.dx * 0.5;
          a.z += push.dz * 0.5;
          b.x -= push.dx * 0.5;
          b.z -= push.dz * 0.5;
        }
      }
    }
  }
}
