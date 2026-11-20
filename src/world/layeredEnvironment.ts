import * as THREE from 'three';
import type { WorldMoodTokens } from '../types/world';
import { createSeededRng, valueNoise1D } from '../core/math';
import { createSoftGlowTexture } from './proceduralTextures';

interface BokehMote {
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly speed: number;
  readonly phase: number;
}

/**
 * Layer 2 (Distant Horizon Silhouettes & Depth Haze) + Layer 4 (Subtle Foreground Framing):
 * - Multi-ring distant mountain ridges + distant stone citadel silhouettes around 360° horizon
 * - Translucent horizon depth haze belt kept strictly in the far distance
 * - Gentle lens-edge bokeh motes & subtle corner foreground framing that never blocks the center subject
 */
export class LayeredEnvironmentSystem {
  private readonly horizonRoot = new THREE.Group();
  private readonly nearRidgeMat: THREE.MeshBasicMaterial;
  private readonly farRidgeMat: THREE.MeshBasicMaterial;
  private readonly citadelMat: THREE.MeshBasicMaterial;
  private readonly hazeMat: THREE.MeshBasicMaterial;

  private readonly foregroundGroup = new THREE.Group();
  private readonly bokehPoints: THREE.Points;
  private readonly bokehMat: THREE.PointsMaterial;
  private readonly bokehPositions: Float32Array;
  private readonly bokehSeeds: readonly BokehMote[];

  public constructor(scene: THREE.Scene, camera: THREE.Camera, seed: number) {
    this.horizonRoot.name = 'Layer2_DistantHorizon';
    scene.add(this.horizonRoot);

    this.farRidgeMat = new THREE.MeshBasicMaterial({
      color: 0x3b3348,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.nearRidgeMat = new THREE.MeshBasicMaterial({
      color: 0x4e423d,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.citadelMat = new THREE.MeshBasicMaterial({
      color: 0x332b2c,
      fog: false,
    });
    this.hazeMat = new THREE.MeshBasicMaterial({
      color: 0xd9a882,
      transparent: true,
      opacity: 0.24,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    // Two concentric 360-degree mountain silhouette rings at different distances for true parallax
    this.horizonRoot.add(
      this.buildMountainRing(84, 21, 9.5, seed + 11, this.farRidgeMat),
      this.buildMountainRing(66, 13.5, 6.2, seed + 47, this.nearRidgeMat),
    );

    // Distant fortified hilltop citadel & watchtowers along the horizon
    this.buildDistantCitadels(seed + 83);

    // Horizon depth haze cylinder (far distance only so foreground stays crystal sharp)
    const hazeGeo = new THREE.CylinderGeometry(74, 74, 18, 48, 1, true);
    const hazeMesh = new THREE.Mesh(hazeGeo, this.hazeMat);
    hazeMesh.position.y = 4.5;
    this.horizonRoot.add(hazeMesh);

    // Layer 4: subtle foreground lens-bokeh motes anchored softly in front of camera
    this.foregroundGroup.name = 'Layer4_ForegroundFraming';
    camera.add(this.foregroundGroup);
    if (camera.parent === null) {
      scene.add(camera);
    }

    const rng = createSeededRng(seed + 909);
    const count = 26;
    this.bokehPositions = new Float32Array(count * 3);
    const seeds: BokehMote[] = [];
    for (let i = 0; i < count; i += 1) {
      // Keep motes biased toward outer frame perimeter so center face/action stays 100% clear
      const side = i % 2 === 0 ? -1 : 1;
      const edgeX = side * (0.42 + rng() * 0.45);
      const edgeY = (rng() * 2 - 1) * 1.15;
      seeds.push({
        baseX: edgeX,
        baseY: edgeY,
        baseZ: -1.45 - rng() * 0.9,
        speed: 0.25 + rng() * 0.45,
        phase: rng() * Math.PI * 2,
      });
    }
    this.bokehSeeds = seeds;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.bokehPositions, 3));
    this.bokehMat = new THREE.PointsMaterial({
      size: 0.14,
      map: createSoftGlowTexture(),
      color: 0xffd79e,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.bokehPoints = new THREE.Points(geo, this.bokehMat);
    this.bokehPoints.frustumCulled = false;
    this.foregroundGroup.add(this.bokehPoints);
  }

  public update(tokens: WorldMoodTokens, timeSec: number): void {
    const fogCol = new THREE.Color(tokens.fogColor);
    const horizonCol = new THREE.Color(tokens.skyHorizon);
    const bottomCol = new THREE.Color(tokens.skyBottom);

    this.farRidgeMat.color.copy(fogCol).lerp(horizonCol, 0.38).multiplyScalar(0.68);
    this.nearRidgeMat.color.copy(fogCol).lerp(bottomCol, 0.45).multiplyScalar(0.56);
    this.citadelMat.color.copy(this.nearRidgeMat.color).multiplyScalar(0.84);
    this.hazeMat.color.copy(horizonCol).lerp(fogCol, 0.5);
    this.hazeMat.opacity = tokens.moonVisibility > 0.3 ? 0.16 : 0.24;

    this.bokehMat.color.setHex(tokens.rimColor);
    this.bokehMat.opacity = tokens.moonVisibility > 0.3 ? 0.24 : 0.32;

    for (let i = 0; i < this.bokehSeeds.length; i += 1) {
      const s = this.bokehSeeds[i];
      if (s === undefined) continue;
      const idx = i * 3;
      this.bokehPositions[idx] = s.baseX + Math.sin(timeSec * s.speed + s.phase) * 0.12;
      this.bokehPositions[idx + 1] =
        s.baseY + Math.cos(timeSec * s.speed * 0.8 + s.phase) * 0.14;
      this.bokehPositions[idx + 2] = s.baseZ;
    }
    const attr = this.bokehPoints.geometry.getAttribute('position');
    if (attr instanceof THREE.BufferAttribute) attr.needsUpdate = true;
  }

  private buildMountainRing(
    radius: number,
    maxPeak: number,
    baseHeight: number,
    seed: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const segments = 96;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const angle = t * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const n1 = valueNoise1D(t * 14, seed) * 0.5 + 0.5;
      const n2 = valueNoise1D(t * 31, seed + 17) * 0.5 + 0.5;
      const ridgeY = baseHeight + Math.pow(n1, 1.35) * maxPeak * 0.72 + n2 * maxPeak * 0.28;

      positions.push(cosA * radius, -6, sinA * radius);
      positions.push(cosA * radius, ridgeY, sinA * radius);
    }

    for (let i = 0; i < segments; i += 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
  }

  private buildDistantCitadels(seed: number): void {
    const rng = createSeededRng(seed);
    const angles = [-2.5, -1.65, -0.75, 0.45, 1.55, 2.35];
    for (const angle of angles) {
      const dist = 62 + rng() * 6;
      const citadel = new THREE.Group();
      const baseH = 5.5 + rng() * 3.0;
      const keep = new THREE.Mesh(new THREE.BoxGeometry(5.5, baseH, 3.2), this.citadelMat);
      keep.position.y = baseH * 0.5;
      const towerL = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, baseH + 3.4, 8), this.citadelMat);
      towerL.position.set(-2.9, (baseH + 3.4) * 0.5, 0);
      const towerR = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, baseH + 2.2, 8), this.citadelMat);
      towerR.position.set(2.9, (baseH + 2.2) * 0.5, 0);
      citadel.add(keep, towerL, towerR);
      citadel.position.set(Math.cos(angle) * dist, 1.5, Math.sin(angle) * dist);
      citadel.lookAt(0, 2, 0);
      this.horizonRoot.add(citadel);
    }
  }
}
