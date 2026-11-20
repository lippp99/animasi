import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { WorldMoodTokens } from '../types/world';
import { TOON_WORLD_TOKENS } from '../core/tokens';

/**
 * Display-space (post-ACES/sRGB) color grading + optical edge DoF + soft vignette + deterministic film grain.
 * Runs AFTER OutputPass so contrast pivots around true sRGB mid-grey (0.5) without crushing shadows.
 */
const CINEMATIC_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1080, 1920) },
    uWarmth: { value: 0.05 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.08 },
    uDofStrength: { value: 0.7 },
    uTime: { value: 0 },
    uGrainStrength: { value: TOON_WORLD_TOKENS.filmGrainStrength },
    uImpactFlash: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uWarmth;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uDofStrength;
    uniform float uTime;
    uniform float uGrainStrength;
    uniform float uImpactFlash;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      float focusDist = abs(vUv.y - 0.54);
      float blurAmount = smoothstep(0.24, 0.52, focusDist) * uDofStrength;
      vec2 texel = (1.0 / uResolution) * (1.35 * blurAmount);

      vec4 col = texture2D(tDiffuse, vUv) * 0.44;
      col += texture2D(tDiffuse, vUv + vec2(texel.x, texel.y)) * 0.14;
      col += texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)) * 0.14;
      col += texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)) * 0.14;
      col += texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)) * 0.14;

      vec3 rgb = col.rgb;
      rgb.r *= 1.0 + uWarmth;
      rgb.b *= 1.0 - uWarmth * 0.65;

      float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
      rgb = mix(vec3(luma), rgb, uSaturation);
      rgb = (rgb - 0.5) * uContrast + 0.5;

      // Subtle amber-white impact flash on climax hits
      rgb += vec3(1.0, 0.86, 0.62) * uImpactFlash * 0.16;

      vec2 centered = vUv - vec2(0.5, 0.52);
      float vig = smoothstep(1.06, 0.34, length(centered * vec2(1.08, 0.88)));
      rgb *= mix(0.84, 1.0, vig);

      // Deterministic animated subtle film grain (weighted to midtones for organic cel-film look)
      vec2 grainCoord = floor(vUv * uResolution * 0.5) + vec2(uTime * 37.0, uTime * 71.0);
      float grain = (hash12(grainCoord) - 0.5) * 2.0;
      float midtoneMask = 1.0 - abs(luma - 0.5) * 1.1;
      rgb += grain * uGrainStrength * clamp(midtoneMask, 0.35, 1.0);

      gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
    }
  `,
};

export class PostProcessor {
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly gradePass: ShaderPass;
  private readonly renderer: THREE.WebGLRenderer;

  public constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
  ) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(width, height);

    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.5, 0.84);
    this.composer.addPass(this.bloomPass);

    // OutputPass converts HDR linear -> ACES Filmic sRGB before final color grade & film grain
    this.composer.addPass(new OutputPass());

    this.gradePass = new ShaderPass(CINEMATIC_GRADE_SHADER);
    this.gradePass.uniforms.uResolution?.value.set(width, height);
    this.composer.addPass(this.gradePass);
  }

  public applyMood(
    tokens: WorldMoodTokens,
    focusDistance: number,
    frame: number,
    impactFlash = 0,
  ): void {
    this.renderer.toneMappingExposure = tokens.exposure;
    this.bloomPass.strength = tokens.bloomStrength;
    this.bloomPass.threshold = tokens.bloomThreshold;

    const u = this.gradePass.uniforms;
    if (u.uWarmth !== undefined) u.uWarmth.value = tokens.gradeWarmth;
    if (u.uContrast !== undefined) u.uContrast.value = tokens.gradeContrast;
    if (u.uSaturation !== undefined) u.uSaturation.value = tokens.gradeSaturation;
    if (u.uDofStrength !== undefined) {
      u.uDofStrength.value = focusDistance < 7.5 ? 0.92 : 0.42;
    }
    if (u.uTime !== undefined) u.uTime.value = frame % 997;
    if (u.uImpactFlash !== undefined) u.uImpactFlash.value = impactFlash;
  }

  public render(): void {
    this.composer.render();
  }
}
