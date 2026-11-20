import type { SfxAccentEvent } from '../types/common';
import { CAMERA_IMPULSE_TOKENS } from '../core/tokens';
import { clamp, valueNoise1D } from '../core/math';

export interface CameraImpulseOutput {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly pitchRad: number;
  readonly rollRad: number;
  readonly fovDeltaDeg: number;
}

/**
 * Analytical damped-spring Camera Impulse Rig synchronized to SfxAccentEvent timestamps.
 * Strictly zero at dt = 0 (no 1-frame snap) and smooth C1 damped oscillation across all frames.
 */
export function evaluateCameraImpulses(
  frame: number,
  fps: number,
  accents: readonly SfxAccentEvent[],
): CameraImpulseOutput {
  let offsetX = 0;
  let offsetY = 0;
  let pitchRad = 0;
  let rollRad = 0;
  let fovDeltaDeg = 0;

  const omega = Math.PI * 2 * CAMERA_IMPULSE_TOKENS.springFrequencyHz;
  const damping = CAMERA_IMPULSE_TOKENS.springDamping;

  for (let i = 0; i < accents.length; i += 1) {
    const evt = accents[i];
    if (evt === undefined || evt.cameraImpulse === undefined) continue;
    if (frame <= evt.frame) continue;

    const dt = (frame - evt.frame) / fps;
    if (dt > CAMERA_IMPULSE_TOKENS.maxWindowSec) continue;

    const intensity = evt.impulseIntensity ?? evt.gain;
    const attack = clamp(dt / CAMERA_IMPULSE_TOKENS.attackSec, 0, 1);
    const envelope = Math.exp(-damping * dt) * attack;
    const springWave = Math.exp(-damping * dt) * Math.sin(omega * dt);

    switch (evt.cameraImpulse) {
      case 'drop_thud':
        offsetY += CAMERA_IMPULSE_TOKENS.dropOffsetY * intensity * springWave;
        pitchRad += CAMERA_IMPULSE_TOKENS.dropPitchRad * intensity * springWave;
        offsetX += valueNoise1D(dt * 16, 91 + i) * 0.025 * intensity * envelope;
        break;
      case 'impact_punch':
        fovDeltaDeg += CAMERA_IMPULSE_TOKENS.punchFovDeg * intensity * springWave;
        offsetX +=
          valueNoise1D(dt * 24, 113 + i) *
          CAMERA_IMPULSE_TOKENS.punchShakeScale *
          intensity *
          envelope;
        offsetY +=
          valueNoise1D(dt * 24, 137 + i) *
          CAMERA_IMPULSE_TOKENS.punchShakeScale *
          intensity *
          envelope;
        rollRad += springWave * 0.018 * intensity;
        break;
      case 'rumble_surge':
        offsetX += valueNoise1D(dt * 14, 173 + i) * 0.08 * intensity * envelope;
        offsetY += valueNoise1D(dt * 14, 191 + i) * 0.05 * intensity * envelope;
        rollRad += CAMERA_IMPULSE_TOKENS.rumbleRollRad * intensity * springWave;
        break;
    }
  }

  return { offsetX, offsetY, pitchRad, rollRad, fovDeltaDeg };
}
