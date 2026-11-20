import * as THREE from 'three';
import { TOON_WORLD_TOKENS } from '../core/tokens';
import type { ProceduralTextureSet } from './proceduralTextures';
import { getCelGradientMap } from './proceduralTextures';

export interface ToonMaterialOptions {
  readonly color?: number;
  readonly map?: THREE.Texture | null;
  readonly textures?: ProceduralTextureSet;
  readonly bumpScale?: number;
  readonly side?: THREE.Side;
  readonly rimColor?: number;
  readonly rimStrength?: number;
  readonly rimPower?: number;
  readonly coolShadowColor?: number;
  readonly coolShadowStrength?: number;
  readonly emissive?: number;
  readonly emissiveIntensity?: number;
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly fog?: boolean;
  readonly clippingPlanes?: THREE.Plane[];
  readonly cutawayRimUniform?: { value: THREE.Color };
}

export interface ControlledToonMaterial {
  readonly material: THREE.MeshToonMaterial;
  readonly coolShadowUniform: { value: THREE.Color };
  readonly rimColorUniform: { value: THREE.Color };
}

const OUTLINE_VERTEX_SHADER = `
uniform float uThickness;
#include <common>
#include <clipping_planes_pars_vertex>
#include <fog_pars_vertex>
void main() {
  vec3 displaced = position + normal * uThickness;
  vec4 mvPosition = vec4(displaced, 1.0);
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
  #include <fog_vertex>
}
`;

const OUTLINE_FRAGMENT_SHADER = `
uniform vec3 uColor;
#include <common>
#include <clipping_planes_pars_fragment>
#include <fog_pars_fragment>
void main() {
  #include <clipping_planes_fragment>
  gl_FragColor = vec4(uColor, 1.0);
  #include <fog_fragment>
}
`;

/**
 * Creates a clean 3-step Low-Poly MeshToonMaterial with:
 * - Cool bluish-purple shadow floor (never muddy grey/black)
 * - Crisp Fresnel rim light
 * - Native WebGL clippingPlanes support + bright glowing cutaway slice edge highlight
 */
export function createToonMaterial(opts: ToonMaterialOptions): ControlledToonMaterial {
  const coolShadowUniform = {
    value: new THREE.Color(opts.coolShadowColor ?? TOON_WORLD_TOKENS.coolShadowColor),
  };
  const rimColorUniform = {
    value: new THREE.Color(opts.rimColor ?? TOON_WORLD_TOKENS.rimHighlightColor),
  };
  const cutawayRimUniform = opts.cutawayRimUniform ?? {
    value: new THREE.Color(TOON_WORLD_TOKENS.cutawayRimColor),
  };
  const rimStrength = opts.rimStrength ?? 0.24;
  const rimPower = opts.rimPower ?? 2.8;
  const shadowStrength = opts.coolShadowStrength ?? TOON_WORLD_TOKENS.coolShadowStrength;
  const clipEnabled = (opts.clippingPlanes?.length ?? 0) > 0;

  const material = new THREE.MeshToonMaterial({
    color: opts.color ?? 0xffffff,
    map: opts.map ?? opts.textures?.map ?? null,
    bumpMap: opts.textures?.bumpMap ?? null,
    bumpScale: opts.bumpScale ?? 0.08,
    gradientMap: getCelGradientMap(TOON_WORLD_TOKENS.toonSteps),
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    fog: opts.fog ?? true,
    clippingPlanes: opts.clippingPlanes ?? [],
    clipShadows: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCoolShadowColor = coolShadowUniform;
    shader.uniforms.uCoolShadowStrength = { value: shadowStrength };
    shader.uniforms.uRimColor = rimColorUniform;
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.uniforms.uRimPower = { value: rimPower };
    shader.uniforms.uCutawayRimColor = cutawayRimUniform;
    shader.uniforms.uCutawayRimWidth = { value: TOON_WORLD_TOKENS.cutawayRimWidth };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uCoolShadowColor;
         uniform float uCoolShadowStrength;
         uniform vec3 uRimColor;
         uniform float uRimStrength;
         uniform float uRimPower;
         uniform vec3 uCutawayRimColor;
         uniform float uCutawayRimWidth;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `float toonLuma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         float shadowMask = clamp(1.0 - smoothstep(0.16, 0.54, toonLuma), 0.0, 1.0);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, max(gl_FragColor.rgb, uCoolShadowColor * 0.72), shadowMask * uCoolShadowStrength);
         vec3 rimViewDir = normalize(vViewPosition);
         float rimNdV = clamp(1.0 - max(dot(normalize(normal), rimViewDir), 0.0), 0.0, 1.0);
         float rimBand = smoothstep(0.46, 0.74, pow(rimNdV, uRimPower));
         gl_FragColor.rgb += uRimColor * rimBand * uRimStrength;
         #if NUM_CLIPPING_PLANES > 0
           vec4 cp = clippingPlanes[0];
           float planeDist = dot(vClipPosition, cp.xyz) - cp.w;
           float edgeGlow = 1.0 - smoothstep(0.0, uCutawayRimWidth, abs(planeDist));
           gl_FragColor.rgb = mix(gl_FragColor.rgb, uCutawayRimColor, edgeGlow * 0.92);
         #endif
         #include <dithering_fragment>`,
      );
  };
  material.customProgramCacheKey = () =>
    `toon3_${shadowStrength.toFixed(2)}_${rimStrength.toFixed(2)}_${clipEnabled ? 'clip' : 'noclip'}`;

  return { material, coolShadowUniform, rimColorUniform };
}

/** Clipping-plane-aware inverted-hull #111111 ink outline for low-poly toon props. */
export function addInkOutline(
  mesh: THREE.Mesh,
  thickness: number,
  clippingPlanes: THREE.Plane[] = [],
  colorHex = TOON_WORLD_TOKENS.inkOutlineColor,
): THREE.Mesh {
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uThickness: { value: thickness },
        uColor: { value: new THREE.Color(colorHex) },
      },
    ]),
    vertexShader: OUTLINE_VERTEX_SHADER,
    fragmentShader: OUTLINE_FRAGMENT_SHADER,
    side: THREE.BackSide,
    fog: true,
    clipping: clippingPlanes.length > 0,
    clippingPlanes,
  });
  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
  outlineMesh.castShadow = false;
  outlineMesh.receiveShadow = false;
  outlineMesh.name = `${mesh.name || 'mesh'}_inkOutline`;
  mesh.add(outlineMesh);
  return outlineMesh;
}

/** Crisp architectural ink edge lines (THREE.EdgesGeometry + LineSegments in #231D1A) for 3D props. */
export function addInkEdges(
  mesh: THREE.Mesh,
  clippingPlanes: THREE.Plane[] = [],
  thresholdDeg: number = TOON_WORLD_TOKENS.edgeThresholdDeg,
  colorHex: number = TOON_WORLD_TOKENS.inkOutlineColor,
): THREE.LineSegments {
  const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, thresholdDeg);
  const edgeMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.78,
    clippingPlanes,
  });
  const lines = new THREE.LineSegments(edgesGeo, edgeMat);
  lines.name = `${mesh.name || 'mesh'}_inkEdges`;
  mesh.add(lines);
  return lines;
}

let cachedContactShadowTex: THREE.CanvasTexture | null = null;

/** Soft radial dark contact shadow disc beneath 3D props so objects anchor cleanly onto the ground. */
export function createPropContactShadow(radiusX: number, radiusZ = radiusX): THREE.Mesh {
  if (cachedContactShadowTex === null) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx !== null) {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(35, 29, 26, 0.48)');
      grad.addColorStop(0.65, 'rgba(35, 29, 26, 0.2)');
      grad.addColorStop(1, 'rgba(35, 29, 26, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    cachedContactShadowTex = new THREE.CanvasTexture(canvas);
  }
  const mat = new THREE.MeshBasicMaterial({
    map: cachedContactShadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}
