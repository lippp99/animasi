import * as THREE from 'three';
import type { SfxAccentEvent } from '../types/common';
import type { ResolvedTimelineFrame } from '../core/timeline';
import type { OverlayTransitionState } from '../overlay/hud';
import { applyEasing, clamp, lerp, valueNoise1D } from '../core/math';
import { WORLD_TOKENS } from '../core/tokens';
import { CAMERA_ANGLE_PRESETS, CAMERA_TRANSITION_TOKENS } from './presets';
import { evaluateCameraImpulses } from './impulse';

export interface CameraEvaluation {
  readonly transitions: OverlayTransitionState;
  readonly focusDistance: number;
  readonly projectilePos?: THREE.Vector3;
  readonly projectileLook?: THREE.Vector3;
}

const DEG_TO_RAD = Math.PI / 180;

export class CameraDirector {
  public readonly camera: THREE.PerspectiveCamera;
  private readonly lookAtVec = new THREE.Vector3();
  private readonly baseOffset = new THREE.Vector3();
  private readonly computedPos = new THREE.Vector3();
  private readonly projPos = new THREE.Vector3();
  private readonly projLook = new THREE.Vector3();

  public constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, WORLD_TOKENS.cameraNear, WORLD_TOKENS.cameraFar);
  }

  public evaluate(
    resolved: ResolvedTimelineFrame,
    characterPositions: ReadonlyMap<string, THREE.Vector3>,
    sfxAccents: readonly SfxAccentEvent[] = [],
    fps = 60,
  ): CameraEvaluation {
    const { shot, shotProgress, transitionProgress, timeSec, frame } = resolved;
    const cfg = shot.camera;
    const preset = CAMERA_ANGLE_PRESETS[cfg.angle];
    const easedT = applyEasing(cfg.easing, shotProgress);

    let projectilePos: THREE.Vector3 | undefined;
    let projectileLook: THREE.Vector3 | undefined;

    if (cfg.angle === 'projectile_pov' || cfg.motion === 'projectile_track') {
      const start = cfg.projectileStart ?? [0.2, 2.2, -9.5];
      const end = cfg.projectileEnd ?? [0.4, 1.4, 2.5];
      const arcH = cfg.projectileArcHeight ?? 4.2;
      const nextT = clamp(easedT + 0.04, 0, 1);

      this.projPos.set(
        lerp(start[0], end[0], easedT),
        lerp(start[1], end[1], easedT) + Math.sin(easedT * Math.PI) * arcH,
        lerp(start[2], end[2], easedT),
      );
      this.projLook.set(
        lerp(start[0], end[0], nextT),
        lerp(start[1], end[1], nextT) + Math.sin(nextT * Math.PI) * arcH,
        lerp(start[2], end[2], nextT),
      );

      const dir = this.projLook.clone().sub(this.projPos).normalize();
      this.computedPos.copy(this.projPos).addScaledVector(dir, -2.2).add(new THREE.Vector3(0.55, 0.52, 0));
      this.lookAtVec.copy(this.projPos).addScaledVector(dir, 3.2);
      projectilePos = this.projPos;
      projectileLook = this.projLook;
    } else {
      const focusPos =
        cfg.focusCharacterId !== undefined ? characterPositions.get(cfg.focusCharacterId) : undefined;
      let targetX = focusPos !== undefined ? focusPos.x : cfg.target[0];
      let targetY =
        (focusPos !== undefined ? focusPos.y : cfg.target[1]) +
        preset.targetYOffset +
        WORLD_TOKENS.verticalSafeTargetBiasY;
      let targetZ = focusPos !== undefined ? focusPos.z : cfg.target[2];

      if (cfg.motion === 'spline_dolly' && cfg.splineEndTarget !== undefined) {
        const endT = cfg.splineEndTarget;
        targetX = lerp(targetX, endT[0], easedT);
        targetY = lerp(targetY, endT[1] + preset.targetYOffset + WORLD_TOKENS.verticalSafeTargetBiasY, easedT);
        targetZ = lerp(targetZ, endT[2], easedT);
      }

      this.lookAtVec.set(targetX, targetY, targetZ);
      this.baseOffset.set(preset.offset[0], preset.offset[1], preset.offset[2]);

      if (cfg.elevationDeg !== undefined) {
        const dist = this.baseOffset.length();
        const elevRad = clamp(cfg.elevationDeg, -18, 78) * DEG_TO_RAD;
        const horiz = Math.cos(elevRad) * dist;
        const yaw = Math.atan2(this.baseOffset.x, this.baseOffset.z);
        this.baseOffset.set(Math.sin(yaw) * horiz, Math.sin(elevRad) * dist, Math.cos(yaw) * horiz);
      }
      if (cfg.azimuthDeg !== undefined) {
        this.baseOffset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, cfg.azimuthDeg * DEG_TO_RAD);
      }

      const amp = Math.max(0.15, cfg.motionAmplitude);
      this.applyContinuousMotion(cfg.motion, easedT, timeSec, amp);

      if (cfg.transitionIn === 'whip_pan' && transitionProgress < 1) {
        const remain = 1 - applyEasing('easeOutQuart', transitionProgress);
        this.baseOffset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, remain * CAMERA_TRANSITION_TOKENS.whipPanRadians * 1.35);
      } else if (cfg.transitionIn === 'momentum_dolly' && transitionProgress < 1) {
        const remain = 1 - applyEasing('easeOutQuart', transitionProgress);
        const dir = cfg.momentumDir ?? [0, 0, 1];
        this.baseOffset.x += dir[0] * remain * 3.4;
        this.baseOffset.y += dir[1] * remain * 1.4;
        this.baseOffset.z += dir[2] * remain * 3.4;
      } else if (cfg.transitionIn === 'cutaway_dive' && transitionProgress < 1) {
        const remain = 1 - applyEasing('easeOutQuart', transitionProgress);
        this.baseOffset.multiplyScalar(1 + remain * 0.42);
        this.baseOffset.y += remain * 2.2;
      }

      this.computedPos.copy(this.lookAtVec).add(this.baseOffset);
    }

    const whipFovBoost =
      cfg.transitionIn === 'whip_pan' && transitionProgress < 1
        ? (1 - applyEasing('easeOutQuart', transitionProgress)) * 6.0
        : cfg.transitionIn === 'cutaway_dive' && transitionProgress < 1
          ? (1 - applyEasing('easeOutQuart', transitionProgress)) * 4.5
          : 0;

    let trauma = cfg.traumaBase;
    if (cfg.traumaPeakFrame !== undefined && cfg.traumaPeakAmount !== undefined) {
      const dist = Math.abs(frame - cfg.traumaPeakFrame);
      trauma = clamp(trauma + cfg.traumaPeakAmount * Math.exp(-dist * 0.085), 0, 1);
    }
    const shakeSq = trauma * trauma;
    const noiseT = timeSec * CAMERA_TRANSITION_TOKENS.shakeFreqHz;
    const impulse = evaluateCameraImpulses(frame, fps, sfxAccents);

    this.computedPos.x += valueNoise1D(noiseT, 11) * shakeSq * CAMERA_TRANSITION_TOKENS.shakePosScale + impulse.offsetX;
    this.computedPos.y += valueNoise1D(noiseT, 23) * shakeSq * CAMERA_TRANSITION_TOKENS.shakePosScale + impulse.offsetY;

    const baseFov = cfg.fovOverride ?? preset.fov;
    this.camera.fov = clamp(baseFov + whipFovBoost + impulse.fovDeltaDeg, 24, 72);
    this.camera.position.copy(this.computedPos);
    this.camera.lookAt(this.lookAtVec);

    const shakeRoll = valueNoise1D(noiseT, 37) * shakeSq * CAMERA_TRANSITION_TOKENS.shakeRotScale;
    const breathRoll = Math.sin(timeSec * 0.9) * 0.006;
    this.camera.rotateX(impulse.pitchRad);
    this.camera.rotateZ(preset.rollRad + shakeRoll + breathRoll + impulse.rollRad);
    this.camera.updateProjectionMatrix();

    const fadeBlackAlpha =
      (cfg.transitionIn === 'fade_black' || cfg.transitionIn === 'cross_dissolve') && transitionProgress < 1
        ? 1 - applyEasing('easeInOutCubic', transitionProgress)
        : 0;
    const occlusionWipeProgress =
      cfg.transitionIn === 'occlusion_wipe' && transitionProgress < 1
        ? applyEasing('easeInOutCubic', transitionProgress)
        : 0;
    const lightFlareAlpha =
      cfg.transitionIn === 'light_flare' && transitionProgress < 1
        ? Math.sin(transitionProgress * Math.PI) * 0.92
        : 0;

    return {
      transitions: { fadeBlackAlpha, occlusionWipeProgress, lightFlareAlpha },
      focusDistance: this.computedPos.distanceTo(this.lookAtVec),
      projectilePos,
      projectileLook,
    };
  }

  private applyContinuousMotion(
    motion: ResolvedTimelineFrame['shot']['camera']['motion'],
    t: number,
    timeSec: number,
    amp: number,
  ): void {
    const driftX = valueNoise1D(timeSec * CAMERA_TRANSITION_TOKENS.driftFreqHz, 51) * 0.14;
    const driftY = valueNoise1D(timeSec * CAMERA_TRANSITION_TOKENS.driftFreqHz, 73) * 0.09;

    switch (motion) {
      case 'orbit': {
        const angle = lerp(-0.34 * amp, 0.34 * amp, t);
        this.baseOffset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
        this.baseOffset.y += Math.sin(t * Math.PI) * 0.45 * amp;
        break;
      }
      case 'spline_dolly': {
        const arcAngle = Math.sin(t * Math.PI) * 0.28 * amp;
        this.baseOffset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, arcAngle);
        this.baseOffset.multiplyScalar(lerp(1.12, 0.86, t));
        this.baseOffset.y += Math.sin(t * Math.PI) * 0.7 * amp;
        break;
      }
      case 'dolly_in': {
        const factor = lerp(1.16, Math.max(0.62, 1.0 - 0.24 * amp), t);
        this.baseOffset.multiplyScalar(factor);
        this.baseOffset.x += driftX;
        this.baseOffset.y += driftY;
        break;
      }
      case 'dolly_out': {
        const factor = lerp(0.84, 1.0 + 0.28 * amp, t);
        this.baseOffset.multiplyScalar(factor);
        this.baseOffset.x += driftX;
        break;
      }
      case 'crane_up': {
        this.baseOffset.y += lerp(-0.7 * amp, 1.8 * amp, t);
        this.baseOffset.z *= lerp(1.06, 0.94, t);
        this.baseOffset.x += lerp(-0.6 * amp, 0.6 * amp, t);
        break;
      }
      case 'pan_sweep': {
        const shiftX = lerp(-1.8 * amp, 1.8 * amp, t);
        this.baseOffset.x += shiftX;
        this.lookAtVec.x += shiftX * 0.35;
        this.baseOffset.y += driftY;
        break;
      }
      case 'handheld_drift':
      case 'projectile_track': {
        this.baseOffset.x += driftX * 2.4 * amp;
        this.baseOffset.y += driftY * 2.4 * amp;
        this.baseOffset.z += Math.sin(timeSec * 0.8) * 0.25 * amp;
        break;
      }
    }
  }
}
