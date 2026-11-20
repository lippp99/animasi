import type { SfxAccentEvent } from '../types/common';
import { clamp } from '../core/math';
import { TOON_WORLD_TOKENS } from '../core/tokens';

export interface TimeDilationResult {
  readonly simFrame: number;
  readonly simTimeSec: number;
  readonly speedMultiplier: number;
  readonly impactFlash: number;
}

/**
 * Deterministic Micro Slow-Motion Impact (Time Dilation):
 * Slows action simulation speed to 0.25x for 6-10 frames right on climax impact events,
 * then smoothly catches back up over a recovery window so shot cuts & audio sync never drift.
 */
export function evaluateTimeDilation(
  rawFrame: number,
  fps: number,
  accents: readonly SfxAccentEvent[],
): TimeDilationResult {
  const slowScale = TOON_WORLD_TOKENS.timeDilationScale;
  let frameOffset = 0;
  let speedMultiplier = 1.0;
  let impactFlash = 0;

  for (const evt of accents) {
    const slowDur = evt.timeDilationFrames ?? 0;
    if (slowDur <= 0) continue;

    const dtFrames = rawFrame - evt.frame;
    if (dtFrames < 0) continue;

    // Smooth recovery window equal to 2x slowDur restores exact wall-clock phase after impact
    const recoverDur = slowDur * 2;
    const totalWindow = slowDur + recoverDur;
    if (dtFrames >= totalWindow) continue;

    if (dtFrames <= slowDur) {
      // Simulation advances at 0.25x speed -> lags wall clock by (1 - 0.25) * dtFrames
      frameOffset -= dtFrames * (1 - slowScale);
      speedMultiplier = Math.min(speedMultiplier, slowScale);
      const flashT = clamp(1 - dtFrames / Math.max(3, slowDur * 0.65), 0, 1);
      impactFlash = Math.max(impactFlash, flashT * flashT);
    } else {
      const recProgress = (dtFrames - slowDur) / recoverDur;
      const remainLag = 1 - recProgress * recProgress * (3 - 2 * recProgress);
      frameOffset -= slowDur * (1 - slowScale) * remainLag;
      speedMultiplier = Math.max(speedMultiplier, 1 + (1 - slowScale) * 0.5);
    }
  }

  const simFrame = Math.max(0, rawFrame + frameOffset);
  return {
    simFrame,
    simTimeSec: simFrame / fps,
    speedMultiplier,
    impactFlash: clamp(impactFlash, 0, 1),
  };
}
