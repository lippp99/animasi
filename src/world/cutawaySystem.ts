import * as THREE from 'three';
import type { CutawaySpec } from '../types/world';
import { applyEasing, clamp, lerp } from '../core/math';
import { TOON_WORLD_TOKENS } from '../core/tokens';

export interface CutawayEvaluation {
  readonly active: boolean;
  readonly constant: number;
  readonly normal: THREE.Vector3;
}

/**
 * Documentary 3D Cutaway Controller:
 * Drives a shared WebGL clipping plane that slices hills, terrain, and walls cleanly.
 * The bright cross-section rim highlight is rendered directly on clipped geometry surfaces
 * inside toonMaterials.ts (no distracting floating rectangle bars across the sky).
 */
export class CutawaySystem {
  public readonly clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 999);
  public readonly clippingPlanes: THREE.Plane[];
  public readonly rimColorUniform = { value: new THREE.Color(TOON_WORLD_TOKENS.cutawayRimColor) };
  private readonly tmpNormal = new THREE.Vector3();

  public constructor(_scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    renderer.localClippingEnabled = true;
    this.clippingPlanes = [this.clipPlane];
  }

  public evaluate(spec: CutawaySpec | undefined, shotProgress: number): CutawayEvaluation {
    if (spec === undefined || !spec.enabled) {
      this.clipPlane.normal.set(1, 0, 0);
      this.clipPlane.constant = 999;
      return { active: false, constant: 999, normal: this.clipPlane.normal };
    }

    this.tmpNormal.set(spec.normal[0], spec.normal[1], spec.normal[2]);
    if (this.tmpNormal.lengthSq() < 1e-6) this.tmpNormal.set(1, 0, 0);
    else this.tmpNormal.normalize();

    const t = applyEasing(spec.easing ?? 'easeInOutCubic', clamp(shotProgress, 0, 1));
    const constant = lerp(spec.startConstant, spec.endConstant, t);
    this.clipPlane.normal.copy(this.tmpNormal);
    this.clipPlane.constant = constant;
    this.rimColorUniform.value.setHex(spec.rimColor ?? TOON_WORLD_TOKENS.cutawayRimColor);

    return { active: true, constant, normal: this.clipPlane.normal };
  }
}
