import * as THREE from 'three';
import type { CharacterSpec } from '../types/character';
import type { TerrainConfig } from '../types/world';
import type { FootDustInput } from '../vfx/impactVfx';
import { PAPER_CUTOUT_TOKENS } from '../core/tokens';
import { drawVectorCutoutCharacter } from './characterVectorDraw';
import { resolveFaceState } from './characterFaceDraw';
import {
  evaluateFlipSpring,
  evaluateRig2D,
  sampleCharacterBeat,
  type CharacterBeatSample,
} from './characterRig2D';

export { PaperBillboardCrowdGroup } from './characterCrowd2D';

export interface PaperBillboardActor {
  readonly spec: CharacterSpec;
  readonly root: THREE.Group;
  readonly planeMesh: THREE.Mesh;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.MeshBasicMaterial;
  readonly depthMaterial: THREE.MeshDepthMaterial;
  readonly footprintRadius: number;
  readonly worldPosition: THREE.Vector3;
  readonly phase: number;
  lastFlipSign: 1 | -1;
  flipOriginSign: 1 | -1;
  flipStartSec: number;
}

function createSoftGroundShadowPlane(width: number, depth: number): THREE.Mesh {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(35, 29, 26, 0.52)');
    grad.addColorStop(0.65, 'rgba(35, 29, 26, 0.22)');
    grad.addColorStop(1, 'rgba(35, 29, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

/**
 * Mounts a 100% Pure 2D Vector Canvas Cutout (512 x 768) onto a single THREE.PlaneGeometry
 * with Y-axis cylindrical billboarding, spring horizontal flip, and real silhouette shadow casting.
 */
export function createPaperBillboardActor(scene: THREE.Scene, spec: CharacterSpec): PaperBillboardActor {
  const T = PAPER_CUTOUT_TOKENS;
  const canvas = document.createElement('canvas');
  canvas.width = T.canvasWidth;
  canvas.height = T.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error(`Failed to create 2D canvas context for "${spec.id}".`);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: T.alphaTest,
    side: THREE.DoubleSide,
  });

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: texture,
    alphaTest: T.alphaTest,
  });

  const planeGeo = new THREE.PlaneGeometry(T.planeWidth, T.planeHeight);
  const bottomMarginNorm = (T.canvasHeight - T.footBaseY) / T.canvasHeight;
  planeGeo.translate(0, T.planeHeight * (0.5 - bottomMarginNorm), 0);

  const planeMesh = new THREE.Mesh(planeGeo, material);
  planeMesh.castShadow = true;
  planeMesh.receiveShadow = false;
  planeMesh.customDepthMaterial = depthMaterial;
  planeMesh.name = `VectorCutout_${spec.id}`;

  const root = new THREE.Group();
  root.name = `ActorRoot_${spec.id}`;
  root.scale.setScalar(spec.scale);
  root.add(createSoftGroundShadowPlane(1.28, 0.78), planeMesh);
  scene.add(root);

  return {
    spec,
    root,
    planeMesh,
    canvas,
    ctx,
    texture,
    material,
    depthMaterial,
    footprintRadius: spec.footprintRadius ?? 0.56,
    worldPosition: new THREE.Vector3(),
    phase: (spec.seed % 97) * 0.37,
    lastFlipSign: 1,
    flipOriginSign: 1,
    flipStartSec: -10,
  };
}

export function samplePaperBillboardBeat(
  actor: PaperBillboardActor,
  simFrame: number,
  terrain: TerrainConfig,
): CharacterBeatSample {
  return sampleCharacterBeat(actor.spec, simFrame, terrain);
}

export function updatePaperBillboardActor(
  actor: PaperBillboardActor,
  sample: CharacterBeatSample,
  resolvedX: number,
  resolvedY: number,
  resolvedZ: number,
  simFrame: number,
  fps: number,
  cameraPos: THREE.Vector3,
  isSpeaking: boolean,
): FootDustInput {
  const timeSec = simFrame / fps;
  actor.root.position.set(resolvedX, resolvedY, resolvedZ);
  actor.worldPosition.set(resolvedX, resolvedY, resolvedZ);

  const billboardYaw = Math.atan2(cameraPos.x - resolvedX, cameraPos.z - resolvedZ);
  actor.planeMesh.rotation.set(0, billboardYaw, 0);

  const rightDot = Math.sin(sample.facingYaw) * Math.cos(billboardYaw) - Math.cos(sample.facingYaw) * Math.sin(billboardYaw);
  const targetSign: 1 | -1 = rightDot >= -0.06 ? 1 : -1;
  if (targetSign !== actor.lastFlipSign) {
    actor.flipOriginSign = actor.lastFlipSign;
    actor.lastFlipSign = targetSign;
    actor.flipStartSec = timeSec;
  }
  const flipT = Math.min(1, Math.max(0, timeSec - actor.flipStartSec) * PAPER_CUTOUT_TOKENS.flipSpringRate * 0.45);
  actor.planeMesh.scale.x = evaluateFlipSpring(actor.lastFlipSign, actor.flipOriginSign, flipT);

  const rig = evaluateRig2D(sample, timeSec, actor.spec.seed, isSpeaking);
  const face = resolveFaceState(sample.beat, simFrame, fps, actor.spec.seed, isSpeaking);
  drawVectorCutoutCharacter(actor.ctx, actor.spec, rig, face, timeSec);
  actor.texture.needsUpdate = true;

  return { x: resolvedX, y: resolvedY, z: resolvedZ, intensity: rig.footDustIntensity, phase: actor.phase };
}
