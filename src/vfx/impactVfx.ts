import * as THREE from 'three';
import type { SfxAccentEvent } from '../types/common';
import type { TerrainConfig } from '../types/world';
import { clamp, createSeededRng } from '../core/math';
import { getTerrainHeightAt } from '../world/terrainHeight';
import { createSoftGlowTexture } from '../world/proceduralTextures';
import {
  createHeroArrowMesh,
  createSmearArcMesh,
  type ArrowStreakItem,
  type DustPuffItem,
  type RippleItem,
  type SparkPoolItem,
} from './vfxPrimitives';

export interface FootDustInput {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly intensity: number;
  readonly phase: number;
}

/**
 * Deterministic frame-driven Action & Battle VFX:
 * Shockwave ripples, sword smear crescent arcs, sparks, footstep dust puffs,
 * arrow volleys + hero projectile_pov arrow, and warm brazier embers.
 */
export class ImpactVfxSystem {
  private readonly root = new THREE.Group();
  private readonly ripples: RippleItem[] = [];
  private readonly sparks: SparkPoolItem[] = [];
  private readonly dustPuffs: DustPuffItem[] = [];
  private readonly arrows: ArrowStreakItem[] = [];
  private readonly smearArcMesh: THREE.Mesh;
  private readonly smearArcMat: THREE.MeshBasicMaterial;
  private readonly heroArrowGroup: THREE.Group;
  private readonly emberPoints: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly brazierCenters: readonly THREE.Vector3[];

  public constructor(scene: THREE.Scene, brazierPositions: readonly THREE.Vector3[], seed: number) {
    this.root.name = 'HybridActionVFX';
    scene.add(this.root);
    this.brazierCenters = brazierPositions;
    const rng = createSeededRng(seed + 777);

    const outerRingGeo = new THREE.RingGeometry(0.75, 1.0, 24);
    const innerRingGeo = new THREE.RingGeometry(0.45, 0.62, 20);
    for (let i = 0; i < 4; i += 1) {
      const outerMat = new THREE.MeshBasicMaterial({ color: 0xffd584, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const outer = new THREE.Mesh(outerRingGeo, outerMat);
      const inner = new THREE.Mesh(innerRingGeo, innerMat);
      outer.visible = false;
      inner.visible = false;
      this.root.add(outer, inner);
      this.ripples.push({ outer, inner, outerMat, innerMat });
    }

    const smear = createSmearArcMesh();
    this.smearArcMesh = smear.mesh;
    this.smearArcMat = smear.mat;
    this.root.add(this.smearArcMesh);

    const sparkGeo = new THREE.BoxGeometry(0.036, 0.3, 0.036);
    for (let i = 0; i < 28; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffffff : 0xffb347, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      const theta = rng() * Math.PI * 2;
      const elev = 0.25 + rng() * 0.95;
      this.sparks.push({ mesh, mat, dirX: Math.cos(theta) * Math.cos(elev), dirY: Math.sin(elev), dirZ: Math.sin(theta) * Math.cos(elev), speed: 3.6 + rng() * 5.2 });
    }

    const dustGeo = new THREE.DodecahedronGeometry(0.24, 0);
    for (let i = 0; i < 18; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xebe0cc, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(dustGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.dustPuffs.push({ mesh, mat });
    }

    const arrowGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.4, 5).rotateX(Math.PI / 2);
    for (let i = 0; i < 18; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffe4b3, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(arrowGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.arrows.push({ mesh, mat, offsetX: (rng() - 0.5) * 8.4, offsetZ: (rng() - 0.5) * 4.5, delay: rng() * 0.38 });
    }

    this.heroArrowGroup = createHeroArrowMesh();
    this.root.add(this.heroArrowGroup);

    const emberCount = Math.max(1, brazierPositions.length) * 18;
    this.emberPositions = new Float32Array(emberCount * 3);
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberPoints = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({ size: 0.22, map: createSoftGlowTexture(), color: 0xff9b3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.emberPoints.frustumCulled = false;
    this.root.add(this.emberPoints);
  }

  public update(
    frame: number,
    fps: number,
    simTimeSec: number,
    accents: readonly SfxAccentEvent[],
    footDustInputs: readonly FootDustInput[],
    terrain: TerrainConfig,
    projectilePos?: THREE.Vector3,
    projectileTarget?: THREE.Vector3,
  ): void {
    this.heroArrowGroup.visible = projectilePos !== undefined && projectileTarget !== undefined;
    if (projectilePos !== undefined && projectileTarget !== undefined) {
      this.heroArrowGroup.position.copy(projectilePos);
      this.heroArrowGroup.lookAt(projectileTarget);
    }

    let rippleIdx = 0;
    let sparkEvent: { dt: number; pos: THREE.Vector3 } | null = null;
    let arrowEvent: { dt: number; pos: THREE.Vector3 } | null = null;

    for (const evt of accents) {
      const dt = (frame - evt.frame) / fps;
      if (dt < 0 || dt > 0.95) continue;
      const gx = evt.vfxPosition?.[0] ?? 0;
      const gz = evt.vfxPosition?.[2] ?? -1.5;
      const gy = evt.vfxPosition?.[1] ?? getTerrainHeightAt(gx, gz, terrain) + 1.1;

      if (rippleIdx < this.ripples.length && (evt.kind === 'metal_clang' || evt.kind === 'war_drum' || evt.kind === 'heavy_thud')) {
        const rip = this.ripples[rippleIdx++];
        if (rip !== undefined) {
          const t = clamp(dt / 0.52, 0, 1);
          const radius = 0.35 + t * (evt.kind === 'metal_clang' ? 3.2 : 5.6);
          const alpha = (1 - t) * (1 - t) * 0.85;
          const isGround = evt.kind !== 'metal_clang';
          const ry = isGround ? getTerrainHeightAt(gx, gz, terrain) + 0.14 : gy;
          rip.outer.visible = alpha > 0.02;
          rip.inner.visible = alpha > 0.02;
          rip.outer.position.set(gx, ry, gz);
          rip.inner.position.set(gx, ry + 0.03, gz);
          rip.outer.rotation.set(isGround ? -Math.PI / 2 : 0.25, 0, t * 1.4);
          rip.inner.rotation.copy(rip.outer.rotation);
          rip.outer.scale.setScalar(radius);
          rip.inner.scale.setScalar(radius * 0.72);
          rip.outerMat.color.setHex(evt.kind === 'metal_clang' ? 0xffcf70 : 0xe8c796);
          rip.outerMat.opacity = alpha;
          rip.innerMat.opacity = alpha * 0.9;
        }
      }
      if (evt.kind === 'metal_clang' && dt < 0.55) sparkEvent = { dt, pos: new THREE.Vector3(gx, gy, gz) };
      if (evt.kind === 'arrow_volley' && dt < 0.95) arrowEvent = { dt, pos: new THREE.Vector3(gx, gy, gz) };
    }

    for (let i = rippleIdx; i < this.ripples.length; i += 1) {
      const rip = this.ripples[i];
      if (rip !== undefined) {
        rip.outer.visible = false;
        rip.inner.visible = false;
      }
    }

    if (sparkEvent !== null && sparkEvent.dt < 0.36) {
      const st = sparkEvent.dt / 0.36;
      this.smearArcMesh.visible = true;
      this.smearArcMesh.position.copy(sparkEvent.pos);
      this.smearArcMesh.rotation.set(0.3, st * 1.6, -0.4 + st * 2.2);
      this.smearArcMesh.scale.setScalar(0.85 + st * 0.75);
      this.smearArcMat.opacity = (1 - st) * 0.82;
    } else {
      this.smearArcMesh.visible = false;
    }

    for (const sp of this.sparks) {
      if (sparkEvent === null) {
        sp.mesh.visible = false;
        continue;
      }
      const dt = sparkEvent.dt;
      const life = clamp(1 - dt / 0.52, 0, 1);
      sp.mesh.visible = life > 0.02;
      sp.mesh.position.set(
        sparkEvent.pos.x + sp.dirX * sp.speed * dt,
        sparkEvent.pos.y + sp.dirY * sp.speed * dt - 4.9 * dt * dt,
        sparkEvent.pos.z + sp.dirZ * sp.speed * dt,
      );
      sp.mesh.rotation.set(sp.dirZ * 2.2, 0, -sp.dirX * 2.2);
      sp.mesh.scale.set(1, 0.5 + life * 1.4, 1);
      sp.mat.opacity = life;
    }

    for (const arr of this.arrows) {
      if (arrowEvent === null) {
        arr.mesh.visible = false;
        continue;
      }
      const localT = clamp((arrowEvent.dt - arr.delay) / 0.48, 0, 1);
      arr.mesh.visible = localT > 0.01 && localT < 0.99;
      if (!arr.mesh.visible) continue;
      const ax = arrowEvent.pos.x + arr.offsetX;
      const az = arrowEvent.pos.z - 7.5 + localT * 13.5 + arr.offsetZ * 0.3;
      const ay = getTerrainHeightAt(ax, az, terrain) + 0.5 + Math.sin(localT * Math.PI) * 5.2;
      arr.mesh.position.set(ax, ay, az);
      arr.mesh.rotation.x = (localT - 0.5) * 1.1;
      arr.mat.opacity = Math.sin(localT * Math.PI) * 0.92;
    }

    let dustIdx = 0;
    for (const src of footDustInputs) {
      if (src.intensity < 0.08) continue;
      for (let k = 0; k < 3 && dustIdx < this.dustPuffs.length; k += 1) {
        const puff = this.dustPuffs[dustIdx++];
        if (puff === undefined) continue;
        const cycle = (simTimeSec * 2.6 + src.phase + k * 0.33) % 1;
        puff.mesh.visible = true;
        puff.mesh.position.set(
          src.x + Math.sin(src.phase * 5 + k * 2.1) * (0.18 + cycle * 0.55),
          src.y + 0.12 + cycle * 0.62,
          src.z + Math.cos(src.phase * 4 + k * 1.9) * (0.18 + cycle * 0.55),
        );
        puff.mesh.scale.setScalar(0.55 + cycle * 1.35);
        puff.mat.opacity = (1 - cycle) * 0.52 * src.intensity;
      }
    }
    for (let i = dustIdx; i < this.dustPuffs.length; i += 1) {
      const puff = this.dustPuffs[i];
      if (puff !== undefined) puff.mesh.visible = false;
    }

    if (this.brazierCenters.length > 0) {
      const perBrazier = Math.floor(this.emberPositions.length / 3 / this.brazierCenters.length);
      for (let b = 0; b < this.brazierCenters.length; b += 1) {
        const center = this.brazierCenters[b];
        if (center === undefined) continue;
        for (let j = 0; j < perBrazier; j += 1) {
          const idx = (b * perBrazier + j) * 3;
          const phase = j * 1.73 + b * 4.1;
          const rise = (simTimeSec * 0.85 + j / perBrazier) % 1;
          this.emberPositions[idx] = center.x + Math.sin(simTimeSec * 3.1 + phase) * (0.2 + rise * 0.55);
          this.emberPositions[idx + 1] = center.y + 1.4 + rise * 3.4;
          this.emberPositions[idx + 2] = center.z + Math.cos(simTimeSec * 2.7 + phase) * (0.2 + rise * 0.55);
        }
      }
      const attr = this.emberPoints.geometry.getAttribute('position');
      if (attr instanceof THREE.BufferAttribute) attr.needsUpdate = true;
    }
  }
}
