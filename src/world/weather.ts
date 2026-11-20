import * as THREE from 'three';
import type { WeatherType } from '../types/world';
import { createSeededRng } from '../core/math';
import { WORLD_TOKENS } from '../core/tokens';
import { createSoftGlowTexture } from './proceduralTextures';

interface ParticleSeed {
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly speed: number;
  readonly phase: number;
}

export class WeatherParticleSystem {
  private readonly points: THREE.Points;
  private readonly material: THREE.PointsMaterial;
  private readonly positions: Float32Array;
  private readonly seeds: readonly ParticleSeed[];

  public constructor(scene: THREE.Scene, seed: number) {
    const rng = createSeededRng(seed);
    const count = WORLD_TOKENS.particleCount;
    const radius = WORLD_TOKENS.particleVolumeRadius;
    const height = WORLD_TOKENS.particleVolumeHeight;

    this.positions = new Float32Array(count * 3);
    const seeds: ParticleSeed[] = [];
    for (let i = 0; i < count; i += 1) {
      seeds.push({
        baseX: (rng() * 2 - 1) * radius,
        baseY: rng() * height,
        baseZ: (rng() * 2 - 1) * radius,
        speed: 0.65 + rng() * 0.95,
        phase: rng() * Math.PI * 2,
      });
    }
    this.seeds = seeds;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.22,
      map: createSoftGlowTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Analytical particle placement from timeSec guarantees identical output on any frame seek. */
  public update(weather: WeatherType, intensity: number, timeSec: number, center: THREE.Vector3): void {
    if (weather === 'none' || intensity <= 0.01) {
      this.points.visible = false;
      return;
    }

    this.points.visible = true;
    const r = WORLD_TOKENS.particleVolumeRadius;
    const span = r * 2;
    const h = WORLD_TOKENS.particleVolumeHeight;

    switch (weather) {
      case 'embers':
        this.material.color.setHex(0xff8e36);
        this.material.size = 0.26;
        this.material.opacity = Math.min(1, 0.92 * intensity);
        this.material.blending = THREE.AdditiveBlending;
        break;
      case 'rain':
        this.material.color.setHex(0xb8d8f0);
        this.material.size = 0.16;
        this.material.opacity = Math.min(0.9, 0.68 * intensity);
        this.material.blending = THREE.NormalBlending;
        break;
      case 'dust_wind':
        this.material.color.setHex(0xd4b68c);
        this.material.size = 0.34;
        this.material.opacity = Math.min(0.75, 0.48 * intensity);
        this.material.blending = THREE.NormalBlending;
        break;
      case 'fog_wisps':
        this.material.color.setHex(0xd8dfea);
        this.material.size = 0.85;
        this.material.opacity = Math.min(0.24, 0.16 * intensity);
        this.material.blending = THREE.NormalBlending;
        break;
    }

    for (let i = 0; i < this.seeds.length; i += 1) {
      const s = this.seeds[i];
      if (s === undefined) continue;

      let x = s.baseX;
      let y = s.baseY;
      let z = s.baseZ;

      if (weather === 'embers') {
        y = ((s.baseY + timeSec * 1.9 * s.speed) % h);
        x = wrapCoord(s.baseX + Math.sin(timeSec * 1.7 + s.phase) * 1.4 + timeSec * 0.9, span) - r;
        z = wrapCoord(s.baseZ + Math.cos(timeSec * 1.3 + s.phase) * 1.1, span) - r;
      } else if (weather === 'rain') {
        y = h - ((s.baseY + timeSec * 15.5 * s.speed) % h);
        x = wrapCoord(s.baseX - timeSec * 2.2 * s.speed, span) - r;
      } else if (weather === 'dust_wind') {
        x = wrapCoord(s.baseX + timeSec * 4.4 * s.speed, span) - r;
        y = Math.max(0.25, ((s.baseY + Math.sin(timeSec * 1.2 + s.phase) * 0.6) % (h * 0.55)));
      } else {
        x = wrapCoord(s.baseX + timeSec * 0.85 * s.speed, span) - r;
        y = 0.4 + ((s.baseY * 0.25) % 3.6);
      }

      const idx = i * 3;
      this.positions[idx] = center.x + x;
      this.positions[idx + 1] = y;
      this.positions[idx + 2] = center.z + z;
    }

    const attr = this.points.geometry.getAttribute('position');
    if (attr instanceof THREE.BufferAttribute) {
      attr.needsUpdate = true;
    }
  }
}

function wrapCoord(v: number, span: number): number {
  const m = v % span;
  return m < 0 ? m + span : m;
}
