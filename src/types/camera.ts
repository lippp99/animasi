import type { EasingName, Vec3Tuple } from './common';

export type CameraAnglePreset =
  | 'epic_wide'
  | 'medium'
  | 'low_angle'
  | 'birds_eye'
  | 'over_the_shoulder'
  | 'close_up'
  | 'dutch_angle'
  | 'projectile_pov';

export type CameraMotionType =
  | 'orbit'
  | 'dolly_in'
  | 'dolly_out'
  | 'crane_up'
  | 'pan_sweep'
  | 'handheld_drift'
  | 'spline_dolly'
  | 'projectile_track';

export type TransitionType =
  | 'cut'
  | 'cross_dissolve'
  | 'whip_pan'
  | 'fade_black'
  | 'occlusion_wipe'
  | 'momentum_dolly'
  | 'light_flare'
  | 'cutaway_dive';

export interface CameraAngleTokens {
  readonly offset: Vec3Tuple;
  readonly targetYOffset: number;
  readonly fov: number;
  readonly rollRad: number;
}

export interface ShotCameraConfig {
  readonly angle: CameraAnglePreset;
  readonly motion: CameraMotionType;
  readonly target: Vec3Tuple;
  readonly focusCharacterId?: string;
  readonly splineEndTarget?: Vec3Tuple;
  readonly projectileStart?: Vec3Tuple;
  readonly projectileEnd?: Vec3Tuple;
  readonly projectileArcHeight?: number;
  readonly azimuthDeg?: number;
  readonly elevationDeg?: number;
  readonly fovOverride?: number;
  readonly momentumDir?: Vec3Tuple;
  readonly motionAmplitude: number;
  readonly easing: EasingName;
  readonly traumaBase: number;
  readonly traumaPeakFrame?: number;
  readonly traumaPeakAmount?: number;
  readonly transitionIn: TransitionType;
  readonly transitionFrames: number;
}
