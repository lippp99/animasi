import * as THREE from 'three';
import type { TimeOfDayPreset, WorldMoodTokens } from '../types/world';
import { createSeededRng } from '../core/math';
import { TOON_WORLD_TOKENS, WORLD_TOKENS } from '../core/tokens';
import { WORLD_MOOD_PRESETS } from './presets';
import { createSoftGlowTexture, getCelGradientMap } from './proceduralTextures';

interface CloudCluster {
  readonly group: THREE.Group;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly speed: number;
  readonly phase: number;
}

const SKY_VERTEX_SHADER = `
varying vec3 vWorldDirection;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldDirection = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const SKY_FRAGMENT_SHADER = `
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uBottomColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uStarVis;
uniform float uTime;
varying vec3 vWorldDirection;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 dir = normalize(vWorldDirection);
  float h = dir.y;
  vec3 col = h >= 0.0
    ? mix(uHorizonColor, uTopColor, pow(clamp(h, 0.0, 1.0), 0.58))
    : mix(uHorizonColor, uBottomColor, pow(clamp(-h, 0.0, 1.0), 0.7));

  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sunDot, 22.0) * 0.42;
  col += uSunColor * smoothstep(0.996, 0.9992, sunDot) * 1.35;

  if (uStarVis > 0.01 && h > 0.08) {
    vec3 cell = floor(dir * 130.0);
    float rnd = hash31(cell);
    if (rnd > 0.994) {
      float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + rnd * 90.0);
      col += vec3(0.92, 0.96, 1.0) * uStarVis * twinkle * smoothstep(0.08, 0.35, h);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Unified Atmospheric Sky & Lighting System:
 * Gradients (dawn/noon/dusk/night), starry night + bloom moon, moving 3-step toon clouds,
 * volumetric god rays, depth fog, directional shadow sun, cool hemisphere bounce, and rim light.
 */
export class AtmosphericSkySystem {
  public readonly sunLight: THREE.DirectionalLight;
  public readonly rimLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  private readonly fog: THREE.FogExp2;
  private readonly skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uBottomColor: { value: THREE.Color };
    uSunColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uStarVis: { value: number };
    uTime: { value: number };
  };
  private readonly clouds: CloudCluster[] = [];
  private readonly cloudMat: THREE.MeshToonMaterial;
  private readonly sunGroup = new THREE.Group();
  private readonly sunDiscMat: THREE.MeshBasicMaterial;
  private readonly sunHaloMat: THREE.SpriteMaterial;
  private readonly moonGroup = new THREE.Group();
  private readonly moonHaloMat: THREE.SpriteMaterial;
  private readonly shaftsGroup = new THREE.Group();
  private readonly shaftMat: THREE.MeshBasicMaterial;

  public constructor(scene: THREE.Scene, seed: number) {
    const init = WORLD_MOOD_PRESETS.dawn;
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(init.skyTop) },
      uHorizonColor: { value: new THREE.Color(init.skyHorizon) },
      uBottomColor: { value: new THREE.Color(init.skyBottom) },
      uSunColor: { value: new THREE.Color(init.sunColor) },
      uSunDir: { value: new THREE.Vector3(...init.sunPosition).normalize() },
      uStarVis: { value: init.starVisibility },
      uTime: { value: 0 },
    };

    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(WORLD_TOKENS.skyRadius, 32, 24),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    scene.add(skyMesh);

    this.sunLight = new THREE.DirectionalLight(init.sunColor, init.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(WORLD_TOKENS.shadowMapSize, WORLD_TOKENS.shadowMapSize);
    const b = WORLD_TOKENS.shadowBounds;
    this.sunLight.shadow.camera.left = -b;
    this.sunLight.shadow.camera.right = b;
    this.sunLight.shadow.camera.top = b;
    this.sunLight.shadow.camera.bottom = -b;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.bias = -0.0005;
    scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(init.hemiSky, init.hemiGround, init.hemiIntensity);
    scene.add(this.hemiLight);

    this.rimLight = new THREE.DirectionalLight(init.rimColor, init.rimIntensity);
    scene.add(this.rimLight);

    this.fog = new THREE.FogExp2(init.fogColor, init.fogDensity);
    scene.fog = this.fog;

    const rng = createSeededRng(seed + 404);
    const glowTex = createSoftGlowTexture();

    this.cloudMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: getCelGradientMap(TOON_WORLD_TOKENS.toonSteps),
      transparent: true,
      opacity: 0.92,
      fog: false,
    });

    const puffGeo = new THREE.DodecahedronGeometry(1, 1);
    for (let i = 0; i < 16; i += 1) {
      const cluster = new THREE.Group();
      const count = 4 + Math.floor(rng() * 3);
      for (let p = 0; p < count; p += 1) {
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        puff.scale.set(2.4 + rng() * 2.4, 0.95 + rng() * 0.8, 1.9 + rng() * 1.6);
        puff.position.set((p - count * 0.5) * 2.2, (rng() - 0.35) * 0.8, (rng() - 0.5) * 1.2);
        cluster.add(puff);
      }
      const angle = (i / 16) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const radius = 36 + rng() * 22;
      const baseX = Math.cos(angle) * radius;
      const baseY = 17 + rng() * 14;
      const baseZ = Math.sin(angle) * radius;
      cluster.position.set(baseX, baseY, baseZ);
      cluster.rotation.y = -angle;
      scene.add(cluster);
      this.clouds.push({ group: cluster, baseX, baseY, baseZ, speed: 0.48 + rng() * 0.65, phase: rng() * Math.PI * 2 });
    }

    this.sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, fog: false });
    this.sunHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffc675,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const sunHalo = new THREE.Sprite(this.sunHaloMat);
    sunHalo.scale.set(26, 26, 1);
    this.sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(3.1, 18, 14), this.sunDiscMat), sunHalo);
    scene.add(this.sunGroup);

    this.moonHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x9ac6ff,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const moonHalo = new THREE.Sprite(this.moonHaloMat);
    moonHalo.scale.set(22, 22, 1);
    this.moonGroup.add(
      new THREE.Mesh(new THREE.SphereGeometry(2.8, 18, 14), new THREE.MeshBasicMaterial({ color: 0xeef6ff, fog: false })),
      moonHalo,
    );
    scene.add(this.moonGroup);

    this.shaftMat = new THREE.MeshBasicMaterial({
      color: 0xffd89c,
      map: glowTex,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    const shaftGeo = new THREE.PlaneGeometry(7.0, 44);
    for (let i = 0; i < 6; i += 1) {
      const shaft = new THREE.Mesh(shaftGeo, this.shaftMat);
      shaft.position.set(-16 + i * 6.4, 15, -24 - (i % 2) * 7);
      shaft.rotation.z = -0.32;
      this.shaftsGroup.add(shaft);
    }
    scene.add(this.shaftsGroup);
  }

  public update(
    mood: TimeOfDayPreset,
    timeSec: number,
    focusPoint: THREE.Vector3,
    cameraPos: THREE.Vector3,
  ): WorldMoodTokens {
    const tokens = WORLD_MOOD_PRESETS[mood];
    this.skyUniforms.uTopColor.value.setHex(tokens.skyTop);
    this.skyUniforms.uHorizonColor.value.setHex(tokens.skyHorizon);
    this.skyUniforms.uBottomColor.value.setHex(tokens.skyBottom);
    this.skyUniforms.uSunColor.value.setHex(tokens.sunColor);
    this.skyUniforms.uSunDir.value.set(...tokens.sunPosition).normalize();
    this.skyUniforms.uStarVis.value = tokens.starVisibility;
    this.skyUniforms.uTime.value = timeSec;

    this.sunLight.color.setHex(tokens.sunColor);
    this.sunLight.intensity = tokens.sunIntensity;
    this.sunLight.position.set(...tokens.sunPosition);

    this.hemiLight.color.setHex(tokens.hemiSky);
    this.hemiLight.groundColor.setHex(tokens.hemiGround);
    this.hemiLight.intensity = tokens.hemiIntensity;

    const backDir = focusPoint.clone().sub(cameraPos).setY(0);
    if (backDir.lengthSq() < 0.001) backDir.set(0, 0, -1);
    else backDir.normalize();
    this.rimLight.color.setHex(tokens.rimColor);
    this.rimLight.intensity = tokens.rimIntensity;
    this.rimLight.position
      .copy(focusPoint)
      .addScaledVector(backDir, WORLD_TOKENS.rimLightDistance)
      .add(new THREE.Vector3(2.4, WORLD_TOKENS.rimLightHeight, 0));

    this.fog.color.setHex(tokens.fogColor);
    this.fog.density = tokens.fogDensity;

    const showClouds = tokens.cloudVisibility > 0.02;
    this.cloudMat.color.setHex(tokens.cloudColor);
    this.cloudMat.opacity = Math.min(0.94, tokens.cloudVisibility * 0.9);
    const span = 128;
    for (const c of this.clouds) {
      c.group.visible = showClouds;
      if (!showClouds) continue;
      const wrappedX = (((c.baseX + timeSec * c.speed + span / 2) % span) + span) % span - span / 2;
      c.group.position.set(wrappedX, c.baseY + Math.sin(timeSec * 0.48 + c.phase) * 0.34, c.baseZ);
    }

    const isNight = tokens.moonVisibility > 0.25;
    this.sunGroup.visible = !isNight;
    if (this.sunGroup.visible) {
      this.sunGroup.position.set(tokens.sunPosition[0] * 1.9, Math.max(14, tokens.sunPosition[1] * 1.45), tokens.sunPosition[2] * 1.9);
      this.sunDiscMat.color.setHex(tokens.sunColor);
      this.sunHaloMat.color.setHex(tokens.sunColor);
    }

    this.moonGroup.visible = tokens.moonVisibility > 0.02;
    if (this.moonGroup.visible) {
      this.moonGroup.position.set(tokens.sunPosition[0] * 1.65, Math.max(18, tokens.sunPosition[1] * 1.25), tokens.sunPosition[2] * 1.65);
      this.moonHaloMat.opacity = 0.78 * tokens.moonVisibility;
    }

    this.shaftsGroup.visible = tokens.lightShaftIntensity > 0.02;
    if (this.shaftsGroup.visible) {
      this.shaftMat.color.setHex(tokens.sunColor);
      this.shaftMat.opacity = tokens.lightShaftIntensity * (0.28 + 0.05 * Math.sin(timeSec * 0.85));
      this.shaftsGroup.position.x = Math.sin(timeSec * 0.24) * 1.8;
    }

    return tokens;
  }
}
