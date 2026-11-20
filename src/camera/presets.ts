import type { CameraAnglePreset, CameraAngleTokens } from '../types/camera';

export const CAMERA_ANGLE_PRESETS: Readonly<Record<CameraAnglePreset, CameraAngleTokens>> = {
  epic_wide: {
    offset: [0.0, 5.4, 15.2],
    targetYOffset: 1.45,
    fov: 46,
    rollRad: 0,
  },
  medium: {
    offset: [0.8, 2.25, 6.2],
    targetYOffset: 1.25,
    fov: 40,
    rollRad: 0,
  },
  low_angle: {
    offset: [-1.15, 0.98, 5.5],
    targetYOffset: 1.38,
    fov: 39,
    rollRad: 0.02,
  },
  birds_eye: {
    offset: [0.2, 16.5, 9.2],
    targetYOffset: 0.6,
    fov: 48,
    rollRad: 0,
  },
  over_the_shoulder: {
    offset: [1.65, 2.05, 4.4],
    targetYOffset: 1.35,
    fov: 39,
    rollRad: -0.015,
  },
  close_up: {
    offset: [0.18, 1.72, 3.05],
    targetYOffset: 1.62,
    fov: 35,
    rollRad: 0,
  },
  dutch_angle: {
    offset: [-1.45, 1.85, 5.2],
    targetYOffset: 1.32,
    fov: 40,
    rollRad: 0.14,
  },
  projectile_pov: {
    offset: [0.55, 0.65, -2.35],
    targetYOffset: 0.1,
    fov: 54,
    rollRad: -0.04,
  },
};

export const CAMERA_TRANSITION_TOKENS = {
  whipPanRadians: 0.55,
  shakePosScale: 0.24,
  shakeRotScale: 0.042,
  shakeFreqHz: 19,
  driftFreqHz: 0.55,
} as const;
