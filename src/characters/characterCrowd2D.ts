import * as THREE from 'three';
import type { AccessoryId, CharacterBeat, CharacterSpec, CrowdSpec } from '../types/character';
import type { TerrainConfig } from '../types/world';
import { applyEasing, clamp, createSeededRng, lerp } from '../core/math';
import { PAPER_CUTOUT_TOKENS, SPATIAL_TOKENS } from '../core/tokens';
import { getTerrainHeightAt } from '../world/terrainHeight';
import { solveSpatialClearance, type MutableActorFootprint, type SpatialObstacle } from '../world/spatial';
import { drawVectorCutoutCharacter } from './characterVectorDraw';
import { resolveFaceState } from './characterFaceDraw';
import { evaluateRig2D, type CharacterBeatSample } from './characterRig2D';

interface CrowdSoldier {
  readonly mesh: THREE.Mesh;
  readonly offsetX: number;
  readonly offsetZ: number;
  readonly scale: number;
  readonly phase: number;
}

function buildCrowdVariantTexture(spec: CrowdSpec, variantIdx: number): THREE.CanvasTexture {
  const T = PAPER_CUTOUT_TOKENS;
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = T.canvasWidth;
  fullCanvas.height = T.canvasHeight;
  const fullCtx = fullCanvas.getContext('2d');
  if (fullCtx === null) throw new Error('Failed to create 2D canvas for crowd variant.');

  const accessories: AccessoryId[] = ['chest_armor', 'sash_belt'];
  if (spec.headgear === 'turban') accessories.push('turban');
  else if (spec.headgear === 'mongol_hat') accessories.push('mongol_hat');
  else accessories.push('headband');

  if (spec.weapon === 'bow') accessories.push('bow');
  else if (spec.weapon === 'sword') accessories.push('sword', 'shield');
  else accessories.push('spear', 'shield');
  if (variantIdx % 2 === 1) accessories.push('cape');

  const beat: CharacterBeat = {
    startFrame: 0, endFrame: 120, fromPosition: [0, 0, 0], toPosition: [0, 0, 4],
    facingYaw: 0, action: variantIdx % 2 === 0 ? 'walk' : 'combat_slash_or_block',
    expression: variantIdx === 3 ? 'angry' : 'determined', comicEmote: 'none', energy: 1,
  };
  const charSpec: CharacterSpec = {
    id: `${spec.id}-v${variantIdx}`, name: spec.id, bodyColor: spec.bodyColor, trimColor: spec.helmetColor,
    scale: 1, seed: spec.seed + variantIdx * 17, accessories, beats: [beat],
  };
  const sample: CharacterBeatSample = {
    beat, beatProgress: (variantIdx * 0.27) % 1, worldX: 0, worldY: 0, worldZ: 0,
    facingYaw: 0, travelDist: 4, travelProgress: (variantIdx * 0.27) % 1, energy: 1,
  };

  drawVectorCutoutCharacter(
    fullCtx,
    charSpec,
    evaluateRig2D(sample, 0.35 + variantIdx * 0.22, charSpec.seed, false),
    resolveFaceState(beat, variantIdx * 15, 60, charSpec.seed, false),
    variantIdx * 0.25,
  );

  const outCanvas = document.createElement('canvas');
  outCanvas.width = T.crowdCanvasWidth;
  outCanvas.height = T.crowdCanvasHeight;
  outCanvas.getContext('2d')?.drawImage(fullCanvas, 0, 0, outCanvas.width, outCanvas.height);

  const tex = new THREE.CanvasTexture(outCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** Pure 2D PlaneGeometry army crowd with real silhouette shadows, ground lock & spatial clearance. */
export class PaperBillboardCrowdGroup {
  private readonly spec: CrowdSpec;
  private readonly root = new THREE.Group();
  private readonly soldiers: CrowdSoldier[] = [];
  private readonly footprints: MutableActorFootprint[] = [];

  public constructor(scene: THREE.Scene, spec: CrowdSpec) {
    this.spec = spec;
    this.root.name = `VectorCrowd_${spec.id}`;
    scene.add(this.root);

    const T = PAPER_CUTOUT_TOKENS;
    const planeGeo = new THREE.PlaneGeometry(T.crowdPlaneWidth, T.crowdPlaneHeight);
    const bottomMarginNorm = (T.canvasHeight - T.footBaseY) / T.canvasHeight;
    planeGeo.translate(0, T.crowdPlaneHeight * (0.5 - bottomMarginNorm), 0);

    const variants = [0, 1, 2, 3].map((v) => {
      const tex = buildCrowdVariantTexture(spec, v);
      return {
        mat: new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: T.alphaTest, side: THREE.DoubleSide }),
        depthMat: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: T.alphaTest }),
      };
    });

    const rng = createSeededRng(spec.seed);
    const cols = Math.max(2, Math.ceil(Math.sqrt(spec.count * 1.4)));
    const rows = Math.max(1, Math.ceil(spec.count / cols));

    for (let i = 0; i < spec.count; i += 1) {
      const u = cols > 1 ? (i % cols) / (cols - 1) - 0.5 : 0;
      const v = rows > 1 ? Math.floor(i / cols) / (rows - 1) - 0.5 : 0;
      const vm = variants[i % variants.length];
      if (vm === undefined) continue;

      const mesh = new THREE.Mesh(planeGeo, vm.mat);
      mesh.castShadow = true;
      mesh.customDepthMaterial = vm.depthMat;
      this.root.add(mesh);

      const scale = 0.88 + rng() * 0.16;
      this.soldiers.push({
        mesh,
        offsetX: u * spec.spread[0] + (rng() - 0.5) * 0.48,
        offsetZ: v * spec.spread[1] + (rng() - 0.5) * 0.48,
        scale,
        phase: rng() * Math.PI * 2,
      });
      this.footprints.push({
        id: `${spec.id}-${i}`, x: spec.origin[0], y: spec.origin[1], z: spec.origin[2],
        radius: SPATIAL_TOKENS.crowdMemberRadius * scale,
      });
    }
  }

  public update(
    frame: number,
    timeSec: number,
    terrain: TerrainConfig,
    obstacles: readonly SpatialObstacle[],
    cameraPos: THREE.Vector3,
  ): void {
    let originX = this.spec.origin[0];
    let originZ = this.spec.origin[2];
    let facingYaw = this.spec.facingYaw;
    let moving = false;

    if (this.spec.beats !== undefined && this.spec.beats.length > 0) {
      const active =
        this.spec.beats.find((b) => frame >= b.startFrame && frame < b.endFrame) ??
        this.spec.beats[this.spec.beats.length - 1];
      if (active !== undefined) {
        const t = applyEasing('easeInOutCubic', clamp((frame - active.startFrame) / Math.max(1, active.endFrame - active.startFrame), 0, 1));
        originX = lerp(active.fromOrigin[0], active.toOrigin[0], t);
        originZ = lerp(active.fromOrigin[2], active.toOrigin[2], t);
        facingYaw = active.facingYaw;
        moving = Math.hypot(active.toOrigin[0] - active.fromOrigin[0], active.toOrigin[2] - active.fromOrigin[2]) > 0.25 && t > 0.01 && t < 0.99;
      }
    }

    for (let i = 0; i < this.soldiers.length; i += 1) {
      const s = this.soldiers[i];
      const fp = this.footprints[i];
      if (s === undefined || fp === undefined) continue;
      fp.x = originX + s.offsetX;
      fp.z = originZ + s.offsetZ;
      fp.y = getTerrainHeightAt(fp.x, fp.z, terrain);
    }
    solveSpatialClearance(this.footprints, obstacles);

    const faceDirX = Math.sin(facingYaw);
    const faceDirZ = Math.cos(facingYaw);
    for (let i = 0; i < this.soldiers.length; i += 1) {
      const s = this.soldiers[i];
      const fp = this.footprints[i];
      if (s === undefined || fp === undefined) continue;

      const groundY = getTerrainHeightAt(fp.x, fp.z, terrain);
      const bob = moving ? Math.abs(Math.sin(timeSec * 8.4 + s.phase)) * 0.09 : Math.sin(timeSec * 2.4 + s.phase) * 0.02;
      const swayZ = moving ? Math.sin(timeSec * 8.4 + s.phase) * 0.045 : 0;
      const billboardYaw = Math.atan2(cameraPos.x - fp.x, cameraPos.z - fp.z);
      const flipSign = faceDirX * Math.cos(billboardYaw) - faceDirZ * Math.sin(billboardYaw) >= -0.05 ? 1 : -1;

      s.mesh.position.set(fp.x, groundY + bob, fp.z);
      s.mesh.rotation.set(0, billboardYaw, swayZ);
      s.mesh.scale.set(s.scale * flipSign, s.scale, s.scale);
    }
  }
}
